import { useState, useEffect } from 'react'

function QueuePage({ currentUser, onStatusUpdate }) {
  const [queueItems, setQueueItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [imageBaseUrl, setImageBaseUrl] = useState('')
  const [currentItem, setCurrentItem] = useState(null)
  const [currentItemStatuses, setCurrentItemStatuses] = useState([])
  const [details, setDetails] = useState(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState(null)

  useEffect(() => {
    fetchImageBaseUrl()
    loadQueue()
  }, [currentUser])

  const fetchImageBaseUrl = async () => {
    try {
      const res = await fetch('/api/tmdb/config')
      const data = await res.json()
      setImageBaseUrl(data.imageBaseUrl)
    } catch (err) {
      console.error('Error loading TMDB config:', err)
    }
  }

  const loadQueue = async () => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/queue/${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setQueueItems(data)
        setCurrentIndex(0)
      } else {
        console.error('Error loading queue')
      }
    } catch (err) {
      console.error('Error loading queue:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadItemStatuses = async (itemId) => {
    try {
      const response = await fetch(`/api/media/${itemId}/status`)
      if (response.ok) {
        const statuses = await response.json()
        setCurrentItemStatuses(statuses)
      }
    } catch (err) {
      console.error('Error loading statuses:', err)
    }
  }

  useEffect(() => {
    if (queueItems.length > 0 && currentIndex < queueItems.length) {
      const item = queueItems[currentIndex]
      setCurrentItem(item)
      loadItemStatuses(item.id)
      if (item.tmdb_id && item.tmdb_type) {
        fetchDetails(item)
      } else {
        setDetails(null)
        setDetailsError(null)
      }
    } else {
      setCurrentItem(null)
      setCurrentItemStatuses([])
      setDetails(null)
      setDetailsError(null)
    }
  }, [queueItems, currentIndex])

  const fetchDetails = async (item) => {
    setIsLoadingDetails(true)
    setDetailsError(null)
    try {
      const response = await fetch(
        `/api/tmdb/details?tmdb_id=${item.tmdb_id}&tmdb_type=${item.tmdb_type}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch details')
      }
      const data = await response.json()
      setDetails(data)
    } catch (err) {
      console.error('Error fetching details:', err)
      setDetailsError('Failed to load details')
    } finally {
      setIsLoadingDetails(false)
    }
  }

   const handleSkip = async () => {
     if (!currentUser || !currentItem) return

     try {
       const response = await fetch(`/api/queue/${currentUser.id}/skip`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('token')}`
         },
         body: JSON.stringify({ mediaId: currentItem.id })
       })
      
      if (response.ok) {
        // Move to next item
        if (currentIndex < queueItems.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          // No more items, reload queue to see if there are more
          await loadQueue()
        }
      } else {
        alert('Failed to skip item')
      }
    } catch (err) {
      console.error('Error skipping item:', err)
      alert('Failed to skip item')
    }
  }

  const handleStatusUpdate = async () => {
    // Reload queue to get updated list
    await loadQueue()
    if (onStatusUpdate) {
      onStatusUpdate()
    }
  }

  const handleNext = () => {
    if (currentIndex < queueItems.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // At the end, reload queue to see if there are more items
      loadQueue()
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!currentItem) return

    try {
      await fetch(`/api/media/${currentItem.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser.id,
          watchStatus: newStatus
        })
      })
      
      // Reload statuses to update UI
      await loadItemStatuses(currentItem.id)
      
      // Move to next item (or reload queue if at end)
      if (currentIndex < queueItems.length - 1) {
        // Move to next item first
        setCurrentIndex(currentIndex + 1)
        // Then reload queue in background to update the list
        handleStatusUpdate()
      } else {
        // At the end, reload queue which will reset to index 0
        await handleStatusUpdate()
      }
      
      if (onStatusUpdate) {
        onStatusUpdate()
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading queue...</p>
      </div>
    )
  }

  if (queueItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Queue is Empty</h2>
          <p className="text-gray-600">Add items with "Want to Watch" status to see them here.</p>
        </div>
      </div>
    )
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
      want_to_watch: 'bg-green-100 text-green-800',
      dont_want_to_watch: 'bg-red-100 text-red-800',
      undecided: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const labels = {
      want_to_watch: 'Want to Watch',
      dont_want_to_watch: "Don't Want to Watch",
      undecided: 'Undecided'
    }
    return labels[status] || 'Not Set'
  }

  const displayData = details || currentItem
  const posterUrl = displayData?.poster_path && imageBaseUrl 
    ? `${imageBaseUrl}${displayData.poster_path}` 
    : null
  const backdropUrl = displayData?.backdrop_path && imageBaseUrl
    ? `${imageBaseUrl.replace('w500', 'w1280')}${displayData.backdrop_path}`
    : null
  const currentUserStatus = currentItemStatuses.find(s => s.user_id === currentUser?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with progress */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Queue</h1>
              <p className="text-sm text-gray-600">
                Item {currentIndex + 1} of {queueItems.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress bar */}
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / queueItems.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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

            {/* Content */}
            <div className="flex-1 p-6">
              {isLoadingDetails && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading details...</p>
                </div>
              )}

              {detailsError && (
                <div className="text-center py-8">
                  <p className="text-red-500">{detailsError}</p>
                </div>
              )}

              {!isLoadingDetails && !detailsError && displayData && (
                <>
                  {/* Title and basic info */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold text-gray-900">{displayData.title}</h2>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded">
                        {getTypeLabel(displayData.type || currentItem?.type)}
                      </span>
                    </div>

                    {displayData.tagline && (
                      <p className="text-lg text-gray-600 italic mb-2">"{displayData.tagline}"</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {displayData.release_date && (
                        <span>📅 {formatDate(displayData.release_date)}</span>
                      )}
                      {displayData.rating && (
                        <span className="flex items-center gap-1">
                          ⭐ {displayData.rating.toFixed(1)}/10
                          {displayData.vote_count && (
                            <span className="text-gray-500">({displayData.vote_count.toLocaleString()} votes)</span>
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
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded"
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
                      <p className="text-gray-700 leading-relaxed">{displayData.overview}</p>
                    </div>
                  )}

                  {/* Additional details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    {displayData.status && (
                      <div>
                        <span className="font-medium text-gray-700">Status: </span>
                        <span className="text-gray-600">{displayData.status}</span>
                      </div>
                    )}
                    {displayData.budget && displayData.budget > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Budget: </span>
                        <span className="text-gray-600">{formatCurrency(displayData.budget)}</span>
                      </div>
                    )}
                    {displayData.revenue && displayData.revenue > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Revenue: </span>
                        <span className="text-gray-600">{formatCurrency(displayData.revenue)}</span>
                      </div>
                    )}
                    {displayData.production_countries && displayData.production_countries.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Country: </span>
                        <span className="text-gray-600">
                          {displayData.production_countries.map(c => c.name).join(', ')}
                        </span>
                      </div>
                    )}
                    {displayData.spoken_languages && displayData.spoken_languages.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Languages: </span>
                        <span className="text-gray-600">
                          {displayData.spoken_languages.map(l => l.name).join(', ')}
                        </span>
                      </div>
                    )}
                    {displayData.imdb_id && (
                      <div>
                        <span className="font-medium text-gray-700">IMDb: </span>
                        <a
                          href={`https://www.imdb.com/title/${displayData.imdb_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          View on IMDb
                        </a>
                      </div>
                    )}
                    {displayData.homepage && (
                      <div>
                        <span className="font-medium text-gray-700">Website: </span>
                        <a
                          href={displayData.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 truncate block"
                        >
                          Official Site
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Cast */}
                  {displayData.cast && displayData.cast.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Cast</h3>
                      <div className="flex flex-wrap gap-2">
                        {displayData.cast.map((actor, idx) => (
                          <span
                            key={idx}
                            className="text-sm text-gray-600"
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Crew</h3>
                      <div className="space-y-1">
                        {displayData.crew.map((member, idx) => (
                          <div key={idx} className="text-sm text-gray-600">
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Production</h3>
                      <div className="flex flex-wrap gap-2">
                        {displayData.production_companies.map(company => (
                          <span
                            key={company.id}
                            className="text-sm text-gray-600"
                          >
                            {company.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User Statuses */}
                  {currentItemStatuses.filter(s => s.watch_status || s.seen === 1).length > 0 && (
                    <div className="mb-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">User Statuses</h3>
                      <div className="space-y-2">
                        {currentItemStatuses
                          .filter(s => s.watch_status || s.seen === 1)
                          .map(status => (
                            <div key={status.user_id} className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">{status.username}:</span>
                              {status.watch_status && (
                                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(status.watch_status)}`}>
                                  {getStatusLabel(status.watch_status)}
                                </span>
                              )}
                              {status.seen === 1 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                  Seen
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="space-y-4 pt-4 border-t">
                    {currentUser && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-3">Your Status:</span>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <button
                            onClick={() => handleStatusChange('want_to_watch')}
                            className={`px-4 py-2 text-sm rounded transition ${
                              currentUserStatus?.watch_status === 'want_to_watch'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            Want to Watch
                          </button>
                          <button
                            onClick={() => handleStatusChange('dont_want_to_watch')}
                            className={`px-4 py-2 text-sm rounded transition ${
                              currentUserStatus?.watch_status === 'dont_want_to_watch'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            Don't Want
                          </button>
                          <button
                            onClick={() => handleStatusChange('undecided')}
                            className={`px-4 py-2 text-sm rounded transition ${
                              currentUserStatus?.watch_status === 'undecided'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                          >
                            Undecided
                          </button>
                        </div>

                        <div className="mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentUserStatus?.seen === 1}
                                onChange={async (e) => {
                                  if (currentItem) {
                                    try {
                                      await fetch(`/api/media/${currentItem.id}/status`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        },
                                        body: JSON.stringify({
                                          userId: currentUser.id,
                                          watchStatus: currentUserStatus?.watch_status,
                                          seen: e.target.checked ? 1 : 0
                                        })
                                      })
                                      await loadItemStatuses(currentItem.id)
                                      if (onStatusUpdate) {
                                        onStatusUpdate()
                                      }
                                    } catch (err) {
                                      console.error('Error updating seen status:', err)
                                      alert('Failed to update status')
                                    }
                                  }
                                }}
                              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Mark as Seen</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={handleSkip}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                      >
                        Skip
                      </button>
                      {currentIndex > 0 && (
                        <button
                          onClick={handlePrevious}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                        >
                          Previous
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QueuePage

