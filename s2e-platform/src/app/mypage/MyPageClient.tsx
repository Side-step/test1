"use client";

import { useState, useCallback } from "react";
import type { User, SocialPlatform, WithdrawalRequest } from "@/types/database";
import SocialLinkCard from "@/components/ui/SocialLinkCard";
import TrustScoreGauge from "@/components/ui/TrustScoreGauge";
import BottomNav from "@/components/layout/BottomNav";
import ToastContainer, { useToast } from "@/components/ui/Toast";
import WalletSection from "@/components/ui/WalletSection";
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
  withdrawals: WithdrawalRequest[];
}

const ALL_SOCIAL_PLATFORMS: SocialPlatform[] = [
  "X",
  "TELEGRAM",
  "INSTAGRAM",
  "DISCORD",
  "YOUTUBE",
];

export default function MyPageClient({
  user: initialUser,
  linkedPlatforms,
  referralStats,
  withdrawals: initialWithdrawals,
}: MyPageClientProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${user.referral_code}`;
  const totalReferrals = referralStats.length;
  const unlockedReferrals = referralStats.filter((r) => r.reward_unlocked).length;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const handleWalletLinked = useCallback(
    (walletAddress: string) => {
      setUser((prev) => ({ ...prev, wallet_address: walletAddress }));
      showToast("지갑이 성공적으로 연동되었습니다!", "success");
    },
    [showToast]
  );

  const handleClaimSuccess = useCallback(
    (amount: number, withdrawalId: string) => {
      setUser((prev) => ({
        ...prev,
        total_tokens: prev.total_tokens - amount,
      }));
      setWithdrawals((prev) => [
        {
          id: withdrawalId,
          user_id: user.id,
          wallet_address: user.wallet_address!,
          amount,
          status: "PENDING" as const,
          tx_hash: null,
          requested_at: new Date().toISOString(),
          processed_at: null,
          admin_note: null,
        },
        ...prev,
      ]);
    },
    [user.id, user.wallet_address]
  );

  const linkedCount = Object.keys(linkedPlatforms).length;
  const totalPlatforms = ALL_SOCIAL_PLATFORMS.length;

  return (
    <div className="min-h-dvh bg-[#0a0a0f] pb-24">
      <ToastContainer />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#2a2a40]/50 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-[#f0f0f5]">My Page</h1>
          <div className="flex items-center gap-1.5 rounded-full border border-[#2a2a40] bg-[#1a1a2e] px-3 py-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]">
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#f0f0f5]">
                  {linkedPlatforms["X"] ? `@${linkedPlatforms["X"]}` : "S2E User"}
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
        </div>

        {/* Wallet & Withdrawal Section */}
        <WalletSection
          user={user}
          withdrawals={withdrawals}
          onWalletLinked={handleWalletLinked}
          onClaimSuccess={handleClaimSuccess}
        />

        {/* SNS Link Quests */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#f0f0f5]">Link Social Accounts</h2>
            <span className="rounded-full bg-[#6c5ce7]/10 px-2 py-0.5 text-[10px] font-medium text-[#a29bfe]">
              {linkedCount}/{totalPlatforms} linked
            </span>
          </div>

          <div className="mb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a40]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] transition-all duration-500"
                style={{ width: `${(linkedCount / totalPlatforms) * 100}%` }}
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
            <h2 className="text-sm font-bold text-[#f0f0f5]">Invite Friends</h2>
            {totalReferrals > 0 && (
              <span className="rounded-full bg-[#00d2a0]/10 px-2 py-0.5 text-[10px] font-medium text-[#00d2a0]">
                {unlockedReferrals}/{totalReferrals} unlocked
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-[#2a2a40] bg-gradient-to-br from-[#1a1a2e] to-[#12121a] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c5ce7]/15">
                <svg className="h-5 w-5 text-[#6c5ce7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f0f0f5]">Your Referral Code</p>
                <p className="font-mono text-xs text-[#a29bfe]">{user.referral_code}</p>
              </div>
            </div>

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
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Invite Link
                </>
              )}
            </button>

            <div className="mt-4 rounded-xl border border-[#6c5ce7]/10 bg-[#6c5ce7]/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#a29bfe]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p className="text-xs leading-relaxed text-[#8888a0]">
                  When your friend signs up and completes{" "}
                  <span className="font-semibold text-[#f0f0f5]">{PLATFORM.referralMissionsRequired} missions</span>,
                  both of you will receive{" "}
                  <span className="font-bold text-[#00d2a0]">+{PLATFORM.referralReward} tokens</span>!
                </p>
              </div>
            </div>

            {totalReferrals > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#8888a0]">Invited Friends</p>
                <div className="flex flex-col gap-2">
                  {referralStats.map((stat) => (
                    <div key={stat.invitee_id} className="flex items-center justify-between rounded-lg bg-[#0a0a0f]/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${stat.reward_unlocked ? "bg-[#00d2a0]" : "bg-[#ffc107]"}`} />
                        <span className="font-mono text-xs text-[#8888a0]">{stat.invitee_id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#55556a]">
                          {stat.missions_completed}/{PLATFORM.referralMissionsRequired} missions
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

        <div className="h-8" />
      </div>

      <BottomNav />
    </div>
  );
}
