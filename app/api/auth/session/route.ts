import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: user.profile, mode: isSupabaseConfigured() ? "supabase" : "demo" });
}
