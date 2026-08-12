import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    await getProducts();
    return NextResponse.json({
      status: "ok",
      service: "Tikus Borito",
      persistence: isSupabaseConfigured() ? "supabase" : "local-demo",
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unavailable", service: "Tikus Borito", checkedAt: new Date().toISOString() },
      { status: 503 },
    );
  }
}
