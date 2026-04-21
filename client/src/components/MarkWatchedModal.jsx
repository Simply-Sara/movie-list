import { useState, useEffect } from 'react'

function MarkWatchedModal({ isOpen, onClose, users, userStatuses, mediaId, onConfirm }) {
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pre-select users with "want_to_watch" status
      const wantToWatchUserIds = userStatuses
        .filter(s => s.watch_status === 'want_to_watch')
        .map(s => s.user_id)
      setSelectedUserIds(wantToWatchUserIds)
    }
  }, [isOpen, userStatuses])

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleConfirm = () => {
    if (selectedUserIds.length === 0) {
      alert('Please select at least one person')
      return
    }

    setIsSubmitting(true)
    fetch(`/api/media/${mediaId}/mark-watched`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ userIds: selectedUserIds })
    })
      .then(() => {
        onConfirm()
        onClose()
      })
      .catch(err => {
        console.error('Error marking as watched:', err)
        alert('Failed to mark as watched')
      })
      .finally(() => setIsSubmitting(false))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mark as Watched</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select who watched this</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {users.map(user => {
              const isSelected = selectedUserIds.includes(user.id)
              const userStatus = userStatuses.find(s => s.user_id === user.id)
              const hasWantToWatch = userStatus?.watch_status === 'want_to_watch'
              
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleUser(user.id)}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                      {hasWantToWatch && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded dark:bg-green-800 dark:text-green-300">
                          Want to Watch
                        </span>
                      )}
                      {userStatus?.seen === 1 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded dark:bg-blue-800 dark:text-blue-300">
                          Already Seen
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || selectedUserIds.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {isSubmitting ? 'Marking...' : `Mark Watched (${selectedUserIds.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MarkWatchedModal

