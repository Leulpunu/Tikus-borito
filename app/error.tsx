"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-8">
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-600">Something went wrong</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">The page could not be displayed.</h1>
        <p className="mt-3 text-slate-600">Try the request again. Your saved store data has not been removed.</p>
        <button type="button" onClick={retry} className="mt-6 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong">Try again</button>
      </div>
    </main>
  );
}
