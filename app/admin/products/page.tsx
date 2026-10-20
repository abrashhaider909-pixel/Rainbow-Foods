"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import Image from "next/image";
import {
  Edit,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Product, ProductCategory } from "@/lib/types";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

const CATEGORIES: ProductCategory[] = ["Sweets", "Snacks", "Meals"];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Sweets");
  const [price, setPrice] = useState<number>(300);
  const [salePrice, setSalePrice] = useState<string>("");
  const [stock, setStock] = useState<number>(20);
  const [image, setImage] = useState("");
  const [tag, setTag] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/products?all=true")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted) {
          setProducts(data);
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
    return products.filter((p) => {
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
      if (stockFilter === "low" && p.stock > 5) return false;
      if (stockFilter === "out" && p.stock > 0) return false;
      if (stockFilter === "in" && p.stock === 0) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, categoryFilter, stockFilter, search]);

  function openCreateModal() {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setCategory("Sweets");
    setPrice(300);
    setSalePrice("");
    setStock(20);
    setImage(
      "https://images.unsplash.com/photo-1605197161470-5d2c3a6e7a94?auto=format&fit=crop&w=900&q=85",
    );
    setTag("");
    setIsActive(true);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(prod: Product) {
    setEditingProduct(prod);
    setName(prod.name);
    setDescription(prod.description);
    setCategory(prod.category);
    setPrice(prod.price);
    setSalePrice(prod.salePrice ? String(prod.salePrice) : "");
    setStock(prod.stock);
    setImage(prod.image);
    setTag(prod.tag || "");
    setIsActive(prod.isActive);
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (price <= 0) {
      setFormError("Regular price must be greater than 0.");
      return;
    }

    const parsedSalePrice = salePrice && !isNaN(Number(salePrice)) ? Number(salePrice) : null;
    if (parsedSalePrice && parsedSalePrice >= price) {
      setFormError("Sale price must be strictly lower than regular price.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        price,
        salePrice: parsedSalePrice,
        stock,
        image: image.trim(),
        tag: tag.trim() || undefined,
        isActive,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product.");

      if (editingProduct) {
        setProducts((curr) => curr.map((p) => (p.id === data.id ? data : p)));
      } else {
        setProducts((curr) => [...curr, data]);
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(prod: Product) {
    if (
      !confirm(
        `Are you sure you want to remove or archive "${prod.name}"? If it exists in previous orders, it will be safely deactivated.`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/products/${prod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.archived) {
        alert(data.message);
        setProducts((curr) => curr.map((p) => (p.id === prod.id ? { ...p, isActive: false } : p)));
      } else {
        setProducts((curr) => curr.filter((p) => p.id !== prod.id));
      }
    } catch {
      alert("Failed to delete product.");
    }
  }

  return (
    <div className="rounded-3xl border border-[#244c37]/10 bg-white p-7 sm:p-10 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#244c37]/10 pb-5">
        <div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">Product & Inventory</h1>
          <p className="mt-1 text-sm text-[#657264]">
            Create products, update stock quantities, set seasonal sale discounts, and manage availability.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-[#244c37] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#183724]"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, category…"
            className="w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 pl-11 text-xs text-[#244c37] outline-none"
          />
          <Search size={16} className="absolute left-4 top-3.5 text-[#8b7857]" />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-xs outline-none font-semibold text-[#244c37]"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-3 text-xs outline-none font-semibold text-[#244c37]"
          >
            <option value="All">All Stock Levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock (≤ 5 units)</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="py-12 text-center text-xs text-[#657264]">Loading products…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#657264]">
            <Package size={40} className="mx-auto text-[#bd7d28]" />
            <p className="mt-3 font-serif text-lg font-bold">No products found</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#244c37]/10 text-[#8b7857]">
                <th className="pb-3 font-bold uppercase tracking-wider">Item</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Category</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Regular Price</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Sale Price</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Stock</th>
                <th className="pb-3 font-bold uppercase tracking-wider">Status</th>
                <th className="pb-3 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#244c37]/10">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#faf8f1] transition">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <Image
                        unoptimized
                        width={44}
                        height={44}
                        src={prod.image}
                        alt={prod.name}
                        className="h-11 w-11 rounded-xl object-cover bg-[#f0e8d6]"
                      />
                      <div>
                        <p className="font-serif text-sm font-bold text-[#244c37]">{prod.name}</p>
                        {prod.tag && (
                          <span className="text-[10px] text-[#bd7d28] font-semibold">{prod.tag}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-medium">{prod.category}</td>
                  <td className="py-3.5 font-semibold text-sm">{formatPrice(prod.price)}</td>
                  <td className="py-3.5">
                    {prod.salePrice ? (
                      <span className="font-semibold text-emerald-800">
                        {formatPrice(prod.salePrice)}{" "}
                        <span className="text-[10px] text-emerald-600">
                          ({prod.discountPercent}% off)
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#8b7857]">—</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`font-semibold ${
                        prod.stock === 0
                          ? "text-red-700"
                          : prod.stock <= 5
                          ? "text-amber-700"
                          : "text-[#244c37]"
                      }`}
                    >
                      {prod.stock} units
                    </span>
                    {prod.stock <= 5 && prod.stock > 0 && (
                      <span className="block text-[10px] text-amber-700 font-bold">Low stock!</span>
                    )}
                    {prod.stock === 0 && (
                      <span className="block text-[10px] text-red-600 font-bold">Out of stock</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        prod.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {prod.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="rounded-full border border-[#244c37]/20 p-2 text-[#244c37] hover:bg-white"
                        title="Edit product"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod)}
                        className="rounded-full border border-red-200 p-2 text-red-600 hover:bg-red-50"
                        title="Delete or archive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#244c37]/10 pb-4">
              <h2 className="font-serif text-2xl font-bold">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-[#faf8f1]">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Saffron Jaggery Rewri"
                  className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Appetizing description for customers…"
                  className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none font-semibold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Stock Available (Units) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Regular Price (PKR) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Sale Price (PKR, Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Leave empty if regular"
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                  Image URL
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#657264]">
                    Promotional Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. Bestseller, Special Edition"
                    className="mt-1 w-full rounded-2xl border border-[#244c37]/20 bg-[#faf8f1] px-4 py-2.5 text-sm outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#244c37]"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-[#244c37]">
                    Product is Active on Storefront
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#244c37]/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-[#244c37]/20 px-6 py-2.5 text-xs font-semibold hover:bg-[#faf8f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#244c37] px-7 py-2.5 text-xs font-semibold text-white hover:bg-[#183724] disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
