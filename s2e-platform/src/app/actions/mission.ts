"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ============================================================
// Server Action 응답 타입
// ============================================================
interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    mission_log_id: string;
    reward_log_id: string;
    tokens_earned: number;
    new_total_tokens: number;
  };
}

// ============================================================
// 1. PRE-CHECK: 미션 수행 가능 여부 사전 검증
// 유저가 [수행하기] 버튼을 누르면 호출됨
// ============================================================
export async function precheckMission(missionId: string): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." };
    }

    // 유저 정보 조회
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, trust_score")
      .eq("auth_id", authUser.id)
      .single();

    if (userError || !user) {
      return { success: false, error: "USER_NOT_FOUND", message: "유저 정보를 찾을 수 없습니다." };
    }

    // 미션 정보 조회
    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .select("id, min_trust_score, required_platform, max_participants, current_participants")
      .eq("id", missionId)
      .eq("is_active", true)
      .single();

    if (missionError || !mission) {
      return { success: false, error: "MISSION_NOT_FOUND", message: "존재하지 않거나 종료된 미션입니다." };
    }

    // 조건 A: Trust Score 검증
    if (user.trust_score < mission.min_trust_score) {
      return {
        success: false,
        error: "TRUST_SCORE_TOO_LOW",
        message: `신뢰도를 더 높여주세요. (현재: ${user.trust_score}, 필요: ${mission.min_trust_score})`,
      };
    }

    // 조건 B: 필수 SNS 연동 확인
    if (mission.required_platform) {
      const { data: socialLink } = await supabase
        .from("user_social_links")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", mission.required_platform)
        .single();

      if (!socialLink) {
        return {
          success: false,
          error: "SNS_NOT_LINKED",
          message: `마이페이지에서 ${mission.required_platform} 계정을 먼저 연동해 주세요.`,
        };
      }
    }

    // 조건 C: 선착순 마감 확인
    if (mission.current_participants >= mission.max_participants) {
      return { success: false, error: "MISSION_FULL", message: "선착순 마감된 미션입니다." };
    }

    // 조건 D: 중복 참여 확인
    const { data: existingLog } = await supabase
      .from("mission_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("mission_id", missionId)
      .single();

    if (existingLog) {
      return { success: false, error: "ALREADY_PARTICIPATED", message: "이미 참여한 미션입니다." };
    }

    return { success: true };
  } catch {
    // TODO: 어뷰징 의심 시 error_logs 테이블에 기록
    // await logAbuseAttempt(userId, 'precheck_error', error.message);
    return { success: false, error: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
  }
}

// ============================================================
// 1.5. START SESSION: 서버 사이드 타이머 시작
// 유저가 [수행하기] 버튼을 누르면 precheckMission 성공 후 호출
// 타이머 위변조 방지를 위해 서버에서 시작 시각 기록
// ============================================================
export async function startMissionSession(missionId: string): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." };
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", authUser.id)
      .single();

    if (!user) {
      return { success: false, error: "USER_NOT_FOUND", message: "유저 정보를 찾을 수 없습니다." };
    }

    const { error } = await supabase.rpc("start_mission_session", {
      p_user_id: user.id,
      p_mission_id: missionId,
    });

    if (error) {
      return { success: false, error: "SESSION_FAILED", message: "세션 시작에 실패했습니다." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
  }
}

// ============================================================
// 2. VERIFY & COMPLETE: 미션 인증 + 원자적 보상 지급
// 유저가 [인증하기] 버튼을 누르면 호출됨
// 서버 사이드 세션 테이블로 체류 시간 검증 (클라이언트 타임스탬프 미사용)
// ============================================================
export async function verifyAndCompleteMission(
  missionId: string,
  _startedAt?: number // deprecated: 하위 호환용, 서버 세션으로 대체됨
): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // 인증 확인
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." };
    }

    // 유저 ID 조회
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", authUser.id)
      .single();

    if (userError || !user) {
      return { success: false, error: "USER_NOT_FOUND", message: "유저 정보를 찾을 수 없습니다." };
    }

    // 서버 사이드 체류 시간 검증 (클라이언트 타임스탬프가 아닌 DB 세션 기반)
    const { data: dwellResult, error: dwellError } = await supabase.rpc("verify_mission_dwell_time", {
      p_user_id: user.id,
      p_mission_id: missionId,
    });

    if (dwellError) {
      return { success: false, error: "DWELL_CHECK_FAILED", message: "체류 시간 검증에 실패했습니다." };
    }

    const dwellCheck = dwellResult as { success: boolean; error?: string; message?: string };
    if (!dwellCheck.success) {
      return {
        success: false,
        error: dwellCheck.error ?? "TOO_EARLY",
        message: dwellCheck.message ?? "미션을 정확히 수행하고 잠시 후 다시 시도해 주세요.",
      };
    }

    // RPC 호출 - 원자적 트랜잭션으로 3개 스텝 실행
    const { data, error: rpcError } = await supabase.rpc("complete_mission", {
      p_user_id: user.id,
      p_mission_id: missionId,
    });

    if (rpcError) {
      // TODO: DB 에러 시 error_logs 테이블에 기록
      // await logAbuseAttempt(user.id, 'rpc_error', rpcError.message);
      return {
        success: false,
        error: "TRANSACTION_FAILED",
        message: "미션 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    // RPC에서 반환한 JSON 파싱
    const result = data as ActionResult;

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data,
      message: `미션 완료! +${result.data?.tokens_earned} 토큰을 획득했습니다.`,
    };
  } catch {
    // TODO: 예기치 않은 에러 시 어뷰징 의심 로그 기록
    // await logAbuseAttempt('unknown', 'verify_crash', error.message);
    return { success: false, error: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
  }
}
