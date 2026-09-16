-- ============================================================
-- CORTEX PLATFORM — SQL SCHEMA (reference)
-- CHAR(36) -> UUID, DATETIME -> TIMESTAMP, AUTO_INCREMENT -> handled
-- automatically by SERIAL/IDENTITY when using Sequelize.
--
-- NOTE: In Phase 1, server.js calls sequelize.sync() which creates
-- these tables automatically from the model files in models/sql/.
-- This file exists so a developer can read the schema at a glance,
-- or set it up manually on a host where sync() is not desired
-- (e.g. a shared Hostinger MySQL instance).
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name ENUM('owner','manager','analyst','client_viewer') NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  owner_user_id CHAR(36) NOT NULL,
  plan ENUM('trial','starter','agency','enterprise') NOT NULL DEFAULT 'trial',
  credits_balance INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role_id INT NOT NULL,
  invited_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_workspace_user (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS sites (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  display_name VARCHAR(150),
  status ENUM('pending','crawling','active','paused','error') NOT NULL DEFAULT 'pending',
  timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata',
  last_crawled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_workspace_domain (workspace_id, domain),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tracked_keywords (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  search_engine ENUM('google','bing') NOT NULL DEFAULT 'google',
  device ENUM('desktop','mobile') NOT NULL DEFAULT 'desktop',
  location VARCHAR(120) NOT NULL DEFAULT 'India',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tag VARCHAR(80),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_keyword_variant (site_id, keyword, device, location, search_engine),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rank_history (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  position INT NULL,
  search_engine ENUM('google','bing') NOT NULL DEFAULT 'google',
  device ENUM('desktop','mobile') NOT NULL DEFAULT 'desktop',
  location VARCHAR(120),
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_site_keyword (site_id, keyword),
  INDEX idx_checked_at (checked_at),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(6) NOT NULL DEFAULT 'INR',
  credits_purchased INT NOT NULL DEFAULT 0,
  status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id CHAR(36) PRIMARY KEY,
  site_id CHAR(36) NOT NULL,
  provider ENUM('google_search_console','google_analytics','google_tag_manager','bing_webmaster') NOT NULL,
  connected_account_email VARCHAR(160),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME NULL,
  api_key VARCHAR(255),
  metadata JSON,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_site_provider (site_id, provider),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
