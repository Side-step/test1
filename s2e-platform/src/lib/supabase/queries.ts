import { createServerSupabaseClient } from "./server";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  return user;
}

export async function getUserSocialLinks(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("user_social_links")
    .select("*")
    .eq("user_id", userId)
    .order("linked_at", { ascending: true });

  return data ?? [];
}

export async function getActiveMissions(
  countryCode: string | null,
  trustScore: number
) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("missions")
    .select("*")
    .eq("is_active", true)
    .order("reward_tokens", { ascending: false });

  const { data } = await query;

  if (!data) return [];

  // Filter missions by country targeting (server-side)
  return data.filter((mission) => {
    const targets = mission.target_countries as string[];
    if (!targets || targets.length === 0) return true; // no restriction
    if (targets.includes("ALL")) return true;
    if (countryCode && targets.includes(countryCode)) return true;
    return false;
  });
}

export async function getUserMissionLogs(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("mission_logs")
    .select("mission_id, status")
    .eq("user_id", userId);

  return data ?? [];
}

export async function getReferralStats(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("referral_tracking")
    .select("invitee_id, missions_completed, reward_unlocked, reward_claimed")
    .eq("inviter_id", userId);

  return data ?? [];
}
