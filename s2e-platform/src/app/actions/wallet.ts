"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: Record<string, unknown>;
}

// ============================================================
// 1. 지갑 주소 연동 (Connect Wallet → DB 저장)
// 1:1 매칭 검증: 다른 유저가 이미 등록한 주소면 거부
// ============================================================
export async function linkWallet(walletAddress: string): Promise<ActionResult> {
  try {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return { success: false, error: "INVALID_ADDRESS", message: "유효하지 않은 지갑 주소입니다." };
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." };
    }

    // 현재 유저 조회
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq("auth_id", authUser.id)
      .single();

    if (userError || !currentUser) {
      return { success: false, error: "USER_NOT_FOUND", message: "유저 정보를 찾을 수 없습니다." };
    }

    // 이미 같은 주소가 연동되어 있으면 성공 반환
    if (currentUser.wallet_address === walletAddress) {
      return { success: true, message: "이미 연동된 지갑입니다." };
    }

    // 1:1 매칭 검증: 다른 유저가 이 주소를 사용 중인지 확인
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .neq("id", currentUser.id)
      .single();

    if (existingUser) {
      // TODO: 어뷰징 의심 → error_logs 기록
      // await logAbuseAttempt(currentUser.id, 'duplicate_wallet', walletAddress);
      return {
        success: false,
        error: "WALLET_IN_USE",
        message: "이미 다른 계정에 등록된 지갑 주소입니다.",
      };
    }

    // 지갑 주소 저장
    const { error: updateError } = await supabase
      .from("users")
      .update({ wallet_address: walletAddress })
      .eq("id", currentUser.id);

    if (updateError) {
      return { success: false, error: "UPDATE_FAILED", message: "지갑 연동에 실패했습니다." };
    }

    return { success: true, message: "지갑이 성공적으로 연동되었습니다." };
  } catch {
    return { success: false, error: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
  }
}

// ============================================================
// 2. 출금 신청 (Claim Request)
// 원자적 트랜잭션으로 잔액 차감 + 출금 요청 생성
// ============================================================
export async function requestClaim(amount: number): Promise<ActionResult> {
  try {
    const MIN_WITHDRAWAL = 500;

    if (!amount || amount < MIN_WITHDRAWAL) {
      return {
        success: false,
        error: "BELOW_MINIMUM",
        message: `최소 ${MIN_WITHDRAWAL} 토큰 이상 출금 가능합니다.`,
      };
    }

    // 정수만 허용
    if (!Number.isInteger(amount)) {
      return { success: false, error: "INVALID_AMOUNT", message: "정수 금액만 입력 가능합니다." };
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." };
    }

    // 유저 조회
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, total_tokens, status")
      .eq("auth_id", authUser.id)
      .single();

    if (userError || !user) {
      return { success: false, error: "USER_NOT_FOUND", message: "유저 정보를 찾을 수 없습니다." };
    }

    // 밴 유저 차단
    if (user.status === "BANNED") {
      return { success: false, error: "USER_BANNED", message: "정지된 계정에서는 출금할 수 없습니다." };
    }

    // 지갑 미연동 차단
    if (!user.wallet_address) {
      return { success: false, error: "NO_WALLET", message: "지갑을 먼저 연동해 주세요." };
    }

    // 잔액 검증 (클라이언트 조작 방어)
    if (user.total_tokens < amount) {
      return {
        success: false,
        error: "INSUFFICIENT_BALANCE",
        message: `잔액이 부족합니다. (보유: ${user.total_tokens}, 요청: ${amount})`,
      };
    }

    // RPC 호출 - 원자적 트랜잭션
    const { data, error: rpcError } = await supabase.rpc("request_withdrawal", {
      p_user_id: user.id,
      p_wallet_address: user.wallet_address,
      p_amount: amount,
    });

    if (rpcError) {
      return {
        success: false,
        error: "TRANSACTION_FAILED",
        message: "출금 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    const result = data as ActionResult;

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data,
      message: `${amount} 토큰 출금 신청이 완료되었습니다. 관리자 승인 후 지급됩니다.`,
    };
  } catch {
    return { success: false, error: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
  }
}
