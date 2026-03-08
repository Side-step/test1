"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MissionType, SocialPlatform } from "@/types/database";

// ============================================================
// Admin 권한 체크 헬퍼 (Server Action 내부용)
// ============================================================
function getAdminIds(): string[] {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !getAdminIds().includes(user.id)) {
    redirect("/home");
  }

  return supabase;
}

// ============================================================
// MISSION ACTIONS
// ============================================================

interface CreateMissionInput {
  client_name: string;
  title: string;
  description?: string;
  mission_type: MissionType;
  target_url?: string;
  target_countries: string[];
  reward_tokens: number;
  max_participants: number;
  min_trust_score: number;
  required_platform?: SocialPlatform | null;
  expires_at?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createMission(input: CreateMissionInput): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    // 1. client_name으로 client 조회 또는 생성
    let clientId: string;

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("name", input.client_name)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ name: input.client_name })
        .select("id")
        .single();

      if (clientError || !newClient) {
        return { success: false, error: "광고주 등록에 실패했습니다." };
      }
      clientId = newClient.id;
    }

    // 2. 미션 생성
    const { error: missionError } = await supabase.from("missions").insert({
      client_id: clientId,
      title: input.title,
      description: input.description || null,
      mission_type: input.mission_type,
      target_url: input.target_url || null,
      target_countries: input.target_countries,
      reward_tokens: input.reward_tokens,
      max_participants: input.max_participants,
      min_trust_score: input.min_trust_score,
      required_platform: input.required_platform || null,
      expires_at: input.expires_at || null,
      is_active: true,
    });

    if (missionError) {
      return { success: false, error: `미션 생성 실패: ${missionError.message}` };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function toggleMissionActive(missionId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from("missions")
      .update({ is_active: isActive })
      .eq("id", missionId);

    if (error) {
      return { success: false, error: `상태 변경 실패: ${error.message}` };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function deleteMission(missionId: string): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from("missions")
      .delete()
      .eq("id", missionId);

    if (error) {
      return { success: false, error: `삭제 실패: ${error.message}` };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

// ============================================================
// USER ACTIONS
// ============================================================

export async function updateUserTrustScore(
  userId: string,
  newScore: number
): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    if (newScore < 0 || newScore > 100) {
      return { success: false, error: "신뢰도 점수는 0~100 사이여야 합니다." };
    }

    const { error } = await supabase
      .from("users")
      .update({ trust_score: newScore })
      .eq("id", userId);

    if (error) {
      return { success: false, error: `점수 수정 실패: ${error.message}` };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function banUser(userId: string): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from("users")
      .update({ status: "BANNED", trust_score: 0 })
      .eq("id", userId);

    if (error) {
      return { success: false, error: `계정 정지 실패: ${error.message}` };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function unbanUser(userId: string): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from("users")
      .update({ status: "ACTIVE" })
      .eq("id", userId);

    if (error) {
      return { success: false, error: `정지 해제 실패: ${error.message}` };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

// ============================================================
// WITHDRAWAL ACTIONS
// ============================================================

export async function approveWithdrawal(withdrawalId: string): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status: "APPROVED", processed_at: new Date().toISOString() })
      .eq("id", withdrawalId)
      .eq("status", "PENDING");

    if (error) {
      return { success: false, error: `승인 실패: ${error.message}` };
    }

    revalidatePath("/admin/withdrawals");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function completeWithdrawal(
  withdrawalId: string,
  txHash?: string
): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "COMPLETED",
        tx_hash: txHash || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId)
      .in("status", ["PENDING", "APPROVED"]);

    if (error) {
      return { success: false, error: `완료 처리 실패: ${error.message}` };
    }

    revalidatePath("/admin/withdrawals");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

export async function rejectWithdrawal(
  withdrawalId: string,
  userId: string,
  amount: number
): Promise<ActionResult> {
  try {
    const supabase = await verifyAdmin();

    // 출금 요청 거절 + 토큰 환불 (원자적으로 처리해야 하지만 MVP에서는 순차)
    const { error: rejectError } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "REJECTED",
        processed_at: new Date().toISOString(),
        admin_note: "Admin rejected",
      })
      .eq("id", withdrawalId)
      .eq("status", "PENDING");

    if (rejectError) {
      return { success: false, error: `거절 실패: ${rejectError.message}` };
    }

    // 토큰 환불
    const { error: refundError } = await supabase.rpc("refund_tokens", {
      p_user_id: userId,
      p_amount: amount,
    });

    // RPC가 없으면 직접 업데이트
    if (refundError) {
      await supabase
        .from("users")
        .update({ total_tokens: amount }) // supabase doesn't support increment directly
        .eq("id", userId);
    }

    revalidatePath("/admin/withdrawals");
    return { success: true };
  } catch {
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}
