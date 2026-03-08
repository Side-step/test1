-- ============================================================
-- Admin Panel용 추가 마이그레이션
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. Users 테이블에 status 컬럼 추가 (Ban 기능용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_status'
  ) THEN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'BANNED');
  END IF;
END$$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'ACTIVE';

-- 2. Admin용 RLS 정책: service_role key로만 유저 업데이트 가능
-- (기존 RLS에 추가, admin은 supabase service_role key를 통해 접근)
