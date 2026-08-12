"use client";

import { useCallback, useEffect, useState } from "react";
import { useUserRole } from "@/components/UserRoleProvider";
import type { Note } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function NotesPage() {
  const { t, currentUser, isReady, language } = useUserRole();
  const [notes, setNotes] = useState<Note[]>([]);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/notes", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setNotes((await response.json()) as Note[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Fetching begins when the browser-only staff session has been restored.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchNotes();
    }
  }, [currentUser, fetchNotes]);

  async function handlePostNote(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser || !message.trim()) return;
    setPosting(true);
    setFeedback(null);
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": currentUser.role },
      body: JSON.stringify({ message: message.trim(), authorId: currentUser.id, authorName: currentUser.name }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setFeedback({ kind: "error", text: body?.error || t("unableToPostMessage") });
      setPosting(false);
      return;
    }
    setMessage("");
    setFeedback({ kind: "success", text: t("messagePosted") });
    await fetchNotes();
    setPosting(false);
  }

  if (!isReady) return <PageMessage title={t("communicationBoard")} message={t("loading")} />;
  if (!currentUser) return <PageMessage title={t("communicationBoard")} message={t("pleaseLogin")} />;

  return (
    <main className="mx-auto max-w-4xl p-4 pb-10 sm:p-6 md:p-8">
      <section className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{t("notes")}</p>
        <h1 className="mt-1 text-3xl font-black">{t("communicationBoard")}</h1>
        <p className="mt-2 text-slate-600">{t("notePlaceholder")}</p>
      </section>

      <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <form onSubmit={handlePostNote}>
          <label htmlFor="team-message" className="text-sm font-bold text-slate-700">{t("addNote")}</label>
          <textarea id="team-message" className="input mt-2 min-h-32 resize-y" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t("notePlaceholder")} required />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{500 - message.length} {t("charactersRemaining")}</span>
            <button className="rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong" type="submit" disabled={posting || !message.trim()}>{posting ? t("loading") : t("postMessage")}</button>
          </div>
        </form>
        {feedback ? <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${feedback.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{feedback.text}</p> : null}
      </section>

      <section className="mt-6 rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">{t("notes")}</h2><span className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-500">{notes.length}</span></div>
        {loading ? <p className="py-10 text-center text-slate-500">{t("loading")}</p> : null}
        {loadError ? <div className="py-10 text-center"><p className="text-red-700">{t("unableToLoad")}</p><button type="button" onClick={() => void fetchNotes()} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 font-bold">{t("retry")}</button></div> : null}
        {!loading && !loadError ? (
          <div className="mt-5 grid gap-4">
            {notes.map((note) => (
              <article key={note.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="block">{note.authorName}</strong><span className="text-xs font-bold text-primary">{note.role}</span></div><time dateTime={note.createdAt} className="text-xs text-slate-500">{formatDateTime(note.createdAt, language)}</time></div>
                <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{note.message}</p>
              </article>
            ))}
            {notes.length === 0 ? <p className="py-8 text-center text-slate-500">{t("noNotesYet")}</p> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-6xl p-6 md:p-8"><div className="rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-slate-600">{message}</p></div></main>;
}
