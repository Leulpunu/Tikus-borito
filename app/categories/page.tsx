"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserRole } from "@/components/UserRoleProvider";
import type { Product } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default function CategoriesPage() {
  const { t, currentUser, isReady, language } = useUserRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((product) => map.set(product.category, [...(map.get(product.category) ?? []), product]));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  if (!isReady) return <PageMessage title={t("categories")} message={t("loading")} />;
  if (!currentUser) return <PageMessage title={t("categories")} message={t("pleaseLogin")} />;

  return (
    <main className="mx-auto max-w-6xl p-4 pb-10 sm:p-6 md:p-8">
      <section className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{t("browseCategories")}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-black">{t("categories")}</h1><p className="mt-2 text-slate-600">{t("browseByCategory")}</p></div>
          <div className="flex gap-2"><span className="rounded-full bg-amber-50 px-3 py-2 text-sm font-bold text-primary">{grouped.length} {t("categories").toLowerCase()}</span><span className="rounded-full bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">{products.length} {t("products").toLowerCase()}</span></div>
        </div>
      </section>

      {loading ? <section className="mt-6 rounded-3xl bg-white p-10 text-center text-slate-500">{t("loading")}</section> : null}
      {loadError ? <section className="mt-6 rounded-3xl bg-white p-10 text-center"><p className="text-red-700">{t("unableToLoad")}</p><button type="button" onClick={() => void fetchProducts()} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 font-bold">{t("retry")}</button></section> : null}

      {!loading && !loadError ? (
        <section className="mt-6 grid gap-5 md:grid-cols-2">
          {grouped.map(([category, items]) => {
            const available = items.reduce((sum, product) => sum + product.stock, 0);
            return (
              <article key={category} className="overflow-hidden rounded-3xl border border-amber-950/10 bg-white shadow-sm">
                <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
                  <Image src={items[0]?.image ?? "/images/default.svg"} alt="" width={96} height={96} className="h-24 w-24 shrink-0 rounded-2xl bg-white object-contain p-2" />
                  <div><h2 className="text-2xl font-black">{category}</h2><p className="mt-1 text-sm text-slate-600">{items.length} {t("products").toLowerCase()} · {available} {t("inventoryUnits").toLowerCase()}</p></div>
                </div>
                <div className="divide-y divide-slate-100 p-5 pt-2">
                  {items.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-4 py-3">
                      <div><strong className="block">{product.name}</strong><span className={`text-xs font-medium ${product.stock === 0 ? "text-red-600" : product.stock <= 10 ? "text-amber-700" : "text-slate-500"}`}>{product.stock === 0 ? t("outOfStock") : `${product.stock} ${t("available")}`}</span></div>
                      <strong className="whitespace-nowrap text-primary">{formatCurrency(product.unitPrice, language)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
          {grouped.length === 0 ? <div className="rounded-3xl bg-white p-10 text-center text-slate-500 md:col-span-2">{t("noProductsFound")}</div> : null}
        </section>
      ) : null}

      <div className="mt-6 text-center"><Link href="/orders" className="inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong">{t("newOrder")}</Link></div>
    </main>
  );
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-6xl p-6 md:p-8"><div className="rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-slate-600">{message}</p></div></main>;
}
