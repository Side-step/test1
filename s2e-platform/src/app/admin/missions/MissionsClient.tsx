"use client";

import { useState } from "react";
import type { Mission, MissionType, SocialPlatform } from "@/types/database";
import { createMission, toggleMissionActive, deleteMission } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

const MISSION_TYPES: MissionType[] = ["LIKE", "RETWEET", "FOLLOW", "REPLY", "QUOTE", "JOIN", "CUSTOM"];
const PLATFORMS: SocialPlatform[] = ["X", "TELEGRAM", "INSTAGRAM", "DISCORD", "YOUTUBE"];
const COUNTRIES = ["KR", "US", "JP", "VN", "PH", "IN", "BR", "NG", "TR", "ID", "TH", "GB", "DE", "FR"];

interface MissionsClientProps {
  missions: Mission[];
}

export default function MissionsClient({ missions: initialMissions }: MissionsClientProps) {
  const { showToast } = useToast();
  const [missions, setMissions] = useState(initialMissions);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    client_name: "",
    title: "",
    description: "",
    mission_type: "LIKE" as MissionType,
    target_url: "",
    target_countries: [] as string[],
    reward_tokens: 50,
    max_participants: 100,
    min_trust_score: 30,
    required_platform: null as SocialPlatform | null,
    expires_at: "",
  });

  const resetForm = () => {
    setForm({
      client_name: "",
      title: "",
      description: "",
      mission_type: "LIKE",
      target_url: "",
      target_countries: [],
      reward_tokens: 50,
      max_participants: 100,
      min_trust_score: 30,
      required_platform: null,
      expires_at: "",
    });
  };

  const handleCreate = async () => {
    if (!form.client_name || !form.title) {
      showToast("광고주 이름과 미션 제목은 필수입니다.", "error");
      return;
    }

    setIsSubmitting(true);
    const result = await createMission(form);

    if (result.success) {
      showToast("미션이 성공적으로 생성되었습니다.", "success");
      resetForm();
      setShowForm(false);
      // 페이지를 새로고침하여 최신 데이터 반영
      window.location.reload();
    } else {
      showToast(result.error ?? "미션 생성에 실패했습니다.", "error");
    }
    setIsSubmitting(false);
  };

  const handleToggle = async (missionId: string, currentActive: boolean) => {
    const result = await toggleMissionActive(missionId, !currentActive);
    if (result.success) {
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, is_active: !currentActive } : m))
      );
      showToast(`미션이 ${!currentActive ? "활성화" : "비활성화"}되었습니다.`, "success");
    } else {
      showToast(result.error ?? "상태 변경에 실패했습니다.", "error");
    }
  };

  const handleDelete = async (missionId: string) => {
    const result = await deleteMission(missionId);
    if (result.success) {
      setMissions((prev) => prev.filter((m) => m.id !== missionId));
      showToast("미션이 삭제되었습니다.", "success");
      setDeleteConfirm(null);
    } else {
      showToast(result.error ?? "삭제에 실패했습니다.", "error");
    }
  };

  const toggleCountry = (code: string) => {
    setForm((prev) => ({
      ...prev,
      target_countries: prev.target_countries.includes(code)
        ? prev.target_countries.filter((c) => c !== code)
        : [...prev.target_countries, code],
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f5]">Mission Management</h1>
          <p className="mt-1 text-sm text-[#8888a0]">
            {missions.length} total missions
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#6c5ce7]/25"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Mission
        </button>
      </div>

      {/* Create Mission Form */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-[#1e1e35] bg-[#12121f] p-6">
          <h2 className="mb-5 text-lg font-semibold text-[#f0f0f5]">Create New Mission</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Client Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Advertiser Name *
              </label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                placeholder="e.g. Uniswap Labs"
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#55556a] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Mission Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Follow @Uniswap on X"
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#55556a] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Mission Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Mission Type
              </label>
              <select
                value={form.mission_type}
                onChange={(e) => setForm({ ...form, mission_type: e.target.value as MissionType })}
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#6c5ce7]"
              >
                {MISSION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Required Platform */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Required Platform
              </label>
              <select
                value={form.required_platform ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    required_platform: e.target.value ? (e.target.value as SocialPlatform) : null,
                  })
                }
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#6c5ce7]"
              >
                <option value="">None (any)</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Target URL */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Target URL
              </label>
              <input
                type="url"
                value={form.target_url}
                onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                placeholder="https://x.com/..."
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#55556a] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Reward Tokens */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Reward Tokens
              </label>
              <input
                type="number"
                min="1"
                value={form.reward_tokens}
                onChange={(e) => setForm({ ...form, reward_tokens: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Max Participants
              </label>
              <input
                type="number"
                min="1"
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Min Trust Score */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Min Trust Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.min_trust_score}
                onChange={(e) => setForm({ ...form, min_trust_score: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Expires At */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Expiry Date (optional)
              </label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Mission description..."
                className="w-full resize-none rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#55556a] outline-none transition-colors focus:border-[#6c5ce7]"
              />
            </div>

            {/* Target Countries */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-[#8888a0]">
                Target Countries (click to select)
              </label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleCountry(code)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      form.target_countries.includes(code)
                        ? "bg-[#6c5ce7]/20 text-[#a29bfe] ring-1 ring-[#6c5ce7]/40"
                        : "bg-[#1a1a2e] text-[#55556a] hover:bg-[#2a2a40] hover:text-[#8888a0]"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Mission"
              )}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-xl px-6 py-2.5 text-sm font-medium text-[#8888a0] transition-colors hover:bg-[#1a1a2e] hover:text-[#f0f0f5]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mission Table */}
      <div className="overflow-hidden rounded-2xl border border-[#1e1e35] bg-[#12121f]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Mission</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Type</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Platform</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Reward</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Progress</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Budget</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#55556a]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((mission) => {
                const progress = mission.max_participants > 0
                  ? Math.round((mission.current_participants / mission.max_participants) * 100)
                  : 0;
                const totalBudget = mission.reward_tokens * mission.max_participants;
                const spent = mission.reward_tokens * mission.current_participants;
                const remaining = totalBudget - spent;

                return (
                  <tr key={mission.id} className="border-b border-[#1e1e35]/50 transition-colors hover:bg-[#1a1a2e]/50">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-[#f0f0f5]">{mission.title}</p>
                        <p className="mt-0.5 text-[10px] text-[#55556a] font-mono">
                          {mission.id.slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-[#6c5ce7]/10 px-2 py-1 text-xs font-medium text-[#a29bfe]">
                        {mission.mission_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8888a0]">
                      {mission.required_platform ?? "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-[#00d2a0]">
                        +{mission.reward_tokens} T
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#2a2a40]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#8888a0]">
                          {mission.current_participants}/{mission.max_participants}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs">
                        <span className="text-[#f0f0f5]">{remaining.toLocaleString()}</span>
                        <span className="text-[#55556a]"> / {totalBudget.toLocaleString()} T</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          mission.is_active
                            ? "bg-[#00d2a0]/10 text-[#00d2a0]"
                            : "bg-[#ff4757]/10 text-[#ff4757]"
                        }`}
                      >
                        {mission.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggle(mission.id, mission.is_active)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                            mission.is_active
                              ? "bg-[#ffc107]/10 text-[#ffc107] hover:bg-[#ffc107]/20"
                              : "bg-[#00d2a0]/10 text-[#00d2a0] hover:bg-[#00d2a0]/20"
                          }`}
                        >
                          {mission.is_active ? "Pause" : "Activate"}
                        </button>

                        {/* Delete */}
                        {deleteConfirm === mission.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(mission.id)}
                              className="rounded-lg bg-[#ff4757]/20 px-2.5 py-1.5 text-xs font-medium text-[#ff4757] hover:bg-[#ff4757]/30"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg px-2 py-1.5 text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(mission.id)}
                            className="rounded-lg bg-[#ff4757]/10 px-2.5 py-1.5 text-xs font-medium text-[#ff4757] transition-all hover:bg-[#ff4757]/20"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {missions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-[#55556a]">
                    No missions yet. Create your first mission!
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
