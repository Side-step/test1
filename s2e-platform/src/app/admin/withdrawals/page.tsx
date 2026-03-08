import { createServerSupabaseClient } from "@/lib/supabase/server";
import WithdrawalsClient from "./WithdrawalsClient";

export default async function WithdrawalsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: withdrawals } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  return <WithdrawalsClient withdrawals={withdrawals ?? []} />;
}
