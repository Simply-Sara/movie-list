import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import MediaList from './MediaList'
import AddMediaForm from './AddMediaForm'
import FilterPanel from './FilterPanel'
import QueuePage from './QueuePage'
import AppHeader from './AppHeader'
import Footer from './Footer'

function Dashboard({ currentUser, users, onLogout, pendingGroupInvitesCount }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mediaItems, setMediaItems] = useState([])
  const [filteredItems, setFilteredItems] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState(() => {
    const view = searchParams.get('view')
    return view === 'queue' ? 'queue' : 'list'
  })

  // Sync URL when activeView changes
  useEffect(() => {
    if (activeView === 'queue') {
      setSearchParams({ view: 'queue' })
    } else {
      setSearchParams({})
    }
  }, [activeView, setSearchParams])

  // Consolidated filter state
  const [filters, setFilters] = useState({
    userIds: [],
    watchStatus: null,
    type: null,
    genres: [],
    runtimeMin: '',
    runtimeMax: ''
  })

  useEffect(() => {
    loadMediaItems()
  }, [])

  const loadMediaItems = useCallback(() => {
    fetch('/api/media')
      .then(res => res.json())
      .then(data => setMediaItems(data))
      .catch(err => console.error('Error loading media:', err))
  }, [])

  const handleFilter = useCallback(() => {
    const body = {
      userIds: filters.userIds,
      watchStatus: filters.watchStatus || null,
      type: filters.type || null,
      genres: filters.genres.length > 0 ? filters.genres : null,
      runtimeMin: filters.runtimeMin || null,
      runtimeMax: filters.runtimeMax || null
    }

    fetch('/api/media/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => setFilteredItems(data))
      .catch(err => console.error('Error filtering media:', err))
  }, [filters])

  // Trigger filter whenever any filter changes
  useEffect(() => {
    handleFilter()
  }, [handleFilter])

  // Consolidated status update handler: reload media list and refresh filter if needed
  const handleStatusUpdate = useCallback(() => {
    loadMediaItems()
    if (filteredItems !== null) {
      handleFilter()
    }
  }, [loadMediaItems, handleFilter, filteredItems])

  // Individual filter setters that update state
  const setUserIds = (userIds) => {
    setFilters(prev => ({ ...prev, userIds }))
  }

  const setWatchStatus = (watchStatus) => {
    setFilters(prev => ({ ...prev, watchStatus }))
  }

  const setType = (type) => {
    setFilters(prev => ({ ...prev, type }))
  }

  const setGenres = (genres) => {
    setFilters(prev => ({ ...prev, genres }))
  }

  const setRuntimeRange = (runtimeRange) => {
    setFilters(prev => ({ ...prev, runtimeMin: runtimeRange.min, runtimeMax: runtimeRange.max }))
  }

  const handleClearAllFilters = () => {
    setFilters({
      userIds: [],
      watchStatus: null,
      type: null,
      genres: [],
      runtimeMin: '',
      runtimeMax: ''
    })
    setFilteredItems(null)
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
        pendingInvitesCount={pendingGroupInvitesCount}
      />

      {/* Main content area */}
      <div className="flex-grow">
         {activeView === 'queue' ? (
           <QueuePage
             currentUser={currentUser}
             onStatusUpdate={handleStatusUpdate}
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
                selectedUsers={filters.userIds}
                onSelectedUsersChange={setUserIds}
                watchStatusFilter={filters.watchStatus}
                onWatchStatusFilter={setWatchStatus}
                typeFilter={filters.type}
                onTypeFilterChange={setType}
                selectedGenres={filters.genres}
                onGenresChange={setGenres}
                runtimeRange={{ min: filters.runtimeMin, max: filters.runtimeMax }}
                onRuntimeRangeChange={setRuntimeRange}
                onClearFilter={handleClearAllFilters}
              />
            </div>

            <MediaList
              items={displayItems}
              currentUser={currentUser}
              users={users}
              onStatusUpdate={handleStatusUpdate}
            />
          </main>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default Dashboard
