import { useState, useEffect } from 'react'

function MediaDetailsModal({ 
  isOpen, 
  onClose, 
  mediaItem, 
  isSearchResult = false,
  existingItemId: propExistingItemId = null,
  currentUser,
  users = [],
  userStatuses: initialUserStatuses = [],
  onStatusUpdate,
  onAddToList
}) {
  const [details, setDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [imageBaseUrl, setImageBaseUrl] = useState('')
  const [error, setError] = useState(null)
  const [userStatuses, setUserStatuses] = useState(initialUserStatuses)
  const [existingItemId, setExistingItemId] = useState(propExistingItemId)

  const currentUserStatus = userStatuses.find(s => s.user_id === currentUser?.id)
  const itemExists = existingItemId !== null || (mediaItem?.id && !isSearchResult)

  // Update userStatuses when initialUserStatuses changes
  useEffect(() => {
    setUserStatuses(initialUserStatuses)
  }, [initialUserStatuses])

  // Update existingItemId when prop changes
  useEffect(() => {
    setExistingItemId(propExistingItemId)
  }, [propExistingItemId])

  useEffect(() => {
    if (isOpen && mediaItem) {
      fetchImageBaseUrl()
      if (mediaItem.tmdb_id && mediaItem.tmdb_type) {
        fetchDetails()
      } else {
        // Use existing data if no TMDB ID
        setDetails(null)
        setError(null)
      }
    } else {
      setDetails(null)
      setError(null)
    }
  }, [isOpen, mediaItem])

  const fetchImageBaseUrl = async () => {
    try {
      const res = await fetch('/api/tmdb/config')
      const data = await res.json()
      setImageBaseUrl(data.imageBaseUrl)
    } catch (err) {
      console.error('Error loading TMDB config:', err)
    }
  }

  const fetchDetails = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/tmdb/details?tmdb_id=${mediaItem.tmdb_id}&tmdb_type=${mediaItem.tmdb_type}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch details')
      }
      const data = await response.json()
      setDetails(data)
    } catch (err) {
      console.error('Error fetching details:', err)
      setError('Failed to load details')
    } finally {
      setIsLoading(false)
    }
  }

  const reloadStatuses = async (itemId) => {
    try {
      const response = await fetch(`/api/media/${itemId}/status`)
      if (response.ok) {
        const statuses = await response.json()
        setUserStatuses(statuses)
      }
    } catch (err) {
      console.error('Error reloading statuses:', err)
    }
  }

  const updateStatus = async (watchStatus, seen) => {
    if (!currentUser) return
    
    setIsUpdating(true)
    
    try {
      let finalItemId = null
      
      // If item doesn't exist yet, add it first
      if (isSearchResult && !itemExists) {
        const tmdbId = mediaItem.tmdb_id || mediaItem.id
        const statusToSet = watchStatus !== undefined ? watchStatus : null
        const seenToSet = seen !== undefined ? seen : false
        
         // Add the item to the list
         const addResponse = await fetch('/api/media', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             title: mediaItem.title,
             type: mediaItem.type,
             tmdb_id: tmdbId,
             tmdb_type: mediaItem.tmdb_type,
             poster_path: mediaItem.poster_path,
             release_date: mediaItem.release_date,
             overview: mediaItem.overview,
             rating: mediaItem.rating,
             runtime: details?.runtime || mediaItem?.runtime || null
           })
         })
        
        if (addResponse.status === 409) {
          // Item already exists (race condition), get the existing item
          const errorData = await addResponse.json()
          finalItemId = errorData.existingItem?.id
        } else if (addResponse.ok) {
          const newItem = await addResponse.json()
          finalItemId = newItem.id
        } else {
          throw new Error('Failed to add media item')
        }
        
        // Set status on the item (newly added or existing)
        // Always update status, even if null (to clear it)
        if (finalItemId) {
          await fetch(`/api/media/${finalItemId}/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              userId: currentUser.id,
              watchStatus: statusToSet, // Can be null to clear status
              seen: seenToSet ? 1 : 0
            })
          })
        }
        
        // Update existingItemId so modal knows item exists now
        if (finalItemId) {
          setExistingItemId(finalItemId)
          // Reload statuses to update UI
          await reloadStatuses(finalItemId)
        }
        
        // Refresh the main list but keep modal open
        if (onStatusUpdate) {
          onStatusUpdate()
        }
        return
      }
      
      // Item exists, update status in database
      const itemId = existingItemId || mediaItem?.id
      if (!itemId) {
        throw new Error('Item ID not found')
      }
      
      // Handle null watchStatus (clearing status)
      const statusToSet = watchStatus !== undefined ? watchStatus : (currentUserStatus?.watch_status || null)
      const seenToSet = seen !== undefined ? (seen ? 1 : 0) : (currentUserStatus?.seen || 0)
      
      await fetch(`/api/media/${itemId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          watchStatus: statusToSet, // Can be null to clear status
          seen: seenToSet
        })
      })
      
      // Reload statuses to update UI without closing modal
      await reloadStatuses(itemId)
      
      // Refresh the main list but keep modal open
      if (onStatusUpdate) {
        onStatusUpdate()
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatRuntime = (minutes) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatCurrency = (amount) => {
    if (!amount) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
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

  if (!isOpen) return null

  const displayData = details || mediaItem
  const posterUrl = displayData?.poster_path && imageBaseUrl 
    ? `${imageBaseUrl}${displayData.poster_path}` 
    : null
  const backdropUrl = displayData?.backdrop_path && imageBaseUrl
    ? `${imageBaseUrl.replace('w500', 'w1280')}${displayData.backdrop_path}`
    : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop image header */}
          {backdropUrl && (
            <div className="relative h-64 sm:h-80 bg-gray-900">
              <img
                src={backdropUrl}
                alt={displayData?.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row">
              {/* Poster */}
              {posterUrl && (
                <div className="flex-shrink-0 sm:w-64">
                  <img
                    src={posterUrl}
                    alt={displayData?.title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              {/* Details */}
              <div className="flex-1 p-6">
                {isLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Loading details...</p>
                  </div>
                )}

                {error && (
                  <div className="text-center py-8">
                    <p className="text-red-500 dark:text-red-400">{error}</p>
                  </div>
                )}

                {!isLoading && !error && displayData && (
                  <>
                    {/* Title and basic info */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{displayData.title}</h2>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded dark:bg-indigo-900 dark:text-indigo-300">
                          {getTypeLabel(displayData.type || mediaItem?.type)}
                        </span>
                      </div>

                      {displayData.tagline && (
                        <p className="text-lg text-gray-600 dark:text-gray-400 italic mb-2">"{displayData.tagline}"</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {displayData.release_date && (
                          <span>📅 {formatDate(displayData.release_date)}</span>
                        )}
                        {displayData.rating && (
                          <span className="flex items-center gap-1">
                            ⭐ {displayData.rating.toFixed(1)}/10
                            {displayData.vote_count && (
                              <span className="text-gray-500 dark:text-gray-500">({displayData.vote_count.toLocaleString()} votes)</span>
                            )}
                          </span>
                        )}
                        {displayData.runtime && (
                          <span>⏱️ {formatRuntime(displayData.runtime)}</span>
                        )}
                        {displayData.number_of_seasons && (
                          <span>📺 {displayData.number_of_seasons} {displayData.number_of_seasons === 1 ? 'season' : 'seasons'}</span>
                        )}
                        {displayData.number_of_episodes && (
                          <span>• {displayData.number_of_episodes} episodes</span>
                        )}
                      </div>
                    </div>

                    {/* Genres */}
                    {displayData.genres && displayData.genres.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {displayData.genres.map(genre => (
                            <span
                              key={genre.id}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded dark:bg-gray-700 dark:text-gray-300"
                            >
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overview */}
                    {displayData.overview && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Overview</h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{displayData.overview}</p>
                      </div>
                    )}

                    {/* Additional details */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {displayData.status && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Status: </span>
                          <span className="text-gray-600 dark:text-gray-400">{displayData.status}</span>
                        </div>
                      )}
                      {displayData.budget && displayData.budget > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Budget: </span>
                          <span className="text-gray-600 dark:text-gray-400">{formatCurrency(displayData.budget)}</span>
                        </div>
                      )}
                      {displayData.revenue && displayData.revenue > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Revenue: </span>
                          <span className="text-gray-600 dark:text-gray-400">{formatCurrency(displayData.revenue)}</span>
                        </div>
                      )}
                      {displayData.production_countries && displayData.production_countries.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Country: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {displayData.production_countries.map(c => c.name).join(', ')}
                          </span>
                        </div>
                      )}
                      {displayData.spoken_languages && displayData.spoken_languages.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Languages: </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {displayData.spoken_languages.map(l => l.name).join(', ')}
                          </span>
                        </div>
                      )}
                      {displayData.imdb_id && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">IMDb: </span>
                          <a
                            href={`https://www.imdb.com/title/${displayData.imdb_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            View on IMDb
                          </a>
                        </div>
                      )}
                      {displayData.homepage && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Website: </span>
                          <a
                            href={displayData.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 truncate block"
                          >
                            Official Site
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Cast */}
                    {displayData.cast && displayData.cast.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Cast</h3>
                        <div className="flex flex-wrap gap-2">
                          {displayData.cast.map((actor, idx) => (
                            <span
                              key={idx}
                              className="text-sm text-gray-600 dark:text-gray-400"
                            >
                              {actor.name}
                              {idx < displayData.cast.length - 1 && ','}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Crew */}
                    {displayData.crew && displayData.crew.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Key Crew</h3>
                        <div className="space-y-1">
                          {displayData.crew.map((member, idx) => (
                            <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">{member.name}</span>
                              {' - '}
                              <span>{member.job}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Production Companies */}
                    {displayData.production_companies && displayData.production_companies.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Production</h3>
                        <div className="flex flex-wrap gap-2">
                          {displayData.production_companies.map(company => (
                            <span
                              key={company.id}
                              className="text-sm text-gray-600 dark:text-gray-400"
                            >
                              {company.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User Statuses */}
                    {userStatuses.filter(s => s.watch_status || s.seen === 1).length > 0 && (
                      <div className="mb-4 pt-4 border-t dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">User Statuses</h3>
                        <div className="space-y-2">
                          {userStatuses
                            .filter(s => s.watch_status || s.seen === 1)
                            .map(status => (
                              <div key={status.user_id} className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status.username}:</span>
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
                        </div>
                    )}
                    
                    {/* Action buttons - same UI for both search results and existing items */}
                    <div className="pt-4 border-t dark:border-gray-700">
                      {currentUser && (
                        <div className="space-y-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Your Status:</span>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  const newStatus = currentUserStatus?.watch_status === 'want_to_watch' ? null : 'want_to_watch'
                                  updateStatus(newStatus, undefined)
                                }}
                                disabled={isUpdating}
                                className={`px-4 py-2 text-sm rounded transition ${
                                  currentUserStatus?.watch_status === 'want_to_watch'
                                    ? 'bg-green-600 text-white dark:bg-green-700'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700'
                                } disabled:opacity-50`}
                              >
                                Want to Watch
                              </button>
                              <button
                                onClick={() => {
                                  const newStatus = currentUserStatus?.watch_status === 'dont_want_to_watch' ? null : 'dont_want_to_watch'
                                  updateStatus(newStatus, undefined)
                                }}
                                disabled={isUpdating}
                                className={`px-4 py-2 text-sm rounded transition ${
                                  currentUserStatus?.watch_status === 'dont_want_to_watch'
                                    ? 'bg-red-600 text-white dark:bg-red-700'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700'
                                } disabled:opacity-50`}
                              >
                                Don't Want
                              </button>
                              <button
                                onClick={() => {
                                  const newStatus = currentUserStatus?.watch_status === 'undecided' ? null : 'undecided'
                                  updateStatus(newStatus, undefined)
                                }}
                                disabled={isUpdating}
                                className={`px-4 py-2 text-sm rounded transition ${
                                  currentUserStatus?.watch_status === 'undecided'
                                    ? 'bg-yellow-600 text-white dark:bg-yellow-700'
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-700'
                                } disabled:opacity-50`}
                              >
                                Undecided
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentUserStatus?.seen === 1}
                                onChange={(e) => updateStatus(undefined, e.target.checked)}
                                disabled={isUpdating}
                                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Seen</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                 )}
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
  )
}

export default MediaDetailsModal

