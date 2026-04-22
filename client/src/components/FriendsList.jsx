import { useState } from 'react';
import { Link } from 'react-router-dom';

function FriendsList({ friends, onRemoveFriend, loading }) {
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const handleRemoveClick = (e, friendId) => {
    e.stopPropagation(); // Prevent navigation to profile
    setConfirmRemove(friendId);
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await onRemoveFriend(confirmRemove);
      setConfirmRemove(null);
    } catch (err) {
      console.error('Error removing friend:', err);
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelRemove = () => {
    setConfirmRemove(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2c0-.656.126-1.283.356-1.857m7.356 1.857l-1.09 1.09a2.5 2.5 0 01-3.538 0l-1.09-1.09A2.5 2.5 0 0111.66 15.12z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No friends yet</h3>
        <p className="text-gray-600 dark:text-gray-400">Start adding friends to build your watchlist network.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCancelRemove}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Remove Friend</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to remove this friend? They will no longer appear in your friends list.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelRemove}
                disabled={removing}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {friends.map((friend) => (
        <Link
          key={friend.id}
          to={`/users/${friend.username}`}
          className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt={friend.username} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                      {friend.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{friend.username}</h4>
                  {friend.about_me && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{friend.about_me}</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => handleRemoveClick(e, friend.id)}
              disabled={removing && confirmRemove === friend.id}
              className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default FriendsList;
