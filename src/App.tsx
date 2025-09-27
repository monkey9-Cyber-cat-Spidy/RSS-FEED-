import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { ArticleManager } from './components/ArticleManager'
import { UserDashboard } from './components/UserDashboard'
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
            <ArticleManager />
          </div>
        ) : (
          <div className="user-dashboard">
            <UserDashboard />
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
