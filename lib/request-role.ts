import type { Role } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/auth";

export async function getUserRole(request: Request): Promise<Role | null> {
  return (await getAuthenticatedUser(request))?.profile.role ?? null;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new Error("A valid JSON request body is required.");
  }
}
