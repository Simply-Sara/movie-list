import { useState, useEffect } from 'react'
import MarkWatchedModal from './MarkWatchedModal'
import MediaDetailsModal from './MediaDetailsModal'

function MediaItem({ item, currentUser, userStatuses, users, onStatusUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [imageBaseUrl, setImageBaseUrl] = useState('')
  const [showMarkWatchedModal, setShowMarkWatchedModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const currentUserStatus = currentUser ? userStatuses.find(s => s.user_id === currentUser.id) : null;

  useEffect(() => {
    // Get TMDB image base URL
    fetch('/api/tmdb/config')
      .then(res => res.json())
      .then(data => setImageBaseUrl(data.imageBaseUrl))
      .catch(err => console.error('Error loading TMDB config:', err))
  }, [])

  const updateStatus = (watchStatus, seen) => {
    if (!currentUser) return
    setIsUpdating(true)
    // Handle null watchStatus (clearing status) - use !== undefined to allow null
    const statusToSet = watchStatus !== undefined ? watchStatus : (currentUserStatus?.watch_status || null)
    const seenToSet = seen !== undefined ? (seen ? 1 : 0) : (currentUserStatus?.seen || 0)

    fetch(`/api/media/${item.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        userId: currentUser.id,
        watchStatus: statusToSet,
        seen: seenToSet
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            const error = new Error(errData.error || `Request failed with status ${res.status}`)
            error.status = res.status
            throw error
          }).catch(() => {
            const error = new Error(`Request failed with status ${res.status}`)
            error.status = res.status
            throw error
          })
        }
        return res.json()
      })
      .then(() => {
        onStatusUpdate()
      })
      .catch(err => {
        console.error('Error updating status:', err)
        if (err.status === 401) {
          // Token invalid or missing – clear and redirect to login
          localStorage.removeItem('token')
          window.location.href = '/'
        } else {
          alert('Failed to update status')
        }
      })
      .finally(() => setIsUpdating(false))
  }

  const usersWantingToWatch = userStatuses.filter(s => s.watch_status === 'want_to_watch')

  const handleCardClick = () => {
    setShowDetailsModal(true)
  }

  const handleStatusButtonClick = (e) => {
    e.stopPropagation() // Prevent opening modal when clicking status buttons
  }

  const handleMarkWatchedClick = (e) => {
    e.stopPropagation() // Prevent opening modal when clicking mark watched
    setShowMarkWatchedModal(true)
  }

  const getTypeLabel = (type) => {
    const labels = {
      movie: 'Movie',
      tv_show: 'TV Show',
      anime: 'Anime'
    }
    return labels[type] || type
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      want_to_watch: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      dont_want_to_watch: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      undecided: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const getStatusLabel = (status) => {
    const labels = {
      want_to_watch: 'Want to Watch',
      dont_want_to_watch: "Don't Want to Watch",
      undecided: 'Undecided'
    }
    return labels[status] || 'Not Set'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const posterUrl = item.poster_path && imageBaseUrl ? `${imageBaseUrl}${item.poster_path}` : null

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleCardClick}
    >
      <div className="flex flex-col md:flex-row">
        {posterUrl && (
          <div className="md:w-48 flex-shrink-0">
            <img
              src={posterUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded dark:bg-indigo-900 dark:text-indigo-300">
                  {getTypeLabel(item.type)}
                </span>
              </div>
              
              {(item.release_date || item.rating) && (
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {item.release_date && (
                    <span>📅 {formatDate(item.release_date)}</span>
                  )}
                  {item.rating && (
                    <span>⭐ {item.rating.toFixed(1)}/10</span>
                  )}
                </div>
              )}

              {item.overview && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">{item.overview}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-3 mb-3">
                {userStatuses
                  .filter(s => s.watch_status || s.seen === 1)
                  .map(status => (
                    <div key={status.user_id} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{status.username}:</span>
                      {status.watch_status && (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(status.watch_status)}`}>
                          {getStatusLabel(status.watch_status)}
                        </span>
                      )}
                      {status.seen === 1 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded dark:bg-blue-900 dark:text-blue-300">
                          Seen
                        </span>
                      )}
                    </div>
                  ))}
              </div>

               {currentUser && (
                 <div className="mb-4">
                   <button
                     onClick={handleMarkWatchedClick}
                     disabled={isUpdating}
                     className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 dark:focus:ring-offset-gray-900"
                   >
                     ✓ Mark as Watched
                     {usersWantingToWatch.length > 0 && (
                       <span className="ml-2">({usersWantingToWatch.length} {usersWantingToWatch.length === 1 ? 'person' : 'people'} want to watch)</span>
                     )}
                   </button>
                 </div>
               )}
            </div>
          </div>

          <div className="border-t pt-4 mt-4 dark:border-gray-700">
            {currentUser ? (
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Status:</span>
                
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      handleStatusButtonClick(e)
                      const newStatus = currentUserStatus?.watch_status === 'want_to_watch' ? null : 'want_to_watch'
                      updateStatus(newStatus, undefined)
                    }}
                    disabled={isUpdating}
                    className={`px-3 py-1 text-sm rounded transition ${
                      currentUserStatus?.watch_status === 'want_to_watch'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    Want to Watch
                  </button>
                  <button
                    onClick={(e) => {
                      handleStatusButtonClick(e)
                      const newStatus = currentUserStatus?.watch_status === 'dont_want_to_watch' ? null : 'dont_want_to_watch'
                      updateStatus(newStatus, undefined)
                    }}
                    disabled={isUpdating}
                    className={`px-3 py-1 text-sm rounded transition ${
                      currentUserStatus?.watch_status === 'dont_want_to_watch'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700'
                    } disabled:opacity-50`}
                  >
                    Don't Want
                  </button>
                  <button
                    onClick={(e) => {
                      handleStatusButtonClick(e)
                      const newStatus = currentUserStatus?.watch_status === 'undecided' ? null : 'undecided'
                      updateStatus(newStatus, undefined)
                    }}
                    disabled={isUpdating}
                    className={`px-3 py-1 text-sm rounded transition ${
                      currentUserStatus?.watch_status === 'undecided'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700'
                    } disabled:opacity-50`}
                  >
                    Undecided
                  </button>
                </div>

                <div className="ml-auto">
                  <label 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={handleStatusButtonClick}
                  >
                    <input
                      type="checkbox"
                      checked={currentUserStatus?.seen === 1}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateStatus(undefined, e.target.checked)
                      }}
                      disabled={isUpdating}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Mark as Seen</span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Log in to track your status
              </p>
            )}
          </div>
        </div>
      </div>

      <MarkWatchedModal
        isOpen={showMarkWatchedModal}
        onClose={() => setShowMarkWatchedModal(false)}
        users={users}
        userStatuses={userStatuses}
        mediaId={item.id}
        onConfirm={onStatusUpdate}
      />

      <MediaDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        mediaItem={item}
        isSearchResult={false}
        currentUser={currentUser}
        users={users}
        userStatuses={userStatuses}
        onStatusUpdate={onStatusUpdate}
      />
    </div>
  )
}

export default MediaItem
