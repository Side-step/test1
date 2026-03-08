export type SocialPlatform = "X" | "TELEGRAM" | "INSTAGRAM" | "DISCORD" | "YOUTUBE";
export type MissionType = "LIKE" | "RETWEET" | "FOLLOW" | "REPLY" | "QUOTE" | "JOIN" | "CUSTOM";
export type MissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RewardType =
  | "SIGNUP"
  | "LINK_X"
  | "LINK_TELEGRAM"
  | "LINK_INSTAGRAM"
  | "LINK_DISCORD"
  | "REFERRAL_INVITER"
  | "REFERRAL_INVITEE"
  | "MISSION_COMPLETE"
  | "BONUS";

export interface User {
  id: string;
  auth_id: string;
  device_hash: string | null;
  ip_address: string | null;
  country_code: string | null;
  is_vpn: boolean;
  trust_score: number;
  total_tokens: number;
  wallet_address: string | null;
  referral_code: string;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSocialLink {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  social_uid: string;
  social_username: string | null;
  access_token: string | null;
  account_created_at: string | null;
  follower_count: number;
  is_verified: boolean;
  linked_at: string;
}

export interface Mission {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  mission_type: MissionType;
  target_url: string | null;
  target_countries: string[];
  reward_tokens: number;
  max_participants: number;
  current_participants: number;
  min_trust_score: number;
  required_platform: SocialPlatform | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MissionLog {
  id: string;
  user_id: string;
  mission_id: string;
  status: MissionStatus;
  proof_url: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface RewardsLog {
  id: string;
  user_id: string;
  reward_type: RewardType;
  amount: number;
  description: string | null;
  is_claimed: boolean;
  created_at: string;
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User> & { auth_id: string };
        Update: Partial<User>;
      };
      user_social_links: {
        Row: UserSocialLink;
        Insert: Partial<UserSocialLink> & { user_id: string; platform: SocialPlatform; social_uid: string };
        Update: Partial<UserSocialLink>;
      };
      missions: {
        Row: Mission;
        Insert: Partial<Mission> & { client_id: string; title: string; reward_tokens: number; max_participants: number };
        Update: Partial<Mission>;
      };
      mission_logs: {
        Row: MissionLog;
        Insert: Partial<MissionLog> & { user_id: string; mission_id: string };
        Update: Partial<MissionLog>;
      };
      rewards_log: {
        Row: RewardsLog;
        Insert: Partial<RewardsLog> & { user_id: string; reward_type: RewardType; amount: number };
        Update: Partial<RewardsLog>;
      };
    };
  };
}
