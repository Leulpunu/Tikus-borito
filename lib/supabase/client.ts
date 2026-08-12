"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  browserClient ??= createBrowserClient(supabaseUrl, supabasePublishableKey);
  return browserClient;
}
