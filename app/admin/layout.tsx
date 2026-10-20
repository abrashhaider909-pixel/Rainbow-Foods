import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  Store,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import AdminPasswordChangePrompt from "./password-prompt";


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/admin/login");
  }

  // Security check: Must change initial password on first login
  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#faf8f1] px-5 py-16 text-[#244c37] flex flex-col justify-center items-center">
        <div className="w-full max-w-lg rounded-3xl border border-[#244c37]/15 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 text-amber-700">
            <ShieldAlert size={28} />
            <h1 className="font-serif text-2xl font-bold">Security Requirement</h1>
          </div>
          <p className="mt-2 text-sm text-[#657264] leading-relaxed">
            Welcome to Rainbow Foods administration. You are currently using the default initial password.
            For security compliance, please choose a new private password before accessing the dashboard.
          </p>

          <AdminPasswordChangePrompt />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f1] text-[#244c37]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#244c37]/10 bg-[#faf8f1]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#244c37] text-xl font-bold text-[#e8b75b]">
              R
            </span>
            <span>
              <span className="block font-serif text-xl font-bold tracking-wide">Rainbow Rewri</span>
              <span className="block text-[10px] uppercase tracking-[0.24em] text-[#8c6a32] font-semibold">
                Admin Management Suite
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#244c37]/20 px-4 py-2 text-xs font-semibold hover:bg-white"
            >
              <Store size={14} /> View Storefront
            </Link>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 transition"
              >
                <LogOut size={14} /> Exit
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Admin Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 rounded-3xl border border-[#244c37]/10 bg-white p-6 shadow-sm">
              <div className="border-b border-[#244c37]/10 pb-4 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b7857]">
                  Signed in as Admin
                </span>
                <p className="font-serif text-lg font-bold truncate">{user.name}</p>
                <p className="text-xs text-[#657264] truncate">{user.email}</p>
              </div>

              <nav className="space-y-1.5 text-sm font-medium">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <LayoutDashboard size={18} className="text-[#bd7d28]" /> Overview
                </Link>
                <Link
                  href="/admin/orders"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <Package size={18} className="text-[#bd7d28]" /> Orders & Tracking
                </Link>
                <Link
                  href="/admin/products"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <ShoppingBag size={18} className="text-[#bd7d28]" /> Products & Inventory
                </Link>
                <Link
                  href="/admin/customers"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <Users size={18} className="text-[#bd7d28]" /> Customers
                </Link>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-[#faf8f1] transition"
                >
                  <Settings size={18} className="text-[#bd7d28]" /> Store & Pickup Settings
                </Link>
              </nav>
            </div>
          </aside>

          {/* Admin Subview */}
          <main className="lg:col-span-9">{children}</main>
        </div>
      </div>
    </div>
  );
}
