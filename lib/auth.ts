import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getTeam, type TeamMember } from "@/lib/team";
import type { Role } from "@/lib/permissions";

const roles: Role[] = ["Manager", "Waiter", "Kitchen", "Cashier"];
const roleColors: Record<Role, string> = {
  Manager: "#2563eb",
  Waiter: "#fb923c",
  Kitchen: "#22c55e",
  Cashier: "#8b5cf6",
};

type ProfileRow = {
  id: string;
  name: string;
  role: string;
  area: string | null;
  email: string;
  initials: string | null;
  color: string | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  profile: TeamMember;
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function profileFromRow(row: ProfileRow): TeamMember | null {
  if (!isRole(row.role)) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    area: row.area || row.role,
    email: row.email,
    initials: row.initials || initialsFor(row.name),
    color: row.color || roleColors[row.role],
  };
}

export async function getAuthenticatedUser(request?: Request): Promise<AuthenticatedUser | null> {
  if (!isSupabaseConfigured()) {
    const role = request?.headers.get("x-user-role");
    if (!isRole(role)) return null;
    const profile = getTeam().find((member) => member.role === role);
    return profile ? { id: profile.id, email: profile.email, profile } : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) return null;

  const admin = createAdminClient();
  const { data: row, error: profileError } = await admin
    .from("profiles")
    .select("id,name,role,area,email,initials,color")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (profileError || !row) return null;

  const profile = profileFromRow(row);
  return profile ? { id: userId, email: profile.email, profile } : null;
}

export async function listTeamProfiles(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured()) return getTeam();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,name,role,area,email,initials,color")
    .order("created_at", { ascending: true })
    .returns<ProfileRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(profileFromRow).filter((profile): profile is TeamMember => profile !== null);
}
