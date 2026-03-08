import { createServerSupabaseClient } from "@/lib/supabase/server";
import MissionsClient from "./MissionsClient";

export default async function MissionsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: missions } = await supabase
    .from("missions")
    .select("*")
    .order("created_at", { ascending: false });

  return <MissionsClient missions={missions ?? []} />;
}
