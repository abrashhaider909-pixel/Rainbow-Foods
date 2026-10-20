"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Shield, User as UserIcon, Phone, Mail } from "lucide-react";

export default function AccountProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setPhone(data.user.phone || "");
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Details */}
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Profile Details</h1>
        <p className="mt-1 text-sm text-[#657264]">
          Your contact information associated with orders and communications.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#faf8f1] p-4 border border-[#244c37]/10">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              <UserIcon size={14} /> Full Name
            </span>
            <p className="mt-2 font-serif text-lg font-bold">{name || "—"}</p>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-4 border border-[#244c37]/10">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              <Mail size={14} /> Email Address
            </span>
            <p className="mt-2 font-mono text-sm font-semibold">{email || "—"}</p>
          </div>

          <div className="rounded-2xl bg-[#faf8f1] p-4 border border-[#244c37]/10 sm:col-span-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8b7857]">
              <Phone size={14} /> Mobile Contact
            </span>
            <p className="mt-2 font-mono text-sm font-semibold">{phone || "—"}</p>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
        <h2 className="flex items-center gap-2 font-serif text-2xl font-bold">
          <Shield size={22} className="text-[#bd7d28]" /> Security & Password
        </h2>
        <p className="mt-1 text-sm text-[#657264]">
          Update your password to keep your Rainbow Foods account secure.
        </p>

        {passwordMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={16} /> {passwordMessage}
          </div>
        )}

        {passwordError && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800 border border-red-200">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none transition focus:border-[#244c37] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none transition focus:border-[#244c37] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none transition focus:border-[#244c37] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="mt-2 rounded-full bg-[#244c37] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#183724] disabled:opacity-50"
          >
            {passwordLoading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
