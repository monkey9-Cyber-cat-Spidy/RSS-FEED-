import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

export const ArticleManager: React.FC = () => {
  const { user, profile } = useAuth();
  const [articles, setArticles] = useState<ArticleWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleWithProfile | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_published: true
  });

  // Fetch articles
  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          user_profiles (display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    
    // Set up real-time subscription for articles
    const channel = supabase
      .channel('articles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'articles'
        },
        (payload) => {
          console.log('Article change detected:', payload);
          // Refresh articles when any change occurs
          fetchArticles();
        }
      )
      .subscribe();
    
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.content.trim()) return;

    try {
      setLoading(true);

      if (editingArticle) {
        // Update existing article
        const { error } = await supabase
          .from('articles')
          .update({
            title: formData.title,
            content: formData.content,
            is_published: formData.is_published,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingArticle.id);

        if (error) throw error;
      } else {
        // Create new article
        const { error } = await supabase
          .from('articles')
          .insert([{
            title: formData.title,
            content: formData.content,
            author_id: user.id,
            is_published: formData.is_published,
            published_at: formData.is_published ? new Date().toISOString() : null
          }]);

        if (error) throw error;
      }

      // Reset form
      setFormData({ title: '', content: '', is_published: true });
      setShowForm(false);
      setEditingArticle(null);
      
      // Force refresh articles with a small delay to ensure DB sync
      setTimeout(async () => {
        await fetchArticles();
      }, 100);
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Error saving article. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (article: ArticleWithProfile) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      is_published: article.is_published
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (articleId: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      await fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article. Please try again.');
    }
  };

  // Toggle publish status
  const togglePublish = async (article: ArticleWithProfile) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          is_published: !article.is_published,
          published_at: !article.is_published ? new Date().toISOString() : null
        })
        .eq('id', article.id);

      if (error) throw error;
      await fetchArticles();
    } catch (error) {
      console.error('Error updating article:', error);
    }
  };

  // Handle RSS download
  const handleDownloadRss = () => {
    const publishedArticles = articles
      .filter(article => article.is_published)
      .map(article => ({
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
    generateRssAndDownload(publishedArticles, 'RSS Feed Blog');
  };

  if (profile?.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="article-manager">
      <div className="article-manager-header">
        <h2>📰 Article Management</h2>
        <div className="header-actions">
          <button onClick={handleDownloadRss} className="download-rss-btn">
            📥 Download RSS
          </button>
          <button 
            onClick={() => {
              setShowForm(!showForm);
              setEditingArticle(null);
              setFormData({ title: '', content: '', is_published: true });
            }}
            className="create-article-btn"
          >
            {showForm ? 'Cancel' : '✍️ Write New Article'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="article-form">
          <h3>{editingArticle ? 'Edit Article' : 'Create New Article'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Title:</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter article title..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Content:</label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={10}
                placeholder="Write your article content here..."
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                />
                Publish immediately
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingArticle ? 'Update Article' : 'Create Article')}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingArticle(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="articles-list">
        <h3>📚 Your Articles ({articles.length})</h3>
        
        {loading && <p>Loading articles...</p>}
        
        {!loading && articles.length === 0 && (
          <div className="empty-state">
            <p>🎯 No articles yet! Create your first article to get started.</p>
          </div>
        )}

        {articles.map((article) => (
          <div key={article.id} className="article-card">
            <div className="article-header">
              <h4>{article.title}</h4>
              <div className="article-meta">
                <span className={`status ${article.is_published ? 'published' : 'draft'}`}>
                  {article.is_published ? '✅ Published' : '📝 Draft'}
                </span>
                <span className="date">
                  {new Date(article.published_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="article-content">
              <p>{article.content.substring(0, 150)}...</p>
            </div>
            
            <div className="article-actions">
              <button onClick={() => handleEdit(article)} className="edit-btn">
                ✏️ Edit
              </button>
              <button 
                onClick={() => togglePublish(article)}
                className="publish-btn"
              >
                {article.is_published ? '📝 Unpublish' : '✅ Publish'}
              </button>
              <button 
                onClick={() => handleDelete(article.id)}
                className="delete-btn"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};