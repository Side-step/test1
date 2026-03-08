import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// 환경 변수에서 Admin user ID 목록을 가져옴
// .env.local: ADMIN_USER_IDS=uuid1,uuid2,uuid3
function getAdminIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const adminIds = getAdminIds();

  if (!adminIds.includes(user.id)) {
    redirect("/home");
  }

  return user.id;
}
