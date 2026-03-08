"use client";

import { useState } from "react";
import type { User } from "@/types/database";
import { updateUserTrustScore, banUser, unbanUser } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

interface UsersClientProps {
  users: User[];
}

export default function UsersClient({ users: initialUsers }: UsersClientProps) {
  const { showToast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [banConfirm, setBanConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "BANNED" | "VPN">("ALL");

  const filteredUsers = users.filter((u) => {
    // Search filter
    const matchesSearch =
      !search ||
      u.id.toLowerCase().includes(search.toLowerCase()) ||
      u.wallet_address?.toLowerCase().includes(search.toLowerCase()) ||
      u.country_code?.toLowerCase().includes(search.toLowerCase()) ||
      u.referral_code?.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesFilter =
      filter === "ALL" ||
      (filter === "ACTIVE" && u.status !== "BANNED") ||
      (filter === "BANNED" && u.status === "BANNED") ||
      (filter === "VPN" && u.is_vpn);

    return matchesSearch && matchesFilter;
  });

  const handleTrustScoreUpdate = async (userId: string) => {
    const newScore = parseInt(scoreInput, 10);
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      showToast("0~100 사이의 값을 입력해 주세요.", "error");
      return;
    }

    const result = await updateUserTrustScore(userId, newScore);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, trust_score: newScore } : u))
      );
      showToast("신뢰도 점수가 수정되었습니다.", "success");
      setEditingScore(null);
    } else {
      showToast(result.error ?? "수정에 실패했습니다.", "error");
    }
  };

  const handleBan = async (userId: string) => {
    const result = await banUser(userId);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: "BANNED" as const, trust_score: 0 } : u
        )
      );
      showToast("계정이 정지되었습니다.", "success");
      setBanConfirm(null);
    } else {
      showToast(result.error ?? "정지에 실패했습니다.", "error");
    }
  };

  const handleUnban = async (userId: string) => {
    const result = await unbanUser(userId);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: "ACTIVE" as const } : u
        )
      );
      showToast("정지가 해제되었습니다.", "success");
    } else {
      showToast(result.error ?? "정지 해제에 실패했습니다.", "error");
    }
  };

  const bannedCount = users.filter((u) => u.status === "BANNED").length;
  const vpnCount = users.filter((u) => u.is_vpn).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">User Management</h1>
        <p className="mt-1 text-sm text-[#8888a0]">
          {users.length} total users &middot; {bannedCount} banned &middot; {vpnCount} VPN detected
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55556a]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, wallet, country..."
            className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] py-2.5 pl-10 pr-4 text-sm text-[#f0f0f5] placeholder-[#55556a] outline-none focus:border-[#6c5ce7]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 rounded-xl bg-[#1a1a2e] p-1">
          {(["ALL", "ACTIVE", "BANNED", "VPN"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f
                  ? "bg-[#6c5ce7]/20 text-[#a29bfe]"
                  : "text-[#55556a] hover:text-[#8888a0]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1e1e35] bg-[#12121f]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">User</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Country</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Trust Score</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Tokens</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Wallet</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Flags</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-[#1e1e35]/50 transition-colors hover:bg-[#1a1a2e]/50 ${
                    user.status === "BANNED" ? "opacity-60" : ""
                  }`}
                >
                  {/* User ID */}
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-mono text-xs text-[#f0f0f5]">
                        {user.id.slice(0, 8)}...{user.id.slice(-4)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#55556a]">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </td>

                  {/* Country */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#8888a0]">
                      {user.country_code ?? "-"}
                    </span>
                  </td>

                  {/* Trust Score */}
                  <td className="px-5 py-3.5">
                    {editingScore === user.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={scoreInput}
                          onChange={(e) => setScoreInput(e.target.value)}
                          className="w-16 rounded-lg border border-[#6c5ce7] bg-[#0a0a0f] px-2 py-1 text-center text-sm text-[#f0f0f5] outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTrustScoreUpdate(user.id);
                            if (e.key === "Escape") setEditingScore(null);
                          }}
                        />
                        <button
                          onClick={() => handleTrustScoreUpdate(user.id)}
                          className="rounded-md bg-[#00d2a0]/20 p-1 text-[#00d2a0] hover:bg-[#00d2a0]/30"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingScore(null)}
                          className="rounded-md bg-[#ff4757]/20 p-1 text-[#ff4757] hover:bg-[#ff4757]/30"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingScore(user.id);
                          setScoreInput(String(user.trust_score));
                        }}
                        className="group flex items-center gap-1.5"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2a2a40]">
                          <span
                            className={`text-sm font-bold ${
                              user.trust_score >= 70
                                ? "text-[#00d2a0]"
                                : user.trust_score >= 40
                                ? "text-[#ffc107]"
                                : "text-[#ff4757]"
                            }`}
                          >
                            {user.trust_score}
                          </span>
                        </div>
                        <svg
                          className="h-3 w-3 text-[#55556a] opacity-0 transition-opacity group-hover:opacity-100"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                  </td>

                  {/* Tokens */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-[#f0f0f5]">
                      {user.total_tokens.toLocaleString()}
                    </span>
                    <span className="ml-0.5 text-[10px] text-[#55556a]">T</span>
                  </td>

                  {/* Wallet */}
                  <td className="px-5 py-3.5">
                    {user.wallet_address ? (
                      <span className="font-mono text-xs text-[#8888a0]">
                        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#55556a]">Not linked</span>
                    )}
                  </td>

                  {/* Flags */}
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      {user.is_vpn && (
                        <span className="rounded-md bg-[#ff4757]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff4757]">
                          VPN
                        </span>
                      )}
                      {user.trust_score < 20 && (
                        <span className="rounded-md bg-[#ffc107]/10 px-2 py-0.5 text-[10px] font-medium text-[#ffc107]">
                          LOW TS
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.status === "BANNED"
                          ? "bg-[#ff4757]/10 text-[#ff4757]"
                          : "bg-[#00d2a0]/10 text-[#00d2a0]"
                      }`}
                    >
                      {user.status ?? "ACTIVE"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    {user.status === "BANNED" ? (
                      <button
                        onClick={() => handleUnban(user.id)}
                        className="rounded-lg bg-[#00d2a0]/10 px-3 py-1.5 text-xs font-medium text-[#00d2a0] transition-all hover:bg-[#00d2a0]/20"
                      >
                        Unban
                      </button>
                    ) : banConfirm === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleBan(user.id)}
                          className="rounded-lg bg-[#ff4757]/20 px-2.5 py-1.5 text-xs font-medium text-[#ff4757] hover:bg-[#ff4757]/30"
                        >
                          Confirm Ban
                        </button>
                        <button
                          onClick={() => setBanConfirm(null)}
                          className="rounded-lg px-2 py-1.5 text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setBanConfirm(user.id)}
                        className="rounded-lg bg-[#ff4757]/10 px-3 py-1.5 text-xs font-medium text-[#ff4757] transition-all hover:bg-[#ff4757]/20"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-[#55556a]">
                    {search ? "No users matching your search." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
