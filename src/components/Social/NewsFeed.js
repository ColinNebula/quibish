import React, { useState, useEffect, useRef, useCallback } from 'react';
import './NewsFeed.css';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import postsService from '../../services/postsService';
import { buildApiUrl } from '../../config/api';

const POSTS_CACHE_KEY = 'quibish_posts_feed';

const savePosts = (posts) => {
  try {
    localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(posts.slice(0, 50)));
  } catch (_) {}
};

const loadCachedPosts = () => {
  try {
    const raw = localStorage.getItem(POSTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
};

const NewsFeed = ({ user, className = '' }) => {
  const [posts, setPosts] = useState(() => loadCachedPosts());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [visibility, setVisibility] = useState('public');
  const observerRef = useRef(null);
  const loadingRef = useRef(null);
  // Refs keep loadFeed stable so it doesn't re-trigger the initial-load effect
  const inFlightRef = useRef(false);
  const pageRef = useRef(1);
  const requestIdRef = useRef(0);

  // Define loadFeed callback first
  const loadFeed = useCallback(async (reset = false) => {
    if (inFlightRef.current && !reset) return;

    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setLoading(true);
    setError('');

    try {
      const currentPage = reset ? 1 : pageRef.current;
      const result = await postsService.getFeed({
        page: currentPage,
        limit: 10,
        userId: user.id,
        visibility,
        sortBy
      });

      // A newer request (e.g. changed sort) supersedes this one
      if (requestId !== requestIdRef.current) return;

      if (result.success) {
        if (reset) {
          setPosts(result.posts);
          savePosts(result.posts);
          pageRef.current = 2;
        } else {
          setPosts(prev => {
            const merged = [...prev, ...result.posts];
            savePosts(merged);
            return merged;
          });
          pageRef.current += 1;
        }
        setHasMore(result.pagination.hasMore);
      } else {
        setError(result.error || 'Failed to load feed');
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      // Fall back to cached posts so the feed isn't blank after a refresh
      const cached = loadCachedPosts();
      if (cached.length > 0 && reset) {
        setPosts(cached);
        setHasMore(false);
      } else {
        setError(err.message || 'Failed to load feed');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [user.id, visibility, sortBy]);

  const loadMore = useCallback(() => {
    if (!inFlightRef.current && hasMore) {
      loadFeed(false);
    }
  }, [hasMore, loadFeed]);

  // Load initial feed
  useEffect(() => {
    loadFeed(true);
  }, [loadFeed]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || error) return;

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
  }, [hasMore, loading, error, loadMore]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => {
      const updated = [newPost, ...prev];
      savePosts(updated);
      return updated;
    });
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => {
      const updated = prev.filter(post => post.id !== postId);
      savePosts(updated);
      return updated;
    });
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(prev => {
      const updated = prev.map(post =>
        post.id === updatedPost.id ? updatedPost : post
      );
      savePosts(updated);
      return updated;
    });
  };

  const handleRefresh = () => {
    loadFeed(true);
  };

  const handleSeedPosts = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(buildApiUrl('posts/seed'), {
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
  };

  const handleVisibilityChange = (newVisibility) => {
    setVisibility(newVisibility);
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
        {hasMore && (

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
