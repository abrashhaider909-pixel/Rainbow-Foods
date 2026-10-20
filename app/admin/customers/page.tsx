"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Users } from "lucide-react";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  savedAddressesCount: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/customers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.customers) {
          setCustomers(data.customers);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#244c37]/10 pb-5">
        <div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">Customer Directory</h1>
          <p className="mt-1 text-sm text-[#657264]">
            Customer profiles, order frequency, lifetime spending statistics, and contact information.
          </p>
        </div>
        <span className="rounded-full bg-[#faf8f1] px-4 py-2 text-xs font-bold text-[#244c37] border border-[#244c37]/10">
          Total Registered: {customers.length}
        </span>
      </div>

      {/* Search Bar */}
      <div className="mt-6 relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, email, phone…"
          className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-xs text-[#244c37] outline-none"
        />
        <Search size={16} className="absolute left-4 top-3.5 text-[#8b7857]" />
      </div>

      {/* Customers Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="py-12 text-center text-xs text-[#657264]">Loading customer profiles…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#657264]">
            <Users size={40} className="mx-auto text-[#bd7d28]" />
            <p className="mt-3 font-serif text-lg font-bold">No customers found</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#244c37]/10 text-[#8b7857]">
                <th className="pb-3 font-bold uppercase tracking-wider">Customer</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Phone</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Saved Addresses</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Orders Placed</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Total Spent</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#244c37]/10">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#faf8f1] transition">
                  <td className="py-4">
                    <p className="font-serif text-sm font-bold text-[#244c37]">{c.name}</p>
                    <p className="text-[11px] text-[#8b7857]">{c.email}</p>
                  </td>
                  <td className="py-4 font-mono">{c.phone || "—"}</td>
                  <td className="py-4 font-semibold">{c.savedAddressesCount} locations</td>
                  <td className="py-4">
                    <span className="font-semibold text-sm">{c.totalOrders}</span> orders
                  </td>
                  <td className="py-4 font-semibold text-sm text-[#244c37]">
                    {formatPrice(c.totalSpent)}
                  </td>
                  <td className="py-4 text-[#8b7857]">
                    {new Date(c.createdAt).toLocaleDateString("en-PK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
