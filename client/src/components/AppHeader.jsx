import { Link } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

function AppHeader({ currentUser, onLogout, activeView, onViewChange, showViewSwitcher = false }) {
  return (
    <header className="bg-white shadow-sm border-b dark:bg-gray-800 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Welcome */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movie List</h1>
              {currentUser && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {currentUser.username}!</p>
              )}
            </div>

          {/* View Switcher (only on Dashboard) */}
          {showViewSwitcher && (
            <div className="flex gap-1 border-l pl-6">
              <button
                onClick={() => onViewChange?.('list')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeView === 'list'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                All Media
              </button>
              <button
                onClick={() => onViewChange?.('queue')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeView === 'queue'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Queue
              </button>
            </div>
          )}
          </div>

          {/* Right side controls */}
          <div className="flex gap-3 items-center">
            <DarkModeToggle size="md" />
            {currentUser ? (
              <>
                <Link
                  to={`/users/${currentUser.username}`}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Profile
                </Link>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
