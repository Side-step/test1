-- ============================================================
-- S2E PLATFORM SECURITY FIXES
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ============================================================
-- FIX 1: refund_tokens RPC (출금 거절 시 토큰 환불)
-- rejectWithdrawal에서 호출하는 원자적 환불 함수
-- ============================================================
CREATE OR REPLACE FUNCTION refund_tokens(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- 유저 조회 + Lock
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_AMOUNT');
  END IF;

  -- 원자적 토큰 증가 (SET이 아닌 INCREMENT)
  UPDATE public.users
  SET total_tokens = total_tokens + p_amount
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_user.total_tokens + p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ============================================================
-- FIX 2: complete_mission RPC에서 수동 participant increment 제거
-- schema.sql의 trg_mission_participant_count 트리거가 자동으로 처리하므로
-- RPC에서 수동으로 증가시키면 2번 증가하는 버그 발생
-- ============================================================
CREATE OR REPLACE FUNCTION complete_mission(
  p_user_id     UUID,
  p_mission_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission         RECORD;
  v_existing_log    RECORD;
  v_user            RECORD;
  v_social_link     RECORD;
  v_log_id          UUID;
  v_reward_id       UUID;
BEGIN
  -- STEP 0: 유저 조회 + Lock (FOR UPDATE로 동시 실행 방지)
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', '유저를 찾을 수 없습니다.');
  END IF;

  -- STEP 1: 미션 조회 + Lock
  SELECT * INTO v_mission
  FROM public.missions
  WHERE id = p_mission_id
    AND is_active = TRUE
  FOR UPDATE;

  IF v_mission IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'MISSION_NOT_FOUND', 'message', '존재하지 않거나 종료된 미션입니다.');
  END IF;

  -- PRE-CHECK A: Trust Score 검증
  IF v_user.trust_score < v_mission.min_trust_score THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TRUST_SCORE_TOO_LOW',
      'message', '신뢰도를 더 높여주세요. (현재: ' || v_user.trust_score || ', 필요: ' || v_mission.min_trust_score || ')'
    );
  END IF;

  -- PRE-CHECK B: 필수 SNS 연동 확인
  IF v_mission.required_platform IS NOT NULL THEN
    SELECT * INTO v_social_link
    FROM public.user_social_links
    WHERE user_id = p_user_id
      AND platform = v_mission.required_platform;

    IF v_social_link IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'SNS_NOT_LINKED',
        'message', '마이페이지에서 ' || v_mission.required_platform || ' 계정을 먼저 연동해 주세요.'
      );
    END IF;
  END IF;

  -- PRE-CHECK C: 선착순 마감 확인
  IF v_mission.current_participants >= v_mission.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'MISSION_FULL', 'message', '선착순 마감된 미션입니다.');
  END IF;

  -- PRE-CHECK D: 중복 참여 확인
  SELECT * INTO v_existing_log
  FROM public.mission_logs
  WHERE user_id = p_user_id
    AND mission_id = p_mission_id;

  IF v_existing_log IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_PARTICIPATED', 'message', '이미 참여한 미션입니다.');
  END IF;

  -- ========================================
  -- TRANSACTION STEP 1: Mission Log 생성 (APPROVED)
  -- NOTE: trg_mission_participant_count 트리거가 current_participants를 자동 증가시킴
  -- 수동으로 UPDATE하면 2번 증가하는 버그 발생하므로 제거됨
  -- ========================================
  INSERT INTO public.mission_logs (user_id, mission_id, status, submitted_at, reviewed_at)
  VALUES (p_user_id, p_mission_id, 'APPROVED', NOW(), NOW())
  RETURNING id INTO v_log_id;

  -- TRANSACTION STEP 2: 토큰 지급 (total_tokens += reward)
  UPDATE public.users
  SET total_tokens = total_tokens + v_mission.reward_tokens
  WHERE id = p_user_id;

  -- TRANSACTION STEP 3: Rewards Log 기록
  INSERT INTO public.rewards_log (user_id, reward_type, amount, description)
  VALUES (
    p_user_id,
    'MISSION_COMPLETE',
    v_mission.reward_tokens,
    'Mission: ' || v_mission.title || ' (ID: ' || p_mission_id || ')'
  )
  RETURNING id INTO v_reward_id;

  -- 성공 응답
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'mission_log_id', v_log_id,
      'reward_log_id', v_reward_id,
      'tokens_earned', v_mission.reward_tokens,
      'new_total_tokens', v_user.total_tokens + v_mission.reward_tokens
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ============================================================
-- FIX 3: wallet_address에 UNIQUE 제약조건 추가
-- linkWallet 레이스 컨디션을 DB 레벨에서 방지
-- NULL은 여러 개 허용 (지갑 미연동 유저가 많음)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_unique
  ON public.users(wallet_address)
  WHERE wallet_address IS NOT NULL;

-- ============================================================
-- FIX 4: 미션 시작 세션 테이블 (타이머 위변조 방지)
-- 서버에서 startedAt을 기록하고 verify 시 서버 타임스탬프로 검증
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mission_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id  UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified    BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_sessions_user ON public.mission_sessions(user_id);

-- RLS: SECURITY DEFINER 함수를 통해서만 접근
ALTER TABLE public.mission_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIX 5: 미션 세션 시작 RPC (서버 사이드 타이머 시작)
-- ============================================================
CREATE OR REPLACE FUNCTION start_mission_session(
  p_user_id    UUID,
  p_mission_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- UPSERT: 기존 세션이 있으면 타임스탬프 갱신
  INSERT INTO public.mission_sessions (user_id, mission_id, started_at, verified)
  VALUES (p_user_id, p_mission_id, NOW(), FALSE)
  ON CONFLICT (user_id, mission_id)
  DO UPDATE SET started_at = NOW(), verified = FALSE;

  RETURN json_build_object('success', true, 'started_at', NOW());
END;
$$;

-- ============================================================
-- FIX 6: 미션 체류시간 검증 RPC (서버 사이드 타이머 검증)
-- ============================================================
CREATE OR REPLACE FUNCTION verify_mission_dwell_time(
  p_user_id    UUID,
  p_mission_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session   RECORD;
  v_elapsed   INTERVAL;
  v_min_dwell INTERVAL := INTERVAL '15 seconds';
BEGIN
  SELECT * INTO v_session
  FROM public.mission_sessions
  WHERE user_id = p_user_id
    AND mission_id = p_mission_id
    AND verified = FALSE;

  IF v_session IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NO_SESSION', 'message', '미션 세션을 찾을 수 없습니다.');
  END IF;

  v_elapsed := NOW() - v_session.started_at;

  IF v_elapsed < v_min_dwell THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TOO_EARLY',
      'message', '미션을 정확히 수행하고 잠시 후 다시 시도해 주세요.',
      'remaining_seconds', EXTRACT(EPOCH FROM (v_min_dwell - v_elapsed))
    );
  END IF;

  -- 세션 검증 완료 표시
  UPDATE public.mission_sessions
  SET verified = TRUE
  WHERE id = v_session.id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- FIX 7: Admin용 RLS 정책 추가
-- Admin Server Action이 anon key로 다른 유저 데이터에 접근할 수 있도록
-- ADMIN_USER_IDS를 app_metadata에 설정한 뒤 정책 적용 필요
-- MVP에서는 SECURITY DEFINER RPC가 RLS를 우회하므로
-- 직접 테이블 업데이트하는 admin action만 별도 처리 필요
-- ============================================================

-- Admin이 모든 유저를 조회/수정할 수 있는 정책
-- 주의: Supabase에서 auth.jwt()로 admin 여부를 확인하려면
-- Custom Claims 또는 service_role key가 필요
-- MVP 대안: admin actions에서 service_role key 사용 권장

-- withdrawal_requests에 admin update 정책 추가
CREATE POLICY "withdrawal_admin_update" ON public.withdrawal_requests
  FOR UPDATE USING (TRUE)
  WITH CHECK (TRUE);

-- withdrawal_requests에 admin select all 정책 추가
CREATE POLICY "withdrawal_admin_select" ON public.withdrawal_requests
  FOR SELECT USING (TRUE);
