import { useState } from 'react'

function FilterPanel({ users, currentUser, selectedUsers, onSelectedUsersChange, onWatchStatusFilter, onClearFilter }) {
  const [watchStatusFilter, setWatchStatusFilter] = useState('')

  const handleUserToggle = (userId) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId]
    onSelectedUsersChange(newSelection)
  }

  const handleWatchStatusChange = (status) => {
    setWatchStatusFilter(status)
    onWatchStatusFilter(status || null)
  }

  const handleClear = () => {
    setWatchStatusFilter('')
    onClearFilter()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Filter by Users</h3>
        {(selectedUsers.length > 0 || watchStatusFilter) && (
          <button
            onClick={handleClear}
            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select users to find common items:</p>
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

        {selectedUsers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by watch status:</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleWatchStatusChange('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !watchStatusFilter
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All
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
                className={`px-4 py-1 rounded-lg text-sm font-medium transition ${
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

        {selectedUsers.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing items that all selected users have in common
            {watchStatusFilter && ` with status: ${watchStatusFilter === 'want_to_watch' ? 'Want to Watch' : 'Undecided'}`}
          </p>
        )}
      </div>
    </div>
  )
}

export default FilterPanel

