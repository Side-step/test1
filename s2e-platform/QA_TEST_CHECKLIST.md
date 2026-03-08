# S2E Platform - Security Audit Report & QA Test Checklist

## Part 1: Security Audit Report

### CRITICAL Vulnerabilities (Fixed)

| # | Severity | Issue | Root Cause | Fix Applied |
|---|----------|-------|------------|-------------|
| 1 | **CRITICAL** | `rejectWithdrawal`이 토큰을 SET(덮어쓰기)으로 환불 | `update({ total_tokens: amount })`가 기존 잔액을 무시하고 환불 금액으로 대체 | `refund_tokens` RPC 생성 → `total_tokens + p_amount` 원자적 증가 |
| 2 | **CRITICAL** | `refund_tokens` RPC 미존재 | admin.ts에서 호출하지만 DB에 함수 없음 → 직접 업데이트 fallback이 잘못됨 | `security_fixes.sql`에 `refund_tokens` RPC 추가 |
| 3 | **CRITICAL** | `current_participants` 2회 증가 | `complete_mission` RPC에서 수동 +1 + `trg_mission_participant_count` 트리거 자동 +1 = 2배 증가 | RPC에서 수동 increment 제거, 트리거에만 의존 |
| 4 | **HIGH** | 15초 타이머 위변조 가능 | `startedAt`이 클라이언트에서 전송 → 과거 타임스탬프 조작 가능 | `mission_sessions` 테이블 + 서버 사이드 RPC로 시작/검증 분리 |
| 5 | **MEDIUM** | `linkWallet` 레이스 컨디션 | check-then-update 패턴 → 두 유저가 동시에 같은 주소 등록 가능 | `wallet_address`에 UNIQUE 인덱스 추가 + 23505 에러 핸들링 |
| 6 | **MEDIUM** | Admin 액션 RLS 차단 가능 | `verifyAdmin()`이 anon key로 다른 유저 데이터 수정 시도 | withdrawal_requests에 admin update/select 정책 추가 |

### Remaining Recommendations (Post-MVP)

1. **Service Role Key**: Admin Server Actions에서 `SUPABASE_SERVICE_ROLE_KEY` 사용으로 RLS 완전 우회
2. **Rate Limiting**: 미션 인증 요청에 IP/유저별 rate limit 적용
3. **Error Logging**: `error_logs` 테이블 생성 후 어뷰징 시도 기록
4. **Audit Trail**: Admin 액션에 대한 감사 로그 테이블 추가

---

## Part 2: Manual QA Test Checklist

### A. 회원가입 & 인증 플로우

- [ ] **A-1** 소셜 로그인(Google/GitHub)으로 신규 가입 성공
- [ ] **A-2** 가입 시 `users` 테이블에 레코드 생성 확인 (`trust_score=50, total_tokens=50`)
- [ ] **A-3** 가입 보상 50T가 `rewards_log`에 `SIGNUP` 타입으로 기록
- [ ] **A-4** 로그인 후 `/home`으로 리다이렉트
- [ ] **A-5** 미인증 상태에서 `/mypage` 접근 시 `/`로 리다이렉트
- [ ] **A-6** 미인증 상태에서 `/admin` 접근 시 `/home`으로 리다이렉트

### B. 미션 수행 플로우

- [ ] **B-1** 미션 카드에서 [Do Mission] 클릭 → precheck 성공 → 새 탭 열림 + 15초 타이머 시작
- [ ] **B-2** 타이머 15초 완료 전 [Verify Mission] 버튼 비활성화 상태 확인
- [ ] **B-3** 타이머 완료 후 [Verify Mission] 클릭 → 토큰 지급 + "Completed" 표시
- [ ] **B-4** 동일 미션 재참여 시 "이미 참여한 미션입니다" 에러
- [ ] **B-5** Trust Score 부족 시 잠금 아이콘 + "Trust Score X+ required" 표시
- [ ] **B-6** 필수 SNS 미연동 시 "마이페이지에서 OOO 계정을 먼저 연동해 주세요" 에러
- [ ] **B-7** 선착순 마감된 미션 [Do Mission] 클릭 시 "선착순 마감" 에러
- [ ] **B-8** 미션 완료 후 참여자 수 정확히 +1 (2가 아닌 1)
- [ ] **B-9** 미션 완료 후 토큰 잔액이 정확히 `reward_tokens`만큼 증가

#### B-Security: 미션 어뷰징 테스트

- [ ] **B-S1** [Do Mission] 더블 클릭 → 두 번째 클릭 무시 (isLoading 상태)
- [ ] **B-S2** [Verify Mission] 더블 클릭 → 두 번째 클릭 무시
- [ ] **B-S3** DevTools에서 `startedAt` 조작 → 서버 세션 기반 검증으로 차단 확인
- [ ] **B-S4** 브라우저 2개에서 동시 미션 수행 → `UNIQUE(user_id, mission_id)` 제약에 의한 중복 방지
- [ ] **B-S5** 네트워크 오류 발생 시 "미션 처리 중 오류" 에러 메시지 표시

### C. 지갑 연동 플로우

- [ ] **C-1** Thirdweb ConnectButton으로 MetaMask 연결 → 주소 자동 연동
- [ ] **C-2** 연동된 지갑 주소가 `/mypage`에 표시
- [ ] **C-3** 다른 계정에서 이미 연동된 주소 → "이미 다른 계정에 등록된 지갑" 에러
- [ ] **C-4** 유효하지 않은 주소 형식(0x가 아닌) → "유효하지 않은 지갑 주소" 에러

#### C-Security: 지갑 레이스 컨디션 테스트

- [ ] **C-S1** 두 브라우저에서 동시에 같은 주소 연동 시도 → 하나만 성공, 나머지 UNIQUE 제약 에러
- [ ] **C-S2** 이미 연동된 주소로 다시 연동 시도 → "이미 연동된 지갑입니다" (정상)

### D. 출금 신청 플로우

- [ ] **D-1** 500T 이상 보유 + 지갑 연동 상태에서 출금 신청 성공
- [ ] **D-2** 출금 후 잔액이 정확히 차감됨 확인
- [ ] **D-3** 출금 신청 후 `withdrawal_requests`에 PENDING 상태 기록
- [ ] **D-4** 이미 PENDING 출금이 있을 때 추가 신청 차단 ("이미 처리 대기 중")
- [ ] **D-5** 500T 미만 출금 시도 → "최소 500 토큰" 에러
- [ ] **D-6** 소수점 금액 입력 → "정수 금액만 입력 가능" 에러
- [ ] **D-7** 잔액 초과 출금 시도 → "잔액이 부족합니다" 에러
- [ ] **D-8** 지갑 미연동 상태에서 출금 시도 → "지갑을 먼저 연동해 주세요" 에러
- [ ] **D-9** BAN된 유저 출금 시도 → "정지된 계정" 에러

#### D-Security: 출금 더블 스펜드 테스트

- [ ] **D-S1** 출금 버튼 더블 클릭 → 두 번째 요청 차단 (isLoading)
- [ ] **D-S2** 브라우저 2개에서 동시 출금 → `FOR UPDATE` 잠금으로 하나만 성공
- [ ] **D-S3** DevTools에서 `amount` 조작 → RPC의 잔액 재검증으로 차단

### E. 관리자 패널 테스트

#### E-1. 미션 관리

- [ ] **E-1a** 미션 생성 폼 입력 → DB에 정상 저장
- [ ] **E-1b** 미션 활성/비활성 토글 → `is_active` 변경 확인
- [ ] **E-1c** 미션 삭제 → DB에서 제거 확인

#### E-2. 유저 관리

- [ ] **E-2a** Trust Score 수정 (0~100 범위) → DB 반영
- [ ] **E-2b** 범위 초과 점수(101, -1) → "0~100 사이" 에러
- [ ] **E-2c** 유저 BAN → `status='BANNED', trust_score=0` 확인
- [ ] **E-2d** BAN 해제 → `status='ACTIVE'` 복원

#### E-3. 출금 관리

- [ ] **E-3a** PENDING 출금 승인 → `status='APPROVED'` 변경
- [ ] **E-3b** APPROVED 출금 완료 처리 → `status='COMPLETED'` 변경
- [ ] **E-3c** PENDING 출금 거절 → `status='REJECTED'` + 토큰 원자적 환불 확인
- [ ] **E-3d** 거절 후 유저 잔액이 정확히 출금 금액만큼 증가 (SET이 아닌 INCREMENT)
- [ ] **E-3e** 이미 APPROVED된 출금 다시 승인 시도 → 무반응 (`.eq("status", "PENDING")`)

#### E-Security: 관리자 권한 테스트

- [ ] **E-S1** 비관리자 유저가 `/admin` 접근 → 리다이렉트
- [ ] **E-S2** 비관리자가 직접 admin Server Action 호출 → `verifyAdmin()` 차단
- [ ] **E-S3** `ADMIN_USER_IDS` 환경변수 미설정 시 모든 admin 접근 차단

### F. SNS 연동 & 레퍼럴

- [ ] **F-1** X(Twitter) 계정 연동 → `user_social_links` 기록 + 30T 보상
- [ ] **F-2** 동일 플랫폼 중복 연동 → `UNIQUE(user_id, platform)` 제약
- [ ] **F-3** 레퍼럴 코드 공유 → 초대받은 유저 가입 시 `referral_tracking` 기록
- [ ] **F-4** 초대받은 유저 3개 미션 완료 → 양쪽 100T 보상

### G. PWA & 모바일

- [ ] **G-1** 모바일 Chrome에서 "홈 화면에 추가" 가능
- [ ] **G-2** PWA 설치 후 스플래시 스크린 표시
- [ ] **G-3** manifest.json 로드 확인 (`/manifest.json`)
- [ ] **G-4** 오프라인 상태에서 기본 fallback 페이지 표시

### H. Edge Cases & 에러 핸들링

- [ ] **H-1** Supabase 연결 오류 시 "알 수 없는 오류" 메시지 (앱 크래시 없음)
- [ ] **H-2** RPC 타임아웃 시 적절한 에러 메시지 반환
- [ ] **H-3** 미션 만료(`expires_at` 초과) 시 `is_active=false` → 미노출
- [ ] **H-4** 동시 다발 미션 수행 (10+ 유저) 시 `current_participants` 정확성
- [ ] **H-5** VPN 변경 중 요청 → 세션 유지 또는 적절한 에러
- [ ] **H-6** 브라우저 새로고침 후 미션 상태 복원 (completed 미션은 "Completed" 표시)
- [ ] **H-7** Toast 메시지 4종 (success/error/warning/info) 정상 표시 및 자동 소멸

---

## Part 3: Security Fixes Applied (File Summary)

| File | Changes |
|------|---------|
| `supabase/security_fixes.sql` | NEW: `refund_tokens` RPC, updated `complete_mission` RPC (removed manual participant increment), `wallet_address` UNIQUE index, `mission_sessions` table + RPC, admin RLS policies |
| `src/app/actions/admin.ts` | FIX: `rejectWithdrawal` now uses `refund_tokens` RPC with proper error handling |
| `src/app/actions/mission.ts` | FIX: Added `startMissionSession()` action + server-side dwell time verification via `verify_mission_dwell_time` RPC |
| `src/app/actions/wallet.ts` | FIX: Added UNIQUE constraint violation handling (code 23505) for race condition |
| `src/components/ui/MissionCard.tsx` | FIX: Calls `startMissionSession()` on mission start for server-side timer tracking |
