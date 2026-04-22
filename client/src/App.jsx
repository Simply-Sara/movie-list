import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import PublicProfile from './pages/PublicProfile'
import Register from './pages/Register'
import FriendsPage from './pages/FriendsPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [pendingGroupInvitesCount, setPendingGroupInvitesCount] = useState(0)

  const fetchGroupInvitesCount = useCallback(() => {
    if (!currentUser) {
      setPendingGroupInvitesCount(0);
      return;
    }
    fetch('/api/groups/invites', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(invites => {
        const pending = invites.filter(i => i.status === 'pending').length;
        setPendingGroupInvitesCount(pending);
      })
      .catch(err => console.error('Error fetching invite count:', err));
  }, [currentUser]);

  useEffect(() => {
    // Load users on mount
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Error loading users:', err))
       
    // Check for existing token on startup
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Invalid token')
        })
        .then(user => {
          setCurrentUser(user)
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
    }
  }, [])

  // Fetch group invites count after login and after invite updates
  useEffect(() => {
    if (currentUser) {
      fetchGroupInvitesCount()
    }
  }, [currentUser, fetchGroupInvitesCount])

  // Listen for group invite updates
  useEffect(() => {
    const handleInviteUpdate = () => {
      fetchGroupInvitesCount()
    }
    window.addEventListener('group-invite-updated', handleInviteUpdate)
    return () => window.removeEventListener('group-invite-updated', handleInviteUpdate)
  }, [fetchGroupInvitesCount])

  const handleLogin = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Login failed')
      }
      
      const data = await res.json()
      const token = data.token
      
      // Store token
      localStorage.setItem('token', token)
      
      // Set current user
      setCurrentUser(data.user)
    } catch (err) {
      throw err
    }
  }

  const handleRegister = async (username, password, confirmPassword) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Registration failed')
      }
      
      // Registration successful - show success message (handled in Register component)
      return await res.json()
    } catch (err) {
      throw err
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    // Clear token on logout
    localStorage.removeItem('token')
    window.location.reload()
  }

  // Handle user updates from profile page
  useEffect(() => {
    const handleUserUpdated = (e) => {
      setCurrentUser(prevUser => {
        if (!prevUser) return prevUser
        if (e.detail.id === prevUser.id) {
          return { ...prevUser, username: e.detail.username }
        }
        return prevUser
      })
    }
    
    window.addEventListener('user-updated', handleUserUpdated)
    return () => {
      window.removeEventListener('user-updated', handleUserUpdated)
    }
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} users={users} />} />
        <Route path="/register" element={<Register onRegister={handleRegister} />} />
        <Route path="/friends" element={currentUser ? <FriendsPage currentUser={currentUser} onLogout={handleLogout} pendingGroupInvitesCount={pendingGroupInvitesCount} /> : <Navigate to="/" replace />} />
        <Route path="/groups" element={currentUser ? <GroupsPage currentUser={currentUser} onLogout={handleLogout} pendingGroupInvitesCount={pendingGroupInvitesCount} /> : <Navigate to="/" replace />} />
        <Route path="/groups/:groupId" element={currentUser ? <GroupDetailPage currentUser={currentUser} users={users} onLogout={handleLogout} pendingGroupInvitesCount={pendingGroupInvitesCount} /> : <Navigate to="/" replace />} />
        <Route path="/users/:username" element={<PublicProfile currentUser={currentUser} users={users} onLogout={handleLogout} pendingGroupInvitesCount={pendingGroupInvitesCount} />} />
        <Route path="/dashboard" element={currentUser ? <Dashboard currentUser={currentUser} users={users} onLogout={handleLogout} pendingGroupInvitesCount={pendingGroupInvitesCount} /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={currentUser ? <Navigate to={`/users/${currentUser.username}`} replace /> : <Navigate to="/" replace />} />
        <Route path="*" element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

