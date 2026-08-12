"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserRole } from "@/components/UserRoleProvider";
import type { Order, OrderStatus, Product } from "@/lib/data";
import { formatCurrency, formatDateTime, shortOrderId } from "@/lib/format";
import { canCreateOrders, canManageOrders, canMarkPayment, canUpdateOrderStatus } from "@/lib/permissions";

const statuses: OrderStatus[] = ["Confirmed", "Preparing", "Ready", "Served", "Cancelled"];
type Feedback = { kind: "success" | "error"; text: string } | null;

export default function OrdersPage() {
  const { t, currentUser, isReady, language } = useUserRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const canOrder = currentUser ? canCreateOrders(currentUser.role) : false;
  const canCollectPayment = currentUser ? canMarkPayment(currentUser.role) : false;
  const canUpdateStatus = currentUser ? canUpdateOrderStatus(currentUser.role) : false;
  const canCancel = currentUser ? canManageOrders(currentUser.role) : false;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [productsResponse, ordersResponse] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
      ]);
      if (!productsResponse.ok || !ordersResponse.ok) throw new Error();
      const [productsData, ordersData] = await Promise.all([
        productsResponse.json() as Promise<Product[]>,
        ordersResponse.json() as Promise<Order[]>,
      ]);
      setProducts(productsData);
      setOrders(ordersData);
      setProductId((current) => {
        if (productsData.some((product) => product.id === current && product.stock > 0)) return current;
        return productsData.find((product) => product.stock > 0)?.id ?? "";
      });
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
      void fetchData();
    }
  }, [currentUser, fetchData]);

  const selectedProduct = products.find((product) => product.id === productId);
  const visibleOrders = useMemo(
    () => orders.filter((order) => (statusFilter === "All" || order.status === statusFilter) && (paymentFilter === "All" || order.paymentStatus === paymentFilter)),
    [orders, paymentFilter, statusFilter],
  );
  const activeOrders = orders.filter((order) => !["Served", "Cancelled"].includes(order.status)).length;
  const pendingPayments = orders.filter((order) => order.paymentStatus === "Pending" && order.status !== "Cancelled").length;
  const paidRevenue = orders.filter((order) => order.paymentStatus === "Paid" && order.status !== "Cancelled").reduce((sum, order) => sum + order.total, 0);

  const roleInstructions = currentUser
    ? currentUser.role === "Waiter"
      ? t("waiterOrderInstructions")
      : currentUser.role === "Cashier"
        ? t("cashierOrderInstructions")
        : currentUser.role === "Kitchen"
          ? t("kitchenOrderInstructions")
          : t("managerOrderInstructions")
    : t("pleaseLogin");

  async function requestError(response: Response, fallback: string) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || fallback;
  }

  async function handlePlaceOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser || !canOrder) return;
    setPendingAction("create");
    setFeedback(null);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": currentUser.role },
      body: JSON.stringify({ customerName, productId, quantity }),
    });
    if (!response.ok) {
      setFeedback({ kind: "error", text: await requestError(response, t("unableToCreateOrder")) });
      setPendingAction(null);
      return;
    }
    setCustomerName("");
    setQuantity(1);
    setFeedback({ kind: "success", text: t("orderCreated") });
    await fetchData();
    setPendingAction(null);
  }

  async function patchOrder(orderId: string, body: Record<string, string>, successMessage: string, fallbackError: string) {
    if (!currentUser) return;
    setPendingAction(orderId);
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": currentUser.role },
      body: JSON.stringify({ id: orderId, ...body }),
    });
    if (!response.ok) {
      setFeedback({ kind: "error", text: await requestError(response, fallbackError) });
      setPendingAction(null);
      return;
    }
    setFeedback({ kind: "success", text: successMessage });
    await fetchData();
    setPendingAction(null);
  }

  async function handleCancel(order: Order) {
    if (!window.confirm(`${t("orderNumber")} #${shortOrderId(order.id)}\n\n${t("confirmCancelOrder")}`)) return;
    await patchOrder(order.id, { action: "cancel" }, t("orderCancelled"), t("unableToCancelOrder"));
  }

  function getNextStatus(status: OrderStatus): OrderStatus | null {
    if (status === "Confirmed") return "Preparing";
    if (status === "Preparing") return "Ready";
    if (status === "Ready") return "Served";
    return null;
  }

  function getStatusActionLabel(status: OrderStatus) {
    if (status === "Confirmed") return t("startPreparing");
    if (status === "Preparing") return t("markReady");
    if (status === "Ready") return t("markServed");
    return "";
  }

  if (!isReady) return <PageMessage title={t("orders")} message={t("loading")} />;
  if (!currentUser) return <PageMessage title={t("orders")} message={t("pleaseLogin")} />;

  return (
    <main className="mx-auto max-w-6xl p-4 pb-10 sm:p-6 md:p-8">
      <section className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{t("manageOrders")}</p>
        <h1 className="mt-1 text-3xl font-black">{t("orders")}</h1>
        <p className="mt-2 max-w-3xl text-slate-600">{roleInstructions}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Summary value={activeOrders.toLocaleString()} label={t("activeOrders")} />
          <Summary value={pendingPayments.toLocaleString()} label={t("pendingPayments")} warning={pendingPayments > 0} />
          <Summary value={formatCurrency(paidRevenue, language)} label={t("paidRevenue")} />
        </div>
      </section>

      {canOrder ? (
        <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">{t("newOrder")}</h2>
          <form onSubmit={handlePlaceOrder} className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label={t("customerName")}>
              <input className="input" value={customerName} maxLength={80} onChange={(event) => setCustomerName(event.target.value)} required />
            </Field>
            <Field label={t("product")}>
              <select className="input" value={productId} onChange={(event) => { setProductId(event.target.value); setQuantity(1); }} required>
                {products.map((product) => (
                  <option key={product.id} value={product.id} disabled={product.stock === 0}>
                    {product.name} · {formatCurrency(product.unitPrice, language)} · {product.stock} {t("available")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("quantity")}>
              <input className="input" type="number" min={1} max={selectedProduct?.stock || 1} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 px-4 py-3 md:col-span-3">
              <span className="text-sm text-slate-600">
                {t("orderTotalPreview")}: <strong className="text-base text-slate-900">{formatCurrency((selectedProduct?.unitPrice ?? 0) * quantity, language)}</strong>
              </span>
              <button className="rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong" type="submit" disabled={!customerName.trim() || !productId || pendingAction === "create"}>
                {pendingAction === "create" ? t("loading") : t("placeOrder")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          {currentUser.role === "Cashier" ? t("cashierOrdersMessage") : currentUser.role === "Kitchen" ? t("kitchenOrdersMessage") : t("managerOnlyOrders")}
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">{t("orders")}</h2>
            <p className="mt-1 text-sm text-slate-500">{visibleOrders.length} {t("totalOrders").toLowerCase()}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("orderStatus")}>
              <select className="input min-w-40" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="All">{t("allStatuses")}</option>
                {statuses.map((status) => <option key={status} value={status}>{t(`status${status}`)}</option>)}
              </select>
            </Field>
            <Field label={t("paymentStatus")}>
              <select className="input min-w-40" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
                <option value="All">{t("allPayments")}</option>
                <option value="Pending">{t("statusPending")}</option>
                <option value="Paid">{t("statusPaid")}</option>
              </select>
            </Field>
          </div>
        </div>

        {feedback ? (
          <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${feedback.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{feedback.text}</p>
        ) : null}

        {loading ? <p className="py-10 text-center text-slate-500">{t("loading")}</p> : null}
        {loadError ? (
          <div className="py-10 text-center"><p className="text-red-700">{t("unableToLoad")}</p><button type="button" onClick={() => void fetchData()} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 font-bold">{t("retry")}</button></div>
        ) : null}

        {!loading && !loadError ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="pb-3 pr-4">{t("orderNumber")}</th>
                  <th scope="col" className="pb-3 pr-4">{t("customerName")}</th>
                  <th scope="col" className="pb-3 pr-4">{t("product")}</th>
                  <th scope="col" className="pb-3 pr-4">{t("total")}</th>
                  <th scope="col" className="pb-3 pr-4">{t("paymentStatus")}</th>
                  <th scope="col" className="pb-3 pr-4">{t("orderStatus")}</th>
                  <th scope="col" className="pb-3">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  const hasAction = (order.paymentStatus === "Pending" && canCollectPayment && order.status !== "Cancelled") || (canUpdateStatus && nextStatus) || (canCancel && order.paymentStatus === "Pending" && !["Served", "Cancelled"].includes(order.status));
                  return (
                    <tr key={order.id} className="border-b border-slate-100 align-top last:border-0">
                      <td className="py-4 pr-4"><strong>#{shortOrderId(order.id)}</strong><span className="mt-1 block whitespace-nowrap text-xs text-slate-500">{formatDateTime(order.createdAt, language)}</span></td>
                      <td className="py-4 pr-4 font-medium">{order.customerName}</td>
                      <td className="py-4 pr-4"><span className="block">{order.productName}</span><span className="text-xs text-slate-500">{order.quantity} × {formatCurrency(order.total / order.quantity, language)}</span></td>
                      <td className="py-4 pr-4 font-bold">{formatCurrency(order.total, language)}</td>
                      <td className="py-4 pr-4"><StatusBadge label={t(`status${order.paymentStatus}`)} tone={order.paymentStatus === "Paid" ? "green" : "amber"} /></td>
                      <td className="py-4 pr-4"><StatusBadge label={t(`status${order.status}`)} tone={order.status === "Cancelled" ? "red" : order.status === "Served" ? "green" : "blue"} /></td>
                      <td className="py-4">
                        <div className="flex max-w-52 flex-wrap gap-2">
                          {order.paymentStatus === "Pending" && canCollectPayment && order.status !== "Cancelled" ? (
                            <button type="button" disabled={pendingAction === order.id} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-100" onClick={() => void patchOrder(order.id, { paymentStatus: "Paid" }, t("paymentRecorded"), t("unableToUpdateStatus"))}>{t("markAsPaid")}</button>
                          ) : null}
                          {canUpdateStatus && nextStatus ? (
                            <button type="button" disabled={pendingAction === order.id} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-primary hover:bg-amber-100" onClick={() => void patchOrder(order.id, { status: nextStatus }, t("orderStatusUpdated"), t("unableToUpdateStatus"))}>{getStatusActionLabel(order.status)}</button>
                          ) : null}
                          {canCancel && order.paymentStatus === "Pending" && !["Served", "Cancelled"].includes(order.status) ? (
                            <button type="button" disabled={pendingAction === order.id} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" onClick={() => void handleCancel(order)}>{t("cancelOrder")}</button>
                          ) : null}
                          {!hasAction ? <span className="text-xs text-slate-400">{t("noActionsAvailable")}</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleOrders.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-slate-500">{t("noOrdersFound")}</td></tr> : null}
              </tbody>
            </table>
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
  return <div className={`rounded-2xl border p-4 ${warning ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}><strong className="block text-xl text-slate-900">{value}</strong><span className="text-sm text-slate-500">{label}</span></div>;
}

function StatusBadge({ label, tone }: { label: string; tone: "green" | "amber" | "blue" | "red" }) {
  const colors = { green: "bg-green-50 text-green-700", amber: "bg-amber-50 text-amber-800", blue: "bg-blue-50 text-blue-700", red: "bg-red-50 text-red-700" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${colors[tone]}`}>{label}</span>;
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-6xl p-6 md:p-8"><div className="rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-slate-600">{message}</p></div></main>;
}
