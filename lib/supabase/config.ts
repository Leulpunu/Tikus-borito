export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseConfigured() {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) && supabasePublishableKey.length > 20;
}

export function requireSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Copy .env.example to .env.local and add your project credentials.");
  }
  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}
