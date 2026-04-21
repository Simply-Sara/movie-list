import { useState, useEffect } from 'react';
import DarkModeToggle from '../components/DarkModeToggle'
import { useDarkModeContext } from '../contexts/DarkModeContext'

function Profile({ currentUser, users, onLogout }) {
  const { darkMode, setDarkMode } = useDarkModeContext()
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [appearanceMode, setAppearanceMode] = useState(darkMode)

  // Sync local appearance state when darkMode changes (e.g., from header toggle)
  useEffect(() => {
    setAppearanceMode(darkMode)
  }, [darkMode])

  useEffect(() => {
    loadProfile();
  }, [currentUser]);

  const loadProfile = () => {
    if (!currentUser) return;
    
    setLoading(true);
    fetch(`/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setUsername(data.username);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
        setLoading(false);
      });
  };

  const handleAppearanceChange = (e) => {
    const value = e.target.value
    setAppearanceMode(value)
    setDarkMode(value)
  }

  const handleUsernameUpdate = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    fetch(`/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ username: username.trim() })
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => Promise.reject(err));
        return res.json();
      })
      .then(data => {
        setSuccess('Profile updated successfully');
        // Update currentUser in context
        window.dispatchEvent(new CustomEvent('user-updated', { 
          detail: { id: data.id, username: data.username } 
        }));
        setUsername(data.username);
      })
      .catch(err => {
        setError(err.error || 'Failed to update profile');
      });
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    fetch(`/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword
      })
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => Promise.reject(err));
        return res.json();
      })
      .then(data => {
        setSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      })
      .catch(err => {
        setError(err.error || 'Failed to update password');
      });
  };

  if (!currentUser) {
    return <div>Please log in to view your profile</div>;
  }

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white shadow-sm border-b dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your account settings</p>
            </div>
            <div className="flex items-center gap-3">
              <DarkModeToggle size="md" />
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/30 dark:border-green-700">
              <p className="text-green-800 dark:text-green-300">{success}</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/30 dark:border-red-700">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Appearance Settings Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme Mode</p>
                  <div className="flex flex-wrap gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${
                      appearanceMode === 'light'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:bg-gray-700'
                    }`}>
                      <input
                        type="radio"
                        name="appearance-mode"
                        value="light"
                        checked={appearanceMode === 'light'}
                        onChange={handleAppearanceChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${
                      appearanceMode === 'dark'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:bg-gray-700'
                    }`}>
                      <input
                        type="radio"
                        name="appearance-mode"
                        value="dark"
                        checked={appearanceMode === 'dark'}
                        onChange={handleAppearanceChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${
                      appearanceMode === 'system'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:bg-gray-700'
                    }`}>
                      <input
                        type="radio"
                        name="appearance-mode"
                        value="system"
                        checked={appearanceMode === 'system'}
                        onChange={handleAppearanceChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-gray-600"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System (auto)</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    System mode follows your operating system's theme preference.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Profile Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Profile Information</h2>
            <form onSubmit={handleUsernameUpdate} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  defaultValue={profile?.username || ''}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-900"
              >
                Update Username
              </button>
            </form>
          </section>

          {/* Password Change */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Enter new password (min 12 chars, 1 letter + 1 number)"
                />
              </div>
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-900"
              >
                Change Password
              </button>
            </form>
          </section>
        </main>
      </div>
  );
}

export default Profile;