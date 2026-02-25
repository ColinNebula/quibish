import React, { useState, useEffect, useRef, useCallback } from 'react';
import './NewsFeed.css';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import postsService from '../../services/postsService';

const NewsFeed = ({ user, className = '' }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [visibility, setVisibility] = useState('public');
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  // Load initial feed
  useEffect(() => {
    loadFeed(true);
  }, [sortBy, visibility]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page]);

  const loadFeed = async (reset = false) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const currentPage = reset ? 1 : page;
      const result = await postsService.getFeed({
        page: currentPage,
        limit: 10,
        userId: user.id,
        visibility,
        sortBy
      });

      if (result.success) {
        if (reset) {
          setPosts(result.posts);
          setPage(2);
        } else {
          setPosts(prev => [...prev, ...result.posts]);
          setPage(prev => prev + 1);
        }
        setHasMore(result.pagination.hasMore);
      } else {
        setError(result.error || 'Failed to load feed');
      }
    } catch (err) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadFeed(false);
    }
  }, [loading, hasMore, page]);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostDeleted = (postId) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  const handleRefresh = () => {
    setPage(1);
    loadFeed(true);
  };

  const handleSeedPosts = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5001/api/posts/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          count: 15
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Reload the feed
        await loadFeed(true);
      } else {
        setError('Failed to create sample posts');
      }
    } catch (err) {
      console.error('Error seeding posts:', err);
      setError('Failed to create sample posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    setPage(1);
  };

  const handleVisibilityChange = (newVisibility) => {
    setVisibility(newVisibility);
    setPage(1);
  };

  return (
    <div className={`news-feed ${className}`}>
      {/* Feed Header */}
      <div className="feed-header">
        <h2 className="feed-title">News Feed</h2>
        
        <div className="feed-controls">
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="trending">Trending</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Show:</label>
            <select value={visibility} onChange={(e) => handleVisibilityChange(e.target.value)}>
              <option value="public">Public Posts</option>
              <option value="all">All Posts</option>
            </select>
          </div>

          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            🔄 {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Post Composer */}
      <PostComposer 
        user={user} 
        onPostCreated={handlePostCreated}
      />

      {/* Feed Content */}
      <div className="feed-content">
        {error && (
          <div className="feed-error">
            <p>{error}</p>
            <button onClick={handleRefresh}>Try Again</button>
          </div>
        )}

        {posts.length === 0 && !loading && !error && (
          <div className="feed-empty">
            <div className="empty-icon">📝</div>
            <h3>No posts yet</h3>
            <p>Be the first to share something!</p>
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={handleSeedPosts} 
                className="seed-posts-btn"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Create Sample Posts
              </button>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Click to populate your feed with sample content
              </p>
            </div>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={user}
            onPostDeleted={handlePostDeleted}
            onPostUpdated={handlePostUpdated}
          />
        ))}

        {/* Loading Indicator */}
        {loading && posts.length > 0 && (
          <div className="feed-loading">
            <div className="loading-spinner"></div>
            <p>Loading more posts...</p>
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && !loading && (
          <div ref={loadingRef} className="scroll-trigger"></div>
        )}

        {/* End of Feed */}
        {!hasMore && posts.length > 0 && (
          <div className="feed-end">
            <p>You've reached the end of your feed</p>
            <button onClick={handleRefresh}>Refresh Feed</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
