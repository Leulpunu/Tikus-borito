import { NextResponse } from "next/server";
import { getAuthenticatedUser, isRole, listTeamProfiles, profileFromRow } from "@/lib/auth";
import { getTeam } from "@/lib/team";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/request-role";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json(getTeam());
  if (!(await getAuthenticatedUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await listTeamProfiles());
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requester = await getAuthenticatedUser(request);
  if (!isSupabaseConfigured() || requester?.profile.role !== "Manager") {
    return NextResponse.json({ error: "Only a manager can create staff accounts." }, { status: 403 });
  }

  try {
    const body = await readJson(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role;
    if (!name || !email || password.length < 8 || !isRole(role)) {
      return NextResponse.json({ error: "Name, valid role, email, and a password of at least 8 characters are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });
    if (createError || !created.user) throw new Error(createError?.message || "Unable to create user.");

    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
    const { data: row, error: profileError } = await admin
      .from("profiles")
      .upsert({ id: created.user.id, name, email, role, area: role, initials })
      .select("id,name,role,area,email,initials,color")
      .single();

    if (profileError || !row) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError?.message || "Unable to create staff profile.");
    }
    const profile = profileFromRow(row);
    if (!profile) throw new Error("The saved staff role is invalid.");
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
