export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-6 md:p-8" aria-busy="true" aria-label="Loading">
      <div className="animate-pulse rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm">
        <div className="h-4 w-28 rounded bg-amber-100" />
        <div className="mt-4 h-9 w-64 max-w-full rounded bg-slate-100" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </main>
  );
}
