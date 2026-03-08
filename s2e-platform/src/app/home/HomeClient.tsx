"use client";

import type { User, Mission, MissionStatus } from "@/types/database";
import MissionCard from "@/components/ui/MissionCard";
import TrustScoreGauge from "@/components/ui/TrustScoreGauge";
import BottomNav from "@/components/layout/BottomNav";

interface HomeClientProps {
  user: User;
  missions: Mission[];
  participationMap: Record<string, string>;
}

export default function HomeClient({
  user,
  missions,
  participationMap,
}: HomeClientProps) {
  const availableMissions = missions.filter(
    (m) => !participationMap[m.id] || participationMap[m.id] === "REJECTED"
  );
  const activeMissions = missions.filter(
    (m) =>
      participationMap[m.id] === "PENDING" ||
      participationMap[m.id] === "APPROVED"
  );

  return (
    <div className="min-h-dvh bg-[#0a0a0f] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#2a2a40]/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">
              <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] bg-clip-text text-transparent">
                S2E
              </span>
            </h1>
            <p className="text-[10px] text-[#55556a]">Social-to-Earn</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Token Balance */}
            <div className="flex items-center gap-1.5 rounded-full border border-[#2a2a40] bg-[#1a1a2e] px-3 py-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]">
                <svg
                  className="h-3 w-3 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                </svg>
              </div>
              <span className="text-sm font-bold text-[#f0f0f5]">
                {user.total_tokens.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#55556a]">T</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Stats Card */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-[#2a2a40] bg-gradient-to-br from-[#1a1a2e] to-[#12121a] p-5">
          <TrustScoreGauge score={user.trust_score} />
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#55556a]">
                Trust Score
              </p>
              <p className="text-xs text-[#8888a0]">
                Complete missions & link socials to increase
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl bg-[#2a2a40]/50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-[#f0f0f5]">
                  {user.total_tokens.toLocaleString()}
                </p>
                <p className="text-[9px] text-[#55556a]">TOKENS</p>
              </div>
              <div className="flex-1 rounded-xl bg-[#2a2a40]/50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-[#f0f0f5]">
                  {activeMissions.length}
                </p>
                <p className="text-[9px] text-[#55556a]">ACTIVE</p>
              </div>
            </div>
          </div>
        </div>

        {/* Country Badge */}
        {user.country_code && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#2a2a40]/50 bg-[#1a1a2e]/50 px-4 py-2.5">
            <svg
              className="h-4 w-4 text-[#6c5ce7]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="text-xs text-[#8888a0]">
              Showing missions for{" "}
              <span className="font-semibold text-[#f0f0f5]">
                {user.country_code}
              </span>
            </span>
          </div>
        )}

        {/* VPN Warning */}
        {user.is_vpn && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#ff4757]/20 bg-[#ff4757]/5 px-4 py-3">
            <svg
              className="h-4 w-4 shrink-0 text-[#ff4757]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs text-[#ff4757]">
              VPN/Proxy detected. Some high-value missions may be hidden.
            </p>
          </div>
        )}

        {/* Available Missions */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#f0f0f5]">
              Available Missions
            </h2>
            <span className="rounded-full bg-[#6c5ce7]/10 px-2 py-0.5 text-[10px] font-medium text-[#a29bfe]">
              {availableMissions.length} missions
            </span>
          </div>

          {availableMissions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {availableMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  userTrustScore={user.trust_score}
                  participationStatus={
                    (participationMap[mission.id] as MissionStatus) ?? null
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#2a2a40] bg-[#1a1a2e]/30 py-12">
              <svg
                className="h-10 w-10 text-[#55556a]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 15h8M9 9h.01M15 9h.01" />
              </svg>
              <p className="text-sm text-[#55556a]">
                No missions available right now
              </p>
              <p className="text-xs text-[#55556a]/70">
                Check back later for new missions
              </p>
            </div>
          )}
        </div>

        {/* Active / Completed Missions */}
        {activeMissions.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#f0f0f5]">
                My Missions
              </h2>
              <span className="rounded-full bg-[#00d2a0]/10 px-2 py-0.5 text-[10px] font-medium text-[#00d2a0]">
                {activeMissions.length} in progress
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {activeMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  userTrustScore={user.trust_score}
                  participationStatus={
                    participationMap[mission.id] as MissionStatus
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Spacer for bottom nav */}
        <div className="h-8" />
      </div>

      <BottomNav />
    </div>
  );
}
