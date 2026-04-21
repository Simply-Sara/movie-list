import { useState, useEffect } from 'react'
import MediaList from './MediaList'
import AddMediaForm from './AddMediaForm'
import FilterPanel from './FilterPanel'
import QueuePage from './QueuePage'
import DarkModeToggle from './DarkModeToggle'

function Dashboard({ currentUser, users, onLogout }) {
  const [mediaItems, setMediaItems] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [filteredItems, setFilteredItems] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState('list') // 'list' or 'queue'

  useEffect(() => {
    loadMediaItems()
  }, [])

  const loadMediaItems = () => {
    fetch('/api/media')
      .then(res => res.json())
      .then(data => setMediaItems(data))
      .catch(err => console.error('Error loading media:', err))
  }

  const handleFilter = (userIds, watchStatus) => {
    if (userIds.length === 0) {
      setFilteredItems(null)
      return
    }

    fetch('/api/media/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ userIds, watchStatus })
    })
      .then(res => res.json())
      .then(data => setFilteredItems(data))
      .catch(err => console.error('Error filtering media:', err))
  }

  const displayItems = filteredItems !== null ? filteredItems : mediaItems

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white shadow-sm border-b dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movie List</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {currentUser.username}!</p>
            </div>
            <div className="flex gap-3 items-center">
              <DarkModeToggle size="md" />
              <a
                href="/profile"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Profile
              </a>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        {/* Navigation tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveView('list')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition ${
                activeView === 'list'
                  ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 dark:bg-gray-800 dark:text-indigo-400 dark:border-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              All Media
            </button>
            <button
              onClick={() => setActiveView('queue')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg transition ${
                activeView === 'queue'
                  ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 dark:bg-gray-800 dark:text-indigo-400 dark:border-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              Queue
            </button>
          </div>
        </div>
      </header>

      {activeView === 'queue' ? (
        <QueuePage
          currentUser={currentUser}
          onStatusUpdate={loadMediaItems}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {filteredItems !== null 
                ? `Filtered Results (${filteredItems.length} items)`
                : `All Media (${mediaItems.length} items)`
              }
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-900"
            >
              {showAddForm ? 'Cancel' : '+ Add Media'}
            </button>
          </div>

          {showAddForm && (
            <div className="mb-6">
              <AddMediaForm 
                onAdd={loadMediaItems} 
                onCancel={() => setShowAddForm(false)}
                currentUser={currentUser}
                users={users}
              />
            </div>
          )}

          <div className="mb-6">
            <FilterPanel
              users={users}
              currentUser={currentUser}
              selectedUsers={selectedUsers}
              onSelectedUsersChange={(userIds) => {
                setSelectedUsers(userIds)
                handleFilter(userIds, null)
              }}
              onWatchStatusFilter={(status) => {
                handleFilter(selectedUsers, status)
              }}
              onClearFilter={() => {
                setSelectedUsers([])
                setFilteredItems(null)
              }}
            />
          </div>

          <MediaList
            items={displayItems}
            currentUser={currentUser}
            users={users}
            onStatusUpdate={loadMediaItems}
          />
        </main>
      )}
    </div>
  )
}

export default Dashboard

