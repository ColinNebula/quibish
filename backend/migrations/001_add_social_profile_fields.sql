-- Migration: Add Social Profile Fields to Users Table
-- Date: 2026-01-10
-- Description: Extends user profiles with social network features

-- Add new columns to users table for social features
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_photo VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSON DEFAULT NULL;

-- Social stats
ALTER TABLE users ADD COLUMN IF NOT EXISTS friends_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS posts_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0;

-- Enhanced profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender ENUM('male', 'female', 'other', 'prefer_not_to_say') DEFAULT 'prefer_not_to_say';
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_status ENUM('single', 'in_relationship', 'married', 'divorced', 'widowed', 'prefer_not_to_say') DEFAULT 'prefer_not_to_say';

-- Verification and badges
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSON DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type ENUM('personal', 'business', 'creator') DEFAULT 'personal';

-- Activity tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_views_count INT DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- Update existing users to have default values
UPDATE users SET 
  bio = COALESCE(bio, ''),
  friends_count = COALESCE(friends_count, 0),
  posts_count = COALESCE(posts_count, 0),
  followers_count = COALESCE(followers_count, 0),
  following_count = COALESCE(following_count, 0),
  profile_views_count = COALESCE(profile_views_count, 0),
  is_verified = COALESCE(is_verified, FALSE),
  account_type = COALESCE(account_type, 'personal')
WHERE id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.bio IS 'User biography/about me section (max 500 chars)';
COMMENT ON COLUMN users.cover_photo IS 'URL to user cover photo';
COMMENT ON COLUMN users.interests IS 'JSON array of user interests/hobbies';
COMMENT ON COLUMN users.friends_count IS 'Total number of friends/connections';
COMMENT ON COLUMN users.posts_count IS 'Total number of posts created';
COMMENT ON COLUMN users.followers_count IS 'Total number of followers';
COMMENT ON COLUMN users.following_count IS 'Total number of users being followed';
COMMENT ON COLUMN users.is_verified IS 'Whether user account is verified';
COMMENT ON COLUMN users.badges IS 'JSON array of earned badges';
COMMENT ON COLUMN users.last_active_at IS 'Last time user was active on the platform';

COMMIT;
