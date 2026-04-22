import { useState } from 'react';

function MemberList({ groupId, members, currentUserRole, currentUserId, onMemberRemoved, onRoleToggled }) {
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;

  const showAdminToggle = (targetRole) => isAdmin && targetRole !== 'owner';
  const showRemoveBtn = (targetRole) => {
    if (isOwner) return targetRole !== 'owner'; // Owner can remove anyone except themselves
    if (isAdmin) return targetRole === 'member';
    return false;
  };

  const handleAction = async (userId, action) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    setError('');
    try {
      if (action === 'toggleAdmin') {
        const res = await fetch(`/api/groups/${groupId}/members/${userId}/admin`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to toggle admin');
        onRoleToggled();
      } else if (action === 'remove') {
        if (!window.confirm('Are you sure you want to remove this member?')) {
          setActionLoading(prev => ({ ...prev, [userId]: false }));
          return;
        }
        const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to remove member');
        onMemberRemoved();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">👑 Owner</span>;
      case 'admin':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Admin</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Member</span>;
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const canToggleAdmin = showAdminToggle(member.role);
          const canRemove = showRemoveBtn(member.role);
          const loading = actionLoading[member.user_id];

          return (
            <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.username} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {member.username}
                      {isSelf && <span className="ml-2 text-gray-500">(you)</span>}
                    </h4>
                    {member.about_me && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{member.about_me}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(member.role)}
                      <span className="text-xs text-gray-500">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {!isSelf && isAdmin && (
                  <div className="flex gap-2 ml-4">
                    {canToggleAdmin && (
                      <button
                        onClick={() => handleAction(member.user_id, 'toggleAdmin')}
                        disabled={loading}
                        title={member.role === 'admin' ? 'Remove admin privileges' : 'Make admin'}
                        className={`px-3 py-1.5 text-sm font-medium border rounded-lg transition disabled:opacity-50 ${
                          member.role === 'admin'
                            ? 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/40'
                            : 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/40'
                        }`}
                      >
                        {loading ? '...' : member.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleAction(member.user_id, 'remove')}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50"
                      >
                        {loading ? '...' : 'Remove'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MemberList;
