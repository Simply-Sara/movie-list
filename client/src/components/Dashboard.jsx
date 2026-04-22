import { useState, useEffect } from 'react'
import MediaList from './MediaList'
import AddMediaForm from './AddMediaForm'
import FilterPanel from './FilterPanel'
import QueuePage from './QueuePage'
import AppHeader from './AppHeader'
import Footer from './Footer'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        activeView={activeView}
        onViewChange={setActiveView}
        showViewSwitcher
      />

      {/* Main content area */}
      <div className="flex-grow">
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

      <Footer />
    </div>
  )
}

export default Dashboard
