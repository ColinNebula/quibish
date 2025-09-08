-- MySQL password reset script
-- Run this with: mysql -u root < reset-password.sql

-- Reset root password
ALTER USER 'root'@'localhost' IDENTIFIED BY 'ultra-max-@48F-#ehD';

-- Create quibish database
CREATE DATABASE IF NOT EXISTS quibish;

-- Grant all privileges on quibish database to root
GRANT ALL PRIVILEGES ON quibish.* TO 'root'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show databases to confirm
SHOW DATABASES;