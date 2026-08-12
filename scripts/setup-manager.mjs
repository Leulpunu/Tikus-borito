import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.BOOTSTRAP_MANAGER_EMAIL;
const password = process.env.BOOTSTRAP_MANAGER_PASSWORD;

if (!url || !secretKey || !email || !password || password.length < 8) {
  throw new Error("Set Supabase credentials plus BOOTSTRAP_MANAGER_EMAIL and a BOOTSTRAP_MANAGER_PASSWORD of at least 8 characters in .env.local.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: "Manager", role: "Manager" },
});

if (error || !data.user) throw new Error(error?.message || "Unable to create the manager account.");

const { error: profileError } = await supabase.from("profiles").upsert({
  id: data.user.id,
  name: "Manager",
  email: email.toLowerCase(),
  role: "Manager",
  area: "Operations",
  initials: "M",
  color: "#2563eb",
});

if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  throw new Error(profileError.message);
}

console.log(`Manager account created for ${email}. Remove BOOTSTRAP_MANAGER_PASSWORD from .env.local now.`);
