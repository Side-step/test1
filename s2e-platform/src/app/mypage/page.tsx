import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getUserSocialLinks,
  getReferralStats,
} from "@/lib/supabase/queries";
import MyPageClient from "./MyPageClient";

export default async function MyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const [socialLinks, referralStats] = await Promise.all([
    getUserSocialLinks(user.id),
    getReferralStats(user.id),
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
    />
  );
}
