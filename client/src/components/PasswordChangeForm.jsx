import { useState } from 'react';

function PasswordChangeForm({ onChangePassword }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (newPassword.length < 9) {
      setError('New password must be at least 9 characters');
      setLoading(false);
      return;
    }

    // Basic complexity check: at least one letter and one number
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must contain at least one letter and one number');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    // Call password change function
    onChangePassword(currentPassword, newPassword, confirmNewPassword)
      .then(() => {
        setSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      })
      .catch((err) => {
        setError(err.message || 'Failed to update password');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Current Password
        </label>
        <input
          type="password"
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Enter current password"
        />
      </div>
      
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
          New Password
        </label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
           placeholder="Enter new password (min 9 chars, 1 letter + 1 number)"
        />
      </div>
      
      <div>
        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm New Password
        </label>
        <input
          type="password"
          id="confirmNewPassword"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Confirm new password"
        />
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 rounded-lg transition-colors ${
          loading
            ? 'bg-indigo-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {loading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}

export default PasswordChangeForm;