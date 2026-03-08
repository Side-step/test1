import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  // 통계 데이터 병렬 조회
  const [
    { count: totalUsers },
    { count: totalMissions },
    { count: activeMissions },
    { data: recentRewards },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("missions").select("*", { count: "exact", head: true }),
    supabase.from("missions").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("rewards_log")
      .select("amount")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const totalTokensDistributed = recentRewards?.reduce((sum, r) => sum + r.amount, 0) ?? 0;

  const stats = [
    {
      label: "Total Users",
      value: totalUsers ?? 0,
      color: "from-[#6c5ce7] to-[#a29bfe]",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Active Missions",
      value: activeMissions ?? 0,
      color: "from-[#00d2a0] to-[#00b894]",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Total Missions",
      value: totalMissions ?? 0,
      color: "from-[#fdcb6e] to-[#f39c12]",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      label: "Tokens Distributed",
      value: totalTokensDistributed.toLocaleString(),
      color: "from-[#ff6b6b] to-[#ee5a24]",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="8" r="6" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#8888a0]">
          S2E Platform overview and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[#1e1e35] bg-[#12121f] p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white`}
              >
                {stat.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#f0f0f5]">{stat.value}</p>
            <p className="mt-1 text-xs text-[#55556a]">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
