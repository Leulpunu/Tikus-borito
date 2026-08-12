import { NextResponse } from "next/server";
import { createNote, getNotes } from "@/lib/data";
import { getUserRole, readJson } from "@/lib/request-role";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const userRole = await getUserRole(request);
  if (!userRole && isSupabaseConfigured()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getNotes());
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await readJson(request);
    if (!body.message) {
      return NextResponse.json({ error: "Missing note data." }, { status: 400 });
    }

    const note = await createNote({
      authorId: isSupabaseConfigured() ? user.profile.id : String(body.authorId || user.profile.id),
      authorName: isSupabaseConfigured() ? user.profile.name : String(body.authorName || user.profile.name),
      role: user.profile.role,
      message: String(body.message),
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
