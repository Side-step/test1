-- ============================================================
-- S2E Platform - Full Database Schema
-- Supabase PostgreSQL (Copy & Paste into SQL Editor)
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID NOT NULL UNIQUE,                        -- maps to auth.users.id
  device_hash   TEXT,                                         -- browser fingerprint hash
  ip_address    INET,
  country_code  CHAR(2),
  is_vpn        BOOLEAN DEFAULT FALSE,
  trust_score   INTEGER DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  total_tokens  BIGINT DEFAULT 0 CHECK (total_tokens >= 0),
  wallet_address TEXT,                                        -- linked only at claim time
  referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  invited_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_device_hash ON public.users(device_hash);
CREATE INDEX idx_users_referral_code ON public.users(referral_code);
CREATE INDEX idx_users_invited_by ON public.users(invited_by);

-- ============================================================
-- 2. USER SOCIAL LINKS (1:N)
-- ============================================================
CREATE TYPE social_platform AS ENUM ('X', 'TELEGRAM', 'INSTAGRAM', 'DISCORD', 'YOUTUBE');

CREATE TABLE public.user_social_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform        social_platform NOT NULL,
  social_uid      TEXT NOT NULL,                              -- platform-specific user ID
  social_username TEXT,
  access_token    TEXT,                                        -- encrypted at app layer
  account_created_at TIMESTAMPTZ,                             -- for aging filter
  follower_count  INTEGER DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,                      -- passed aging filter
  linked_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_social_links_user ON public.user_social_links(user_id);
CREATE INDEX idx_social_links_platform ON public.user_social_links(platform);

-- ============================================================
-- 3. CLIENTS (Advertisers)
-- ============================================================
CREATE TABLE public.clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  company       TEXT,
  api_key       TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MISSIONS
-- ============================================================
CREATE TYPE mission_type AS ENUM ('LIKE', 'RETWEET', 'FOLLOW', 'REPLY', 'QUOTE', 'JOIN', 'CUSTOM');

CREATE TABLE public.missions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  mission_type          mission_type DEFAULT 'CUSTOM',
  target_url            TEXT,                                 -- tweet/channel URL
  target_countries      TEXT[] DEFAULT '{}',                  -- ISO country codes
  reward_tokens         INTEGER NOT NULL CHECK (reward_tokens > 0),
  max_participants      INTEGER NOT NULL CHECK (max_participants > 0),
  current_participants  INTEGER DEFAULT 0 CHECK (current_participants >= 0),
  min_trust_score       INTEGER DEFAULT 30 CHECK (min_trust_score BETWEEN 0 AND 100),
  required_platform     social_platform,
  starts_at             TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_missions_client ON public.missions(client_id);
CREATE INDEX idx_missions_active ON public.missions(is_active, starts_at, expires_at);

-- ============================================================
-- 5. MISSION LOGS
-- ============================================================
CREATE TYPE mission_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE public.mission_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id    UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  status        mission_status DEFAULT 'PENDING',
  proof_url     TEXT,                                         -- screenshot or link proof
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  UNIQUE(user_id, mission_id)                                 -- one attempt per user per mission
);

CREATE INDEX idx_mission_logs_user ON public.mission_logs(user_id);
CREATE INDEX idx_mission_logs_mission ON public.mission_logs(mission_id);
CREATE INDEX idx_mission_logs_status ON public.mission_logs(status);

-- ============================================================
-- 6. REWARDS LOG (Internal marketing rewards)
-- ============================================================
CREATE TYPE reward_type AS ENUM (
  'SIGNUP',
  'LINK_X',
  'LINK_TELEGRAM',
  'LINK_INSTAGRAM',
  'LINK_DISCORD',
  'REFERRAL_INVITER',
  'REFERRAL_INVITEE',
  'MISSION_COMPLETE',
  'BONUS'
);

CREATE TABLE public.rewards_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type   reward_type NOT NULL,
  amount        INTEGER NOT NULL CHECK (amount > 0),
  description   TEXT,
  is_claimed    BOOLEAN DEFAULT FALSE,                        -- for claimable referral rewards
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_user ON public.rewards_log(user_id);
CREATE INDEX idx_rewards_type ON public.rewards_log(reward_type);

-- ============================================================
-- 7. DEVICE REGISTRY (1-device-1-account enforcement)
-- ============================================================
CREATE TABLE public.device_registry (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_hash   TEXT NOT NULL UNIQUE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address    INET,
  user_agent    TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_user ON public.device_registry(user_id);

-- ============================================================
-- 8. REFERRAL TRACKING
-- ============================================================
CREATE TABLE public.referral_tracking (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  missions_completed  INTEGER DEFAULT 0,
  reward_unlocked     BOOLEAN DEFAULT FALSE,                  -- true when invitee completes 3+ missions
  reward_claimed      BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inviter_id, invitee_id)
);

CREATE INDEX idx_referral_inviter ON public.referral_tracking(inviter_id);
CREATE INDEX idx_referral_invitee ON public.referral_tracking(invitee_id);

-- ============================================================
-- 9. AUTO-UPDATE TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. MISSION PARTICIPANT COUNTER (auto-increment)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_mission_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD IS NULL OR OLD.status != 'APPROVED') THEN
    UPDATE public.missions
    SET current_participants = current_participants + 1
    WHERE id = NEW.mission_id
      AND current_participants < max_participants;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mission_participant_count
  AFTER INSERT OR UPDATE ON public.mission_logs
  FOR EACH ROW EXECUTE FUNCTION increment_mission_participants();

-- ============================================================
-- 11. REFERRAL MISSION COUNTER & AUTO-UNLOCK
-- ============================================================
CREATE OR REPLACE FUNCTION update_referral_on_mission_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD IS NULL OR OLD.status != 'APPROVED') THEN
    UPDATE public.referral_tracking
    SET missions_completed = missions_completed + 1,
        reward_unlocked = CASE
          WHEN missions_completed + 1 >= 3 THEN TRUE
          ELSE reward_unlocked
        END
    WHERE invitee_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referral_mission_count
  AFTER INSERT OR UPDATE ON public.mission_logs
  FOR EACH ROW EXECUTE FUNCTION update_referral_on_mission_complete();

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Users: can read/update own row only
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Social Links: user can CRUD own links
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_links_select_own" ON public.user_social_links
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "social_links_insert_own" ON public.user_social_links
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "social_links_delete_own" ON public.user_social_links
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Missions: all authenticated users can read active missions
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missions_select_active" ON public.missions
  FOR SELECT USING (is_active = TRUE);

-- Mission Logs: users can read/insert own logs
ALTER TABLE public.mission_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mission_logs_select_own" ON public.mission_logs
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "mission_logs_insert_own" ON public.mission_logs
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Rewards Log: users can read own rewards
ALTER TABLE public.rewards_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_select_own" ON public.rewards_log
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Device Registry: no direct user access (server-side only)
ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;

-- Referral Tracking: users can read own referrals
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_select_own" ON public.referral_tracking
  FOR SELECT USING (
    inviter_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Clients: no user access (admin/server-side only)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 13. CONSTANTS / CONFIG TABLE (min withdrawal, signup reward, etc.)
-- ============================================================
CREATE TABLE public.platform_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.platform_config (key, value, description) VALUES
  ('MIN_WITHDRAWAL_TOKENS', '500', 'Minimum tokens required for withdrawal/claim'),
  ('SIGNUP_REWARD', '50', 'Tokens awarded on successful signup'),
  ('SOCIAL_LINK_REWARD', '30', 'Tokens awarded per additional social link'),
  ('REFERRAL_REWARD', '100', 'Tokens awarded to both parties on referral unlock'),
  ('MIN_TWITTER_AGE_DAYS', '30', 'Minimum Twitter account age in days'),
  ('MIN_TWITTER_FOLLOWERS', '10', 'Minimum Twitter followers for full trust'),
  ('REFERRAL_MISSIONS_REQUIRED', '3', 'Missions invitee must complete for referral reward');

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select_all" ON public.platform_config
  FOR SELECT USING (TRUE);
