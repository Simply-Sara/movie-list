import { useState, useEffect } from 'react';

function AddFriendSearch({ currentUser, existingFriendIds, outgoingRequestUserIds, incomingRequestUserIds, onSendRequest, loading }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all users for local filtering (could be optimized with server search later)
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const users = await res.json();
        // Filter out current user
        setAllUsers(users.filter(u => u.id !== currentUser.id));
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [currentUser.id]);

  // Filter users based on query and exclusions
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    // Build a Set of user IDs that cannot be added (friends, pending requests either direction)
    const blockedIds = new Set([
      ...existingFriendIds,
      ...outgoingRequestUserIds,
      ...incomingRequestUserIds
    ]);

    const filtered = allUsers.filter(user => {
      // Must match username
      if (!user.username.toLowerCase().includes(lowerQuery)) return false;
      // Exclude any blocked/pending relationships
      if (blockedIds.has(user.id)) return false;
      return true;
    }).slice(0, 10); // Limit to 10 results

    setSearchResults(filtered);
  }, [query, allUsers, existingFriendIds, outgoingRequestUserIds, incomingRequestUserIds]);

  const handleSendRequest = async (username) => {
    try {
      await onSendRequest(username);
      setQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error sending request:', err);
    }
  };

  const getButtonState = (userId) => {
    if (existingFriendIds.includes(userId)) {
      return { label: 'Friends', disabled: true, className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-default' };
    }
    if (outgoingRequestUserIds.includes(userId)) {
      return { label: 'Request Pending', disabled: true, className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 cursor-default' };
    }
    return { label: 'Add Friend', disabled: false, className: 'bg-indigo-600 text-white hover:bg-indigo-700' };
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="add-friend-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Find people to add
        </label>
        <input
          type="text"
          id="add-friend-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          disabled={loadingUsers}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loadingUsers && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading users...</div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {searchResults.map((user) => {
              const buttonState = getButtonState(user.id);
              return (
                <li key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                          {user.about_me && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.about_me}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.username)}
                      disabled={buttonState.disabled || loading}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${buttonState.className} ${buttonState.disabled ? 'cursor-not-allowed' : ''}`}
                    >
                      {loading ? 'Sending...' : buttonState.label}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {query && searchResults.length === 0 && !loadingUsers && (
        <p className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          No users found matching "{query}"
        </p>
      )}
    </div>
  );
}

export default AddFriendSearch;
