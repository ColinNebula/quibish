// Shared in-memory user store used when no real database model is available
const bcrypt = require('bcryptjs');

function initInMemoryStorage() {
  if (global.inMemoryStorage && typeof global.inMemoryStorage.seedDefaultUsers === 'function') return global.inMemoryStorage;
global.inMemoryStorage = {
  users: [],
  messages: [],
  usingInMemory: false,
  seedDefaultUsers: function() {
    if (this.users.length === 0) {
      const bcrypt = require('bcryptjs');
      const defaultUsers = [
        {
          id: '1',
          username: 'demo',
          email: 'demo@quibish.com',
          password: bcrypt.hashSync('demo', 10),
          name: 'Demo User',
          displayName: 'Demo User',
          avatar: null,
          status: 'online',
          role: 'user',
          bio: 'Welcome! I\'m the demo user for Quibish. Feel free to explore!',
          headline: 'Exploring Quibish',
          cover_photo: null,
          location: null,
          website: null,
          company: null,
          jobTitle: null,
          interests: ['Technology', 'Social Media', 'Communication'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: false,
          badges: [],
          account_type: 'personal',
          date_of_birth: null,
          gender: null,
          relationship_status: null,
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        },
        {
          id: '2',
          username: 'john',
          email: 'john@example.com',
          password: bcrypt.hashSync('password', 10),
          name: 'John Doe',
          displayName: 'John Doe',
          avatar: null,
          status: 'online',
          role: 'user',
          bio: 'Software engineer passionate about building great products.',
          headline: 'Senior Software Engineer at TechCorp',
          cover_photo: null,
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          company: 'TechCorp',
          jobTitle: 'Senior Software Engineer',
          interests: ['Coding', 'Open Source', 'JavaScript', 'React'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: false,
          badges: [],
          account_type: 'personal',
          date_of_birth: null,
          gender: 'male',
          relationship_status: null,
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        },
        {
          id: '3',
          username: 'jane',
          email: 'jane@example.com',
          password: bcrypt.hashSync('password', 10),
          name: 'Jane Smith',
          displayName: 'Jane Smith',
          avatar: null,
          status: 'online',
          role: 'user',
          bio: 'UX Designer creating beautiful and intuitive experiences. Coffee enthusiast ☕',
          headline: 'Lead UX Designer',
          cover_photo: null,
          location: 'New York, NY',
          website: 'https://janesmith.design',
          company: 'Design Studio',
          jobTitle: 'Lead UX Designer',
          interests: ['Design', 'UI/UX', 'Art', 'Photography'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: false,
          badges: [],
          account_type: 'personal',
          date_of_birth: null,
          gender: 'female',
          relationship_status: null,
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        },
        {
          id: '4',
          username: 'admin',
          email: 'admin@quibish.com',
          password: bcrypt.hashSync('dpG6-x5T@-pM&H-$qZ1', 10),
          name: 'Admin User',
          displayName: 'Quibish Admin',
          avatar: null,
          status: 'online',
          role: 'admin',
          bio: 'Official Quibish administrator account. Here to help!',
          headline: 'Platform Administrator',
          cover_photo: null,
          location: null,
          website: 'https://quibish.com',
          company: 'Quibish',
          jobTitle: 'Platform Administrator',
          interests: ['Community Management', 'Technology', 'Support'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: true,
          badges: ['admin', 'verified', 'founder'],
          account_type: 'business',
          date_of_birth: null,
          gender: null,
          relationship_status: null,
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        }
      ];
      this.users = defaultUsers;
      console.log('🌱 In-memory users seeded successfully');
    }
  }
};
  return global.inMemoryStorage;
}

module.exports = { initInMemoryStorage };
