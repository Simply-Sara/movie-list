import { useState, useEffect, useCallback } from 'react';
import { useDarkModeContext } from '../contexts/DarkModeContext';

function SettingsPopup({ isOpen, onClose, currentUser, onUserUpdated }) {
  const { darkMode, setDarkMode } = useDarkModeContext();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ username: '', about_me: '', profile_visibility: 'public' });

  // Section-specific states
  const [usernameValue, setUsernameValue] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [aboutMe, setAboutMe] = useState('');
  const [aboutMeError, setAboutMeError] = useState('');
  const [aboutMeSuccess, setAboutMeSuccess] = useState('');

  const [privacy, setPrivacy] = useState('public');
  const [privacyError, setPrivacyError] = useState('');
  const [privacySuccess, setPrivacySuccess] = useState('');

  const [appearanceMode, setAppearanceMode] = useState(darkMode);

  // Fetch profile on mount
  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    setAppearanceMode(darkMode);
  }, [darkMode]);

  const loadProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
      setUsernameValue(data.username || '');
      setAboutMe(data.about_me || '');
      setPrivacy(data.profile_visibility || 'public');
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppearanceChange = useCallback((e) => {
    const value = e.target.value;
    setAppearanceMode(value);
    setDarkMode(value);
  }, [setDarkMode]);

  const handleUsernameUpdate = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');
    const trimmed = usernameValue.trim();
    if (!trimmed) {
      setUsernameError('Username is required');
      return;
    }
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username: trimmed })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }
      setUsernameSuccess('Username updated successfully');
      setUsernameValue(data.username);
      if (onUserUpdated) {
        onUserUpdated({ id: data.id, username: data.username });
      }
      // Dispatch event for global sync
      window.dispatchEvent(new CustomEvent('user-updated', { detail: { id: data.id, username: data.username } }));
    } catch (err) {
      setUsernameError(err.message || 'Failed to update username');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    const { currentPassword, newPassword, confirmNewPassword } = passwordFields;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All password fields are required');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('New password must be at least 12 characters');
      return;
    }
    // Simple letter+number check
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setPasswordError('New password must contain at least one letter and one number');
      return;
    }
    try {
      const res = await fetch('/api/auth/change-password', {
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
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password change failed');
      }
      setPasswordSuccess('Password updated successfully');
      setPasswordFields({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  const handleAboutMeUpdate = async (e) => {
    e.preventDefault();
    setAboutMeError('');
    setAboutMeSuccess('');
    const trimmed = aboutMe.trim();
    if (trimmed.length > 500) {
      setAboutMeError('About me cannot exceed 500 characters');
      return;
    }
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ about_me: trimmed })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }
      setAboutMeSuccess('About me updated successfully');
      if (onUserUpdated) onUserUpdated(data);
    } catch (err) {
      setAboutMeError(err.message || 'Failed to update about me');
    }
  };

  const handlePrivacyUpdate = async (e) => {
    e.preventDefault();
    setPrivacyError('');
    setPrivacySuccess('');
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ profile_visibility: privacy })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }
      setPrivacySuccess('Privacy settings updated');
      if (onUserUpdated) onUserUpdated(data);
    } catch (err) {
      setPrivacyError(err.message || 'Failed to update privacy settings');
    }
  };

  if (!isOpen) return null;

  const aboutMeChars = aboutMe.length;
  const maxAboutMe = 500;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />
        
        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Close settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading settings...</div>
            ) : (
              <div className="space-y-8">
                {/* Appearance Section */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Appearance</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme Mode</p>
                    <div className="flex flex-wrap gap-3">
                      {['light', 'dark', 'system'].map((mode) => (
                        <label
                          key={mode}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${
                            appearanceMode === mode
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 dark:bg-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="appearance-mode"
                            value={mode}
                            checked={appearanceMode === mode}
                            onChange={handleAppearanceChange}
                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-gray-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {mode === 'system' ? 'System (auto)' : mode}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      System mode follows your operating system's theme preference.
                    </p>
                  </div>
                </section>

                {/* Profile Information */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Username</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border dark:border-gray-700">
                    <form onSubmit={handleUsernameUpdate} className="space-y-3">
                      <div>
                        <label htmlFor="settings-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Change Username
                        </label>
                        <input
                          type="text"
                          id="settings-username"
                          value={usernameValue}
                          onChange={(e) => setUsernameValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Enter new username"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-800"
                      >
                        Update Username
                      </button>
                      {usernameError && <p className="text-sm text-red-600 dark:text-red-400">{usernameError}</p>}
                      {usernameSuccess && <p className="text-sm text-green-600 dark:text-green-400">{usernameSuccess}</p>}
                    </form>
                  </div>
                </section>

                {/* Change Password */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Change Password</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border dark:border-gray-700">
                    <form onSubmit={handlePasswordChange} className="space-y-3">
                      <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          id="current-password"
                          value={passwordFields.currentPassword}
                          onChange={(e) => setPasswordFields({ ...passwordFields, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          New Password (min 12 chars, 1 letter + 1 number)
                        </label>
                        <input
                          type="password"
                          id="new-password"
                          value={passwordFields.newPassword}
                          onChange={(e) => setPasswordFields({ ...passwordFields, newPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirm-password"
                          value={passwordFields.confirmNewPassword}
                          onChange={(e) => setPasswordFields({ ...passwordFields, confirmNewPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-800"
                      >
                        Change Password
                      </button>
                      {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
                      {passwordSuccess && <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>}
                    </form>
                  </div>
                </section>

                {/* About Me */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">About Me</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border dark:border-gray-700">
                    <form onSubmit={handleAboutMeUpdate} className="space-y-3">
                      <div>
                        <label htmlFor="about-me" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Bio (max 500 characters)
                        </label>
                        <textarea
                          id="about-me"
                          value={aboutMe}
                          onChange={(e) => setAboutMe(e.target.value)}
                          maxLength={maxAboutMe}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                          placeholder="Tell us about yourself..."
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                          {maxAboutMe - aboutMeChars} characters remaining
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-800"
                      >
                        Save Bio
                      </button>
                      {aboutMeError && <p className="text-sm text-red-600 dark:text-red-400">{aboutMeError}</p>}
                      {aboutMeSuccess && <p className="text-sm text-green-600 dark:text-green-400">{aboutMeSuccess}</p>}
                    </form>
                  </div>
                </section>

                {/* Privacy Settings */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Profile Visibility</h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border dark:border-gray-700">
                    <form onSubmit={handlePrivacyUpdate} className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Who can view your profile?
                        </label>
                        <div className="space-y-2">
                          {['public', 'private', 'friends', 'group'].map((option) => (
                            <label
                              key={option}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                                privacy === option
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:bg-gray-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="profile-visibility"
                                value={option}
                                checked={privacy === option}
                                onChange={(e) => setPrivacy(e.target.value)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 dark:border-gray-600"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                  {option === 'public' ? 'Public' : option === 'private' ? 'Private' : option === 'friends' ? 'Friends Only' : 'Group Members'}
                                </span>
                                {['friends', 'group'].includes(option) && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">(Not yet supported — acts as Private)</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-800"
                      >
                        Save Privacy Settings
                      </button>
                      {privacyError && <p className="text-sm text-red-600 dark:text-red-400">{privacyError}</p>}
                      {privacySuccess && <p className="text-sm text-green-600 dark:text-green-400">{privacySuccess}</p>}
                    </form>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPopup;
