import { useState, useEffect } from 'react'
import MediaItem from './MediaItem'

function MediaList({ items, currentUser, users, onStatusUpdate }) {
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    // Load statuses for all items
    const loadStatuses = async () => {
      const statusPromises = items.map(item =>
        fetch(`/api/media/${item.id}/status`)
          .then(res => res.json())
          .then(data => ({ itemId: item.id, statuses: data }))
      )
      const results = await Promise.all(statusPromises)
      const statusMap = {}
      results.forEach(({ itemId, statuses }) => {
        statusMap[itemId] = statuses
      })
      setStatuses(statusMap)
    }

    if (items.length > 0) {
      loadStatuses()
    }
  }, [items])

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No media items yet. Add one to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <MediaItem
          key={item.id}
          item={item}
          currentUser={currentUser}
          users={users}
          userStatuses={statuses[item.id] || []}
          onStatusUpdate={onStatusUpdate}
        />
      ))}
    </div>
  )
}

export default MediaList

