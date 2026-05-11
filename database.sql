-- University of Bohol — Freedom Wall & Writer's Hub (MySQL schema)
-- Run once: mysql -u root -p < database.sql
-- Or tables are auto-created when you start app.py if the database exists.

CREATE DATABASE IF NOT EXISTS ub_freedom_wall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ub_freedom_wall;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Other',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_posts_created (created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  parent_id INT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  INDEX idx_comments_post (post_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_token VARCHAR(128) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_likes_post_user (post_id, user_token),
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_likes_post (post_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_name VARCHAR(255) NOT NULL,
  author_bio TEXT,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Review',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_submissions_created (created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  transferred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transfers_time (transferred_at DESC)
) ENGINE=InnoDB;
