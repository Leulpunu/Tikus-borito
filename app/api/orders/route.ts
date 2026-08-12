import { NextResponse } from "next/server";
import { cancelOrder, createOrder, getOrders, isOrderStatus, updateOrder } from "@/lib/data";
import { canCreateOrders, canManageOrders, canMarkPayment, canUpdateOrderStatus } from "@/lib/permissions";
import { getUserRole, readJson } from "@/lib/request-role";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole && isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getOrders());
}

export async function POST(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole || !canCreateOrders(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await readJson(request);
    const order = await createOrder({
      customerName: String(body.customerName || ""),
      productId: String(body.productId || ""),
      quantity: Number(body.quantity),
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Missing order id." }, { status: 400 });

  if (body.action === "cancel") {
    if (!canManageOrders(userRole)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
      return NextResponse.json(await cancelOrder(String(body.id)));
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
  }

  if (body.paymentStatus) {
    if (!canMarkPayment(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    try {
      if (body.paymentStatus !== "Paid") {
        return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
      }
      const order = await updateOrder(String(body.id), { paymentStatus: "Paid" });
      return NextResponse.json(order);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
  }

  if (body.status) {
    if (!canUpdateOrderStatus(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    try {
      if (!isOrderStatus(body.status) || body.status === "Cancelled") {
        return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
      }
      const order = await updateOrder(String(body.id), { status: body.status });
      return NextResponse.json(order);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}
