import { NextResponse } from "next/server";
import { createProduct, deleteProduct, getProducts, updateProduct } from "@/lib/data";
import { canManageProducts } from "@/lib/permissions";
import { getUserRole, readJson } from "@/lib/request-role";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole && isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getProducts());
}

export async function POST(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole || !canManageProducts(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await readJson(request);
    const product = await createProduct({
      name: String(body.name || ""),
      category: String(body.category || ""),
      image: String(body.image || "/images/default.svg"),
      unitPrice: Number(body.unitPrice),
      stock: Number(body.stock),
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole || !canManageProducts(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await readJson(request);
    if (!body.id) return NextResponse.json({ error: "Missing product id." }, { status: 400 });

    const product = await updateProduct(String(body.id), {
      name: body.name !== undefined ? String(body.name) : undefined,
      category: body.category !== undefined ? String(body.category) : undefined,
      image: body.image !== undefined ? String(body.image) : undefined,
      unitPrice: body.unitPrice !== undefined ? Number(body.unitPrice) : undefined,
      stock: body.stock !== undefined ? Number(body.stock) : undefined,
    });
    return NextResponse.json(product);
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: message === "Product not found." ? 404 : 400 });
  }
}

export async function DELETE(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole || !canManageProducts(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const queryId = url.searchParams.get("id");
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(queryId || body.id || "");

  if (!id) {
    return NextResponse.json({ error: "Missing product id." }, { status: 400 });
  }

  const deleted = await deleteProduct(id);
  return deleted
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Product not found." }, { status: 404 });
}
