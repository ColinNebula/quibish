# ⚡ Quick Integration Guide

## 🚀 Fastest Way to Get Started

### 1. Enhanced Reactions (15 minutes)

**Step 1: Import the component**
```javascript
import EnhancedReactions from './components/Social/Reactions/EnhancedReactions';
```

**Step 2: Replace your like button in PostCard.jsx**
```javascript
// OLD:
<button onClick={() => handleLike(post.id)}>
  👍 Like ({post.likes_count})
</button>

// NEW:
<EnhancedReactions
  postId={post.id}
  currentReaction={post.user_reaction}
  reactionCounts={post.reactions || {}}
  onReact={async (postId, reactionType) => {
    // Your API call here
    await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reactionType })
    });
  }}
  showInline={true}
/>
```

**Step 3: Done!** Long-press to see all reactions, tap for quick like.

---

### 2. Stories Feature (30 minutes)

**Step 1: Import components**
```javascript
import { StoriesCarousel, StoryViewer, StoryCreator } from './components/Social/Stories/Stories';
```

**Step 2: Add Stories to your feed (e.g., NewsFeed.jsx)**
```javascript
const NewsFeed = () => {
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);

  return (
    <div className="news-feed">
      {/* Add at the very top */}
      <StoriesCarousel
        onStoryClick={(storyGroup) => {
          setActiveStoryGroup(storyGroup);
          setShowStoryViewer(true);
        }}
        onCreateStory={() => setShowStoryCreator(true)}
      />

      {/* Your existing posts */}
      <PostsList posts={posts} />

      {/* Story Viewer Modal */}
      {showStoryViewer && activeStoryGroup && (
        <StoryViewer
          initialStoryGroup={activeStoryGroup}
          allStoryGroups={allStoryGroups}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      {/* Story Creator Modal */}
      {showStoryCreator && (
        <StoryCreator
          onClose={() => setShowStoryCreator(false)}
          onStoryCreated={(story) => {
            console.log('Story created:', story);
            setShowStoryCreator(false);
          }}
        />
      )}
    </div>
  );
};
```

**Step 3: Done!** Stories carousel appears at top of feed.

---

### 3. Explore Page (20 minutes)

**Step 1: Create route**
```javascript
import ExplorePage from './components/Social/Explore/ExplorePage';

// In your router (App.js or routes.js)
<Route path="/explore" element={<ExplorePage />} />
```

**Step 2: Add navigation link**
```javascript
// In your navigation/header component
<NavLink to="/explore" className="nav-link">
  <i className="icon-search">🔍</i>
  <span>Explore</span>
</NavLink>
```

**Step 3: Done!** Navigate to /explore to see it in action.

---

## 🔧 Backend API Quick Setup

### Minimal Backend Requirements

**1. Reactions Endpoint (5 lines)**
```javascript
// backend/routes/posts.js
router.post('/posts/:postId/react', authenticateToken, async (req, res) => {
  const { reactionType } = req.body;
  const { postId } = req.params;
  const userId = req.user.id;

  // If reactionType is null, remove reaction
  if (!reactionType) {
    await db.query('DELETE FROM reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
    return res.json({ success: true, liked: false });
  }

  // Upsert reaction
  await db.query(`
    INSERT INTO reactions (id, post_id, user_id, reaction_type)
    VALUES (UUID(), ?, ?, ?)
    ON DUPLICATE KEY UPDATE reaction_type = ?
  `, [postId, userId, reactionType, reactionType]);

  res.json({ success: true, reactionType });
});
```

**2. Stories Endpoints (Basic)**
```javascript
// backend/routes/stories.js
const multer = require('multer');
const upload = multer({ dest: 'uploads/stories/' });

// Create story
router.post('/stories', authenticateToken, upload.single('media'), async (req, res) => {
  const { text_overlay, background_color } = req.body;
  const mediaUrl = req.file ? `/uploads/stories/${req.file.filename}` : null;
  const mediaType = req.file?.mimetype.startsWith('video/') ? 'video' : 'photo';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const storyId = uuidv4();
  await db.query(`
    INSERT INTO stories (id, user_id, media_url, media_type, text_overlay, background_color, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [storyId, req.user.id, mediaUrl, mediaType, text_overlay, background_color, expiresAt]);

  res.json({ success: true, story: { id: storyId } });
});

// Get stories feed
router.get('/stories/feed', authenticateToken, async (req, res) => {
  const [stories] = await db.query(`
    SELECT s.*, u.name as user_name, u.avatar as user_avatar,
           EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND viewer_id = ?) as viewed
    FROM stories s
    JOIN users u ON s.user_id = u.id
    WHERE s.expires_at > NOW()
      AND (s.user_id = ? OR s.user_id IN (
        SELECT friend_id FROM connections WHERE user_id = ? AND status = 'accepted'
      ))
    ORDER BY s.created_at DESC
  `, [req.user.id, req.user.id, req.user.id]);

  // Group by user
  const grouped = stories.reduce((acc, story) => {
    const key = story.user_id;
    if (!acc[key]) {
      acc[key] = {
        user_id: story.user_id,
        user_name: story.user_name,
        user_avatar: story.user_avatar,
        stories: []
      };
    }
    acc[key].stories.push(story);
    return acc;
  }, {});

  res.json({ success: true, stories: Object.values(grouped) });
});

// Mark story as viewed
router.post('/stories/:storyId/view', authenticateToken, async (req, res) => {
  await db.query(`
    INSERT IGNORE INTO story_views (id, story_id, viewer_id)
    VALUES (UUID(), ?, ?)
  `, [req.params.storyId, req.user.id]);

  await db.query('UPDATE stories SET views_count = views_count + 1 WHERE id = ?', [req.params.storyId]);

  res.json({ success: true });
});
```

**3. Explore Endpoint (Basic)**
```javascript
// backend/routes/explore.js
router.get('/explore', authenticateToken, async (req, res) => {
  const { tab = 'forYou' } = req.query;

  if (tab === 'trending') {
    // Simple trending: most engagement in last 24 hours
    const [trending] = await db.query(`
      SELECT p.*, u.name, u.username, u.avatar,
             (p.likes_count * 1 + p.comments_count * 3 + p.shares_count * 5) as engagement_score
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY engagement_score DESC
      LIMIT 30
    `);

    return res.json({ success: true, trending });
  }

  if (tab === 'people') {
    // Suggest users with mutual friends
    const [suggestedUsers] = await db.query(`
      SELECT u.*, COUNT(DISTINCT c2.friend_id) as mutual_friends_count
      FROM users u
      JOIN connections c1 ON u.id = c1.friend_id AND c1.status = 'accepted'
      JOIN connections c2 ON c1.user_id = c2.friend_id AND c2.user_id = ? AND c2.status = 'accepted'
      WHERE u.id != ?
        AND u.id NOT IN (SELECT friend_id FROM connections WHERE user_id = ?)
      GROUP BY u.id
      ORDER BY mutual_friends_count DESC
      LIMIT 20
    `, [req.user.id, req.user.id, req.user.id]);

    return res.json({ success: true, suggestedUsers });
  }

  // Default: For You tab
  const [posts] = await db.query(`
    SELECT p.*, u.name, u.username, u.avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.visibility = 'public'
    ORDER BY p.created_at DESC
    LIMIT 30
  `);

  res.json({ success: true, trending: posts });
});
```

---

## 🗄️ Database Setup (Run Once)

### Option 1: SQL Migration Files

**Create file: `migrations/001_reactions.sql`**
```sql
CREATE TABLE IF NOT EXISTS reactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  post_id VARCHAR(36) NOT NULL,
  reaction_type ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry', 'insightful', 'celebrate') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_reaction (user_id, post_id)
);
```

**Create file: `migrations/002_stories.sql`**
```sql
CREATE TABLE IF NOT EXISTS stories (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  media_url VARCHAR(500),
  media_type ENUM('photo', 'video'),
  text_overlay TEXT,
  background_color VARCHAR(20),
  views_count INT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_active (expires_at, created_at DESC)
);

CREATE TABLE IF NOT EXISTS story_views (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL,
  viewer_id VARCHAR(36) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_view (story_id, viewer_id)
);
```

**Run migrations:**
```bash
mysql -u root -p quibish < migrations/001_reactions.sql
mysql -u root -p quibish < migrations/002_stories.sql
```

### Option 2: Programmatic Setup

```javascript
// backend/setup-database.js
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'quibish'
  });

  // Reactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reactions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      post_id VARCHAR(36) NOT NULL,
      reaction_type ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry', 'insightful', 'celebrate') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE KEY unique_reaction (user_id, post_id)
    )
  `);

  // Stories tables
  await connection.query(`
    CREATE TABLE IF NOT EXISTS stories (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      media_url VARCHAR(500),
      media_type ENUM('photo', 'video'),
      text_overlay TEXT,
      background_color VARCHAR(20),
      views_count INT DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS story_views (
      id VARCHAR(36) PRIMARY KEY,
      story_id VARCHAR(36) NOT NULL,
      viewer_id VARCHAR(36) NOT NULL,
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_view (story_id, viewer_id)
    )
  `);

  console.log('✅ Database setup complete!');
  await connection.end();
}

setupDatabase().catch(console.error);
```

**Run it:**
```bash
node backend/setup-database.js
```

---

## 🎯 Testing Checklist

### Manual Testing (10 minutes)

**Reactions:**
- [ ] Click reaction button (should show picker after 300ms)
- [ ] Select different reactions
- [ ] Change reaction multiple times
- [ ] Remove reaction by clicking same one
- [ ] Verify counts update

**Stories:**
- [ ] Click "Your Story" to create
- [ ] Upload photo
- [ ] Add text overlay
- [ ] Share story
- [ ] Verify it appears in carousel
- [ ] Click to view story
- [ ] Swipe through multiple stories
- [ ] Reply to a story

**Explore:**
- [ ] Navigate to /explore
- [ ] Switch between tabs
- [ ] Click on posts
- [ ] Follow suggested users
- [ ] Search for content

---

## 🚨 Common Issues & Fixes

### Issue: "Cannot read property of undefined"
**Fix:** Make sure to handle null/undefined data:
```javascript
reactionCounts={post.reactions || {}}
currentReaction={post.user_reaction || null}
```

### Issue: Stories not showing
**Fix:** Check backend returns correct format:
```javascript
{
  success: true,
  stories: [
    {
      user_id: '123',
      user_name: 'John',
      user_avatar: 'url',
      stories: [
        { id: '1', media_url: 'url', ... }
      ]
    }
  ]
}
```

### Issue: Images not loading
**Fix:** Ensure media URLs are absolute paths:
```javascript
const fullUrl = post.media_url.startsWith('http') 
  ? post.media_url 
  : `${process.env.REACT_APP_API_URL}${post.media_url}`;
```

---

## 📱 Mobile Testing

Test on real devices or use browser dev tools:

1. **iPhone 14 Pro** (390x844)
   - Test Stories swipe navigation
   - Long-press reactions
   - Pull to refresh

2. **Samsung Galaxy S23** (360x800)
   - Same tests as above
   - Test back button behavior

3. **iPad Pro** (1024x1366)
   - Tablet layout
   - Larger touch targets

---

## ⚡ Performance Tips

### 1. Lazy Load Stories
```javascript
const StoriesCarousel = React.lazy(() => import('./Stories/Stories'));

// In component
<Suspense fallback={<div>Loading...</div>}>
  <StoriesCarousel />
</Suspense>
```

### 2. Optimize Images
```javascript
// Use thumbnails for story previews
<img 
  src={story.thumbnail_url || story.media_url}
  loading="lazy"
  decoding="async"
/>
```

### 3. Cache API Responses
```javascript
// Use React Query or SWR
import { useQuery } from 'react-query';

const { data: stories } = useQuery('stories', fetchStories, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000 // 10 minutes
});
```

---

## 🎉 You're Done!

That's it! You now have:
- ✅ Enhanced Reactions (8 types)
- ✅ Stories Feature (24-hour ephemeral content)
- ✅ Explore Page (discovery & trending)

**Estimated Setup Time:** 1-2 hours total

**Questions?** Check the full documentation:
- [`SOCIAL_MEDIA_RESEARCH_2026.md`](SOCIAL_MEDIA_RESEARCH_2026.md) - Research insights
- [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) - Detailed implementation guide

**Need Help?** Open an issue on GitHub or contact support.

---

Happy coding! 🚀
