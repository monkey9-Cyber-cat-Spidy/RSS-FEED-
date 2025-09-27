import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import './App.css'

const AppContent: React.FC = () => {
  const { user, loading, profile, signOut } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RSS Feed Blog</h1>
        <div className="user-info">
          <span>Welcome, {profile?.display_name || profile?.username || user.email}!</span>
          {profile?.role === 'admin' && <span className="admin-badge">Admin</span>}
          <button onClick={signOut} className="logout-btn">Sign Out</button>
        </div>
      </header>
      
      <main className="app-main">
        {profile?.role === 'admin' ? (
          <div className="admin-dashboard">
            <h2>Admin Dashboard</h2>
            <p>Welcome to the admin panel! Here you can manage articles and RSS feeds.</p>
            {/* TODO: Add admin functionality */}
          </div>
        ) : (
          <div className="user-dashboard">
            <h2>Welcome to RSS Feed Blog</h2>
            <p>Stay updated with the latest articles and real-time notifications.</p>
            {/* TODO: Add user functionality */}
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
