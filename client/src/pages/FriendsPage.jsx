import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FriendsList from '../components/FriendsList';
import FriendRequests from '../components/FriendRequests';
import AddFriendSearch from '../components/AddFriendSearch';
import AppHeader from '../components/AppHeader';
import Footer from '../components/Footer';

function FriendsPage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [currentUser]);

  const handleViewChange = (view) => {
    if (view === 'list') {
      navigate('/dashboard');
    } else if (view === 'queue') {
      navigate('/dashboard?view=queue');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        fetch('/api/friends', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/friends/requests/incoming', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/friends/requests/outgoing', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (!friendsRes.ok || !incomingRes.ok || !outgoingRes.ok) {
        throw new Error('Failed to fetch some data');
      }

      const friendsData = await friendsRes.json();
      const incomingData = await incomingRes.json();
      const outgoingData = await outgoingRes.json();

      setFriends(friendsData);
      setIncomingRequests(incomingData);
      setOutgoingRequests(outgoingData);
    } catch (err) {
      console.error('Error fetching friends data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSendRequest = async (username) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/friends/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request');
      }
      showSuccess(`Friend request sent to ${username}!`);
      // Refresh outgoing requests
      const outgoingRes = await fetch('/api/friends/requests/outgoing', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const outgoingData = await outgoingRes.json();
      setOutgoingRequests(outgoingData);
    } catch (err) {
      console.error('Error sending request:', err);
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/friends/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept request');
      }
      showSuccess('Friend request accepted!');
      // Remove from incoming, add to friends
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
      const friendsRes = await fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const friendsData = await friendsRes.json();
      setFriends(friendsData);
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('friends-updated', { detail: { friends: friendsData } }));
    } catch (err) {
      console.error('Error accepting request:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/friends/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject request');
      }
      showSuccess('Friend request rejected');
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (requestId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/friends/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel request');
      }
      showSuccess('Friend request cancelled');
      setOutgoingRequests(prev => prev.filter(r => r.friendship_id === requestId || r.id !== requestId));
    } catch (err) {
      console.error('Error cancelling request:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove friend');
      }
      showSuccess('Friend removed');
      const newFriends = friends.filter(f => f.id !== friendId);
      setFriends(newFriends);
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('friends-updated', { detail: { friends: newFriends } }));
    } catch (err) {
      console.error('Error removing friend:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Prepare data for AddFriendSearch
  const existingFriendIds = friends.map(f => f.id);
  const outgoingRequestUserIds = outgoingRequests.map(r => r.id);
  const incomingRequestUserIds = incomingRequests.map(r => r.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        activeView={null}
        showViewSwitcher
        onViewChange={handleViewChange}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Friends</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Add Friend Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Add Friend</h2>
            <AddFriendSearch
              currentUser={currentUser}
              existingFriendIds={existingFriendIds}
              outgoingRequestUserIds={outgoingRequestUserIds}
              incomingRequestUserIds={incomingRequestUserIds}
              onSendRequest={handleSendRequest}
              loading={actionLoading}
            />
          </section>

          {/* Friend Requests Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Friend Requests</h2>
            <FriendRequests
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel}
              loading={loading || actionLoading}
            />
          </section>

          {/* Friends List Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Your Friends</h2>
            <FriendsList
              friends={friends}
              onRemoveFriend={handleRemoveFriend}
              loading={loading || actionLoading}
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default FriendsPage;
