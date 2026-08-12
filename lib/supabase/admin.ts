import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "@/lib/supabase/config";

export function createAdminClient() {
  const { url } = requireSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not configured.");

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
