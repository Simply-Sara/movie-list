import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Footer from '../components/Footer';
import GroupMediaList from '../components/GroupMediaList';
import MemberList from '../components/MemberList';
import GroupInviteManager from '../components/GroupInviteManager';
import Tabs from '../components/Tabs';

function GroupDetailPage({ currentUser, users, onLogout, pendingGroupInvitesCount }) {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'members' | 'invites'
  const [successMessage, setSuccessMessage] = useState('');

  const handleViewChange = (view) => {
    if (view === 'list') {
      navigate('/dashboard');
    } else if (view === 'queue') {
      navigate('/dashboard?view=queue');
    }
  };

  const isOwner = group?.currentUserRole === 'owner';
  const isAdmin = group?.currentUserRole === 'admin' || isOwner;

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    loadGroup();
  }, [currentUser, groupId]);

  const loadGroup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        throw new Error('Group not found or access denied');
      }
      const data = await res.json();
      setGroup(data);
    } catch (err) {
      console.error('Error loading group:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete group');
      }
      showSuccess('Group deleted successfully');
      navigate('/groups');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransferOwnership = async (newOwnerUserId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newOwnerUserId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer ownership');
      }
      showSuccess('Ownership transferred successfully');
      loadGroup(); // Refresh to update roles
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (isOwner) {
      // Owner must transfer first
      setError('Owners must transfer ownership before leaving. Use the "Transfer Ownership" button.');
      return;
    }
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      // Self-removal: call remove endpoint with own userId
      const res = await fetch(`/api/groups/${groupId}/members/${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to leave group');
      }
      showSuccess('You have left the group');
      navigate('/groups');
    } catch (err) {
      setError(err.message);
    }
  };

  const tabs = [
    { id: 'media', label: 'Media' },
    { id: 'members', label: 'Members' },
    { id: 'invites', label: 'Invites' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <AppHeader
          currentUser={currentUser}
          onLogout={onLogout}
          activeView={null}
          showViewSwitcher
          onViewChange={handleViewChange}
          pendingInvitesCount={pendingGroupInvitesCount}
        />
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <AppHeader
          currentUser={currentUser}
          onLogout={onLogout}
          activeView={null}
          showViewSwitcher
          onViewChange={handleViewChange}
          pendingInvitesCount={pendingGroupInvitesCount}
        />
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => navigate('/groups')} className="mt-4 text-indigo-600 hover:underline">
              Back to Groups
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        activeView={null}
        showViewSwitcher
        onViewChange={handleViewChange}
        pendingInvitesCount={pendingGroupInvitesCount}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Group Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  group.currentUserRole === 'owner'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                    : group.currentUserRole === 'admin'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {group.currentUserRole === 'owner' ? '👑 Owner' : group.currentUserRole === 'admin' ? ' Admin' : ' Member'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {group.members?.length || 0} member(s) • Created {new Date(group.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2">
              {isOwner && (
                <button
                  onClick={() => {
                    // Open transfer modal - to be implemented as a prompt or modal
                    const newOwnerId = prompt('Enter user ID to transfer ownership (must be a current member):');
                    if (newOwnerId) handleTransferOwnership(newOwnerId);
                  }}
                  className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition"
                >
                  Transfer Ownership
                </button>
              )}
              {isOwner && (
                <button
                  onClick={handleDeleteGroup}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition"
                >
                  Delete Group
                </button>
              )}
              {!isOwner && (
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Leave Group
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-6">
          {activeTab === 'media' && (
            <GroupMediaList
              groupId={parseInt(groupId)}
              currentUser={currentUser}
              groupMembers={group.members}
            />
          )}
          {activeTab === 'members' && (
            <MemberList
              groupId={parseInt(groupId)}
              members={group.members || []}
              currentUserRole={group.currentUserRole}
              currentUserId={currentUser.id}
              onMemberRemoved={loadGroup}
              onRoleToggled={loadGroup}
            />
          )}
          {activeTab === 'invites' && (
            <GroupInviteManager
              groupId={parseInt(groupId)}
              isAdmin={isAdmin}
              currentUser={currentUser}
              members={group.members || []}
              onInviteSent={loadGroup}
              onInviteCancelled={loadGroup}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default GroupDetailPage;
