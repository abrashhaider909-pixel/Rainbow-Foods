"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowUpRight, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";

type Category = "Sweets" | "Snacks" | "Meals";
type Filter = "All" | Category;
type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  tag?: string;
};
type CartItem = Product & { quantity: number };

const CART_STORAGE_KEY = "rainbow-rewri-cart";
const filters: Filter[] = ["All", "Sweets", "Snacks", "Meals"];
const buttonClass = "rounded-full bg-[#244c37] px-6 py-3 font-semibold !text-white transition hover:bg-[#183724]";

function formatPrice(price: number) {
  return `PKR ${price.toLocaleString("en-PK")}`;
}

export default function HomeClient({ products, loadError = false }: { products: Product[]; loadError?: boolean }) {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        const restored = parsed.flatMap((entry) => {
          if (!entry || typeof entry.id !== "number" || !Number.isInteger(entry.quantity) || entry.quantity < 1) return [];
          const product = products.find((item) => item.id === entry.id);
          return product ? [{ ...product, quantity: Math.min(entry.quantity, 99) }] : [];
        });
        // Defer restoration so the server and first client render match.
        window.setTimeout(() => setCart(restored), 0);
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    window.setTimeout(() => setCartLoaded(true), 0);
  }, [products]);

  useEffect(() => {
    if (cartLoaded) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  const visibleProducts = useMemo(() => products.filter((product) =>
    (activeFilter === "All" || product.category === activeFilter) &&
    `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [products, activeFilter, query]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, 99) } : item)
        : [...current, { ...product, quantity: 1 }];
    });
    setOrderMessage("");
    setCartOpen(true);
  }

  function changeQuantity(productId: number, amount: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = item.quantity + amount;
      return quantity > 0 ? [{ ...item, quantity: Math.min(quantity, 99) }] : [];
    }));
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
          customer: { name: form.get("name"), phone: form.get("phone"), address: form.get("address") },
          items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your order.");
      setOrderMessage(`Order request ${result.orderNumber} saved. This is a manual order request; no payment was taken.`);
      setCart([]);
      setCheckoutOpen(false);
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : "Could not submit your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f1] text-[#244c37]">
      <header className="sticky top-0 z-30 border-b border-[#244c37]/10 bg-[#faf8f1]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Rainbow Rewri home">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#244c37] text-xl font-bold text-[#e8b75b]">R</span>
            <span><span className="block font-serif text-xl font-bold tracking-wide">Rainbow Rewri</span><span className="block text-[10px] uppercase tracking-[0.24em] text-[#8b7857]">Good food. Good mood.</span></span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a className="hover:text-[#bd7d28]" href="#home">Home</a><a className="hover:text-[#bd7d28]" href="#products">Our Products</a><a className="hover:text-[#bd7d28]" href="#story">Our Story</a><a className="hover:text-[#bd7d28]" href="#contact">Contact</a>
          </nav>
          <button type="button" onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 rounded-full bg-[#244c37] px-4 py-3 text-sm font-semibold !text-white hover:bg-[#183724]" aria-label={`Open basket, ${cartCount} items`}>
            <ShoppingBag size={18} /><span className="hidden sm:inline">My Basket</span><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#e8b75b] px-1 text-xs font-bold text-[#244c37]">{cartCount}</span>
          </button>
        </div>
      </header>

      <section id="home" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2 md:py-28">
          <div className="relative z-10">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9c79f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6a32]"><span className="h-2 w-2 rounded-full bg-[#c98a35]" />Tradition in every bite</span>
            <h1 className="max-w-xl font-serif text-5xl font-medium leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">A little sweetness,<span className="mt-2 block italic text-[#c98a35]">a lot of joy.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#657264] sm:text-lg">Discover familiar flavours, delightful treats, and traditional goodness made for sharing with the people you love.</p>
            <div className="mt-9 flex flex-wrap gap-4"><a href="#products" className={`${buttonClass} inline-flex items-center gap-3 px-7 py-4`}>Explore our menu <ArrowUpRight size={19} /></a><a href="#story" className="inline-flex items-center gap-2 rounded-full border border-[#244c37]/20 px-7 py-4 font-semibold hover:bg-white">Our story</a></div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#244c37]/10 pt-7"><div><p className="font-serif text-2xl font-bold">Made with care</p><p className="mt-1 text-sm text-[#7b8579]">A taste of tradition</p></div><div><p className="font-serif text-2xl font-bold">Made to share</p><p className="mt-1 text-sm text-[#7b8579]">Little moments, big joy</p></div></div>
          </div>
          <div className="relative mx-auto w-full max-w-xl"><div className="absolute -right-3 -top-5 h-32 w-32 rounded-full bg-[#e8b75b]/25 blur-2xl sm:-right-8 sm:h-48 sm:w-48" /><div className="absolute -bottom-5 -left-5 h-36 w-36 rounded-full bg-[#7b9c70]/20 blur-2xl" /><div className="relative rounded-[48%_48%_24px_24px] border border-[#d9c79f] bg-[#f0e8d6] p-3 sm:p-5"><Image unoptimized width={1100} height={900} src="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1100&q=90" alt="A selection of sweet treats" className="h-[360px] w-full rounded-[48%_48%_18px_18px] object-cover sm:h-[490px]" fetchPriority="high" /><div className="absolute bottom-8 left-1/2 w-[80%] -translate-x-1/2 rounded-2xl border border-white/60 bg-[#faf8f1]/95 p-4 shadow-lg backdrop-blur-sm sm:bottom-10 sm:p-5"><p className="font-serif text-xl font-bold">A taste of happiness</p><p className="mt-1 text-sm text-[#657264]">For everyday cravings and special celebrations.</p></div></div></div>
        </div>
      </section>

      <section className="border-y border-[#244c37]/10 bg-[#f2eee3]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8"><div className="text-center"><p className="font-serif text-xl font-bold">A love for tradition</p><p className="mt-2 text-sm text-[#657264]">Inspired by familiar flavours</p></div><div className="text-center"><p className="font-serif text-xl font-bold">Something for everyone</p><p className="mt-2 text-sm text-[#657264]">Sweet and savoury favourites</p></div><div className="text-center"><p className="font-serif text-xl font-bold">Made for togetherness</p><p className="mt-2 text-sm text-[#657264]">Treats worth passing around</p></div></div></section>

      <section id="products" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#bd7d28]">From our kitchen</p><h2 className="mt-3 font-serif text-4xl font-medium sm:text-5xl">Made for your cravings.</h2><p className="mt-4 max-w-xl leading-7 text-[#657264]">Find something delicious for yourself or a little something to make someone&apos;s day.</p></div>
          <div className="flex flex-wrap gap-2" aria-label="Filter products">{filters.map((filter) => <button type="button" key={filter} onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${activeFilter === filter ? "bg-[#244c37] !text-white" : "border border-[#244c37]/15 hover:bg-white"}`}>{filter}</button>)}</div>
        </div>
        <label className="mt-7 flex max-w-md items-center gap-3 rounded-full border border-[#244c37]/15 bg-white px-5 py-3 text-[#657264]"><Search size={18} /><span className="sr-only">Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sweets, snacks, meals…" className="w-full bg-transparent text-sm text-[#244c37] outline-none placeholder:text-[#8a9389]" /></label>
        {loadError ? <div role="alert" className="mt-10 rounded-3xl border border-amber-300 bg-amber-50 p-8 text-[#6e572a]"><h3 className="font-serif text-2xl font-bold">Our menu is temporarily unavailable</h3><p className="mt-2 text-sm leading-6">Please try again shortly. If this is a new setup, check the MongoDB connection and run <code>npm run seed</code> to add the menu items.</p></div> : products.length === 0 ? <div className="mt-10 rounded-3xl border border-[#244c37]/10 bg-white p-8 text-center"><h3 className="font-serif text-2xl font-bold">The menu is empty</h3><p className="mt-2 text-sm text-[#657264]">Add the starter products with <code>npm run seed</code>, then refresh this page.</p></div> : visibleProducts.length === 0 ? <p className="mt-10 rounded-3xl bg-white p-8 text-center text-[#657264]">No products match that search. Try another name or category.</p> : <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-3xl border border-[#244c37]/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#244c37]/10"><div className="relative overflow-hidden bg-[#f0e8d6]"><Image unoptimized width={900} height={600} src={product.image} alt={product.name} loading="lazy" className="h-64 w-full object-cover transition duration-500 group-hover:scale-105" />{product.tag && <span className="absolute left-4 top-4 rounded-full bg-[#faf8f1]/95 px-3 py-2 text-xs font-semibold text-[#244c37]">{product.tag}</span>}</div><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bd7d28]">{product.category}</p><h3 className="mt-2 font-serif text-2xl font-bold">{product.name}</h3></div><p className="shrink-0 pt-1 font-semibold">{formatPrice(product.price)}</p></div><p className="mt-3 min-h-12 text-sm leading-6 text-[#657264]">{product.description}</p><button type="button" onClick={() => addToCart(product)} className={`${buttonClass} mt-5 flex w-full items-center justify-center gap-2`}><ShoppingBag size={17} /> Add to basket</button></div></article>)}</div>}
      </section>

      <section id="story" className="bg-[#244c37] text-[#faf8f1]"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#e8b75b]">A little about us</p><h2 className="mt-4 max-w-lg font-serif text-4xl font-medium leading-tight sm:text-5xl">Good food brings people closer.</h2></div><div><p className="leading-8 text-white/75">Rainbow Rewri celebrates the simple pleasure of sharing food. From sweet little treats to savoury favourites, our aim is to bring warmth, flavour, and a little happiness to your table.</p><a href="#products" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#e8b75b]">Find your favourite <ArrowUpRight size={18} /></a></div></div></section>
      <section className="px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-[#f0e8d6] p-7 sm:flex-row sm:items-center sm:p-12"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#bd7d28]">Your next favourite treat</p><h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Every good day deserves a little sweetness.</h2></div><a href="#products" className={`${buttonClass} inline-flex shrink-0 items-center gap-3 px-7 py-4`}>Shop the collection <ArrowUpRight size={19} /></a></div></section>

      <footer id="contact" className="border-t border-[#244c37]/10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-10 sm:px-8 md:flex-row"><div><a href="#home" className="font-serif text-2xl font-bold">Rainbow Rewri</a><p className="mt-2 text-sm text-[#657264]">Good food. Good mood. Made for sharing.</p></div><div><p className="font-semibold">Explore</p><div className="mt-3 flex flex-wrap gap-5 text-sm text-[#657264]"><a href="#home">Home</a><a href="#products">Products</a><a href="#story">Our Story</a></div></div><div><p className="font-semibold">Get in touch</p><p className="mt-3 text-sm text-[#657264]">Contact details coming soon.</p></div></div><div className="border-t border-[#244c37]/10 px-5 py-5 text-center text-xs text-[#657264]">© {new Date().getFullYear()} Rainbow Rewri. All rights reserved.</div></footer>

      {cartOpen && <div className="fixed inset-0 z-50"><button type="button" aria-label="Close basket overlay" onClick={() => { setCartOpen(false); setCheckoutOpen(false); }} className="absolute inset-0 h-full w-full bg-black/45" /><aside role="dialog" aria-modal="true" aria-labelledby="basket-title" className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#faf8f1] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#244c37]/10 p-5 sm:p-6"><div><h2 id="basket-title" className="font-serif text-2xl font-bold">Your basket</h2><p className="mt-1 text-sm text-[#657264]">{cartCount} {cartCount === 1 ? "item" : "items"} in your basket</p></div><button type="button" onClick={() => { setCartOpen(false); setCheckoutOpen(false); }} aria-label="Close basket" className="rounded-full p-2 hover:bg-[#244c37]/10"><X size={22} /></button></div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{orderMessage && <p role="status" className="mb-5 rounded-2xl bg-[#e9f1e5] p-4 text-sm leading-6 text-[#244c37]">{orderMessage}</p>}{cart.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><ShoppingBag size={42} className="text-[#bd7d28]" /><h3 className="mt-5 font-serif text-2xl font-bold">Your basket is empty</h3><p className="mt-2 text-sm text-[#657264]">Find something delicious to get started.</p><button type="button" onClick={() => { setCartOpen(false); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className={`${buttonClass} mt-6`}>Browse products</button></div> : <div className="space-y-5">{cart.map((item) => <article key={item.id} className="flex gap-4 border-b border-[#244c37]/10 pb-5"><Image unoptimized width={96} height={96} src={item.image} alt="" className="h-24 w-24 shrink-0 rounded-2xl bg-[#f0e8d6] object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="font-serif text-lg font-bold">{item.name}</h3><button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Remove ${item.name}`} className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600"><X size={17} /></button></div><p className="mt-1 text-sm text-[#657264]">{formatPrice(item.price)} each</p><div className="mt-3 flex items-center justify-between gap-3"><div className="flex items-center gap-3 rounded-full border border-[#244c37]/15 px-2 py-1"><button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Decrease ${item.name} quantity`} className="rounded-full p-1"><Minus size={15} /></button><span className="min-w-4 text-center text-sm font-semibold">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= 99} className="rounded-full p-1 disabled:opacity-40"><Plus size={15} /></button></div><p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p></div></div></article>)}</div>}</div>
        {cart.length > 0 && <div className="border-t border-[#244c37]/10 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-[#657264]">Subtotal</span><span className="font-serif text-2xl font-bold">{formatPrice(subtotal)}</span></div><p className="mt-2 text-xs leading-5 text-[#657264]">Delivery charges, if applicable, are not included. Payment is not collected online.</p>{checkoutOpen ? <form onSubmit={submitOrder} className="mt-5 space-y-3"><p className="text-sm font-semibold">Manual order request</p><label className="block text-sm">Name<input required name="name" autoComplete="name" maxLength={100} className="mt-1 w-full rounded-xl border border-[#244c37]/20 px-4 py-3" /></label><label className="block text-sm">Phone<input required name="phone" type="tel" autoComplete="tel" maxLength={30} className="mt-1 w-full rounded-xl border border-[#244c37]/20 px-4 py-3" /></label><label className="block text-sm">Delivery address<textarea required name="address" autoComplete="street-address" maxLength={500} rows={2} className="mt-1 w-full rounded-xl border border-[#244c37]/20 px-4 py-3" /></label><p className="text-xs leading-5 text-[#657264]">Submitting saves your request for the shop to follow up. No payment or delivery arrangement is made here.</p><button disabled={submitting} className={`${buttonClass} w-full disabled:opacity-50`}>{submitting ? "Submitting…" : "Submit order request"}</button><button type="button" onClick={() => setCheckoutOpen(false)} className="w-full py-2 text-sm text-[#657264]">Back to basket</button></form> : <button type="button" onClick={() => { setCheckoutOpen(true); setOrderMessage(""); }} className={`${buttonClass} mt-5 w-full py-4`}>Continue with manual order</button>}</div>}
      </aside></div>}
    </main>
  );
}
