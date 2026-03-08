-- ============================================================
-- ATOMIC MISSION COMPLETION RPC
-- Supabase SQL Editor에 복사/붙여넣기하여 실행
-- 4개 작업을 하나의 트랜잭션으로 묶어 토큰 복사 버그 방지
-- ============================================================

CREATE OR REPLACE FUNCTION complete_mission(
  p_user_id     UUID,
  p_mission_id  UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS를 우회하여 서버 권한으로 실행
AS $$
DECLARE
  v_mission         RECORD;
  v_existing_log    RECORD;
  v_user            RECORD;
  v_social_link     RECORD;
  v_log_id          UUID;
  v_reward_id       UUID;
BEGIN
  -- ========================================
  -- STEP 0: 유저 조회 + Lock (FOR UPDATE로 동시 실행 방지)
  -- ========================================
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', '유저를 찾을 수 없습니다.');
  END IF;

  -- ========================================
  -- STEP 1: 미션 조회 + Lock
  -- ========================================
  SELECT * INTO v_mission
  FROM public.missions
  WHERE id = p_mission_id
    AND is_active = TRUE
  FOR UPDATE;

  IF v_mission IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'MISSION_NOT_FOUND', 'message', '존재하지 않거나 종료된 미션입니다.');
  END IF;

  -- ========================================
  -- PRE-CHECK A: Trust Score 검증
  -- ========================================
  IF v_user.trust_score < v_mission.min_trust_score THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TRUST_SCORE_TOO_LOW',
      'message', '신뢰도를 더 높여주세요. (현재: ' || v_user.trust_score || ', 필요: ' || v_mission.min_trust_score || ')'
    );
  END IF;

  -- ========================================
  -- PRE-CHECK B: 필수 SNS 연동 확인
  -- ========================================
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

  -- ========================================
  -- PRE-CHECK C: 선착순 마감 확인
  -- ========================================
  IF v_mission.current_participants >= v_mission.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'MISSION_FULL', 'message', '선착순 마감된 미션입니다.');
  END IF;

  -- ========================================
  -- PRE-CHECK D: 중복 참여 확인
  -- ========================================
  SELECT * INTO v_existing_log
  FROM public.mission_logs
  WHERE user_id = p_user_id
    AND mission_id = p_mission_id;

  IF v_existing_log IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_PARTICIPATED', 'message', '이미 참여한 미션입니다.');
  END IF;

  -- ========================================
  -- TRANSACTION STEP 1: current_participants + 1
  -- ========================================
  UPDATE public.missions
  SET current_participants = current_participants + 1
  WHERE id = p_mission_id
    AND current_participants < max_participants;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'MISSION_FULL_RACE', 'message', '선착순 마감된 미션입니다. (동시 접근)');
  END IF;

  -- ========================================
  -- TRANSACTION STEP 2: Mission Log 생성 (APPROVED)
  -- ========================================
  INSERT INTO public.mission_logs (user_id, mission_id, status, submitted_at, reviewed_at)
  VALUES (p_user_id, p_mission_id, 'APPROVED', NOW(), NOW())
  RETURNING id INTO v_log_id;

  -- ========================================
  -- TRANSACTION STEP 3: 토큰 지급 (total_tokens += reward)
  -- ========================================
  UPDATE public.users
  SET total_tokens = total_tokens + v_mission.reward_tokens
  WHERE id = p_user_id;

  -- ========================================
  -- TRANSACTION STEP 4: Rewards Log 기록
  -- ========================================
  INSERT INTO public.rewards_log (user_id, reward_type, amount, description)
  VALUES (
    p_user_id,
    'MISSION_COMPLETE',
    v_mission.reward_tokens,
    'Mission: ' || v_mission.title || ' (ID: ' || p_mission_id || ')'
  )
  RETURNING id INTO v_reward_id;

  -- ========================================
  -- 성공 응답 (모든 Step 완료 → auto commit)
  -- 하나라도 실패 시 PostgreSQL이 전체 롤백 처리
  -- ========================================
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
    -- 어뷰징 시도 또는 예기치 않은 에러는 여기서 잡힘
    -- TODO: 프로덕션에서는 별도 error_logs 테이블에 기록
    -- INSERT INTO public.error_logs (user_id, action, error_message, created_at)
    -- VALUES (p_user_id, 'complete_mission', SQLERRM, NOW());
    RAISE;
END;
$$;
