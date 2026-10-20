"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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

      if (data.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
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
          <ArrowLeft size={16} /> Back to Rainbow Foods
        </Link>

        <div className="overflow-hidden rounded-3xl border border-[#244c37]/10 bg-white p-7 shadow-xl shadow-[#244c37]/5 sm:p-10">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#244c37] text-2xl font-bold text-[#e8b75b]">
              R
            </span>
            <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-sm text-[#657264]">
              Log in to track orders, manage saved addresses, and enjoy faster checkout.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                Email Address
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  placeholder="Enter your password"
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
              {loading ? "Signing in…" : "Sign In"} <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-8 border-t border-[#244c37]/10 pt-6 text-center text-sm text-[#657264]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#bd7d28] hover:underline">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
