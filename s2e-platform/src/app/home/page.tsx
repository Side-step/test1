import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getActiveMissions,
  getUserMissionLogs,
} from "@/lib/supabase/queries";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const [missions, missionLogs] = await Promise.all([
    getActiveMissions(user.country_code, user.trust_score),
    getUserMissionLogs(user.id),
  ]);

  // Build a map of mission_id -> status for quick lookup
  const participationMap: Record<string, string> = {};
  for (const log of missionLogs) {
    participationMap[log.mission_id] = log.status;
  }

  return (
    <HomeClient
      user={user}
      missions={missions}
      participationMap={participationMap}
    />
  );
}
