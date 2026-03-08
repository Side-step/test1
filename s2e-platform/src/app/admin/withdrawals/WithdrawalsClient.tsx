"use client";

import { useState } from "react";
import type { WithdrawalRequest } from "@/types/database";
import { approveWithdrawal, completeWithdrawal, rejectWithdrawal } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

interface WithdrawalsClientProps {
  withdrawals: WithdrawalRequest[];
}

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";

export default function WithdrawalsClient({ withdrawals: initial }: WithdrawalsClientProps) {
  const { showToast } = useToast();
  const [withdrawals, setWithdrawals] = useState(initial);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  const filtered = filter === "ALL"
    ? withdrawals
    : withdrawals.filter((w) => w.status === filter);

  const pendingCount = withdrawals.filter((w) => w.status === "PENDING").length;
  const totalPendingAmount = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((sum, w) => sum + w.amount, 0);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    const result = await approveWithdrawal(id);
    if (result.success) {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: "APPROVED" as const, processed_at: new Date().toISOString() } : w))
      );
      showToast("출금이 승인되었습니다.", "success");
    } else {
      showToast(result.error ?? "승인에 실패했습니다.", "error");
    }
    setProcessing(null);
  };

  const handleComplete = async (id: string) => {
    setProcessing(id);
    const result = await completeWithdrawal(id);
    if (result.success) {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: "COMPLETED" as const, processed_at: new Date().toISOString() } : w))
      );
      showToast("출금이 완료 처리되었습니다.", "success");
    } else {
      showToast(result.error ?? "완료 처리에 실패했습니다.", "error");
    }
    setProcessing(null);
  };

  const handleReject = async (w: WithdrawalRequest) => {
    setProcessing(w.id);
    const result = await rejectWithdrawal(w.id, w.user_id, w.amount);
    if (result.success) {
      setWithdrawals((prev) =>
        prev.map((item) => (item.id === w.id ? { ...item, status: "REJECTED" as const, processed_at: new Date().toISOString() } : item))
      );
      showToast("출금이 거절되었습니다. 토큰이 환불됩니다.", "success");
      setRejectConfirm(null);
    } else {
      showToast(result.error ?? "거절에 실패했습니다.", "error");
    }
    setProcessing(null);
  };

  const statusColor: Record<string, string> = {
    PENDING: "bg-[#ffc107]/10 text-[#ffc107]",
    APPROVED: "bg-[#6c5ce7]/10 text-[#a29bfe]",
    COMPLETED: "bg-[#00d2a0]/10 text-[#00d2a0]",
    REJECTED: "bg-[#ff4757]/10 text-[#ff4757]",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Withdrawal Requests</h1>
        <p className="mt-1 text-sm text-[#8888a0]">
          {pendingCount} pending &middot; {totalPendingAmount.toLocaleString()} T awaiting approval
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["PENDING", "APPROVED", "COMPLETED", "REJECTED"] as const).map((status) => {
          const count = withdrawals.filter((w) => w.status === status).length;
          const amount = withdrawals
            .filter((w) => w.status === status)
            .reduce((sum, w) => sum + w.amount, 0);
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "ALL" : status)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filter === status
                  ? "border-[#6c5ce7]/40 bg-[#6c5ce7]/10"
                  : "border-[#1e1e35] bg-[#12121f] hover:border-[#2a2a40]"
              }`}
            >
              <p className="text-lg font-bold text-[#f0f0f5]">{count}</p>
              <p className="text-[10px] text-[#55556a]">{status}</p>
              <p className="mt-1 text-xs text-[#8888a0]">{amount.toLocaleString()} T</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1e1e35] bg-[#12121f]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">User</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Wallet</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Amount</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Requested</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-[#1e1e35]/50 transition-colors hover:bg-[#1a1a2e]/50">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-[#8888a0]">
                      {w.user_id.slice(0, 8)}...{w.user_id.slice(-4)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-[#f0f0f5]">
                      {w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-4)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-[#f0f0f5]">
                      {w.amount.toLocaleString()}
                    </span>
                    <span className="ml-0.5 text-[10px] text-[#55556a]">T</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#8888a0]">
                    {new Date(w.requested_at).toLocaleDateString()}{" "}
                    {new Date(w.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[w.status]}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {w.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(w.id)}
                            disabled={processing === w.id}
                            className="rounded-lg bg-[#00d2a0]/10 px-2.5 py-1.5 text-xs font-medium text-[#00d2a0] transition-all hover:bg-[#00d2a0]/20 disabled:opacity-50"
                          >
                            Approve
                          </button>

                          {rejectConfirm === w.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReject(w)}
                                disabled={processing === w.id}
                                className="rounded-lg bg-[#ff4757]/20 px-2.5 py-1.5 text-xs font-medium text-[#ff4757] hover:bg-[#ff4757]/30 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setRejectConfirm(null)}
                                className="rounded-lg px-2 py-1.5 text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectConfirm(w.id)}
                              className="rounded-lg bg-[#ff4757]/10 px-2.5 py-1.5 text-xs font-medium text-[#ff4757] transition-all hover:bg-[#ff4757]/20"
                            >
                              Reject
                            </button>
                          )}
                        </>
                      )}

                      {w.status === "APPROVED" && (
                        <button
                          onClick={() => handleComplete(w.id)}
                          disabled={processing === w.id}
                          className="rounded-lg bg-[#6c5ce7]/10 px-2.5 py-1.5 text-xs font-medium text-[#a29bfe] transition-all hover:bg-[#6c5ce7]/20 disabled:opacity-50"
                        >
                          Mark Complete
                        </button>
                      )}

                      {w.status === "COMPLETED" && w.tx_hash && (
                        <span className="font-mono text-[10px] text-[#55556a]">
                          tx: {w.tx_hash.slice(0, 10)}...
                        </span>
                      )}

                      {w.status === "COMPLETED" && !w.tx_hash && (
                        <span className="text-[10px] text-[#00d2a0]">Done</span>
                      )}

                      {w.status === "REJECTED" && (
                        <span className="text-[10px] text-[#55556a]">Refunded</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-[#55556a]">
                    No withdrawal requests found.
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
