"use client";

import { useState } from "react";
import type { User, SocialPlatform } from "@/types/database";
import SocialLinkCard from "@/components/ui/SocialLinkCard";
import TrustScoreGauge from "@/components/ui/TrustScoreGauge";
import BottomNav from "@/components/layout/BottomNav";
import { PLATFORM } from "@/lib/constants";

interface ReferralStat {
  invitee_id: string;
  missions_completed: number;
  reward_unlocked: boolean;
  reward_claimed: boolean;
}

interface MyPageClientProps {
  user: User;
  linkedPlatforms: Record<string, string | null>;
  referralStats: ReferralStat[];
}

const ALL_SOCIAL_PLATFORMS: SocialPlatform[] = [
  "X",
  "TELEGRAM",
  "INSTAGRAM",
  "DISCORD",
  "YOUTUBE",
];

export default function MyPageClient({
  user,
  linkedPlatforms,
  referralStats,
}: MyPageClientProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${user.referral_code}`;
  const totalReferrals = referralStats.length;
  const unlockedReferrals = referralStats.filter((r) => r.reward_unlocked).length;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const linkedCount = Object.keys(linkedPlatforms).length;
  const totalPlatforms = ALL_SOCIAL_PLATFORMS.length;

  return (
    <div className="min-h-dvh bg-[#0a0a0f] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#2a2a40]/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-[#f0f0f5]">My Page</h1>
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
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Profile Card */}
        <div className="mt-4 rounded-2xl border border-[#2a2a40] bg-gradient-to-br from-[#1a1a2e] to-[#12121a] p-5">
          <div className="flex items-start gap-4">
            {/* Avatar placeholder */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]">
              <svg
                className="h-7 w-7 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#f0f0f5]">
                  {linkedPlatforms["X"]
                    ? `@${linkedPlatforms["X"]}`
                    : "S2E User"}
                </p>
                {user.country_code && (
                  <span className="rounded bg-[#2a2a40] px-1.5 py-0.5 text-[10px] text-[#8888a0]">
                    {user.country_code}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3">
                <TrustScoreGauge score={user.trust_score} />
              </div>
            </div>
          </div>

          {/* Wallet */}
          <div className="mt-4 rounded-xl border border-[#2a2a40]/50 bg-[#0a0a0f]/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-[#6c5ce7]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                <span className="text-xs text-[#8888a0]">Wallet</span>
              </div>
              {user.wallet_address ? (
                <span className="rounded-lg bg-[#00d2a0]/10 px-2 py-1 font-mono text-xs text-[#00d2a0]">
                  {user.wallet_address.slice(0, 6)}...
                  {user.wallet_address.slice(-4)}
                </span>
              ) : (
                <button className="rounded-lg bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-md hover:shadow-[#6c5ce7]/20 active:scale-[0.97]">
                  Connect Wallet
                </button>
              )}
            </div>
            {!user.wallet_address && (
              <p className="mt-2 text-[10px] text-[#55556a]">
                Connect at claim time. Min. {PLATFORM.minWithdrawalTokens} tokens
                required.
              </p>
            )}
          </div>
        </div>

        {/* SNS Link Quests */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#f0f0f5]">
              Link Social Accounts
            </h2>
            <span className="rounded-full bg-[#6c5ce7]/10 px-2 py-0.5 text-[10px] font-medium text-[#a29bfe]">
              {linkedCount}/{totalPlatforms} linked
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a40]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] transition-all duration-500"
                style={{
                  width: `${(linkedCount / totalPlatforms) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {ALL_SOCIAL_PLATFORMS.map((platform) => (
              <SocialLinkCard
                key={platform}
                platform={platform}
                isLinked={platform in linkedPlatforms}
                username={linkedPlatforms[platform]}
                rewardAmount={PLATFORM.socialLinkReward}
              />
            ))}
          </div>

          {linkedCount < totalPlatforms && (
            <div className="mt-3 rounded-xl border border-dashed border-[#6c5ce7]/20 bg-[#6c5ce7]/5 px-4 py-3 text-center">
              <p className="text-xs text-[#a29bfe]">
                Link all {totalPlatforms} accounts to earn{" "}
                <span className="font-bold">
                  +{(totalPlatforms - linkedCount) * PLATFORM.socialLinkReward} tokens
                </span>{" "}
                and boost your Trust Score!
              </p>
            </div>
          )}
        </div>

        {/* Referral System */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#f0f0f5]">
              Invite Friends
            </h2>
            {totalReferrals > 0 && (
              <span className="rounded-full bg-[#00d2a0]/10 px-2 py-0.5 text-[10px] font-medium text-[#00d2a0]">
                {unlockedReferrals}/{totalReferrals} unlocked
              </span>
            )}
          </div>

          {/* Referral Code Card */}
          <div className="rounded-2xl border border-[#2a2a40] bg-gradient-to-br from-[#1a1a2e] to-[#12121a] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c5ce7]/15">
                <svg
                  className="h-5 w-5 text-[#6c5ce7]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f0f0f5]">
                  Your Referral Code
                </p>
                <p className="font-mono text-xs text-[#a29bfe]">
                  {user.referral_code}
                </p>
              </div>
            </div>

            {/* Copy Link Button */}
            <button
              onClick={handleCopyReferral}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                copied
                  ? "bg-[#00d2a0]/15 text-[#00d2a0]"
                  : "bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white hover:shadow-lg hover:shadow-[#6c5ce7]/25"
              }`}
            >
              {copied ? (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Invite Link
                </>
              )}
            </button>

            {/* Referral Reward Info */}
            <div className="mt-4 rounded-xl border border-[#6c5ce7]/10 bg-[#6c5ce7]/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#a29bfe]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p className="text-xs leading-relaxed text-[#8888a0]">
                  When your friend signs up and completes{" "}
                  <span className="font-semibold text-[#f0f0f5]">
                    {PLATFORM.referralMissionsRequired} missions
                  </span>
                  , both of you will receive{" "}
                  <span className="font-bold text-[#00d2a0]">
                    +{PLATFORM.referralReward} tokens
                  </span>
                  !
                </p>
              </div>
            </div>

            {/* Referral Stats */}
            {totalReferrals > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#8888a0]">
                  Invited Friends
                </p>
                <div className="flex flex-col gap-2">
                  {referralStats.map((stat) => (
                    <div
                      key={stat.invitee_id}
                      className="flex items-center justify-between rounded-lg bg-[#0a0a0f]/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            stat.reward_unlocked
                              ? "bg-[#00d2a0]"
                              : "bg-[#ffc107]"
                          }`}
                        />
                        <span className="font-mono text-xs text-[#8888a0]">
                          {stat.invitee_id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#55556a]">
                          {stat.missions_completed}/
                          {PLATFORM.referralMissionsRequired} missions
                        </span>
                        {stat.reward_unlocked && (
                          <span className="rounded bg-[#00d2a0]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#00d2a0]">
                            {stat.reward_claimed ? "Claimed" : "Claimable"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal Info */}
        <div className="mt-6 rounded-2xl border border-[#2a2a40]/50 bg-[#1a1a2e]/30 p-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-[#ffc107]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]">
                Withdrawal Requirement
              </p>
              <p className="text-[11px] text-[#8888a0]">
                Minimum{" "}
                <span className="font-semibold text-[#ffc107]">
                  {PLATFORM.minWithdrawalTokens} tokens
                </span>{" "}
                needed to claim. Your wallet will be linked at claim time.
              </p>
              {/* Progress to withdrawal */}
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a40]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ffc107] to-[#00d2a0] transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (user.total_tokens / PLATFORM.minWithdrawalTokens) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-[#55556a]">
                  {user.total_tokens}/{PLATFORM.minWithdrawalTokens} T
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>

      <BottomNav />
    </div>
  );
}
