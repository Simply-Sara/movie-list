import { useState } from 'react'
import { GENRES } from '../utils/genres'

function FilterPanel({
  users,
  currentUser,
  selectedUsers,
  onSelectedUsersChange,
  watchStatusFilter,
  onWatchStatusFilter,
  typeFilter,
  onTypeFilterChange,
  selectedGenres,
  onGenresChange,
  runtimeRange,
  onRuntimeRangeChange,
  onClearFilter
}) {
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)

  const handleUserToggle = (userId) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId]
    onSelectedUsersChange(newSelection)
  }

  const handleWatchStatusChange = (status) => {
    onWatchStatusFilter(status || null)
  }

  const handleTypeChange = (type) => {
    onTypeFilterChange(type || null)
  }

  const handleGenreToggle = (genreName) => {
    const newGenres = selectedGenres.includes(genreName)
      ? selectedGenres.filter(g => g !== genreName)
      : [...selectedGenres, genreName]
    onGenresChange(newGenres)
  }

  const handleRuntimeChange = (field, value) => {
    const newRange = { ...runtimeRange, [field]: value }
    onRuntimeRangeChange(newRange)
  }

  const handleClear = () => {
    onSelectedUsersChange([])
    onWatchStatusFilter(null)
    onTypeFilterChange(null)
    onGenresChange([])
    onRuntimeRangeChange({ min: '', max: '' })
    onClearFilter()
  }

  const hasActiveFilters = selectedUsers.length > 0 || watchStatusFilter || typeFilter || selectedGenres.length > 0 || runtimeRange.min || runtimeRange.max

  const removeGenre = (genre) => {
    onGenresChange(selectedGenres.filter(g => g !== genre))
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'movie': return 'Movies'
      case 'tv_show': return 'TV Shows'
      default: return 'All'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* User Filter Section */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Find media common to:</p>
          <div className="flex flex-wrap gap-2">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserToggle(user.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedUsers.includes(user.id)
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {user.username}
                {user.id === currentUser.id && ' (You)'}
              </button>
            ))}
          </div>
        </div>

        {/* Watch Status Filter (only when users selected) */}
        {selectedUsers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Watch status:</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleWatchStatusChange('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !watchStatusFilter
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Any Status
              </button>
              <button
                onClick={() => handleWatchStatusChange('want_to_watch')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  watchStatusFilter === 'want_to_watch'
                    ? 'bg-green-600 text-white dark:bg-green-700'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700'
                }`}
              >
                Want to Watch
              </button>
              <button
                onClick={() => handleWatchStatusChange('undecided')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  watchStatusFilter === 'undecided'
                    ? 'bg-yellow-600 text-white dark:bg-yellow-700'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-700'
                }`}
              >
                Undecided
              </button>
            </div>
          </div>
        )}

        {/* Type Filter */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Media type:</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleTypeChange(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                !typeFilter
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleTypeChange('movie')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                typeFilter === 'movie'
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => handleTypeChange('tv_show')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                typeFilter === 'tv_show'
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              TV Shows
            </button>
          </div>
        </div>

        {/* Genre Filter */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Genres (AND logic):</p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGenreDropdown(!showGenreDropdown)}
              className="w-full px-4 py-2 text-left bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-between"
            >
              {selectedGenres.length > 0
                ? `${selectedGenres.length} genre${selectedGenres.length > 1 ? 's' : ''} selected`
                : 'Select genres...'}
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showGenreDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {GENRES.map(genre => (
                  <label
                    key={genre.id}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre.name)}
                      onChange={() => handleGenreToggle(genre.name)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{genre.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected genre tags */}
          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedGenres.map(genre => (
                <span
                  key={genre}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                >
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-700"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Runtime Range Filter */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Runtime (minutes):</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Min</label>
              <input
                type="number"
                min="0"
                value={runtimeRange.min}
                onChange={(e) => handleRuntimeChange('min', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max</label>
              <input
                type="number"
                min="0"
                value={runtimeRange.max}
                onChange={(e) => handleRuntimeChange('max', e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Active filters:
              {selectedUsers.length > 0 && ` • Users: ${selectedUsers.map(id => users.find(u => u.id === id)?.username).join(', ')}`}
              {watchStatusFilter && ` • Status: ${watchStatusFilter === 'want_to_watch' ? 'Want to Watch' : 'Undecided'}`}
              {typeFilter && ` • Type: ${getTypeLabel(typeFilter)}`}
              {selectedGenres.length > 0 && ` • Genres: ${selectedGenres.join(', ')}`}
              {(runtimeRange.min || runtimeRange.max) && ` • Runtime: ${runtimeRange.min || '0'} - ${runtimeRange.max || '∞'} min`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FilterPanel
