"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";

export default function AdminPasswordChangePrompt() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error changing password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
          Set New Password
        </label>
        <div className="relative mt-1">
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter secure new password"
            className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-sm text-[#244c37] outline-none"
          />
          <Lock size={18} className="absolute left-4 top-3.5 text-[#8b7857]" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
          Confirm New Password
        </label>
        <div className="relative mt-1">
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-sm text-[#244c37] outline-none"
          />
          <Lock size={18} className="absolute left-4 top-3.5 text-[#8b7857]" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#244c37] py-3.5 text-xs font-semibold text-white transition hover:bg-[#183724] disabled:opacity-50"
      >
        {loading ? "Updating Security Credentials…" : "Save New Password & Continue"} <ArrowRight size={16} />
      </button>
    </form>
  );
}
