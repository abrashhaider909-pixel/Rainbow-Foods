"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@rainbowgmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      if (data.user?.role !== "admin") {
        throw new Error("Access restricted: Administrator privileges required.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-12 text-[#244c37] sm:px-8 sm:py-20 flex flex-col justify-center items-center">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#8b7857] hover:text-[#244c37]"
        >
          <ArrowLeft size={16} /> Back to Storefront
        </Link>

        <div className="overflow-hidden rounded-3xl border border-[#244c37]/15 bg-white p-7 shadow-xl shadow-[#244c37]/5 sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#244c37] text-[#e8b75b]">
              <ShieldCheck size={28} />
            </div>
            <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">Admin Portal</h1>
            <p className="mt-2 text-xs text-[#657264]">
              Authorized staff access only. Role verification is enforced on all actions.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Administrator Email
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rainbowgmail.com"
                  className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                />
                <Mail size={18} className="absolute left-4 top-3.5 text-[#8b7857]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-sm text-[#244c37] outline-none transition focus:border-[#244c37] focus:bg-white"
                />
                <Lock size={18} className="absolute left-4 top-3.5 text-[#8b7857]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#244c37] py-4 font-semibold text-white transition hover:bg-[#183724] disabled:opacity-50"
            >
              {loading ? "Authenticating…" : "Access Dashboard"} <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-8 rounded-2xl bg-[#faf8f1] p-4 text-xs text-[#8b7857] border border-[#244c37]/10">
            <p className="font-bold text-[#244c37]">Initial Setup Credentials:</p>
            <p className="mt-1">
              Email: <code className="font-mono text-[#244c37]">admin@rainbowgmail.com</code>
            </p>
            <p className="mt-0.5">
              Initial Password: <code className="font-mono text-[#244c37]">123oPm78</code>
            </p>
            <p className="mt-1 text-[11px] text-[#657264]">
              (Configurable via <code className="font-mono">ADMIN_INITIAL_PASSWORD</code> env variable)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
