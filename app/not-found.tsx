import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="rounded-3xl border border-amber-950/10 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">404</p>
        <h1 className="mt-2 text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-slate-600">The page you requested does not exist.</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong">Back to dashboard</Link>
      </div>
    </main>
  );
}
