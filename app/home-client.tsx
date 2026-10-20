"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import type { Product, ProductCategory, SessionUser } from "@/lib/types";

type Filter = "All" | ProductCategory;
type CartItem = Product & { quantity: number };

const CART_STORAGE_KEY = "rainbow-rewri-cart";
const filters: Filter[] = ["All", "Sweets", "Snacks", "Meals"];
const buttonClass =
  "rounded-full bg-[#244c37] px-6 py-3 font-semibold !text-white transition hover:bg-[#183724]";

function formatPrice(price: number) {
  return `PKR ${Math.round(price).toLocaleString("en-PK")}`;
}

export default function HomeClient({
  products,
  loadError = false,
}: {
  products: Product[];
  loadError?: boolean;
}) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  // Authentication status
  const [user, setUser] = useState<SessionUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Quick Login Modal State
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Product quick-view modal
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);
  const [inspectQuantity, setInspectQuantity] = useState(1);

  // Load user session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // ignore
      }
    }
    checkAuth();
  }, []);

  // Restore cart
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        const restored = parsed.flatMap((entry) => {
          if (
            !entry ||
            typeof entry.id !== "number" ||
            !Number.isInteger(entry.quantity) ||
            entry.quantity < 1
          )
            return [];
          const product = products.find((item) => item.id === entry.id);
          return product ? [{ ...product, quantity: Math.min(entry.quantity, 99) }] : [];
        });
        window.setTimeout(() => setCart(restored), 0);
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    window.setTimeout(() => setCartLoaded(true), 0);
  }, [products]);

  // Persist cart
  useEffect(() => {
    if (cartLoaded) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (activeFilter === "All" || product.category === activeFilter) &&
          `${product.name} ${product.description} ${product.category}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [products, activeFilter, query],
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const subtotal = cart.reduce((total, item) => {
    const unitPrice =
      item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
    return total + unitPrice * item.quantity;
  }, 0);

  const totalSavings = cart.reduce((total, item) => {
    if (item.salePrice && item.salePrice < item.price) {
      return total + (item.price - item.salePrice) * item.quantity;
    }
    return total;
  }, 0);

  function addToCart(product: Product, quantity = 1) {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock || 99) }
              : item,
          )
        : [...current, { ...product, quantity: Math.min(quantity, product.stock || 99) }];
    });
    setOrderMessage("");
    setCartOpen(true);
  }

  function changeQuantity(productId: number, amount: number) {
    const prod = products.find((p) => p.id === productId);
    const maxStock = prod ? prod.stock : 99;

    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return [item];
        const quantity = item.quantity + amount;
        return quantity > 0 ? [{ ...item, quantity: Math.min(quantity, maxStock) }] : [];
      }),
    );
  }

  async function handleQuickLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");

      setUser(data.user);
      setLoginModalOpen(false);
      setLoginPassword("");
      if (data.user.role === "admin") {
        router.push("/admin");
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setUserMenuOpen(false);
      router.refresh();
    } catch {
      // ignore
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setOrderMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.get("name"),
            phone: form.get("phone"),
            address: form.get("address"),
          },
          fulfillmentMethod: "delivery",
          paymentMethod: "cod",
          deliveryAddress: {
            street: form.get("address"),
            city: "Lahore",
          },
          items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your order.");
      setOrderMessage(
        `Order request #${result.orderNumber} placed! You can track this order in real time.`,
      );
      setCart([]);
      setCheckoutOpen(false);
      localStorage.removeItem(CART_STORAGE_KEY);
      router.push(`/orders/${result.orderNumber}`);
    } catch (error) {
      setOrderMessage(
        error instanceof Error ? error.message : "Could not submit your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f1] text-[#244c37]">
      {/* Existing Header with Added Login / Sign Up / Account Area */}
      <header className="sticky top-0 z-30 border-b border-[#244c37]/10 bg-[#faf8f1]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Rainbow Rewri home">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#244c37] text-xl font-bold text-[#e8b75b]">
              R
            </span>
            <span>
              <span className="block font-serif text-xl font-bold tracking-wide">Rainbow Rewri</span>
              <span className="block text-[10px] uppercase tracking-[0.24em] text-[#8b7857]">
                Good food. Good mood.
              </span>
            </span>
          </a>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a className="hover:text-[#bd7d28] transition" href="#home">
              Home
            </a>
            <a className="hover:text-[#bd7d28] transition" href="#products">
              Our Products
            </a>
            <a className="hover:text-[#bd7d28] transition" href="#story">
              Our Story
            </a>
            <a className="hover:text-[#bd7d28] transition" href="#contact">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* User Account / Login / Sign Up */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full border border-[#244c37]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[#244c37] hover:bg-[#faf8f1] transition"
                >
                  <UserIcon size={15} className="text-[#bd7d28]" />
                  <span className="max-w-[110px] truncate">{user.name.split(" ")[0]}</span>
                  {user.role === "admin" && (
                    <span className="rounded-full bg-[#e8b75b] px-1.5 py-0.2 text-[9px] font-bold text-[#244c37]">
                      Admin
                    </span>
                  )}
                  <ChevronDown size={14} className="text-[#8b7857]" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[#244c37]/10 bg-white p-2 shadow-xl z-50 text-xs">
                    <div className="px-3 py-2 border-b border-[#244c37]/10">
                      <p className="font-bold truncate">{user.name}</p>
                      <p className="text-[#8b7857] truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-[#faf8f1] font-medium"
                    >
                      <UserIcon size={14} className="text-[#bd7d28]" /> My Dashboard
                    </Link>

                    <Link
                      href="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-[#faf8f1] font-medium"
                    >
                      <ShoppingBag size={14} className="text-[#bd7d28]" /> My Orders
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 bg-[#e8b75b]/20 font-bold text-[#8c6a32] hover:bg-[#e8b75b]/30"
                      >
                        <ShieldCheck size={14} /> Admin Dashboard
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50 text-left font-medium"
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="rounded-full border border-[#244c37]/20 px-3.5 py-2 text-xs font-semibold text-[#244c37] hover:bg-white transition"
                >
                  Log In
                </button>
                <Link
                  href="/signup"
                  className="hidden sm:inline-flex rounded-full bg-[#faf8f1] border border-[#d9c79f] px-3.5 py-2 text-xs font-semibold text-[#8c6a32] hover:bg-white transition"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Existing Basket Button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-[#244c37] px-4 py-3 text-sm font-semibold !text-white hover:bg-[#183724]"
              aria-label={`Open basket, ${cartCount} items`}
            >
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">My Basket</span>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#e8b75b] px-1 text-xs font-bold text-[#244c37]">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2 md:py-28">
          <div className="relative z-10">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9c79f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6a32]">
              <span className="h-2 w-2 rounded-full bg-[#c98a35]" />
              Tradition in every bite
            </span>
            <h1 className="max-w-xl font-serif text-5xl font-medium leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
              A little sweetness,
              <span className="mt-2 block italic text-[#c98a35]">a lot of joy.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#657264] sm:text-lg">
              Discover familiar flavours, delightful treats, and traditional goodness made for
              sharing with the people you love.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#products" className={`${buttonClass} inline-flex items-center gap-3 px-7 py-4`}>
                Explore our menu <ArrowUpRight size={19} />
              </a>
              <a
                href="#story"
                className="inline-flex items-center gap-2 rounded-full border border-[#244c37]/20 px-7 py-4 font-semibold hover:bg-white"
              >
                Our story
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#244c37]/10 pt-7">
              <div>
                <p className="font-serif text-2xl font-bold">Made with care</p>
                <p className="mt-1 text-sm text-[#7b8579]">A taste of tradition</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold">Made to share</p>
                <p className="mt-1 text-sm text-[#7b8579]">Little moments, big joy</p>
              </div>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -right-3 -top-5 h-32 w-32 rounded-full bg-[#e8b75b]/25 blur-2xl sm:-right-8 sm:h-48 sm:w-48" />
            <div className="absolute -bottom-5 -left-5 h-36 w-36 rounded-full bg-[#7b9c70]/20 blur-2xl" />
            <div className="relative rounded-[48%_48%_24px_24px] border border-[#d9c79f] bg-[#f0e8d6] p-3 sm:p-5">
              <Image
                unoptimized
                width={1100}
                height={900}
                src="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1100&q=90"
                alt="A selection of sweet treats"
                className="h-[360px] w-full rounded-[48%_48%_18px_18px] object-cover sm:h-[490px]"
                fetchPriority="high"
              />
              <div className="absolute bottom-8 left-1/2 w-[80%] -translate-x-1/2 rounded-2xl border border-white/60 bg-[#faf8f1]/95 p-4 shadow-lg backdrop-blur-sm sm:bottom-10 sm:p-5">
                <p className="font-serif text-xl font-bold">A taste of happiness</p>
                <p className="mt-1 text-sm text-[#657264]">
                  For everyday cravings and special celebrations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Strip */}
      <section className="border-y border-[#244c37]/10 bg-[#f2eee3]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8">
          <div className="text-center">
            <p className="font-serif text-xl font-bold">A love for tradition</p>
            <p className="mt-2 text-sm text-[#657264]">Inspired by familiar flavours</p>
          </div>
          <div className="text-center">
            <p className="font-serif text-xl font-bold">Something for everyone</p>
            <p className="mt-2 text-sm text-[#657264]">Sweet and savoury favourites</p>
          </div>
          <div className="text-center">
            <p className="font-serif text-xl font-bold">Made for togetherness</p>
            <p className="mt-2 text-sm text-[#657264]">Treats worth passing around</p>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#bd7d28]">
              From our kitchen
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium sm:text-5xl">
              Made for your cravings.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-[#657264]">
              Find something delicious for yourself or a little something to make someone&apos;s day.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter products">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? "bg-[#244c37] !text-white"
                    : "border border-[#244c37]/15 hover:bg-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-7 flex max-w-md items-center gap-3 rounded-full border border-[#244c37]/15 bg-white px-5 py-3 text-[#657264]">
          <Search size={18} />
          <span className="sr-only">Search products</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sweets, snacks, meals…"
            className="w-full bg-transparent text-sm text-[#244c37] outline-none placeholder:text-[#8a9389]"
          />
        </label>

        {loadError ? (
          <div
            role="alert"
            className="mt-10 rounded-3xl border border-amber-300 bg-amber-50 p-8 text-[#6e572a]"
          >
            <h3 className="font-serif text-2xl font-bold">Our menu is temporarily unavailable</h3>
            <p className="mt-2 text-sm leading-6">Please try again shortly.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-[#244c37]/10 bg-white p-8 text-center">
            <h3 className="font-serif text-2xl font-bold">The menu is empty</h3>
            <p className="mt-2 text-sm text-[#657264]">Products will appear once added by admin.</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <p className="mt-10 rounded-3xl bg-white p-8 text-center text-[#657264]">
            No products match that search. Try another name or category.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => {
              const isOnSale = product.salePrice && product.salePrice < product.price;
              const displayPrice = isOnSale ? product.salePrice! : product.price;
              const isOutOfStock = product.stock <= 0;

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-3xl border border-[#244c37]/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#244c37]/10 flex flex-col justify-between"
                >
                  <div
                    className="relative overflow-hidden bg-[#f0e8d6] cursor-pointer"
                    onClick={() => {
                      setInspectProduct(product);
                      setInspectQuantity(1);
                    }}
                  >
                    <Image
                      unoptimized
                      width={900}
                      height={600}
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    {/* Sale Badge */}
                    {isOnSale ? (
                      <span className="absolute left-4 top-4 rounded-full bg-[#c98a35] px-3 py-1 text-xs font-bold text-white shadow-md">
                        SALE {product.discountPercent ? `• ${product.discountPercent}% OFF` : ""}
                      </span>
                    ) : (
                      product.tag && (
                        <span className="absolute left-4 top-4 rounded-full bg-[#faf8f1]/95 px-3 py-2 text-xs font-semibold text-[#244c37]">
                          {product.tag}
                        </span>
                      )
                    )}

                    {/* Stock Alert Badge */}
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute right-4 top-4 rounded-full bg-red-100/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-red-800">
                        Only {product.stock} left
                      </span>
                    )}
                  </div>

                  <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bd7d28]">
                            {product.category}
                          </p>
                          <h3
                            onClick={() => {
                              setInspectProduct(product);
                              setInspectQuantity(1);
                            }}
                            className="mt-2 font-serif text-2xl font-bold cursor-pointer hover:text-[#bd7d28] transition"
                          >
                            {product.name}
                          </h3>
                        </div>
                        <div className="shrink-0 text-right pt-1">
                          <p className="font-semibold text-base">{formatPrice(displayPrice)}</p>
                          {isOnSale && (
                            <p className="text-xs text-[#8b7857] line-through">
                              {formatPrice(product.price)}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-[#657264] line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-5">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product)}
                        className={`${buttonClass} flex w-full items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <ShoppingBag size={17} />
                        {isOutOfStock ? "Out of Stock" : "Add to basket"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Story Section */}
      <section id="story" className="bg-[#244c37] text-[#faf8f1]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#e8b75b]">
              A little about us
            </p>
            <h2 className="mt-4 max-w-lg font-serif text-4xl font-medium leading-tight sm:text-5xl">
              Good food brings people closer.
            </h2>
          </div>
          <div>
            <p className="leading-8 text-white/75">
              Rainbow Rewri celebrates the simple pleasure of sharing food. From sweet little treats to
              savoury favourites, our aim is to bring warmth, flavour, and a little happiness to your
              table.
            </p>
            <a
              href="#products"
              className="mt-7 inline-flex items-center gap-2 font-semibold text-[#e8b75b]"
            >
              Find your favourite <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-[#f0e8d6] p-7 sm:flex-row sm:items-center sm:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#bd7d28]">
              Your next favourite treat
            </p>
            <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
              Every good day deserves a little sweetness.
            </h2>
          </div>
          <a
            href="#products"
            className={`${buttonClass} inline-flex shrink-0 items-center gap-3 px-7 py-4`}
          >
            Shop the collection <ArrowUpRight size={19} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-[#244c37]/10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-10 sm:px-8 md:flex-row">
          <div>
            <a href="#home" className="font-serif text-2xl font-bold">
              Rainbow Rewri
            </a>
            <p className="mt-2 text-sm text-[#657264]">Good food. Good mood. Made for sharing.</p>
          </div>
          <div>
            <p className="font-semibold">Explore</p>
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-[#657264]">
              <a href="#home">Home</a>
              <a href="#products">Products</a>
              <a href="#story">Our Story</a>
              <Link href="/checkout">Checkout</Link>
            </div>
          </div>
          <div>
            <p className="font-semibold">Admin & Staff</p>
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-[#657264]">
              <Link href="/admin/login" className="hover:text-[#bd7d28]">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#244c37]/10 px-5 py-5 text-center text-xs text-[#657264]">
          © {new Date().getFullYear()} Rainbow Rewri. All rights reserved.
        </div>
      </footer>

      {/* Product Quick-View Modal */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#faf8f1] p-6 sm:p-8 shadow-2xl border border-[#244c37]/10">
            <div className="flex justify-between items-start">
              <span className="text-xs uppercase font-bold tracking-wider text-[#bd7d28]">
                {inspectProduct.category}
              </span>
              <button
                onClick={() => setInspectProduct(null)}
                className="rounded-full p-1.5 hover:bg-[#244c37]/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mt-3 overflow-hidden rounded-2xl bg-[#f0e8d6]">
              <Image
                unoptimized
                width={800}
                height={500}
                src={inspectProduct.image}
                alt={inspectProduct.name}
                className="h-60 w-full object-cover"
              />
              {inspectProduct.salePrice && inspectProduct.salePrice < inspectProduct.price && (
                <span className="absolute left-3 top-3 rounded-full bg-[#c98a35] px-3 py-1 text-xs font-bold text-white">
                  SALE {inspectProduct.discountPercent ? `${inspectProduct.discountPercent}% OFF` : ""}
                </span>
              )}
            </div>

            <h3 className="mt-4 font-serif text-2xl font-bold">{inspectProduct.name}</h3>
            <p className="mt-2 text-sm text-[#657264] leading-relaxed">
              {inspectProduct.description}
            </p>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-serif text-2xl font-bold text-[#244c37]">
                {formatPrice(
                  inspectProduct.salePrice && inspectProduct.salePrice < inspectProduct.price
                    ? inspectProduct.salePrice
                    : inspectProduct.price,
                )}
              </span>
              {inspectProduct.salePrice && inspectProduct.salePrice < inspectProduct.price && (
                <span className="text-sm text-[#8b7857] line-through">
                  {formatPrice(inspectProduct.price)}
                </span>
              )}
              <span className="ml-auto text-xs text-[#8b7857]">
                {inspectProduct.stock > 0 ? (
                  <span className="text-emerald-700 font-semibold">
                    In Stock ({inspectProduct.stock} available)
                  </span>
                ) : (
                  <span className="text-red-700 font-semibold">Out of stock</span>
                )}
              </span>
            </div>

            {inspectProduct.stock > 0 && (
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-3 rounded-full border border-[#244c37]/20 px-3 py-1.5 bg-white">
                  <button
                    type="button"
                    onClick={() => setInspectQuantity(Math.max(1, inspectQuantity - 1))}
                    className="p-1"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="min-w-6 text-center text-sm font-bold">{inspectQuantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setInspectQuantity(Math.min(inspectProduct.stock, inspectQuantity + 1))
                    }
                    className="p-1"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(inspectProduct, inspectQuantity);
                    setInspectProduct(null);
                  }}
                  className={`${buttonClass} flex-1 flex items-center justify-center gap-2`}
                >
                  <ShoppingBag size={17} /> Add {inspectQuantity} to basket
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Login Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl border border-[#244c37]/10">
            <div className="flex justify-between items-center border-b border-[#244c37]/10 pb-3">
              <h3 className="font-serif text-xl font-bold">Sign In</h3>
              <button onClick={() => setLoginModalOpen(false)} className="rounded-full p-1 hover:bg-[#faf8f1]">
                <X size={18} />
              </button>
            </div>

            {loginError && (
              <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-700 border border-red-200">
                {loginError}
              </div>
            )}

            <form onSubmit={handleQuickLogin} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#657264]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-[#faf8f1] px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#657264]">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-[#244c37]/20 bg-[#faf8f1] px-3 py-2 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-full bg-[#244c37] py-2.5 text-xs font-semibold text-white hover:bg-[#183724] disabled:opacity-50"
              >
                {loginLoading ? "Signing in…" : "Log In"}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-[#657264]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                onClick={() => setLoginModalOpen(false)}
                className="font-bold text-[#bd7d28] hover:underline"
              >
                Sign up here
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Basket Drawer (Preserved from existing UI with enhanced checkout button) */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close basket overlay"
            onClick={() => {
              setCartOpen(false);
              setCheckoutOpen(false);
            }}
            className="absolute inset-0 h-full w-full bg-black/45"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="basket-title"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#faf8f1] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#244c37]/10 p-5 sm:p-6">
              <div>
                <h2 id="basket-title" className="font-serif text-2xl font-bold">
                  Your basket
                </h2>
                <p className="mt-1 text-sm text-[#657264]">
                  {cartCount} {cartCount === 1 ? "item" : "items"} in your basket
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(false);
                }}
                aria-label="Close basket"
                className="rounded-full p-2 hover:bg-[#244c37]/10"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {orderMessage && (
                <p
                  role="status"
                  className="mb-5 rounded-2xl bg-[#e9f1e5] p-4 text-sm leading-6 text-[#244c37]"
                >
                  {orderMessage}
                </p>
              )}

              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag size={42} className="text-[#bd7d28]" />
                  <h3 className="mt-5 font-serif text-2xl font-bold">Your basket is empty</h3>
                  <p className="mt-2 text-sm text-[#657264]">
                    Find something delicious to get started.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`${buttonClass} mt-6`}
                  >
                    Browse products
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {cart.map((item) => {
                    const activeUnitPrice =
                      item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
                    return (
                      <article
                        key={item.id}
                        className="flex gap-4 border-b border-[#244c37]/10 pb-5"
                      >
                        <Image
                          unoptimized
                          width={96}
                          height={96}
                          src={item.image}
                          alt=""
                          className="h-24 w-24 shrink-0 rounded-2xl bg-[#f0e8d6] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-lg font-bold truncate">{item.name}</h3>
                            <button
                              type="button"
                              onClick={() =>
                                setCart((current) => current.filter((entry) => entry.id !== item.id))
                              }
                              aria-label={`Remove ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <X size={17} />
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-[#657264]">
                            {formatPrice(activeUnitPrice)} each
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 rounded-full border border-[#244c37]/15 px-2 py-1">
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, -1)}
                                aria-label={`Decrease ${item.name} quantity`}
                                className="rounded-full p-1"
                              >
                                <Minus size={15} />
                              </button>
                              <span className="min-w-4 text-center text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, 1)}
                                aria-label={`Increase ${item.name} quantity`}
                                disabled={item.quantity >= (item.stock || 99)}
                                className="rounded-full p-1 disabled:opacity-40"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                            <p className="text-sm font-bold">
                              {formatPrice(activeUnitPrice * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-[#244c37]/10 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[#657264]">Subtotal</span>
                  <span className="font-serif text-2xl font-bold">{formatPrice(subtotal)}</span>
                </div>

                {totalSavings > 0 && (
                  <div className="mt-1 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                    <span>Discount Savings</span>
                    <span>- {formatPrice(totalSavings)}</span>
                  </div>
                )}

                <p className="mt-2 text-xs leading-5 text-[#657264]">
                  Fulfillment options (Home Delivery & Store Pickup) and payment methods are selected
                  at checkout.
                </p>

                {checkoutOpen ? (
                  <form onSubmit={submitOrder} className="mt-5 space-y-3">
                    <p className="text-sm font-semibold">Quick order request</p>
                    <label className="block text-sm">
                      Name
                      <input
                        required
                        name="name"
                        defaultValue={user ? user.name : ""}
                        autoComplete="name"
                        maxLength={100}
                        className="mt-1 w-full rounded-xl border border-[#244c37]/20 px-4 py-3"
                      />
                    </label>
                    <label className="block text-sm">
                      Phone
                      <input
                        required
                        name="phone"
                        type="tel"
                        defaultValue={user ? user.phone : ""}
                        autoComplete="tel"
                        maxLength={30}
                        className="mt-1 w-full rounded-xl border border-[#244c37]/20 px-4 py-3"
                      />
                    </label>
                    <label className="block text-sm">
                      Delivery address
                      <textarea
                        required
                        name="address"
                        autoComplete="street-address"
                        maxLength={500}
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-[#244c37]/20 px-4 py-3"
                      />
                    </label>
                    <button
                      disabled={submitting}
                      className={`${buttonClass} w-full disabled:opacity-50`}
                    >
                      {submitting ? "Submitting…" : "Submit Quick Order"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutOpen(false)}
                      className="w-full py-2 text-sm text-[#657264]"
                    >
                      Back to options
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 space-y-2">
                    <Link
                      href="/checkout"
                      onClick={() => setCartOpen(false)}
                      className={`${buttonClass} flex w-full items-center justify-center gap-2 py-4`}
                    >
                      Proceed to Checkout <ArrowRight size={17} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutOpen(true);
                        setOrderMessage("");
                      }}
                      className="w-full rounded-full border border-[#244c37]/20 py-2.5 text-xs font-semibold text-[#244c37] hover:bg-[#faf8f1]"
                    >
                      Quick Manual Order
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
