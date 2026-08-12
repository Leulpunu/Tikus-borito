const remotePatterns = [];
try {
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseUrl.hostname,
    port: "",
    pathname: "/storage/v1/object/public/product-images/**",
    search: "",
  });
} catch {
  // Supabase is optional in local demo mode.
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow requests from 127.0.0.1 in dev (Turbopack HMR / _next resources)
  allowedDevOrigins: ["127.0.0.1"],
  images: { remotePatterns },
};

export default nextConfig;
