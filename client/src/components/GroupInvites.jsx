import { useState } from 'react';

function GroupInvites({ invites, onAccept, onReject, loading }) {
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (inviteId, action) => {
    setActionLoading(prev => ({ ...prev, [inviteId]: true }));
    try {
      if (action === 'accept') {
        await onAccept(inviteId);
      } else {
        await onReject(inviteId);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700 animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => (
        <div key={invite.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                {invite.group_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invited by <span className="font-medium">{invite.invited_by_username}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Sent {new Date(invite.invite_sent_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => handleAction(invite.id, 'reject')}
                disabled={actionLoading[invite.id]}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50"
              >
                {actionLoading[invite.id] ? '...' : 'Decline'}
              </button>
              <button
                onClick={() => handleAction(invite.id, 'accept')}
                disabled={actionLoading[invite.id]}
                className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition disabled:opacity-50"
              >
                {actionLoading[invite.id] ? '...' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GroupInvites;
