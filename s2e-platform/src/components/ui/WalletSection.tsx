"use client";

import { useState, useEffect, useCallback } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { thirdwebClient, activeChain } from "@/lib/thirdweb";
import type { User, WithdrawalRequest } from "@/types/database";
import { linkWallet, requestClaim } from "@/app/actions/wallet";
import { useToast } from "./Toast";
import { PLATFORM } from "@/lib/constants";

interface WalletSectionProps {
  user: User;
  withdrawals: WithdrawalRequest[];
  onWalletLinked: (address: string) => void;
  onClaimSuccess: (amount: number, withdrawalId: string) => void;
}

export default function WalletSection({
  user,
  withdrawals,
  onWalletLinked,
  onClaimSuccess,
}: WalletSectionProps) {
  const { showToast } = useToast();
  const account = useActiveAccount();
  const [isLinking, setIsLinking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimAmount, setClaimAmount] = useState("");
  const [showClaimForm, setShowClaimForm] = useState(false);

  const canWithdraw = user.total_tokens >= PLATFORM.minWithdrawalTokens;
  const hasPendingWithdrawal = withdrawals.some((w) => w.status === "PENDING");

  // 지갑 연결 감지 → 자동으로 DB에 저장
  useEffect(() => {
    if (account?.address && !user.wallet_address && !isLinking) {
      handleLinkWallet(account.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  const handleLinkWallet = useCallback(
    async (address: string) => {
      setIsLinking(true);
      try {
        const result = await linkWallet(address);
        if (result.success) {
          onWalletLinked(address);
        } else {
          showToast(result.message ?? "지갑 연동에 실패했습니다.", "error");
        }
      } catch {
        showToast("지갑 연동 중 오류가 발생했습니다.", "error");
      } finally {
        setIsLinking(false);
      }
    },
    [onWalletLinked, showToast]
  );

  const handleClaim = async () => {
    const amount = parseInt(claimAmount, 10);
    if (isNaN(amount) || amount < PLATFORM.minWithdrawalTokens) {
      showToast(`최소 ${PLATFORM.minWithdrawalTokens} 토큰 이상 입력해 주세요.`, "warning");
      return;
    }
    if (amount > user.total_tokens) {
      showToast("보유 토큰보다 많은 금액은 출금할 수 없습니다.", "error");
      return;
    }

    setIsClaiming(true);
    try {
      const result = await requestClaim(amount);
      if (result.success) {
        showToast(result.message ?? "출금 신청이 완료되었습니다!", "success");
        const withdrawalId = (result.data?.withdrawal_id as string) ?? crypto.randomUUID();
        onClaimSuccess(amount, withdrawalId);
        setClaimAmount("");
        setShowClaimForm(false);
      } else {
        showToast(result.message ?? "출금 신청에 실패했습니다.", "error");
      }
    } catch {
      showToast("출금 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="mt-4">
      {/* Wallet Connection */}
      <div className="rounded-2xl border border-[#2a2a40] bg-gradient-to-br from-[#1a1a2e] to-[#12121a] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c5ce7]/15">
            <svg className="h-5 w-5 text-[#6c5ce7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f0f0f5]">Wallet</p>
            <p className="text-[10px] text-[#55556a]">Polygon Network</p>
          </div>
        </div>

        {user.wallet_address ? (
          <>
            {/* 연동된 지갑 표시 */}
            <div className="rounded-xl border border-[#00d2a0]/20 bg-[#00d2a0]/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#00d2a0] animate-pulse" />
                  <span className="text-xs text-[#8888a0]">Connected</span>
                </div>
                <span className="rounded-lg bg-[#00d2a0]/10 px-2.5 py-1 font-mono text-xs text-[#00d2a0]">
                  {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                </span>
              </div>
            </div>

            {/* 토큰 잔액 + 출금 프로그레스 */}
            <div className="mt-4 rounded-xl border border-[#2a2a40]/50 bg-[#0a0a0f]/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8888a0]">Available Balance</span>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-[#f0f0f5]">
                    {user.total_tokens.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#55556a]">T</span>
                </div>
              </div>

              {/* 최소 출금 프로그레스 바 */}
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a40]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ffc107] to-[#00d2a0] transition-all duration-500"
                    style={{
                      width: `${Math.min((user.total_tokens / PLATFORM.minWithdrawalTokens) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between">
                  <p className="text-[10px] text-[#55556a]">
                    Min. {PLATFORM.minWithdrawalTokens} T to withdraw
                  </p>
                  <p className="text-[10px] text-[#55556a]">
                    {user.total_tokens}/{PLATFORM.minWithdrawalTokens} T
                  </p>
                </div>
              </div>
            </div>

            {/* 출금 버튼 / 폼 */}
            {hasPendingWithdrawal ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#ffc107]/10 px-4 py-3">
                <svg className="h-4 w-4 animate-spin text-[#ffc107]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="text-xs font-medium text-[#ffc107]">
                  Withdrawal pending approval...
                </span>
              </div>
            ) : showClaimForm ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8888a0]">Withdrawal Amount</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={PLATFORM.minWithdrawalTokens}
                        max={user.total_tokens}
                        value={claimAmount}
                        onChange={(e) => setClaimAmount(e.target.value)}
                        placeholder={`Min. ${PLATFORM.minWithdrawalTokens}`}
                        className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 pr-8 text-sm text-[#f0f0f5] placeholder-[#55556a] outline-none focus:border-[#6c5ce7]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#55556a]">T</span>
                    </div>
                    <button
                      onClick={() => setClaimAmount(String(user.total_tokens))}
                      className="rounded-xl border border-[#2a2a40] px-3 py-2.5 text-xs font-medium text-[#a29bfe] transition-colors hover:bg-[#6c5ce7]/10"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming || !claimAmount}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00d2a0] to-[#00b894] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#00d2a0]/25 disabled:opacity-60"
                  >
                    {isClaiming ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M17 7l-5-5-5 5" />
                        </svg>
                        Request Withdrawal
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowClaimForm(false); setClaimAmount(""); }}
                    className="rounded-xl border border-[#2a2a40] px-4 py-2.5 text-xs text-[#8888a0] transition-colors hover:bg-[#1a1a2e]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowClaimForm(true)}
                disabled={!canWithdraw}
                className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                  canWithdraw
                    ? "bg-gradient-to-r from-[#00d2a0] to-[#00b894] text-white hover:shadow-lg hover:shadow-[#00d2a0]/25"
                    : "bg-[#2a2a40] text-[#55556a] cursor-not-allowed"
                }`}
              >
                {canWithdraw ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 7l-5-5-5 5" />
                    </svg>
                    Withdraw Tokens
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {PLATFORM.minWithdrawalTokens - user.total_tokens} more tokens needed
                  </span>
                )}
              </button>
            )}

            {/* 출금 이력 */}
            {withdrawals.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#8888a0]">Withdrawal History</p>
                <div className="flex flex-col gap-2">
                  {withdrawals.slice(0, 5).map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-lg bg-[#0a0a0f]/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            w.status === "COMPLETED"
                              ? "bg-[#00d2a0]"
                              : w.status === "PENDING"
                              ? "bg-[#ffc107] animate-pulse"
                              : w.status === "APPROVED"
                              ? "bg-[#6c5ce7]"
                              : "bg-[#ff4757]"
                          }`}
                        />
                        <span className="text-xs text-[#f0f0f5] font-medium">
                          {w.amount.toLocaleString()} T
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#55556a]">
                          {new Date(w.requested_at).toLocaleDateString()}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            w.status === "COMPLETED"
                              ? "bg-[#00d2a0]/15 text-[#00d2a0]"
                              : w.status === "PENDING"
                              ? "bg-[#ffc107]/15 text-[#ffc107]"
                              : w.status === "APPROVED"
                              ? "bg-[#6c5ce7]/15 text-[#a29bfe]"
                              : "bg-[#ff4757]/15 text-[#ff4757]"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* 지갑 미연동 → ConnectWallet 버튼 */}
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[#6c5ce7]/30 bg-[#6c5ce7]/5 px-6 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c5ce7]/20 to-[#a29bfe]/20">
                <svg className="h-8 w-8 text-[#6c5ce7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#f0f0f5]">Connect Your Wallet</p>
                <p className="mt-1 text-xs text-[#8888a0]">
                  Link your wallet to withdraw earned tokens
                </p>
              </div>

              {isLinking ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#6c5ce7]/10 px-6 py-3">
                  <svg className="h-4 w-4 animate-spin text-[#6c5ce7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-sm text-[#a29bfe]">Linking wallet...</span>
                </div>
              ) : (
                <ConnectButton
                  client={thirdwebClient}
                  chain={activeChain}
                  connectButton={{
                    label: "Connect Wallet",
                    style: {
                      background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
                      color: "#ffffff",
                      borderRadius: "12px",
                      padding: "12px 32px",
                      fontSize: "14px",
                      fontWeight: "600",
                      border: "none",
                      cursor: "pointer",
                    },
                  }}
                  theme="dark"
                />
              )}
            </div>

            <div className="mt-3 rounded-xl border border-[#ffc107]/10 bg-[#ffc107]/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#ffc107]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <p className="text-xs text-[#8888a0]">
                  Minimum <span className="font-semibold text-[#ffc107]">{PLATFORM.minWithdrawalTokens} tokens</span> required to withdraw.
                  Each wallet can only be linked to one account.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
