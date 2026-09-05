-- White-label calling platform schema
-- Reference model: local `vprefer` MySQL database (users / agents / campaigns / calls / wallet_transactions)

CREATE DATABASE IF NOT EXISTS vistara_whitelabel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vistara_whitelabel;

-- ── Users (admin = platform owner, user = client created by / signed up under the admin) ──
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  api_key VARCHAR(64) NOT NULL,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  rate_per_connected_minute DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  rate_per_unconnected_call DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_api_key_unique (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Agents: Vistara AI agents linked into this platform and assigned to a user ──
CREATE TABLE IF NOT EXISTS agents (
  id INT NOT NULL AUTO_INCREMENT,
  vistara_agent_id VARCHAR(255) NOT NULL,
  user_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY agents_vistara_agent_id_unique (vistara_agent_id),
  KEY agents_user_id_idx (user_id),
  CONSTRAINT agents_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Campaigns: bulk-dial batches created by a user ──
CREATE TABLE IF NOT EXISTS campaigns (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  agent_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  total_contacts INT NOT NULL DEFAULT 0,
  completed_calls INT NOT NULL DEFAULT 0,
  connected_calls INT NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY campaigns_user_id_idx (user_id),
  KEY campaigns_agent_id_idx (agent_id),
  CONSTRAINT campaigns_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT campaigns_agent_id_fk FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Calls: every dialed contact, whether from a campaign or an ad-hoc / API call ──
CREATE TABLE IF NOT EXISTS calls (
  id INT NOT NULL AUTO_INCREMENT,
  campaign_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  agent_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  duration INT NOT NULL DEFAULT 0,
  transcript LONGTEXT,
  summary TEXT,
  sentiment VARCHAR(50) DEFAULT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  vistara_call_id VARCHAR(255) DEFAULT NULL,
  recording_url VARCHAR(1000) DEFAULT NULL,
  answers JSON DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  reschedule_at VARCHAR(100) DEFAULT NULL,
  error_message VARCHAR(500) DEFAULT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY calls_campaign_id_idx (campaign_id),
  KEY calls_user_id_idx (user_id),
  KEY calls_agent_id_idx (agent_id),
  KEY calls_vistara_call_id_idx (vistara_call_id),
  KEY calls_status_idx (status),
  CONSTRAINT calls_campaign_id_fk FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE,
  CONSTRAINT calls_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT calls_agent_id_fk FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Wallet transactions: every credit/debit against a user's balance ──
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type ENUM('credit','debit') NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY wallet_transactions_user_id_idx (user_id),
  CONSTRAINT wallet_transactions_user_id_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT wallet_transactions_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
