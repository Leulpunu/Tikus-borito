"use client";

import Link from "next/link";
import { useUserRole } from "@/components/UserRoleProvider";
import { formatCurrency } from "@/lib/format";

type HomeDashboardProps = {
  productCount: number;
  stockCount: number;
  orderCount: number;
  revenue: number;
  lowStockCount: number;
};

export default function HomeDashboard({ productCount, stockCount, orderCount, revenue, lowStockCount }: HomeDashboardProps) {
  const { currentUser, language, t } = useUserRole();

  const actions = [
    { href: "/products", label: t("products"), copy: t("manageMenu") },
    { href: "/orders", label: t("orders"), copy: t("manageOrdersCopy") },
    { href: "/reports", label: t("reports"), copy: t("reportSummary") },
    { href: "/notes", label: t("communicationBoard"), copy: t("notes") },
  ];

  return (
    <main className="mx-auto max-w-6xl p-4 pb-10 sm:p-6 md:p-8">
      <section className="grid gap-7 rounded-3xl border border-amber-950/10 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-card-shadow md:grid-cols-[1.35fr_1fr] md:p-10">
        <div className="self-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">{t("siteTitle")}</p>
          <h1 className="mb-3 max-w-2xl text-3xl font-black leading-tight text-slate-900 md:text-4xl">{t("dashboardWelcome")}</h1>
          <p className="mb-6 max-w-xl leading-7 text-slate-600">{t("dashboardCopy")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/products" className="rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-strong">
              {t("viewProducts")}
            </Link>
            <Link href="/orders" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-amber-50">
              {t("manageOrders")}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Stat value={productCount.toLocaleString()} label={t("menuItems")} />
          <Stat value={stockCount.toLocaleString()} label={t("inventoryUnits")} />
          <Stat value={orderCount.toLocaleString()} label={t("ordersToday")} />
          <Stat value={formatCurrency(revenue, language)} label={t("paidRevenue")} compact />
        </div>
      </section>

      {lowStockCount > 0 ? (
        <Link
          href="/products"
          className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 transition hover:bg-amber-100"
        >
          <span><strong>{lowStockCount}</strong> {t("lowStock").toLowerCase()}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      <section className="mt-6 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{t("quickActions")}</h2>
            <Link href="/categories" className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-primary">
              {t("browseCategories")}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="rounded-2xl border border-slate-100 p-4 transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-sm">
                <strong className="block text-slate-900">{action.label}</strong>
                <span className="mt-1 block text-sm leading-6 text-slate-500">{action.copy}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{t("operationsTeam")}</h2>
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">{t("activeStaff")}</span>
          </div>
          {currentUser ? (
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-amber-50/50 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white" style={{ backgroundColor: currentUser.color }}>
                {currentUser.initials}
              </div>
              <div className="min-w-0">
                <strong className="block truncate">{currentUser.name}</strong>
                <span className="block text-sm text-slate-500">{currentUser.role} · {currentUser.area}</span>
                <span className="block truncate text-sm text-slate-500">{currentUser.email}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return (
    <div className="grid min-h-28 place-content-center rounded-2xl border border-amber-950/10 bg-white p-4 text-center shadow-sm">
      <strong className={compact ? "text-lg text-slate-900 sm:text-xl" : "text-2xl text-slate-900 sm:text-3xl"}>{value}</strong>
      <span className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
    </div>
  );
}
