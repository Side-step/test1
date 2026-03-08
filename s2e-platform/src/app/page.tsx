"use client";

import { createClient } from "@/lib/supabase/client";

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CoinsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = createClient();

  const handleTwitterLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-8">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6c5ce7]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] translate-x-1/4 translate-y-1/4 rounded-full bg-[#a29bfe]/8 blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">

        {/* Logo */}
        <div className="slide-up mb-8 flex flex-col items-center">
          <div className="float-animation mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] shadow-lg shadow-[#6c5ce7]/25">
            <CoinsIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] bg-clip-text text-transparent">S2E</span>
          </h1>
          <p className="mt-1 text-sm text-[#8888a0]">Social-to-Earn</p>
        </div>

        {/* Tagline */}
        <div className="slide-up slide-up-delay-1 mb-10 text-center">
          <h2 className="mb-2 text-xl font-semibold text-[#f0f0f5]">
            Earn rewards for<br />real social engagement
          </h2>
          <p className="text-sm text-[#8888a0]">
            Complete missions. Build trust. Get paid.
          </p>
        </div>

        {/* Login buttons */}
        <div className="slide-up slide-up-delay-2 flex w-full flex-col gap-3">
          <button
            onClick={handleTwitterLogin}
            className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-black font-semibold transition-all duration-200 hover:bg-white/90 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
          >
            <TwitterIcon className="h-5 w-5" />
            Continue with X
          </button>

          <button
            disabled
            className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#26A5E4]/15 text-[#26A5E4] font-semibold border border-[#26A5E4]/20 transition-all duration-200 hover:bg-[#26A5E4]/25 hover:shadow-lg hover:shadow-[#26A5E4]/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TelegramIcon className="h-5 w-5" />
            Continue with Telegram
            <span className="rounded-full bg-[#26A5E4]/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Soon
            </span>
          </button>
        </div>

        {/* Feature badges */}
        <div className="slide-up slide-up-delay-3 mt-10 flex w-full flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#2a2a40] bg-[#1a1a2e]/50 px-4 py-3">
            <ShieldIcon className="h-5 w-5 shrink-0 text-[#00d2a0]" />
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]">Anti-Bot Protected</p>
              <p className="text-[11px] text-[#8888a0]">Only verified real users earn rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#2a2a40] bg-[#1a1a2e]/50 px-4 py-3">
            <CoinsIcon className="h-5 w-5 shrink-0 text-[#6c5ce7]" />
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]">Instant Token Rewards</p>
              <p className="text-[11px] text-[#8888a0]">Earn tokens for every completed mission</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#2a2a40] bg-[#1a1a2e]/50 px-4 py-3">
            <UsersIcon className="h-5 w-5 shrink-0 text-[#a29bfe]" />
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]">Referral Program</p>
              <p className="text-[11px] text-[#8888a0]">Invite friends and earn bonus rewards</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="slide-up slide-up-delay-4 mt-8 text-center">
          <p className="text-[11px] text-[#55556a]">
            By continuing, you agree to our{" "}
            <span className="text-[#8888a0] underline underline-offset-2 cursor-pointer">Terms</span>
            {" "}and{" "}
            <span className="text-[#8888a0] underline underline-offset-2 cursor-pointer">Privacy Policy</span>
          </p>
          <p className="mt-2 text-[10px] text-[#55556a]">
            Powered by Web3
          </p>
        </div>
      </div>
    </div>
  );
}
