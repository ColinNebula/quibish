import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './ExplorePage.css';

const ExplorePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('forYou');
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nearbyPosts, setNearbyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchExploreData();
  }, [activeTab]);

  const fetchExploreData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`/api/explore?tab=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTrendingPosts(data.trending || []);
        setTrendingHashtags(data.hashtags || []);
        setSuggestedUsers(data.suggestedUsers || []);
        setCategories(data.categories || []);
        setNearbyPosts(data.nearby || []);
      }
    } catch (error) {
      console.error('Error fetching explore data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to search results
    window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <div className="explore-page">
      {/* Search Bar */}
      <div className="explore-search-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search posts, people, hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            🔍
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="explore-tabs">
        <button
          className={`explore-tab ${activeTab === 'forYou' ? 'active' : ''}`}
          onClick={() => setActiveTab('forYou')}
        >
          For You
        </button>
        <button
          className={`explore-tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          Trending
        </button>
        <button
          className={`explore-tab ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          People
        </button>
        <button
          className={`explore-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`explore-tab ${activeTab === 'nearby' ? 'active' : ''}`}
          onClick={() => setActiveTab('nearby')}
        >
          📍 Nearby
        </button>
      </div>

      {/* Content */}
      <div className="explore-content">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'forYou' && (
              <ForYouTab posts={trendingPosts} />
            )}
            {activeTab === 'trending' && (
              <TrendingTab 
                posts={trendingPosts}
                hashtags={trendingHashtags}
              />
            )}
            {activeTab === 'people' && (
              <PeopleTab users={suggestedUsers} />
            )}
            {activeTab === 'categories' && (
              <CategoriesTab categories={categories} />
            )}
            {activeTab === 'nearby' && (
              <NearbyTab posts={nearbyPosts} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// For You Tab - Personalized recommendations
const ForYouTab = ({ posts }) => {
  const [personalizedPosts, setPersonalizedPosts] = useState(posts);

  const handleRefresh = async () => {
    // Fetch new recommendations
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/explore/refresh', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setPersonalizedPosts(data.posts);
      }
    } catch (error) {
      console.error('Error refreshing feed:', error);
    }
  };

  return (
    <div className="for-you-tab">
      <div className="section-header">
        <h2>Recommended for You</h2>
        <button className="refresh-btn" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>
      
      <div className="posts-grid">
        {personalizedPosts.map(post => (
          <ExplorePostCard key={post.id} post={post} />
        ))}
      </div>

      {personalizedPosts.length === 0 && (
        <div className="empty-state">
          <p>No recommendations yet. Follow more people and interact with posts to see personalized content!</p>
        </div>
      )}
    </div>
  );
};

// Trending Tab - Trending content and hashtags
const TrendingTab = ({ posts, hashtags }) => {
  return (
    <div className="trending-tab">
      {/* Trending Hashtags */}
      <div className="trending-section">
        <h2>Trending Hashtags</h2>
        <div className="hashtags-grid">
          {hashtags.map((hashtag, index) => (
            <HashtagCard key={hashtag.id} hashtag={hashtag} rank={index + 1} />
          ))}
        </div>
      </div>

      {/* Trending Posts */}
      <div className="trending-section">
        <h2>Trending Now</h2>
        <div className="trending-timeframes">
          <button className="timeframe-btn active">24 Hours</button>
          <button className="timeframe-btn">7 Days</button>
          <button className="timeframe-btn">30 Days</button>
        </div>
        
        <div className="posts-grid">
          {posts.map(post => (
            <ExplorePostCard key={post.id} post={post} showTrending />
          ))}
        </div>
      </div>
    </div>
  );
};

// People Tab - Suggested users to follow
const PeopleTab = ({ users }) => {
  const [followedUsers, setFollowedUsers] = useState(new Set());

  const handleFollow = async (userId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendId: userId })
      });

      const data = await response.json();
      if (data.success) {
        setFollowedUsers(prev => new Set([...prev, userId]));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <div className="people-tab">
      <div className="section-header">
        <h2>Suggested for You</h2>
      </div>

      <div className="people-grid">
        {users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            isFollowed={followedUsers.has(user.id)}
            onFollow={() => handleFollow(user.id)}
          />
        ))}
      </div>

      {users.length === 0 && (
        <div className="empty-state">
          <p>No suggestions available. Try connecting with more people!</p>
        </div>
      )}
    </div>
  );
};

// Categories Tab - Browse by interest
const CategoriesTab = ({ categories }) => {
  return (
    <div className="categories-tab">
      <div className="section-header">
        <h2>Browse by Interest</h2>
      </div>

      <div className="categories-grid">
        {categories.map(category => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
};

// Nearby Tab - Location-based content
const NearbyTab = ({ posts }) => {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const requestLocation = async () => {
    setRequestingLocation(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Send location to server and get nearby posts
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/explore/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      });

      const data = await response.json();
      if (data.success) {
        setLocationEnabled(true);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to access location. Please enable location services.');
    } finally {
      setRequestingLocation(false);
    }
  };

  if (!locationEnabled) {
    return (
      <div className="location-prompt">
        <div className="location-icon">📍</div>
        <h3>Discover What's Nearby</h3>
        <p>See posts, events, and people in your area</p>
        <button 
          className="enable-location-btn"
          onClick={requestLocation}
          disabled={requestingLocation}
        >
          {requestingLocation ? 'Getting Location...' : 'Enable Location'}
        </button>
        <p className="privacy-note">
          Your precise location is never shared with other users
        </p>
      </div>
    );
  }

  return (
    <div className="nearby-tab">
      <div className="section-header">
        <h2>Near You</h2>
        <button className="change-location-btn">
          Change Location
        </button>
      </div>

      <div className="posts-grid">
        {posts.map(post => (
          <ExplorePostCard key={post.id} post={post} showLocation />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="empty-state">
          <p>No posts nearby. Be the first to share something in your area!</p>
        </div>
      )}
    </div>
  );
};

// Explore Post Card Component
const ExplorePostCard = ({ post, showTrending, showLocation }) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleCardClick = () => {
    // Navigate to post detail
    window.location.href = `/posts/${post.id}`;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="explore-post-card" onClick={handleCardClick}>
      {showTrending && (
        <div className="trending-badge">
          🔥 Trending
        </div>
      )}
      
      {post.media_urls && JSON.parse(post.media_urls)[0] && (
        <div className="post-media">
          <img 
            src={JSON.parse(post.media_urls)[0]} 
            alt="Post"
            className="post-image"
          />
          {post.media_type === 'video' && (
            <div className="video-indicator">▶️</div>
          )}
        </div>
      )}

      <div className="post-info">
        <div className="post-author">
          <img src={post.avatar} alt={post.name} className="author-avatar" />
          <div className="author-details">
            <span className="author-name">{post.name}</span>
            {showLocation && post.location && (
              <span className="post-location">📍 {post.location}</span>
            )}
          </div>
        </div>

        {post.content && (
          <p className="post-text">{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
        )}

        <div className="post-stats">
          <button className={`stat-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
            ❤️ {post.likes_count}
          </button>
          <span className="stat-item">💬 {post.comments_count}</span>
          <span className="stat-item">👁️ {post.views_count}</span>
        </div>
      </div>
    </div>
  );
};

// Hashtag Card Component
const HashtagCard = ({ hashtag, rank }) => {
  return (
    <div className="hashtag-card" onClick={() => window.location.href = `/hashtag/${hashtag.tag}`}>
      <div className="hashtag-rank">#{rank}</div>
      <h3 className="hashtag-name">#{hashtag.tag}</h3>
      <p className="hashtag-stats">
        {hashtag.post_count} posts • {hashtag.growth > 0 ? '📈' : '📉'} {Math.abs(hashtag.growth)}%
      </p>
      <div className="hashtag-preview">
        {hashtag.sample_posts && hashtag.sample_posts.slice(0, 3).map((post, i) => (
          <img key={i} src={post.thumbnail} alt="Preview" className="preview-thumb" />
        ))}
      </div>
    </div>
  );
};

// User Card Component
const UserCard = ({ user, isFollowed, onFollow }) => {
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} className="user-avatar" />
      <h3 className="user-name">{user.name}</h3>
      <p className="user-username">@{user.username}</p>
      
      {user.bio && (
        <p className="user-bio">{user.bio.slice(0, 80)}{user.bio.length > 80 ? '...' : ''}</p>
      )}

      {user.mutual_friends_count > 0 && (
        <p className="mutual-friends">
          {user.mutual_friends_count} mutual friend{user.mutual_friends_count !== 1 ? 's' : ''}
        </p>
      )}

      <button 
        className={`follow-btn ${isFollowed ? 'following' : ''}`}
        onClick={onFollow}
      >
        {isFollowed ? '✓ Following' : '+ Follow'}
      </button>
    </div>
  );
};

// Category Card Component
const CategoryCard = ({ category }) => {
  return (
    <div 
      className="category-card"
      onClick={() => window.location.href = `/explore/category/${category.slug}`}
    >
      <div className="category-icon" style={{ background: category.color }}>
        {category.icon}
      </div>
      <h3 className="category-name">{category.name}</h3>
      <p className="category-count">{category.post_count} posts</p>
    </div>
  );
};

// Loading State Component
const LoadingState = () => {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Loading explore content...</p>
    </div>
  );
};

export default ExplorePage;
