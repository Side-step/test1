import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getUserSocialLinks,
  getReferralStats,
} from "@/lib/supabase/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import MyPageClient from "./MyPageClient";

export default async function MyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();

  const [socialLinks, referralStats, { data: withdrawals }] = await Promise.all([
    getUserSocialLinks(user.id),
    getReferralStats(user.id),
    supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(10),
  ]);

  // Build a set of linked platforms
  const linkedPlatforms: Record<string, string | null> = {};
  for (const link of socialLinks) {
    linkedPlatforms[link.platform] = link.social_username;
  }

  return (
    <MyPageClient
      user={user}
      linkedPlatforms={linkedPlatforms}
      referralStats={referralStats}
      withdrawals={withdrawals ?? []}
    />
  );
}
