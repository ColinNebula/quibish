/**
 * Posts & News Feed - Testing Examples
 * 
 * Example code for testing the posts and news feed functionality
 */

import postsService from '../services/postsService';

// ============= MOCK DATA =============

export const mockUsers = {
  user1: {
    id: 'user-001',
    username: 'johndoe',
    displayName: 'John Doe',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=667eea&color=fff'
  },
  user2: {
    id: 'user-002',
    username: 'janedoe',
    displayName: 'Jane Doe',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Doe&background=10b981&color=fff'
  }
};

export const mockPosts = [
  {
    id: 'post-001',
    userId: 'user-001',
    content: 'Just launched my new project! 🚀 #coding #webdev',
    type: 'text',
    visibility: 'public',
    tags: ['#coding', '#webdev'],
    likesCount: 42,
    commentsCount: 5,
    sharesCount: 2,
    createdAt: new Date(Date.now() - 3600000) // 1 hour ago
  },
  {
    id: 'post-002',
    userId: 'user-002',
    content: 'Beautiful sunset today 🌅',
    type: 'image',
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
      }
    ],
    location: 'San Francisco, CA',
    feeling: 'happy',
    visibility: 'public',
    likesCount: 128,
    commentsCount: 15,
    sharesCount: 8,
    createdAt: new Date(Date.now() - 7200000) // 2 hours ago
  }
];

// ============= TEST FUNCTIONS =============

/**
 * Test creating a new post
 */
export async function testCreatePost(userId) {
  console.log('🧪 Testing: Create Post');
  
  try {
    const result = await postsService.createPost({
      userId,
      content: 'This is a test post! #testing',
      type: 'text',
      visibility: 'public',
      tags: ['#testing']
    });
    
    console.log('✅ Post created:', result);
    return result.post;
  } catch (error) {
    console.error('❌ Create post failed:', error);
    throw error;
  }
}

/**
 * Test fetching the news feed
 */
export async function testGetFeed(userId) {
  console.log('🧪 Testing: Get Feed');
  
  try {
    const result = await postsService.getFeed({
      page: 1,
      limit: 10,
      userId,
      sortBy: 'recent'
    });
    
    console.log('✅ Feed loaded:', result.posts.length, 'posts');
    console.log('📄 Pagination:', result.pagination);
    return result;
  } catch (error) {
    console.error('❌ Get feed failed:', error);
    throw error;
  }
}

/**
 * Test liking a post
 */
export async function testLikePost(postId, userId) {
  console.log('🧪 Testing: Like Post');
  
  try {
    const result = await postsService.toggleLike('post', postId, userId, 'like');
    console.log('✅ Like toggled:', result);
    return result;
  } catch (error) {
    console.error('❌ Like post failed:', error);
    throw error;
  }
}

/**
 * Test adding a comment
 */
export async function testAddComment(postId, userId) {
  console.log('🧪 Testing: Add Comment');
  
  try {
    const result = await postsService.addComment(postId, {
      userId,
      content: 'Great post! 👍'
    });
    
    console.log('✅ Comment added:', result);
    return result.comment;
  } catch (error) {
    console.error('❌ Add comment failed:', error);
    throw error;
  }
}

/**
 * Test adding a reply to a comment
 */
export async function testAddReply(postId, commentId, userId) {
  console.log('🧪 Testing: Add Reply');
  
  try {
    const result = await postsService.addComment(postId, {
      userId,
      content: 'Thanks! 😊',
      parentCommentId: commentId
    });
    
    console.log('✅ Reply added:', result);
    return result.comment;
  } catch (error) {
    console.error('❌ Add reply failed:', error);
    throw error;
  }
}

/**
 * Test updating a post
 */
export async function testUpdatePost(postId, userId) {
  console.log('🧪 Testing: Update Post');
  
  try {
    const result = await postsService.updatePost(postId, {
      userId,
      content: 'Updated post content!'
    });
    
    console.log('✅ Post updated:', result);
    return result.post;
  } catch (error) {
    console.error('❌ Update post failed:', error);
    throw error;
  }
}

/**
 * Test deleting a post
 */
export async function testDeletePost(postId, userId) {
  console.log('🧪 Testing: Delete Post');
  
  try {
    const result = await postsService.deletePost(postId, userId);
    console.log('✅ Post deleted:', result);
    return result;
  } catch (error) {
    console.error('❌ Delete post failed:', error);
    throw error;
  }
}

/**
 * Test sharing a post
 */
export async function testSharePost(postId, userId) {
  console.log('🧪 Testing: Share Post');
  
  try {
    const result = await postsService.sharePost(postId, userId, 'Check this out!');
    console.log('✅ Post shared:', result);
    return result.post;
  } catch (error) {
    console.error('❌ Share post failed:', error);
    throw error;
  }
}

/**
 * Test searching posts
 */
export async function testSearchPosts(query, userId) {
  console.log('🧪 Testing: Search Posts');
  
  try {
    const result = await postsService.searchPosts(query, {
      page: 1,
      limit: 10,
      userId
    });
    
    console.log('✅ Search results:', result.posts.length, 'posts found');
    return result;
  } catch (error) {
    console.error('❌ Search failed:', error);
    throw error;
  }
}

/**
 * Test infinite scroll pagination
 */
export async function testInfiniteScroll(userId) {
  console.log('🧪 Testing: Infinite Scroll');
  
  try {
    const results = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 3) {
      const result = await postsService.getFeed({
        page,
        limit: 5,
        userId
      });
      
      results.push(...result.posts);
      hasMore = result.pagination.hasMore;
      page++;
      
      console.log(`📄 Page ${page - 1}: Loaded ${result.posts.length} posts`);
    }
    
    console.log('✅ Total loaded:', results.length, 'posts');
    return results;
  } catch (error) {
    console.error('❌ Infinite scroll failed:', error);
    throw error;
  }
}

/**
 * Test multiple reactions
 */
export async function testReactions(postId, userId) {
  console.log('🧪 Testing: Multiple Reactions');
  
  const reactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
  
  try {
    for (const reaction of reactions) {
      const result = await postsService.toggleLike('post', postId, userId, reaction);
      console.log(`${reaction}: ${result.liked ? '✅' : '❌'}`);
      
      // Small delay to see changes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ All reactions tested');
  } catch (error) {
    console.error('❌ Reactions test failed:', error);
    throw error;
  }
}

// ============= FULL TEST SUITE =============

/**
 * Run complete test suite
 */
export async function runFullTestSuite(userId) {
  console.log('🚀 Starting Full Test Suite...\n');
  
  try {
    // 1. Create a post
    console.log('--- Test 1: Create Post ---');
    const newPost = await testCreatePost(userId);
    console.log('');
    
    // 2. Get feed
    console.log('--- Test 2: Get Feed ---');
    await testGetFeed(userId);
    console.log('');
    
    // 3. Like the post
    console.log('--- Test 3: Like Post ---');
    await testLikePost(newPost.id, userId);
    console.log('');
    
    // 4. Add comment
    console.log('--- Test 4: Add Comment ---');
    const comment = await testAddComment(newPost.id, userId);
    console.log('');
    
    // 5. Add reply
    console.log('--- Test 5: Add Reply ---');
    await testAddReply(newPost.id, comment.id, userId);
    console.log('');
    
    // 6. Update post
    console.log('--- Test 6: Update Post ---');
    await testUpdatePost(newPost.id, userId);
    console.log('');
    
    // 7. Share post
    console.log('--- Test 7: Share Post ---');
    await testSharePost(newPost.id, userId);
    console.log('');
    
    // 8. Search posts
    console.log('--- Test 8: Search Posts ---');
    await testSearchPosts('test', userId);
    console.log('');
    
    // 9. Test reactions
    console.log('--- Test 9: Multiple Reactions ---');
    await testReactions(newPost.id, userId);
    console.log('');
    
    // 10. Test infinite scroll
    console.log('--- Test 10: Infinite Scroll ---');
    await testInfiniteScroll(userId);
    console.log('');
    
    // 11. Delete post
    console.log('--- Test 11: Delete Post ---');
    await testDeletePost(newPost.id, userId);
    console.log('');
    
    console.log('✅ All tests passed! 🎉');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// ============= COMPONENT TESTING HELPERS =============

/**
 * Create test posts for feed testing
 */
export async function createTestPosts(userId, count = 20) {
  console.log(`🧪 Creating ${count} test posts...`);
  
  const posts = [];
  const types = ['text', 'image', 'video'];
  const feelings = ['happy', 'excited', 'grateful', 'blessed', 'motivated'];
  
  for (let i = 0; i < count; i++) {
    try {
      const post = await postsService.createPost({
        userId,
        content: `Test post #${i + 1} with some interesting content! ${['🚀', '✨', '💫', '🎉', '🔥'][i % 5]}`,
        type: types[i % types.length],
        feeling: feelings[i % feelings.length],
        visibility: 'public',
        tags: [`#test${i + 1}`, '#testing']
      });
      
      posts.push(post.post);
      
      if ((i + 1) % 5 === 0) {
        console.log(`   Created ${i + 1}/${count} posts...`);
      }
    } catch (error) {
      console.error(`   Failed to create post ${i + 1}:`, error);
    }
  }
  
  console.log(`✅ Created ${posts.length} test posts`);
  return posts;
}

/**
 * Clean up test data
 */
export async function cleanupTestPosts(userId) {
  console.log('🧹 Cleaning up test posts...');
  
  try {
    const result = await postsService.getUserPosts(userId, { limit: 100 });
    const posts = result.posts || [];
    
    for (const post of posts) {
      if (post.content.includes('Test post #')) {
        await postsService.deletePost(post.id, userId);
      }
    }
    
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// ============= PERFORMANCE TESTING =============

/**
 * Test feed loading performance
 */
export async function testFeedPerformance(userId, iterations = 10) {
  console.log(`🧪 Testing feed performance (${iterations} iterations)...`);
  
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await postsService.getFeed({ page: 1, limit: 10, userId });
    const end = performance.now();
    
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log('📊 Performance Results:');
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   Min: ${min.toFixed(2)}ms`);
  console.log(`   Max: ${max.toFixed(2)}ms`);
  
  return { avg, min, max };
}

// ============= EXPORT FOR USE =============

export default {
  // Mock data
  mockUsers,
  mockPosts,
  
  // Individual tests
  testCreatePost,
  testGetFeed,
  testLikePost,
  testAddComment,
  testAddReply,
  testUpdatePost,
  testDeletePost,
  testSharePost,
  testSearchPosts,
  testInfiniteScroll,
  testReactions,
  
  // Test suite
  runFullTestSuite,
  
  // Helpers
  createTestPosts,
  cleanupTestPosts,
  testFeedPerformance
};
