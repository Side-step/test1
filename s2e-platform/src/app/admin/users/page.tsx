import { createServerSupabaseClient } from "@/lib/supabase/server";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient();

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  return <UsersClient users={users ?? []} />;
}
