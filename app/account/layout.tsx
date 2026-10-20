import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  ArrowLeft,
  LayoutDashboard,
  MapPin,
  Package,
  Shield,
  User as UserIcon,
  LogOut,
  Sparkles,
} from "lucide-react";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#faf8f1] text-[#244c37]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#244c37]/10 bg-[#faf8f1]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#244c37] text-xl font-bold text-[#e8b75b]">
              R
            </span>
            <span>
              <span className="block font-serif text-xl font-bold tracking-wide">Rainbow Rewri</span>
              <span className="block text-[10px] uppercase tracking-[0.24em] text-[#8b7857]">
                Customer Account
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#bd7d28] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#a66a1d]"
              >
                <Sparkles size={14} /> Admin Portal
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#244c37]/20 px-4 py-2 text-xs font-semibold hover:bg-white"
            >
              <ArrowLeft size={14} /> Shop Menu
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content with Navigation Sidebar */}
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 rounded-3xl border border-[#244c37]/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#244c37]/10 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#244c37]/10 text-xl font-bold text-[#244c37]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base font-bold truncate">{user.name}</p>
                  <p className="text-xs text-[#657264] truncate">{user.email}</p>
                </div>
              </div>

              <nav className="mt-5 space-y-1 text-sm font-medium">
                <Link
                  href="/account"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <LayoutDashboard size={18} className="text-[#bd7d28]" /> Overview
                </Link>
                <Link
                  href="/account/orders"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <Package size={18} className="text-[#bd7d28]" /> My Orders
                </Link>
                <Link
                  href="/account/addresses"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <MapPin size={18} className="text-[#bd7d28]" /> Saved Addresses
                </Link>
                <Link
                  href="/account/profile"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <UserIcon size={18} className="text-[#bd7d28]" /> Profile & Security
                </Link>

                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-[#e8b75b]/20 font-bold text-[#8c6a32] hover:bg-[#e8b75b]/30 transition"
                  >
                    <Shield size={18} /> Admin Dashboard
                  </Link>
                )}

                <div className="pt-4 border-t border-[#244c37]/10">
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={18} /> Log Out
                    </button>
                  </form>
                </div>
              </nav>
            </div>
          </aside>

          {/* Page Child View */}
          <main className="lg:col-span-9">{children}</main>
        </div>
      </div>
    </div>
  );
}
