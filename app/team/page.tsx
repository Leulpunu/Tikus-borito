"use client";

import Link from "next/link";
import { useUserRole } from "@/components/UserRoleProvider";

export default function TeamPage() {
  const { t, currentUser, allUsers, isReady } = useUserRole();

  if (!isReady) return <PageMessage title={t("team")} message={t("loading")} />;
  if (!currentUser) return <PageMessage title={t("team")} message={t("pleaseLogin")} />;

  return (
    <main className="mx-auto max-w-6xl p-4 pb-10 sm:p-6 md:p-8">
      <section className="rounded-3xl border border-amber-950/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{t("staffDirectory")}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-black">{t("team")}</h1><p className="mt-2 max-w-3xl text-slate-600">{t("meetStaff")}</p></div>
          <div className="flex flex-wrap gap-2">
            {currentUser.role === "Manager" ? (
              <Link href="/login#signup" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-strong">
                {t("createStaffAccount")}
              </Link>
            ) : null}
            <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-primary">{allUsers.length} {t("teamMembers").toLowerCase()}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {allUsers.map((member) => (
          <article key={member.id} className={`flex items-center gap-4 rounded-3xl border bg-white p-5 shadow-sm ${currentUser.id === member.id ? "border-amber-300 ring-2 ring-amber-100" : "border-amber-950/10"}`}>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-lg font-black text-white" style={{ backgroundColor: member.color }}>{member.initials}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-extrabold">{member.name}</h2>{currentUser.id === member.id ? <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-bold text-green-700">{t("currentUser")}</span> : null}</div>
              <p className="mt-1 font-bold text-primary">{member.role}</p>
              <p className="text-sm text-slate-500">{member.area === "Custom" ? t("customAccount") : member.area}</p>
              <a href={`mailto:${member.email}`} className="mt-1 block truncate text-sm text-slate-500 hover:text-primary">{member.email}</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-6xl p-6 md:p-8"><div className="rounded-3xl border border-amber-950/10 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black">{title}</h1><p className="mt-2 text-slate-600">{message}</p></div></main>;
}
