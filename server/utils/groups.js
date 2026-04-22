const dbModule = require('../database');

function getDb() {
  return dbModule.getDb();
}

// Create a new group (creator becomes owner)
function createGroup(userId, name) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO groups (name, created_by) VALUES (?, ?)',
      [name.trim(), userId],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return reject(new Error('Group name already exists'));
          }
          return reject(err);
        }
        const groupId = this.lastID;
        // Add creator as owner
        db.run(
          'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
          [groupId, userId, 'owner'],
          function(insertErr) {
            if (insertErr) {
              db.run('DELETE FROM groups WHERE id = ?', [groupId], () => {});
              return reject(insertErr);
            }
            resolve({ id: groupId, name: name.trim(), created_by: userId });
          }
        );
      }
    );
  });
}

// Get all groups the current user is a member of
function getUserGroups(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT g.id, g.name, g.created_by, g.created_at,
             gm.role,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.name ASC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Get group full details by ID (including members and current user's role)
function getGroupById(groupId, userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Get group info
    db.get(
      'SELECT * FROM groups WHERE id = ?',
      [groupId],
      (err, group) => {
        if (err) return reject(err);
        if (!group) {
          return reject(new Error('Group not found'));
        }

        // Get members
        db.all(
          `SELECT gm.id, gm.user_id, gm.role, gm.joined_at,
                  u.username, u.about_me, u.avatar_url
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = ?
           ORDER BY gm.role = 'owner' DESC, gm.role = 'admin' DESC, u.username ASC`,
          [groupId],
          (membersErr, members) => {
            if (membersErr) return reject(membersErr);

            // Get current user's role
            const userRoleObj = members.find(m => m.user_id === userId);
            const userRole = userRoleObj ? userRoleObj.role : null;

            resolve({
              ...group,
              members,
              currentUserRole: userRole
            });
          }
        );
      }
    );
  });
}

// Update group name (owner or admin only)
function updateGroupName(groupId, newName, actingUserId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Check if acting user has permission (owner or admin)
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, actingUserId],
      (err, member) => {
        if (err) return reject(err);
        if (!member) {
          return reject(new Error('You are not a member of this group'));
        }
        if (member.role !== 'owner' && member.role !== 'admin') {
          return reject(new Error('Only owner or admin can rename the group'));
        }

        db.run(
          'UPDATE groups SET name = ? WHERE id = ?',
          [newName.trim(), groupId],
          function(updateErr) {
            if (updateErr) {
              if (updateErr.message.includes('UNIQUE constraint')) {
                return reject(new Error('Group name already exists'));
              }
              return reject(updateErr);
            }
            if (this.changes === 0) {
              return reject(new Error('Group not found'));
            }
            resolve({ id: groupId, name: newName.trim() });
          }
        );
      }
    );
  });
}

// Delete group (owner only)
function deleteGroup(groupId, actingUserId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Verify user is the owner
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, actingUserId],
      (err, member) => {
        if (err) return reject(err);
        if (!member || member.role !== 'owner') {
          return reject(new Error('Only the owner can delete the group'));
        }

        // Cascade will handle members and invites automatically
        db.run('DELETE FROM groups WHERE id = ?', [groupId], function(delErr) {
          if (delErr) return reject(delErr);
          if (this.changes === 0) {
            return reject(new Error('Group not found'));
          }
          resolve({ success: true });
        });
      }
    );
  });
}

// Transfer ownership to another member (owner only)
function transferOwnership(groupId, actingUserId, newOwnerUserId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Verify acting user is the current owner
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, actingUserId],
      (err, actingMember) => {
        if (err) return reject(err);
        if (!actingMember || actingMember.role !== 'owner') {
          return reject(new Error('Only the owner can transfer ownership'));
        }

        // Verify new owner is a group member
        db.get(
          'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
          [groupId, newOwnerUserId],
          (err, newMember) => {
            if (err) return reject(err);
            if (!newMember) {
              return reject(new Error('Target user is not a member of this group'));
            }

            // Perform transaction: update owner's role to admin (or member?), set new owner
            db.serialize(() => {
              db.run('BEGIN TRANSACTION');

              // Update former owner to admin
              db.run(
                'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
                ['admin', groupId, actingUserId],
                (err1) => {
                  if (err1) {
                    db.run('ROLLBACK');
                    return reject(err1);
                  }

                  // Update new owner role to owner
                  db.run(
                    'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
                    ['owner', groupId, newOwnerUserId],
                    (err2) => {
                      if (err2) {
                        db.run('ROLLBACK');
                        return reject(err2);
                      }

                      // Update group's created_by to new owner
                      db.run(
                        'UPDATE groups SET created_by = ? WHERE id = ?',
                        [newOwnerUserId, groupId],
                        function(updateErr) {
                          if (updateErr) {
                            db.run('ROLLBACK');
                            return reject(updateErr);
                          }
                          db.run('COMMIT');
                          resolve({
                            success: true,
                            message: 'Ownership transferred successfully'
                          });
                        }
                      );
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  });
}

// Toggle admin status for a member (owner or admin only)
function toggleMemberAdmin(groupId, actingUserId, targetUserId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Verify acting user has permission
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, actingUserId],
      (err, actingMember) => {
        if (err) return reject(err);
        if (!actingMember || (actingMember.role !== 'owner' && actingMember.role !== 'admin')) {
          return reject(new Error('Only owner or admin can manage roles'));
        }

        // Get target member
        db.get(
          'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?',
          [groupId, targetUserId],
          (err, targetMember) => {
            if (err) return reject(err);
            if (!targetMember) {
              return reject(new Error('Target user is not a member'));
            }
            // Owner role is immutable
            if (targetMember.role === 'owner') {
              return reject(new Error('Cannot change owner role'));
            }

            const newRole = targetMember.role === 'admin' ? 'member' : 'admin';

            db.run(
              'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
              [newRole, groupId, targetUserId],
              function(updateErr) {
                if (updateErr) return reject(updateErr);
                resolve({
                  success: true,
                  newRole,
                  message: `Member is now ${newRole}`
                });
              }
            );
          }
        );
      }
    );
  });
}

// Remove member from group (owner can remove anyone except self; admin can remove members only; user can self-remove)
function removeGroupMember(groupId, actingUserId, targetUserId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Get acting user's role
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, actingUserId],
      (err, actingMember) => {
        if (err) return reject(err);
        if (!actingMember) {
          return reject(new Error('You are not a member of this group'));
        }

        // Get target member
        db.get(
          'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
          [groupId, targetUserId],
          (err, targetMember) => {
            if (err) return reject(err);
            if (!targetMember) {
              return reject(new Error('Target user is not a member'));
            }

            // Self-removal always allowed
            const isSelfRemoval = actingUserId === targetUserId;

            if (isSelfRemoval) {
              // Prevent owner from self-removing (must transfer first)
              if (targetMember.role === 'owner') {
                return reject(new Error('Owner cannot leave without transferring ownership first'));
              }
              // Allow member to remove self
            } else {
              // Acting user wants to remove someone else - need permission
              if (actingMember.role === 'owner') {
                // Owner can remove anyone except themselves (handled above)
                // So if we're here, owner is trying to remove another member - allowed
              } else if (actingMember.role === 'admin') {
                // Admin can only remove members (not owner or other admins)
                if (targetMember.role === 'owner' || targetMember.role === 'admin') {
                  return reject(new Error('Admins cannot remove owners or other admins'));
                }
              } else {
                // Regular member trying to remove someone else
                return reject(new Error('Members cannot remove other members'));
              }
            }

            // Perform deletion
            db.run(
              'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
              [groupId, targetUserId],
              function(delErr) {
                if (delErr) return reject(delErr);
                if (this.changes === 0) {
                  return reject(new Error('Member not found'));
                }

                // Check if group would become empty (shouldn't happen if cascade or logic prevents)
                db.get(
                  'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
                  [groupId],
                  (err, row) => {
                    if (err) return reject(err);
                    if (row.count === 0) {
                      // Delete the group itself
                      db.run('DELETE FROM groups WHERE id = ?', [groupId], () => {});
                    }
                    resolve({ success: true, message: 'Member removed' });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

// Send group invite (owner or admin only)
function sendGroupInvite(groupId, invitedById, invitedUsername) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Verify inviter is owner or admin
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, invitedById],
      (err, member) => {
        if (err) return reject(err);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
          return reject(new Error('Only owner or admin can send invites'));
        }

        // Look up invited user
        db.get(
          'SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)',
          [invitedUsername.trim()],
          (err, user) => {
            if (err) return reject(err);
            if (!user) {
              return reject(new Error('User not found'));
            }
            const invitedUserId = user.id;

            // Cannot invite yourself
            if (invitedUserId === invitedById) {
              return reject(new Error('Cannot invite yourself'));
            }

            // Check if already a member
            db.get(
              'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
              [groupId, invitedUserId],
              (err, existingMember) => {
                if (err) return reject(err);
                if (existingMember) {
                  return reject(new Error('User is already a member'));
                }

                // Check for pending invite
                db.get(
                  'SELECT id FROM group_invites WHERE group_id = ? AND invited_user_id = ? AND status = "pending"',
                  [groupId, invitedUserId],
                  (err, existingInvite) => {
                    if (err) return reject(err);
                    if (existingInvite) {
                      return reject(new Error('Invite already sent'));
                    }

                    // Create invite
                    db.run(
                      'INSERT INTO group_invites (group_id, invited_by, invited_user_id, status) VALUES (?, ?, ?, ?)',
                      [groupId, invitedById, invitedUserId, 'pending'],
                      function(insertErr) {
                        if (insertErr) return reject(insertErr);
                        resolve({
                          id: this.lastID,
                          group_id: groupId,
                          invited_by: invitedById,
                          invited_user_id: invitedUserId,
                          status: 'pending'
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

// Get all pending invites for current user
function getUserInvites(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT gi.id, gi.status, gi.created_at as invite_sent_at,
             g.id as group_id, g.name as group_name, g.created_by as group_owner_id,
             u.username as invited_by_username
      FROM group_invites gi
      JOIN groups g ON gi.group_id = g.id
      JOIN users u ON gi.invited_by = u.id
      WHERE gi.invited_user_id = ?
      ORDER BY gi.created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Accept group invite
function acceptGroupInvite(inviteId, userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Get invite
    db.get(
      'SELECT * FROM group_invites WHERE id = ? AND invited_user_id = ? AND status = "pending"',
      [inviteId, userId],
      (err, invite) => {
        if (err) return reject(err);
        if (!invite) {
          return reject(new Error('Invite not found or already responded'));
        }

        // Add user to group as member
        db.run(
          'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
          [invite.group_id, userId, 'member'],
          function(insertErr) {
            if (insertErr) {
              if (insertErr.message.includes('UNIQUE constraint')) {
                // Already a member - still mark invite as accepted
                db.run(
                  'UPDATE group_invites SET status = "accepted" WHERE id = ?',
                  [inviteId],
                  () => resolve({ success: true, message: 'Already a member' })
                );
                return;
              }
              return reject(insertErr);
            }

            // Update invite status
            db.run(
              'UPDATE group_invites SET status = "accepted" WHERE id = ?',
              [inviteId],
              function(updateErr) {
                if (updateErr) return reject(updateErr);
                resolve({
                  success: true,
                  message: 'Invite accepted',
                  memberId: this.lastID
                });
              }
            );
          }
        );
      }
    );
  });
}

// Reject group invite
function rejectGroupInvite(inviteId, userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE group_invites SET status = "rejected" WHERE id = ? AND invited_user_id = ? AND status = "pending"',
      [inviteId, userId],
      function(updateErr) {
        if (updateErr) return reject(updateErr);
        if (this.changes === 0) {
          return reject(new Error('Invite not found or already processed'));
        }
        resolve({ success: true, message: 'Invite rejected' });
      }
    );
  });
}

// Cancel pending invite (inviter only)
function cancelGroupInvite(inviteId, actingUserId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE group_invites SET status = "rejected" WHERE id = ? AND invited_by = ? AND status = "pending"',
      [inviteId, actingUserId],
      function(updateErr) {
        if (updateErr) return reject(updateErr);
        if (this.changes === 0) {
          return reject(new Error('Invite not found or cannot cancel'));
        }
        resolve({ success: true, message: 'Invite cancelled' });
      }
    );
  });
}

// Get combined media for a group (union or intersection of members' media)
function getGroupMedia(groupId, filters = {}) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    // Get all member IDs
    db.all(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      [groupId],
      (err, memberRows) => {
        if (err) return reject(err);
        if (memberRows.length === 0) {
          return resolve([]);
        }

        const allGroupMemberIds = memberRows.map(r => r.user_id);

        // Determine which users to filter by: if filters.userIds provided, use those (but only if they're group members); else all members
        let targetUserIds = allGroupMemberIds;
        if (filters.userIds && filters.userIds.length > 0) {
          targetUserIds = filters.userIds.filter(uid => allGroupMemberIds.includes(uid));
        }

        if (targetUserIds.length === 0) {
          return resolve([]);
        }

        const placeholders = targetUserIds.map(() => '?').join(',');

        let query = `
          SELECT
            m.id,
            m.title,
            m.type,
            m.tmdb_id,
            m.tmdb_type,
            m.poster_path,
            m.release_date,
            m.overview,
            m.rating,
            m.runtime,
            m.genres,
            m.created_at,
            u.username,
            ums.watch_status,
            ums.seen
          FROM media_items m
          JOIN user_media_status ums ON m.id = ums.media_id
          JOIN users u ON ums.user_id = u.id
          WHERE ums.user_id IN (${placeholders})
        `;

        const params = [...targetUserIds];

        if (filters.watchStatus) {
          query += ' AND ums.watch_status = ?';
          params.push(filters.watchStatus);
        }

        if (filters.type) {
          query += ' AND m.type = ?';
          params.push(filters.type);
        }

        if (filters.runtimeMin) {
          query += ' AND m.runtime >= ?';
          params.push(parseInt(filters.runtimeMin, 10));
        }

        if (filters.runtimeMax) {
          query += ' AND m.runtime <= ?';
          params.push(parseInt(filters.runtimeMax, 10));
        }

        if (filters.genres && filters.genres.length > 0) {
          filters.genres.forEach(genre => {
            query += ' AND m.genres LIKE ?';
            params.push(`%"${genre}"%`);
          });
        }

        // If specific users selected (intersection), enforce that all have status for each media item
        if (filters.userIds && filters.userIds.length > 0) {
          query += `
            GROUP BY m.id
            HAVING COUNT(DISTINCT ums.user_id) = ?
          `;
          params.push(targetUserIds.length);
        }

        query += `
          ORDER BY m.created_at DESC, u.username
        `;

        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('Group media query error:', err.message, 'Query:', query);
            return reject(err);
          }

          // Aggregate rows into media objects with members array
          const mediaMap = new Map();

          rows.forEach(row => {
            const mediaId = row.id;
            if (!mediaMap.has(mediaId)) {
              mediaMap.set(mediaId, {
                id: row.id,
                title: row.title,
                type: row.type,
                tmdb_id: row.tmdb_id,
                tmdb_type: row.tmdb_type,
                poster_path: row.poster_path,
                release_date: row.release_date,
                overview: row.overview,
                rating: row.rating,
                runtime: row.runtime,
                genres: row.genres ? JSON.parse(row.genres) : [],
                created_at: row.created_at,
                members: []
              });
            }
            const media = mediaMap.get(mediaId);
            media.members.push({
              username: row.username,
              watch_status: row.watch_status,
              seen: row.seen === 1
            });
          });

          resolve(Array.from(mediaMap.values()));
        });
      }
    );
  });
}

// Check if user is a member of the group
function isGroupMember(groupId, userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}

// Get user's role in the group
function getUserGroupRole(groupId, userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.role : null);
      }
    );
  });
}

// Get pending invites count for a user
function getPendingInvitesCount(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM group_invites WHERE invited_user_id = ? AND status = "pending"',
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      }
    );
  });
}

// Get pending invites for a specific group (only pending status)
function getGroupPendingInvites(groupId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT gi.id, gi.group_id, gi.invited_by, gi.invited_user_id, gi.status, gi.created_at as invite_sent_at,
             u.username as invited_user_username, inviter.username as inviter_username
      FROM group_invites gi
      JOIN users u ON gi.invited_user_id = u.id
      JOIN users inviter ON gi.invited_by = inviter.id
      WHERE gi.group_id = ? AND gi.status = 'pending'
      ORDER BY gi.created_at DESC
    `;
    db.all(sql, [groupId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroupName,
  deleteGroup,
  transferOwnership,
  toggleMemberAdmin,
  removeGroupMember,
  sendGroupInvite,
  getUserInvites,
  getGroupPendingInvites,
  acceptGroupInvite,
  rejectGroupInvite,
  cancelGroupInvite,
  getGroupMedia,
  isGroupMember,
  getUserGroupRole,
  getPendingInvitesCount
};
