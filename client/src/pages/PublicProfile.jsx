import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MediaList from '../components/MediaList';
import SettingsPopup from '../components/SettingsPopup';
import AppHeader from '../components/AppHeader';
import Footer from '../components/Footer';
import { formatWatchTime } from '../utils/format';

function PublicProfile({ currentUser, users, onLogout }) {
  const { username } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch profile data
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/username/${encodeURIComponent(username)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('not-found');
        } else {
          throw new Error('Failed to fetch profile');
        }
        return;
      }
      const data = await res.json();
      setProfile(data);

      // Canonicalize URL if username case differs
      if (data.username !== username) {
        navigate(`/users/${data.username}`, { replace: true });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  // Handle status updates from MediaList (propagated from MediaItem)
  const handleStatusUpdate = () => {
    fetchProfile();
  };

  // Filter media locally based on selected tab
  const filteredMedia = (profile?.media || []).filter((item) => {
    if (mediaFilter === 'all') return true;
    if (mediaFilter === 'watched') return item.seen === 1;
    if (mediaFilter === 'want_to_watch') return item.watch_status === 'want_to_watch';
    if (mediaFilter === 'undecided') return item.watch_status === 'undecided';
    return true;
  });

  const isOwner = currentUser && currentUser.id === profile?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">User not found</h1>
          <p className="text-gray-600 dark:text-gray-400">This profile may have been removed or is private.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-gray-600 dark:text-gray-400">Unable to load profile. Please try again later.</p>
          <button onClick={fetchProfile} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const stats = profile.stats || {};
  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        activeView={null}
        showViewSwitcher
        onViewChange={(view) => {
          if (view === 'list') {
            navigate('/dashboard');
          } else if (view === 'queue') {
            navigate('/dashboard?view=queue');
          }
        }}
      />

      {/* Main content area */}
      <div className="flex-grow">
        {/* Profile Header */}
        <header className="bg-white shadow-sm border-b dark:bg-gray-800 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.username}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Joined {joinDate}</p>
                {profile.about_me && (
                  <p className="mt-3 text-gray-700 dark:text-gray-300 max-w-2xl">{profile.about_me}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isOwner && currentUser && (
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    aria-label="Settings"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </span>
                  </button>
                )}
                {currentUser && (
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_media || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Media</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatWatchTime(stats.total_watch_time_minutes)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Watch Time</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.watched || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Watched</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.want_to_watch || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Want to Watch</div>
            </div>
          </div>

          {/* Media section with filter tabs */}
          <div>
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4" aria-label="Media filters">
                  {['all', 'watched', 'want_to_watch', 'undecided'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMediaFilter(filter)}
                      className={`py-3 px-1 text-sm font-medium border-b-2 transition ${
                        mediaFilter === filter
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter === 'watched' ? 'Watched' : filter === 'want_to_watch' ? 'Want to Watch' : 'Undecided'}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Media grid */}
            {filteredMedia.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No media found for this filter.
              </div>
            ) : (
              <MediaList
                items={filteredMedia}
                currentUser={currentUser}
                users={users}
                onStatusUpdate={handleStatusUpdate}
              />
            )}
          </div>
        </main>

        {/* Settings Popup */}
        <SettingsPopup
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentUser={currentUser}
          onUserUpdated={() => {
            // Refetch profile to get updated data and canonicalize URL if needed
            fetchProfile();
          }}
        />
      </div>

      <Footer />
    </div>
  )
}

export default PublicProfile;
