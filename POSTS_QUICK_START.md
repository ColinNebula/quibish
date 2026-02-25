# Posts & News Feed - Quick Start Guide 🚀

Get your social news feed up and running in 5 minutes!

## Step 1: Start the Backend Server

```bash
cd backend
node stable-server.js
```

✅ Server running on `http://localhost:5001`

## Step 2: Import Components

```jsx
// In your App.js or routing file
import { SocialPage } from './components/Social';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();
  
  return (
    <div className="app">
      <SocialPage user={user} />
    </div>
  );
}
```

## Step 3: Done! 🎉

Your news feed is now live with:
- ✅ Post composer
- ✅ News feed with infinite scroll
- ✅ Like, comment, share functionality
- ✅ Nested comments
- ✅ Multiple reactions
- ✅ Responsive design

## Alternative: Use Individual Components

### Just the Feed
```jsx
import { NewsFeed } from './components/Social';

<NewsFeed user={currentUser} />
```

### Just the Composer
```jsx
import { PostComposer } from './components/Social';

<PostComposer 
  user={currentUser}
  onPostCreated={(post) => console.log('New post:', post)}
/>
```

### Individual Post Card
```jsx
import { PostCard } from './components/Social';

<PostCard 
  post={postData}
  currentUser={currentUser}
  onPostDeleted={(id) => console.log('Deleted:', id)}
/>
```

## API Examples

### Create a Post
```javascript
import postsService from './services/postsService';

const newPost = await postsService.createPost({
  userId: user.id,
  content: 'Hello World! 🌍',
  type: 'text',
  visibility: 'public'
});
```

### Like a Post
```javascript
await postsService.toggleLike('post', postId, userId, 'like');
```

### Add Comment
```javascript
await postsService.addComment(postId, {
  userId: user.id,
  content: 'Great post!'
});
```

## Customization

### Change Theme Colors
Edit the CSS variables in your global styles:

```css
:root {
  --primary-color: #1877f2;  /* Change to your brand color */
  --primary-hover: #166fe5;
  --card-bg: #ffffff;
}
```

### Adjust Pagination
```javascript
<NewsFeed 
  user={user}
  postsPerPage={20}  // Default is 10
/>
```

## Troubleshooting

### Posts not loading?
1. Check backend is running: `http://localhost:5001/api/health`
2. Check browser console for errors
3. Verify user is authenticated

### Infinite scroll not working?
1. Make sure you have enough posts (>10)
2. Check browser console for Intersection Observer errors
3. Ensure feed container has proper height

## What's Included

### Backend (/backend)
- ✅ `models/Post.js` - Post data model
- ✅ `models/Comment.js` - Comment data model
- ✅ `models/Like.js` - Like data model
- ✅ `routes/posts.js` - All API endpoints
- ✅ MySQL models in `models/mysql/`

### Frontend (/src)
- ✅ `components/Social/PostComposer.js` - Create posts
- ✅ `components/Social/PostCard.js` - Display posts
- ✅ `components/Social/NewsFeed.js` - Feed with infinite scroll
- ✅ `components/Social/SocialPage.js` - Complete page layout
- ✅ `services/postsService.js` - API client
- ✅ All CSS files included

## Next Steps

1. **Add Authentication** - Integrate with your auth system
2. **Customize Design** - Update CSS to match your brand
3. **Add Features** - Implement additional features like:
   - Photo upload
   - Video support
   - GIF picker
   - Emoji picker
   - Hashtag search
   - User mentions
   - Post scheduling

## Support

Check the full documentation: `POSTS_NEWSFEED_COMPLETE.md`

---

Happy coding! 🎨✨
