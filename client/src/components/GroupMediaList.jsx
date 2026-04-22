import { useState, useEffect, useMemo } from 'react'
import FilterPanel from './FilterPanel'
import MediaItem from './MediaItem'

function GroupMediaList({ groupId, currentUser, groupMembers }) {
  const [mediaItems, setMediaItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    userIds: [],
    watchStatus: null,
    type: null,
    genres: [],
    runtimeMin: '',
    runtimeMax: ''
  })

  // Build username->userId lookup from groupMembers
  const memberIdMap = useMemo(() => {
    const map = new Map()
    groupMembers?.forEach(m => {
      map.set(m.username, m.user_id)
    })
    return map
  }, [groupMembers])

  // Build minimal users array for MediaItem badges (id, username)
  const memberUsers = useMemo(() => {
    return groupMembers?.map(m => ({ id: m.user_id, username: m.username })) || []
  }, [groupMembers])

  useEffect(() => {
    loadMedia()
  }, [groupId, filters])

  const loadMedia = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.userIds.length > 0) {
        params.append('userIds', filters.userIds.join(','))
      }
      if (filters.watchStatus) params.append('watchStatus', filters.watchStatus)
      if (filters.type) params.append('type', filters.type)
      if (filters.runtimeMin) params.append('runtimeMin', filters.runtimeMin)
      if (filters.runtimeMax) params.append('runtimeMax', filters.runtimeMax)
      if (filters.genres && filters.genres.length > 0) {
        params.append('genres', filters.genres.join(','))
      }

      const res = await fetch(`/api/groups/${groupId}/media?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Failed to load media')
      const data = await res.json()

      // Transform data: convert members array into userStatuses with numeric user IDs
      const transformed = data.map(item => ({
        ...item,
        userStatuses: item.members?.map(m => ({
          user_id: memberIdMap.get(m.username) || 0,
          username: m.username,
          watch_status: m.watch_status,
          seen: m.seen ? 1 : 0
        })) || []
      }))

      setMediaItems(transformed)
    } catch (err) {
      console.error('Error loading group media:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleClearFilters = () => {
    setFilters({
      userIds: [],
      watchStatus: null,
      type: null,
      genres: [],
      runtimeMin: '',
      runtimeMax: ''
    })
  }

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
    )
  }

  return (
    <div>
      {/* Filter Panel */}
      <div className="mb-6">
        <FilterPanel
          users={memberUsers}
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
        <div className="space-y-4">
          {mediaItems.map((item) => (
            <MediaItem
              key={item.id}
              item={item}
              currentUser={currentUser}
              users={memberUsers}
              userStatuses={item.userStatuses}
              onStatusUpdate={loadMedia}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default GroupMediaList
