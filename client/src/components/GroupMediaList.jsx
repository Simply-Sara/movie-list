import { useState, useEffect } from 'react';
import FilterPanel from './FilterPanel';

function GroupMediaList({ groupId, currentUser, users }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userIds: [],
    watchStatus: null,
    type: null,
    genres: [],
    runtimeMin: '',
    runtimeMax: ''
  });

  useEffect(() => {
    loadMedia();
  }, [groupId, filters]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.watchStatus) params.append('watchStatus', filters.watchStatus);
      if (filters.type) params.append('type', filters.type);
      if (filters.runtimeMin) params.append('runtimeMin', filters.runtimeMin);
      if (filters.runtimeMax) params.append('runtimeMax', filters.runtimeMax);
      if (filters.genres && filters.genres.length > 0) {
        params.append('genres', filters.genres.join(','));
      }

      const res = await fetch(`/api/groups/${groupId}/media?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to load media');
      const data = await res.json();
      setMediaItems(data);
    } catch (err) {
      console.error('Error loading group media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      userIds: [],
      watchStatus: null,
      type: null,
      genres: [],
      runtimeMin: '',
      runtimeMax: ''
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700 animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Panel */}
      <div className="mb-6">
        <FilterPanel
          users={users}
          currentUser={currentUser}
          selectedUsers={filters.userIds}
          onSelectedUsersChange={(userIds) => handleFilterChange({ userIds })}
          watchStatusFilter={filters.watchStatus}
          onWatchStatusFilter={(status) => handleFilterChange({ watchStatus: status })}
          typeFilter={filters.type}
          onTypeFilterChange={(type) => handleFilterChange({ type })}
          selectedGenres={filters.genres}
          onGenresChange={(genres) => handleFilterChange({ genres })}
          runtimeRange={{ min: filters.runtimeMin, max: filters.runtimeMax }}
          onRuntimeRangeChange={(range) => handleFilterChange({ runtimeMin: range.min, runtimeMax: range.max })}
          onClearFilter={handleClearFilters}
        />
      </div>

      {mediaItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No media found</h3>
          <p className="text-gray-600 dark:text-gray-400">This group doesn't have any media in common yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <MediaCard key={item.id} item={item} allUsers={users} />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({ item, allUsers }) {
  const baseImageUrl = 'https://image.tmdb.org/t/p/w500';

  // Build a lookup map from members array
  const memberStatusMap = {};
  item.members?.forEach(m => {
    memberStatusMap[m.username] = {
      watch_status: m.watch_status,
      seen: m.seen
    };
  });

  const getStatusBadge = (username) => {
    const status = memberStatusMap[username];
    if (!status) return <span className="text-gray-300">—</span>;

    if (status.seen) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">✓ Seen</span>;
    }
    switch (status.watch_status) {
      case 'want_to_watch':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Want</span>;
      case 'dont_want_to_watch':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Skip</span>;
      case 'undecided':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">?</span>;
      default:
        return <span className="text-gray-400">—</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden flex flex-col">
      {item.poster_path && (
        <div className="relative h-64 bg-gray-200 dark:bg-gray-700">
          <img
            src={`${baseImageUrl}${item.poster_path}`}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 capitalize">{item.type.replace('_', ' ')}</p>

        {/* Member status badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {allUsers?.slice(0, 4).map(user => (
            <div key={user.id} className="flex items-center gap-1">
              {memberStatusMap[user.username] && (
                <span title={user.username} className="text-xs">
                  {getStatusBadge(user.username)}
                </span>
              )}
            </div>
          ))}
          {allUsers?.length > 4 && (
            <span className="text-xs text-gray-500">+{allUsers.length - 4}</span>
          )}
        </div>

        {item.rating && (
          <div className="mt-auto">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.rating.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupMediaList;
