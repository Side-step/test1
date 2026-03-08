-- ============================================================
-- WITHDRAWAL SYSTEM - DB Migration
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. 출금 요청 상태 enum
CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- 2. 출금 요청 테이블
CREATE TABLE public.withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  status          withdrawal_status DEFAULT 'PENDING',
  tx_hash         TEXT,                                    -- 온체인 전송 완료 시 기록
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  admin_note      TEXT
);

CREATE INDEX idx_withdrawal_user ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status ON public.withdrawal_requests(status);

-- RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawal_select_own" ON public.withdrawal_requests
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "withdrawal_insert_own" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================================
-- 3. ATOMIC WITHDRAWAL RPC
-- 잔액 차감 + 출금 기록 생성을 하나의 트랜잭션으로 묶음
-- ============================================================
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_user_id        UUID,
  p_wallet_address TEXT,
  p_amount         INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user           RECORD;
  v_pending_count  INTEGER;
  v_withdrawal_id  UUID;
  v_min_amount     INTEGER := 500;
BEGIN
  -- 유저 조회 + Lock
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND', 'message', '유저를 찾을 수 없습니다.');
  END IF;

  -- 밴 유저 차단
  IF v_user.status = 'BANNED' THEN
    RETURN json_build_object('success', false, 'error', 'USER_BANNED', 'message', '정지된 계정입니다.');
  END IF;

  -- 지갑 주소 일치 여부 (변조 방지)
  IF v_user.wallet_address IS NULL OR v_user.wallet_address != p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'WALLET_MISMATCH', 'message', '등록된 지갑 주소와 일치하지 않습니다.');
  END IF;

  -- 최소 출금액 검증
  IF p_amount < v_min_amount THEN
    RETURN json_build_object('success', false, 'error', 'BELOW_MINIMUM', 'message', '최소 ' || v_min_amount || ' 토큰 이상 출금 가능합니다.');
  END IF;

  -- 잔액 부족 검증
  IF v_user.total_tokens < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'message', '잔액이 부족합니다. (보유: ' || v_user.total_tokens || ', 요청: ' || p_amount || ')');
  END IF;

  -- 기존 대기 중 출금 요청 확인 (중복 방지)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.withdrawal_requests
  WHERE user_id = p_user_id AND status = 'PENDING';

  IF v_pending_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'PENDING_EXISTS', 'message', '이미 처리 대기 중인 출금 요청이 있습니다.');
  END IF;

  -- STEP 1: 토큰 차감
  UPDATE public.users
  SET total_tokens = total_tokens - p_amount
  WHERE id = p_user_id
    AND total_tokens >= p_amount;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'DEDUCTION_FAILED', 'message', '토큰 차감에 실패했습니다. (동시 접근)');
  END IF;

  -- STEP 2: 출금 요청 기록 생성
  INSERT INTO public.withdrawal_requests (user_id, wallet_address, amount, status)
  VALUES (p_user_id, p_wallet_address, p_amount, 'PENDING')
  RETURNING id INTO v_withdrawal_id;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'withdrawal_id', v_withdrawal_id,
      'amount', p_amount,
      'new_balance', v_user.total_tokens - p_amount
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
