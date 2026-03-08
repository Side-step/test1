"use client";

import { useState, useEffect, useCallback } from "react";
import type { Mission, MissionStatus, SocialPlatform } from "@/types/database";
import { precheckMission, verifyAndCompleteMission } from "@/app/actions/mission";
import { useToast } from "./Toast";

// ============================================================
// Platform Icons (재사용)
// ============================================================
const platformIcons: Record<SocialPlatform, { icon: React.ReactNode; color: string }> = {
  X: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "#ffffff",
  },
  TELEGRAM: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    color: "#26A5E4",
  },
  INSTAGRAM: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
    color: "#E4405F",
  },
  DISCORD: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
      </svg>
    ),
    color: "#5865F2",
  },
  YOUTUBE: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#0a0a0f" />
      </svg>
    ),
    color: "#FF0000",
  },
};

// ============================================================
// Mission Card 상태 관리
// ============================================================
type MissionPhase = "idle" | "doing" | "verifying" | "completed";

interface MissionCardProps {
  mission: Mission;
  userTrustScore: number;
  participationStatus?: MissionStatus | null;
  onMissionComplete?: (missionId: string, tokensEarned: number) => void;
}

const MIN_DWELL_SECONDS = 15;

export default function MissionCard({
  mission,
  userTrustScore,
  participationStatus,
  onMissionComplete,
}: MissionCardProps) {
  const { showToast } = useToast();
  const isLocked = userTrustScore < mission.min_trust_score;
  const isCompleted = participationStatus === "APPROVED";
  const isPending = participationStatus === "PENDING";
  const isFull = mission.current_participants >= mission.max_participants;
  const progress =
    mission.max_participants > 0
      ? (mission.current_participants / mission.max_participants) * 100
      : 0;

  const platform = mission.required_platform
    ? platformIcons[mission.required_platform]
    : null;

  // 미션 수행 상태
  const [phase, setPhase] = useState<MissionPhase>(
    isCompleted ? "completed" : "idle"
  );
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(MIN_DWELL_SECONDS);
  const [isLoading, setIsLoading] = useState(false);

  // 카운트다운 타이머
  useEffect(() => {
    if (phase !== "doing" || !startedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(MIN_DWELL_SECONDS - elapsed, 0);
      setCountdown(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, startedAt]);

  // [수행하기] 버튼 핸들러
  const handleStartMission = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await precheckMission(mission.id);

      if (!result.success) {
        const toastType =
          result.error === "TRUST_SCORE_TOO_LOW" || result.error === "SNS_NOT_LINKED"
            ? "warning"
            : "error";
        showToast(result.message ?? "미션을 시작할 수 없습니다.", toastType);
        return;
      }

      // Pre-check 통과 → 외부 링크로 이동 (새 탭) + 타이머 시작
      const now = Date.now();
      setStartedAt(now);
      setCountdown(MIN_DWELL_SECONDS);
      setPhase("doing");

      if (mission.target_url) {
        window.open(mission.target_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      showToast("알 수 없는 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [mission.id, mission.target_url, showToast]);

  // [인증하기] 버튼 핸들러
  const handleVerify = useCallback(async () => {
    if (!startedAt) return;

    // 클라이언트 1차 체류 시간 검증
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_DWELL_SECONDS * 1000) {
      showToast("미션을 정확히 수행하고 잠시 후 다시 시도해 주세요.", "warning");
      return;
    }

    setIsLoading(true);
    setPhase("verifying");

    try {
      const result = await verifyAndCompleteMission(mission.id, startedAt);

      if (!result.success) {
        setPhase("doing"); // 다시 인증 가능 상태로
        const toastType = result.error === "TOO_EARLY" ? "warning" : "error";
        showToast(result.message ?? "인증에 실패했습니다.", toastType);
        return;
      }

      // 성공!
      setPhase("completed");
      showToast(
        result.message ?? `미션 완료! +${result.data?.tokens_earned} 토큰 획득!`,
        "success"
      );

      if (result.data && onMissionComplete) {
        onMissionComplete(mission.id, result.data.tokens_earned);
      }
    } catch {
      setPhase("doing");
      showToast("인증 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [startedAt, mission.id, showToast, onMissionComplete]);

  // ============================================================
  // 버튼 렌더링 로직
  // ============================================================
  const renderActionButton = () => {
    if (isLocked) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-[#2a2a40]/50 px-3 py-2">
          <svg className="h-4 w-4 text-[#ffc107]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-xs text-[#ffc107]">
            Trust Score {mission.min_trust_score}+ required
          </span>
        </div>
      );
    }

    if (phase === "completed" || isCompleted) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-[#00d2a0]/10 px-3 py-2">
          <svg className="h-4 w-4 text-[#00d2a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="text-xs font-medium text-[#00d2a0]">Completed</span>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-[#ffc107]/10 px-3 py-2">
          <svg className="h-4 w-4 animate-spin text-[#ffc107]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-xs font-medium text-[#ffc107]">Under Review</span>
        </div>
      );
    }

    if (isFull) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-[#ff4757]/10 px-3 py-2">
          <span className="text-xs font-medium text-[#ff4757]">Fully Participated</span>
        </div>
      );
    }

    // PHASE: idle → "수행하기" 버튼
    if (phase === "idle") {
      return (
        <button
          onClick={handleStartMission}
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] px-4 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#6c5ce7]/25 active:scale-[0.98] disabled:opacity-60"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Checking...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Do Mission
            </span>
          )}
        </button>
      );
    }

    // PHASE: doing → 카운트다운 + "인증하기" 버튼
    if (phase === "doing") {
      const canVerify = countdown === 0;

      return (
        <div className="flex flex-col gap-2">
          {/* 카운트다운 프로그레스 */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2a2a40]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ffc107] to-[#00d2a0] transition-all duration-1000"
                style={{
                  width: `${((MIN_DWELL_SECONDS - countdown) / MIN_DWELL_SECONDS) * 100}%`,
                }}
              />
            </div>
            {!canVerify && (
              <span className="shrink-0 text-xs font-mono text-[#ffc107]">
                {countdown}s
              </span>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={!canVerify || isLoading}
            className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
              canVerify
                ? "bg-gradient-to-r from-[#00d2a0] to-[#00b894] text-white hover:shadow-lg hover:shadow-[#00d2a0]/25"
                : "bg-[#2a2a40] text-[#55556a] cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Verifying...
              </span>
            ) : canVerify ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Verify Mission
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                Complete the mission first...
              </span>
            )}
          </button>
        </div>
      );
    }

    // PHASE: verifying → 로딩 상태
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-[#6c5ce7]/10 px-3 py-2.5">
        <svg className="h-4 w-4 animate-spin text-[#6c5ce7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-xs font-medium text-[#a29bfe]">Processing...</span>
      </div>
    );
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        isLocked
          ? "border-[#2a2a40]/50 bg-[#1a1a2e]/30 opacity-60"
          : phase === "completed" || isCompleted
          ? "border-[#00d2a0]/30 bg-[#00d2a0]/5"
          : phase === "doing"
          ? "border-[#ffc107]/30 bg-[#ffc107]/5"
          : "border-[#2a2a40] bg-[#1a1a2e] hover:border-[#6c5ce7]/40 hover:bg-[#222240]"
      }`}
    >
      <div className="p-4">
        {/* Top row: platform icon + reward */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {platform && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${platform.color}15` }}
              >
                <span style={{ color: platform.color }}>{platform.icon}</span>
              </div>
            )}
            <span className="rounded-full bg-[#6c5ce7]/15 px-2.5 py-0.5 text-xs font-medium text-[#a29bfe]">
              {mission.mission_type}
            </span>
            {phase === "doing" && (
              <span className="rounded-full bg-[#ffc107]/15 px-2 py-0.5 text-[10px] font-medium text-[#ffc107] animate-pulse">
                IN PROGRESS
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[#00d2a0]/10 px-3 py-1">
            <span className="text-sm font-bold text-[#00d2a0]">
              +{mission.reward_tokens}
            </span>
            <span className="text-[10px] font-medium text-[#00d2a0]/70">T</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-1 text-sm font-semibold text-[#f0f0f5]">
          {mission.title}
        </h3>
        {mission.description && (
          <p className="mb-3 text-xs text-[#8888a0] line-clamp-2">
            {mission.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-[#55556a]">Participants</span>
            <span className="text-[10px] text-[#8888a0]">
              {mission.current_participants}/{mission.max_participants}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a40]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        {renderActionButton()}
      </div>

      {/* Min trust score indicator */}
      {!isLocked && mission.min_trust_score > 0 && (
        <div className="absolute right-3 top-3">
          <span className="text-[9px] text-[#55556a]">
            TS {mission.min_trust_score}+
          </span>
        </div>
      )}
    </div>
  );
}
