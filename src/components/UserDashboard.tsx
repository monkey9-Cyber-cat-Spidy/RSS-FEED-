import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Subscription, Notification } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateRssAndDownload } from '../utils/rss';

interface ArticleWithProfile {
  id: string;
  title: string;
  content: string;
  author_id: string;
  published_at: string;
  updated_at: string;
  is_published: boolean;
  user_profiles?: {
    display_name: string;
    email: string;
  };
}

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<ArticleWithProfile[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch articles
  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          user_profiles (display_name, email)
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  // Fetch subscription status
  const fetchSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          articles (title, id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchArticles(),
        fetchSubscription(),
        fetchNotifications()
      ]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Toggle subscription
  const toggleSubscription = async () => {
    if (!user) return;

    try {
      if (subscription?.is_active) {
        // Unsubscribe
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            is_active: false,
            unsubscribed_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
        setSubscription(prev => prev ? { ...prev, is_active: false } : null);
      } else {
        // Subscribe or resubscribe
        if (subscription) {
          // Reactivate existing subscription
          const { error } = await supabase
            .from('subscriptions')
            .update({ 
              is_active: true,
              unsubscribed_at: null
            })
            .eq('user_id', user.id);

          if (error) throw error;
          setSubscription(prev => prev ? { ...prev, is_active: true } : null);
        } else {
          // Create new subscription
          const { data, error } = await supabase
            .from('subscriptions')
            .insert([{ user_id: user.id, is_active: true }])
            .select()
            .single();

          if (error) throw error;
          setSubscription(data);
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Error updating subscription. Please try again.');
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle RSS download
  const handleDownloadRss = () => {
    const convertedArticles = articles.map(article => ({
      ...article,
      user_profiles: article.user_profiles ? {
        id: '',
        email: article.user_profiles.email,
        username: '',
        display_name: article.user_profiles.display_name,
        role: 'user' as const,
        avatar_url: undefined,
        created_at: '',
        updated_at: ''
      } : undefined
    }));
    generateRssAndDownload(convertedArticles, 'RSS Feed Blog');
  };

  if (loading) {
    return <div>Loading your dashboard...</div>;
  }

  const isSubscribed = subscription?.is_active || false;
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="user-dashboard-content">
      <div className="dashboard-header">
        <h2>📰 Latest Articles</h2>
        <div className="dashboard-actions">
          <button 
            onClick={toggleSubscription}
            className={`subscription-btn ${isSubscribed ? 'subscribed' : 'unsubscribed'}`}
          >
            {isSubscribed ? '🔕 Unsubscribe' : '🔔 Subscribe to RSS'}
          </button>
          <button onClick={handleDownloadRss} className="download-rss-btn">
            📥 Download RSS Feed
          </button>
        </div>
      </div>

      {isSubscribed && (
        <div className="subscription-status">
          ✅ You're subscribed to RSS notifications! You'll get notified when new articles are published.
        </div>
      )}

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="notifications-section">
          <h3>
            🔔 Notifications 
            {unreadNotifications > 0 && (
              <span className="notification-badge">{unreadNotifications}</span>
            )}
          </h3>
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-meta">
                  <span className="notification-date">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                  {!notification.is_read && <span className="unread-indicator">●</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles Section */}
      <div className="articles-section">
        <h3>📚 Published Articles ({articles.length})</h3>
        
        {articles.length === 0 ? (
          <div className="empty-state">
            <p>📝 No articles published yet. Check back later!</p>
          </div>
        ) : (
          <div className="articles-grid">
            {articles.map((article) => (
              <div key={article.id} className="article-card-user">
                <div className="article-header-user">
                  <h4>{article.title}</h4>
                  <div className="article-meta-user">
                    <span className="author">
                      by {article.user_profiles?.display_name || 'Unknown Author'}
                    </span>
                    <span className="date">
                      {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="article-content-user">
                  <p>{article.content.substring(0, 200)}{article.content.length > 200 ? '...' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};