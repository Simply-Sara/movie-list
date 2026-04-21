import { useState, useEffect } from 'react'
import MediaDetailsModal from './MediaDetailsModal'

function AddMediaForm({ onAdd, onCancel, currentUser, users }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageBaseUrl, setImageBaseUrl] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)
  const [existingItem, setExistingItem] = useState(null)
  const [existingStatuses, setExistingStatuses] = useState([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    // Get TMDB image base URL
    fetch('/api/tmdb/config')
      .then(res => res.json())
      .then(data => setImageBaseUrl(data.imageBaseUrl))
      .catch(err => console.error('Error loading TMDB config:', err))
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch()
      } else {
        setSearchResults([])
      }
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const performSearch = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data)
    } catch (err) {
      console.error('Error searching TMDB:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = async (result) => {
    // Map search result to format expected by modal
    const modalItem = {
      ...result,
      tmdb_id: result.id, // Search results use 'id', modal expects 'tmdb_id'
      tmdb_type: result.tmdb_type // This should already be 'movie' or 'tv'
    }
    setSelectedResult(modalItem)
    
    // Check if item already exists
    if (modalItem.tmdb_id && modalItem.tmdb_type) {
      try {
        const response = await fetch(
          `/api/media/by-tmdb?tmdb_id=${modalItem.tmdb_id}&tmdb_type=${modalItem.tmdb_type}`
        )
        if (response.ok) {
          const data = await response.json()
          if (data) {
            // Item exists
            setExistingItem(data)
            setExistingStatuses(data.userStatuses || [])
          } else {
            // Item doesn't exist
            setExistingItem(null)
            setExistingStatuses([])
          }
        }
      } catch (err) {
        console.error('Error checking if item exists:', err)
        setExistingItem(null)
        setExistingStatuses([])
      }
    }
    
    setShowDetailsModal(true)
  }

  const handleAddToList = async (result, statusData) => {
    // This function is now only used to close the modal and refresh
    // The actual adding/updating is handled in the modal's updateStatus function
    setSearchQuery('')
    setSearchResults([])
    setShowDetailsModal(false)
    setSelectedResult(null)
    setExistingItem(null)
    setExistingStatuses([])
    onAdd()
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.getFullYear()
  }

  const getTypeLabel = (type) => {
    const labels = {
      movie: 'Movie',
      tv_show: 'TV Show',
      anime: 'Anime'
    }
    return labels[type] || type
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Add New Media</h3>
      
      <div className="space-y-4 mb-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search TMDB
          </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              placeholder="Search for movies, TV shows, or anime..."
              autoFocus
            />
          {isSearching && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Searching...</p>
          )}
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="mb-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="p-2 space-y-2">
            {searchResults.map((result) => (
              <button
                key={`${result.tmdb_type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition text-left disabled:opacity-50"
              >
                {result.poster_path && (
                  <img
                    src={`${imageBaseUrl}${result.poster_path}`}
                    alt={result.title}
                    className="w-16 h-24 object-cover rounded flex-shrink-0"
                  />
                )}
                {!result.poster_path && (
                  <div className="w-16 h-24 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500 text-xs">No Image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{result.title}</h4>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded flex-shrink-0 dark:bg-indigo-900 dark:text-indigo-300">
                      {getTypeLabel(result.type)}
                    </span>
                  </div>
                  {result.release_date && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(result.release_date)}</p>
                  )}
                  {result.rating && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">⭐ {result.rating.toFixed(1)}</p>
                  )}
                  {result.overview && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">{result.overview}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>

      {selectedResult && (
        <MediaDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedResult(null)
            setExistingItem(null)
            setExistingStatuses([])
          }}
          mediaItem={existingItem || selectedResult}
          isSearchResult={true}
          existingItemId={existingItem?.id}
          currentUser={currentUser}
          users={users}
          userStatuses={existingStatuses}
          onAddToList={handleAddToList}
          onStatusUpdate={async () => {
            // Reload the item to get updated statuses if it was just added
            if (selectedResult.tmdb_id && selectedResult.tmdb_type) {
              try {
                const response = await fetch(
                  `/api/media/by-tmdb?tmdb_id=${selectedResult.tmdb_id}&tmdb_type=${selectedResult.tmdb_type}`
                )
                if (response.ok) {
                  const data = await response.json()
                  if (data) {
                    setExistingItem(data)
                    setExistingStatuses(data.userStatuses || [])
                  }
                }
              } catch (err) {
                console.error('Error reloading item:', err)
              }
            }
            onAdd()
          }}
        />
      )}
    </div>
  )
}

export default AddMediaForm
