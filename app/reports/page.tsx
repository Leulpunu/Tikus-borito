"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserRole } from "@/components/UserRoleProvider";
import type { Order } from "@/lib/data";
import { formatCurrency, formatDateTime, shortOrderId } from "@/lib/format";
import { canManageOrders } from "@/lib/permissions";
import { buildExcelWorkbook, buildOrdersCsv, summarizeOrders } from "@/lib/reports";

export default function ReportsPage() {
  const { t, currentUser, isReady, language } = useUserRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const canViewReports = currentUser ? canManageOrders(currentUser.role) : false;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setOrders((await response.json()) as Order[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewReports) {
      // Report data is synchronized after role access has been established.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchOrders();
    }
  }, [canViewReports, fetchOrders]);

  const report = useMemo(() => summarizeOrders(orders), [orders]);

  function exportCsv() {
    const csv = buildOrdersCsv(orders);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tikus-borito-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const workbook = buildExcelWorkbook(orders);
    downloadFile(workbook, "application/vnd.ms-excel;charset=utf-8", `tikus-borito-report-${new Date().toISOString().slice(0, 10)}.xls`);
  }

  function exportPdf() {
    const previousTitle = document.title;
    document.title = `Tikus Borito Report ${new Date().toISOString().slice(0, 10)}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 1000);
  }

  if (!isReady) return <PageMessage title={t("reportsPage")} message={t("loading")} />;
  if (!currentUser) return <PageMessage title={t("reportsPage")} message={t("pleaseLogin")} />;
  if (!canViewReports) return <PageMessage title={t("reportsPage")} message={t("pageNotAuthorized")} />;

  return (
    <main className="report-page mx-auto max-w-6xl p-4 pb-10 sm:p-6 md:p-8">
      <div className="print-only hidden">
        <h1 className="text-3xl font-black">Tikus Borito</h1>
        <p className="mt-1 text-slate-600">{t("reportsPage")} · {new Date().toLocaleDateString()}</p>
      </div>
      <section className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{t("salesInsights")}</p>
            <h1 className="mt-1 text-3xl font-black">{t("reportsPage")}</h1>
            <p className="mt-2 text-slate-600">{t("reportSummary")}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" disabled={orders.length === 0} onClick={exportExcel} className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800">{t("exportExcel")}</button>
            <button type="button" disabled={orders.length === 0} onClick={exportPdf} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800">{t("exportPdf")}</button>
            <button type="button" disabled={orders.length === 0} onClick={exportCsv} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-strong">{t("exportCsv")}</button>
          </div>
        </div>
      </section>

      {loading ? <section className="mt-6 rounded-3xl bg-white p-10 text-center text-slate-500">{t("loading")}</section> : null}
      {loadError ? (
        <section className="mt-6 rounded-3xl bg-white p-10 text-center"><p className="text-red-700">{t("unableToLoad")}</p><button type="button" onClick={() => void fetchOrders()} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 font-bold">{t("retry")}</button></section>
      ) : null}

      {!loading && !loadError ? (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PeriodCard title={t("dailyReport")} data={report.daily} t={t} language={language} />
            <PeriodCard title={t("weeklyReport")} data={report.weekly} t={t} language={language} />
            <PeriodCard title={t("monthlyReport")} data={report.monthly} t={t} language={language} />
            <PeriodCard title={t("reports")} data={report.total} t={t} language={language} highlight />
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-xl font-extrabold">{t("orderBreakdown")}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {report.statuses.map(({ status, count }) => {
                  const percentage = orders.length ? Math.round((count / orders.length) * 100) : 0;
                  return (
                    <div key={status} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-3"><strong>{t(`status${status}`)}</strong><span className="text-sm text-slate-500">{count}</span></div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold">{t("salesInsights")}</h2>
              <div className="mt-5 grid gap-4">
                <Insight label={t("averageOrderValue")} value={formatCurrency(report.average, language)} />
                <Insight label={t("bestSeller")} value={report.bestSeller ? `${report.bestSeller[0]} · ${report.bestSeller[1]} ${t("unitsSold")}` : t("noSalesData")} />
                <Insight label={t("completedSales")} value={report.total.paidOrders.toLocaleString()} />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">{t("orders")}</h2>
            {orders.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th scope="col" className="pb-3 pr-4">{t("orderNumber")}</th><th scope="col" className="pb-3 pr-4">{t("customerName")}</th><th scope="col" className="pb-3 pr-4">{t("product")}</th><th scope="col" className="pb-3 pr-4">{t("status")}</th><th scope="col" className="pb-3">{t("total")}</th></tr></thead>
                  <tbody>{orders.slice(0, 8).map((order) => <tr key={order.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4"><strong>#{shortOrderId(order.id)}</strong><span className="block text-xs text-slate-500">{formatDateTime(order.createdAt, language)}</span></td><td className="py-4 pr-4">{order.customerName}</td><td className="py-4 pr-4">{order.productName} × {order.quantity}</td><td className="py-4 pr-4">{t(`status${order.status}`)}</td><td className="py-4 font-bold">{formatCurrency(order.total, language)}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="mt-4 text-slate-500">{t("noSalesData")}</p>}
          </section>
        </>
      ) : null}
    </main>
  );
}

type Summary = { orders: number; paidOrders: number; revenue: number };

function PeriodCard({ title, data, t, language, highlight = false }: { title: string; data: Summary; t: (key: string) => string; language: "en" | "am"; highlight?: boolean }) {
  return <article className={`rounded-3xl border p-5 shadow-sm ${highlight ? "border-amber-300 bg-amber-50" : "border-amber-950/10 bg-white"}`}><h2 className="font-extrabold">{title}</h2><strong className="mt-4 block text-2xl">{formatCurrency(data.revenue, language)}</strong><div className="mt-3 flex justify-between gap-3 text-sm text-slate-500"><span>{t("totalOrders")}: {data.orders}</span><span>{t("completedSales")}: {data.paidOrders}</span></div></article>;
}

function Insight({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><span className="block text-sm text-slate-500">{label}</span><strong className="mt-1 block leading-6">{value}</strong></div>;
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-6xl p-6 md:p-8"><div className="rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-slate-600">{message}</p></div></main>;
}

function downloadFile(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
