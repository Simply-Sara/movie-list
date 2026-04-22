import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GroupList from '../components/GroupList';
import GroupInvites from '../components/GroupInvites';
import CreateGroupModal from '../components/CreateGroupModal';
import AppHeader from '../components/AppHeader';
import Footer from '../components/Footer';

function GroupsPage({ currentUser, onLogout, pendingGroupInvitesCount }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [currentUser]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch groups and invites separately so one doesn't block the other
      const groupsRes = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!groupsRes.ok) {
        throw new Error('Failed to fetch groups');
      }
      const groupsData = await groupsRes.json();
      setGroups(groupsData);

      const invitesRes = await fetch('/api/groups/invites', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData);
        const pendingCount = invitesData.filter(i => i.status === 'pending').length;
        setPendingInvitesCount(pendingCount);
      } else {
        // If invites fail, just clear invites but don't error out
        setInvites([]);
        setPendingInvitesCount(0);
      }
    } catch (err) {
      console.error('Error fetching groups data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCreateGroup = async (name) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group');
      }
      showSuccess(`Group "${name}" created!`);
      setShowCreateModal(false);
      // Optimistically add the new group to the list
      const newGroup = {
        id: data.id,
        name: data.name,
        role: 'owner',
        member_count: 1
      };
      setGroups(prev => [...prev, newGroup]);
      // Also refresh in background to sync with server
      fetchAllData();
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.message);
      throw err;
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/groups/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }
      showSuccess('Group invite accepted!');
      // Remove from invites, refresh groups
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      fetchAllData();
      // Update badge count globally
      window.dispatchEvent(new CustomEvent('group-invite-updated'));
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError(err.message);
      throw err;
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/groups/invites/${inviteId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject invite');
      }
      showSuccess('Invite rejected');
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      window.dispatchEvent(new CustomEvent('group-invite-updated'));
    } catch (err) {
      console.error('Error rejecting invite:', err);
      setError(err.message);
      throw err;
    }
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        activeView={null}
        showViewSwitcher
        pendingInvitesCount={pendingGroupInvitesCount}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Groups</h1>

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
          {/* My Groups Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">My Groups</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition dark:focus:ring-offset-gray-900"
              >
                + Create Group
              </button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700 animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2c0-.656.126-1.283.356-1.857m7.356 1.857l-1.09 1.09a2.5 2.5 0 01-3.538 0l-1.09-1.09A2.5 2.5 0 0111.66 15.12z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No groups yet</h3>
                <p className="text-gray-600 dark:text-gray-400">Create your first group to start building a shared watchlist.</p>
              </div>
            ) : (
              <GroupList groups={groups} onGroupClick={(groupId) => navigate(`/groups/${groupId}`)} />
            )}
          </section>

          {/* Pending Invites Section */}
          {pendingInvites.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Pending Invites ({pendingInvites.length})</h2>
              <GroupInvites
                invites={pendingInvites}
                onAccept={handleAcceptInvite}
                onReject={handleRejectInvite}
                loading={loading}
              />
            </section>
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      <Footer />
    </div>
  );
}

export default GroupsPage;
