import { useState, useEffect } from 'react';
import GroupMemberAutocomplete from './GroupMemberAutocomplete';

function GroupInviteManager({ groupId, isAdmin, onInviteSent, onInviteCancelled, currentUser, members }) {
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // Fetch all users for autocomplete
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setUsersError(null);
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const users = await res.json();
        setAllUsers(users);
      } catch (err) {
        console.error('Error fetching users:', err);
        setUsersError('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Load pending invites for this group
  useEffect(() => {
    loadInvites();
  }, [groupId]);

  const loadInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to load invites');
      const data = await res.json();
      setPendingInvites(data);
    } catch (err) {
      console.error('Error loading invites:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleInviteSent = () => {
    loadInvites(); // Refresh pending invites list
    if (onInviteSent) onInviteSent();
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/groups/invites/${inviteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invite');
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      if (onInviteCancelled) onInviteCancelled();
      // Notify global count update
      window.dispatchEvent(new CustomEvent('group-invite-updated'));
    } catch (err) {
      console.error('Error cancelling invite:', err);
    }
  };

  // Prepare data for autocomplete
  const existingMemberIds = members ? members.map(m => m.user_id) : [];
  const pendingInviteUserIds = pendingInvites.map(invite => invite.invited_user_id);

  if (!isAdmin) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">Only group admins can send invites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Send Invite Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Send Invite</h3>
        
        {loadingUsers ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading users...</div>
        ) : usersError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{usersError}</p>
        ) : (
          <GroupMemberAutocomplete
            allUsers={allUsers}
            groupId={groupId}
            currentUserId={currentUser.id}
            existingMemberIds={existingMemberIds}
            pendingInviteUserIds={pendingInviteUserIds}
            onInviteSent={handleInviteSent}
            loading={loadingUsers}
          />
        )}
      </div>

      {/* Pending Invites */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pending Invites</h3>
        {loadingInvites ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        ) : pendingInvites.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {invite.invited_user_username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {invite.invited_user_username}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (invited by {invite.inviter_username})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupInviteManager;
