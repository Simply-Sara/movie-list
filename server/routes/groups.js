const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
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
} = require('../utils/groups');

const router = express.Router();

// === Group Management Routes (no params) ===

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required', code: 'NAME_REQUIRED' });
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 3) {
    return res.status(400).json({ error: 'Group name must be at least 3 characters', code: 'NAME_TOO_SHORT' });
  }
  if (trimmedName.length > 50) {
    return res.status(400).json({ error: 'Group name must be at most 50 characters', code: 'NAME_TOO_LONG' });
  }
  try {
    const group = await createGroup(userId, trimmedName);
    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    const status = err.message === 'Group name already exists' ? 409 : 500;
    res.status(status).json({ error: err.message, code: 'CREATE_GROUP_FAILED' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const groups = await getUserGroups(userId);
    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Failed to get groups', code: 'GET_GROUPS_FAILED' });
  }
});

// === Invite Routes (static paths - MUST come before dynamic :groupId routes) ===

router.get('/invites', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const invites = await getUserInvites(userId);
    res.json(invites);
  } catch (err) {
    console.error('Get invites error:', err);
    res.status(500).json({ error: 'Failed to get invites', code: 'GET_INVITES_FAILED' });
  }
});

router.post('/invites/:inviteId/accept', requireAuth, async (req, res) => {
  const { inviteId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(inviteId))) {
    return res.status(400).json({ error: 'Invalid invite ID', code: 'INVALID_ID' });
  }
  try {
    const result = await acceptGroupInvite(parseInt(inviteId), userId);
    res.json(result);
  } catch (err) {
    console.error('Accept invite error:', err);
    const status = err.message === 'Invite not found or already responded' ? 404 : 500;
    res.status(status).json({ error: err.message, code: 'ACCEPT_INVITE_FAILED' });
  }
});

router.post('/invites/:inviteId/reject', requireAuth, async (req, res) => {
  const { inviteId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(inviteId))) {
    return res.status(400).json({ error: 'Invalid invite ID', code: 'INVALID_ID' });
  }
  try {
    const result = await rejectGroupInvite(parseInt(inviteId), userId);
    res.json(result);
  } catch (err) {
    console.error('Reject invite error:', err);
    const status = err.message === 'Invite not found or already processed' ? 404 : 500;
    res.status(status).json({ error: err.message, code: 'REJECT_INVITE_FAILED' });
  }
});

router.delete('/invites/:inviteId', requireAuth, async (req, res) => {
  const { inviteId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(inviteId))) {
    return res.status(400).json({ error: 'Invalid invite ID', code: 'INVALID_ID' });
  }
  try {
    const result = await cancelGroupInvite(parseInt(inviteId), userId);
    res.json(result);
  } catch (err) {
    console.error('Cancel invite error:', err);
    let status = 500;
    if (err.message === 'Invite not found or cannot cancel') status = 404;
    else if (err.message.includes('not authorized')) status = 403;
    res.status(status).json({ error: err.message, code: 'CANCEL_INVITE_FAILED' });
  }
});

// === Dynamic Group Routes (/:groupId) - placed AFTER static routes above ===

router.get('/:groupId', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  try {
    const isMember = await isGroupMember(parseInt(groupId), userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group', code: 'NOT_A_MEMBER' });
    }
    const group = await getGroupById(parseInt(groupId), userId);
    res.json(group);
  } catch (err) {
    console.error('Get group error:', err);
    const status = err.message === 'Group not found' ? 404 : 500;
    res.status(status).json({ error: err.message, code: 'GET_GROUP_FAILED' });
  }
});

router.delete('/:groupId', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  try {
    await deleteGroup(parseInt(groupId), userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete group error:', err);
    let status = 500;
    if (err.message === 'Group not found') status = 404;
    else if (err.message.includes('Only the owner')) status = 403;
    res.status(status).json({ error: err.message, code: 'DELETE_GROUP_FAILED' });
  }
});

router.put('/:groupId/name', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  const userId = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required', code: 'NAME_REQUIRED' });
  }
  try {
    const updated = await updateGroupName(parseInt(groupId), name.trim(), userId);
    res.json(updated);
  } catch (err) {
    console.error('Rename group error:', err);
    let status = 500;
    if (err.message === 'Group not found') status = 404;
    else if (err.message.includes('Only owner or admin') || err.message.includes('not a member')) status = 403;
    else if (err.message === 'Group name already exists') status = 409;
    res.status(status).json({ error: err.message, code: 'RENAME_GROUP_FAILED' });
  }
});

router.post('/:groupId/transfer-ownership', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { newOwnerUserId } = req.body;
  const userId = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  if (!newOwnerUserId || isNaN(parseInt(newOwnerUserId))) {
    return res.status(400).json({ error: 'New owner user ID is required', code: 'NEW_OWNER_REQUIRED' });
  }
  try {
    const result = await transferOwnership(parseInt(groupId), userId, parseInt(newOwnerUserId));
    res.json(result);
  } catch (err) {
    console.error('Transfer ownership error:', err);
    let status = 500;
    if (err.message === 'Group not found') status = 404;
    else if (err.message.includes('Only the owner') || err.message.includes('not a member')) status = 403;
    res.status(status).json({ error: err.message, code: 'TRANSFER_OWNERSHIP_FAILED' });
  }
});

// === Member Management Routes ===

router.post('/:groupId/members/:userId/admin', requireAuth, async (req, res) => {
  const { groupId, userId } = req.params;
  const actingUserId = req.user.userId;
  if (isNaN(parseInt(groupId)) || isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'Invalid IDs', code: 'INVALID_ID' });
  }
  try {
    const result = await toggleMemberAdmin(parseInt(groupId), actingUserId, parseInt(userId));
    res.json(result);
  } catch (err) {
    console.error('Toggle admin error:', err);
    let status = 500;
    if (err.message.includes('Only owner or admin') || err.message.includes('not a member')) status = 403;
    else if (err.message === 'Cannot change owner role') status = 400;
    res.status(status).json({ error: err.message, code: 'TOGGLE_ADMIN_FAILED' });
  }
});

router.delete('/:groupId/members/:userId', requireAuth, async (req, res) => {
  const { groupId, userId } = req.params;
  const actingUserId = req.user.userId;
  if (isNaN(parseInt(groupId)) || isNaN(parseInt(userId))) {
    return res.status(400).json({ error: 'Invalid IDs', code: 'INVALID_ID' });
  }
  try {
    const result = await removeGroupMember(parseInt(groupId), actingUserId, parseInt(userId));
    res.json(result);
  } catch (err) {
    console.error('Remove member error:', err);
    let status = 500;
    if (err.message === 'Group not found' || err.message === 'Target user is not a member') status = 404;
    else if (err.message.includes('Only owner') || err.message.includes('cannot remove') || err.message.includes('not a member')) status = 403;
    else if (err.message.includes('Owner cannot leave')) status = 400;
    res.status(status).json({ error: err.message, code: 'REMOVE_MEMBER_FAILED' });
  }
});

// === Invite Sending (requires groupId) - placed before media but after member routes ===

router.post('/:groupId/invites', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { username } = req.body;
  const invitedById = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required', code: 'USERNAME_REQUIRED' });
  }
  try {
    const invite = await sendGroupInvite(parseInt(groupId), invitedById, username.trim());
    res.status(201).json(invite);
  } catch (err) {
    console.error('Send invite error:', err);
    let status = 500;
    if (err.message === 'Group not found' || err.message === 'User not found') status = 404;
    else if (err.message.includes('Only owner or admin') || err.message.includes('already a member') || err.message.includes('Invite already sent') || err.message.includes('Cannot invite yourself')) status = 400;
    res.status(status).json({ error: err.message, code: 'SEND_INVITE_FAILED' });
  }
});

router.get('/:groupId/invites', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  try {
    const member = await isGroupMember(parseInt(groupId), userId);
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this group', code: 'NOT_A_MEMBER' });
    }
    const invites = await getGroupPendingInvites(parseInt(groupId));
    res.json(invites);
  } catch (err) {
    console.error('Get group invites error:', err);
    const status = err.message === 'Group not found' ? 404 : 500;
    res.status(status).json({ error: err.message, code: 'GET_GROUP_INVITES_FAILED' });
  }
});

// === Combined Media Route ===

router.get('/:groupId/media', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;
  if (isNaN(parseInt(groupId))) {
    return res.status(400).json({ error: 'Invalid group ID', code: 'INVALID_ID' });
  }
  try {
    const isMember = await isGroupMember(parseInt(groupId), userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group', code: 'NOT_A_MEMBER' });
    }
    const filters = {
      watchStatus: req.query.watchStatus || null,
      type: req.query.type || null,
      runtimeMin: req.query.runtimeMin || null,
      runtimeMax: req.query.runtimeMax || null,
      genres: req.query.genres ? req.query.genres.split(',') : [],
      userIds: req.query.userIds ? req.query.userIds.split(',').map(Number).filter(Boolean) : []
    };
    const media = await getGroupMedia(parseInt(groupId), filters);
    res.json(media);
  } catch (err) {
    console.error('Get group media error:', err);
    const status = err.message === 'Group not found' ? 404 : 500;
    res.status(status).json({ error: err.message, code: 'GET_GROUP_MEDIA_FAILED' });
  }
});

module.exports = router;
