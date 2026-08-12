"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserRole } from "@/components/UserRoleProvider";
import type { Product } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { canManageProducts } from "@/lib/permissions";

const categoryOptions = ["Wraps", "Sandwiches", "Breakfast", "Samosas", "Drinks", "Snacks"];
const imageOptions = [
  "/images/default.svg",
  "/images/wraps.svg",
  "/images/sandwiches.svg",
  "/images/breakfast.svg",
  "/images/samosas.svg",
  "/images/drinks.svg",
  "/images/snacks.svg",
];

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function ProductsPage() {
  const { t, currentUser, isReady, language, usesSupabase } = useUserRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categoryOptions[0]);
  const [image, setImage] = useState(imageOptions[1]);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const manageProducts = currentUser ? canManageProducts(currentUser.role) : false;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setProducts((await response.json()) as Product[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Fetching begins when the browser-only staff session has been restored.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchProducts();
    }
  }, [currentUser, fetchProducts]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches = selectedCategory === "All" || product.category === selectedCategory;
      const queryMatches = !normalizedQuery || `${product.name} ${product.category}`.toLowerCase().includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
  }, [products, query, selectedCategory]);

  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.unitPrice, 0);
  const lowStockCount = products.filter((product) => product.stock <= 10).length;

  async function requestError(response: Response, fallback: string) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || fallback;
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser || !manageProducts) return setFeedback({ kind: "error", text: t("onlyManagerCanManage") });

    setPendingAction("add");
    setFeedback(null);
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": currentUser.role },
      body: JSON.stringify({ name, category, image, unitPrice: Number(price), stock: Number(stock) }),
    });
    if (!response.ok) {
      setFeedback({ kind: "error", text: await requestError(response, t("unableToSaveProduct")) });
      setPendingAction(null);
      return;
    }

    setName("");
    setPrice("");
    setStock("");
    setFeedback({ kind: "success", text: t("productSaved") });
    await fetchProducts();
    setPendingAction(null);
  }

  async function uploadProductImage(file: File, onUploaded: (url: string) => void) {
    setUploadingImage(true);
    setFeedback(null);
    const formData = new FormData();
    formData.set("image", file);
    const response = await fetch("/api/images", { method: "POST", body: formData });
    if (!response.ok) {
      setFeedback({ kind: "error", text: await requestError(response, t("unableToUploadImage")) });
      setUploadingImage(false);
      return;
    }
    const body = (await response.json()) as { url: string };
    onUploaded(body.url);
    setFeedback({ kind: "success", text: t("imageUploaded") });
    setUploadingImage(false);
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser || !editing || !manageProducts) return;
    setPendingAction(editing.id);
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": currentUser.role },
      body: JSON.stringify(editing),
    });
    if (!response.ok) {
      setFeedback({ kind: "error", text: await requestError(response, t("unableToSaveProduct")) });
      setPendingAction(null);
      return;
    }
    setEditing(null);
    setFeedback({ kind: "success", text: t("productUpdated") });
    await fetchProducts();
    setPendingAction(null);
  }

  async function handleDelete(product: Product) {
    if (!currentUser || !manageProducts) return;
    if (!window.confirm(`${product.name}\n\n${t("confirmDeleteProduct")}`)) return;
    setPendingAction(product.id);
    const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, {
      method: "DELETE",
      headers: { "x-user-role": currentUser.role },
    });
    if (response.ok) {
      if (editing?.id === product.id) setEditing(null);
      setFeedback({ kind: "success", text: t("productDeleted") });
      await fetchProducts();
    } else {
      setFeedback({ kind: "error", text: await requestError(response, t("unableToDeleteProduct")) });
    }
    setPendingAction(null);
  }

  if (!isReady) return <PageMessage title={t("productsPage")} message={t("loading")} />;
  if (!currentUser) return <PageMessage title={t("productsPage")} message={t("pleaseLogin")} />;

  return (
    <main className="mx-auto max-w-6xl p-4 pb-10 sm:p-6 md:p-8">
      <section className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{t("currentInventory")}</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">{t("productsPage")}</h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Summary value={products.length.toLocaleString()} label={t("menuItems")} />
          <Summary value={lowStockCount.toLocaleString()} label={t("lowStock")} warning={lowStockCount > 0} />
          <Summary value={formatCurrency(inventoryValue, language)} label={t("inventoryValue")} />
        </div>
      </section>

      {manageProducts ? (
        <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">{t("addProduct")}</h2>
          <form onSubmit={handleAdd} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Field label={t("products")}>
              <input className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field label={t("category")}>
              <select
                className="input"
                value={category}
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  setCategory(nextCategory);
                  const suggestedImage = `/images/${nextCategory.toLowerCase()}.svg`;
                  if (imageOptions.includes(suggestedImage)) setImage(suggestedImage);
                }}
              >
                {categoryOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label={t("imagePath")}>
              <select className="input" value={image} onChange={(event) => setImage(event.target.value)}>
                {imageOptions.map((option) => <option key={option}>{option.replace("/images/", "")}</option>)}
              </select>
              {usesSupabase ? (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingImage}
                  aria-label={t("uploadProductImage")}
                  className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:font-bold file:text-primary"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadProductImage(file, setImage);
                    event.target.value = "";
                  }}
                />
              ) : null}
            </Field>
            <Field label={t("unitPrice")}>
              <input className="input" type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </Field>
            <Field label={t("stockQuantity")}>
              <input className="input" type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required />
            </Field>
            <div className="lg:col-span-5">
              <button className="rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong disabled:opacity-60" type="submit" disabled={pendingAction === "add" || uploadingImage}>
                {pendingAction === "add" || uploadingImage ? t("loading") : t("saveProduct")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">{t("managerOnlyProducts")}</section>
      )}

      {editing ? (
        <section className="mt-6 rounded-3xl border-2 border-amber-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold">{t("edit")}: {editing.name}</h2>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100" onClick={() => setEditing(null)}>
              {t("cancel")}
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Field label={t("products")}>
              <input className="input" value={editing.name} maxLength={80} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required />
            </Field>
            <Field label={t("category")}>
              <select className="input" value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>
                {categoryOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label={t("imagePath")}>
              <select className="input" value={editing.image} onChange={(event) => setEditing({ ...editing, image: event.target.value })}>
                {!imageOptions.includes(editing.image) ? <option value={editing.image}>{t("uploadedImage")}</option> : null}
                {imageOptions.map((option) => <option key={option} value={option}>{option.replace("/images/", "")}</option>)}
              </select>
              {usesSupabase ? (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingImage}
                  aria-label={t("uploadProductImage")}
                  className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:font-bold file:text-primary"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadProductImage(file, (url) => setEditing((current) => current ? { ...current, image: url } : current));
                    event.target.value = "";
                  }}
                />
              ) : null}
            </Field>
            <Field label={t("unitPrice")}>
              <input className="input" type="number" min="0.01" step="0.01" value={editing.unitPrice} onChange={(event) => setEditing({ ...editing, unitPrice: Number(event.target.value) })} required />
            </Field>
            <Field label={t("stockQuantity")}>
              <input className="input" type="number" min="0" step="1" value={editing.stock} onChange={(event) => setEditing({ ...editing, stock: Number(event.target.value) })} required />
            </Field>
            <div className="lg:col-span-5">
              <button className="rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong disabled:opacity-60" type="submit" disabled={pendingAction === editing.id || uploadingImage}>
                {pendingAction === editing.id || uploadingImage ? t("loading") : t("saveChanges")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">{t("currentInventory")}</h2>
            <p className="mt-1 text-sm text-slate-500">{visibleProducts.length} {t("products").toLowerCase()}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-600">
              {t("searchProducts")}
              <input className="input min-w-56" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchProducts")} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-600">
              {t("category")}
              <select className="input min-w-48" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categories.map((option) => <option key={option} value={option}>{option === "All" ? t("allCategories") : option}</option>)}
              </select>
            </label>
          </div>
        </div>

        {feedback ? (
          <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${feedback.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {feedback.text}
          </p>
        ) : null}

        {loading ? <p className="py-10 text-center text-slate-500">{t("loading")}</p> : null}
        {loadError ? (
          <div className="py-10 text-center">
            <p className="text-red-700">{t("unableToLoad")}</p>
            <button type="button" onClick={() => void fetchProducts()} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 font-bold">{t("retry")}</button>
          </div>
        ) : null}

        {!loading && !loadError ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {visibleProducts.map((product) => (
              <article key={product.id} className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-amber-200 hover:shadow-sm sm:grid-cols-[120px_minmax(0,1fr)]">
                <div className="grid min-h-28 place-items-center self-stretch rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-2">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={120}
                    height={120}
                    className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                  />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">{product.category}</span>
                  <h3 className="mt-1 text-lg font-extrabold leading-tight text-slate-900">{product.name}</h3>
                  <strong className="mt-2 text-primary">{formatCurrency(product.unitPrice, language)}</strong>
                  <div className="mt-2"><StockBadge stock={product.stock} t={t} /></div>
                  {manageProducts ? (
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <button type="button" className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-primary hover:bg-amber-100" onClick={() => setEditing(product)}>{t("edit")}</button>
                      <button type="button" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100" disabled={pendingAction === product.id} onClick={() => void handleDelete(product)}>{t("delete")}</button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {visibleProducts.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 py-10 text-center text-slate-500 md:col-span-2">{t("noProductsFound")}</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-600">{label}{children}</label>;
}

function Summary({ value, label, warning = false }: { value: string; label: string; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warning ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
      <strong className="block text-xl text-slate-900">{value}</strong>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

function StockBadge({ stock, t }: { stock: number; t: (key: string) => string }) {
  const label = stock === 0 ? t("outOfStock") : stock <= 10 ? t("lowStock") : t("inStock");
  const classes = stock === 0 ? "bg-red-50 text-red-700" : stock <= 10 ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classes}`}>{stock} · {label}</span>;
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-6xl p-6 md:p-8"><div className="rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-slate-600">{message}</p></div></main>;
}
