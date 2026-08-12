"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserRole } from "@/components/UserRoleProvider";
import type { Language } from "@/lib/i18n";

const navigation = [
  { href: "/", label: "dashboard" },
  { href: "/products", label: "products" },
  { href: "/orders", label: "orders" },
  { href: "/categories", label: "categories" },
  { href: "/reports", label: "reports" },
  { href: "/notes", label: "communicationBoard" },
  { href: "/team", label: "team" },
] as const;

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, isAuthenticated, isReady, language, setLanguage, languageOptions, t } = useUserRole();
  const isLoginRoute = pathname === "/login";
  const currentPage = navigation.find((item) => item.href === pathname)?.label ?? "dashboard";

  return (
    <header className="app-shell-header mx-auto max-w-6xl px-4 pb-2 pt-5 sm:px-6 sm:pt-7">
      <div className="rounded-3xl border border-amber-950/10 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link href={isAuthenticated ? "/" : "/login"} className="flex w-full min-w-0 items-center gap-3 rounded-2xl sm:w-auto">
            <Image
              src="/images/tikus-borito-logo.png"
              alt={t("siteTitle")}
              width={142}
              height={72}
              priority
              className="h-14 w-28 rounded-2xl border border-amber-950/10 bg-white object-contain p-1 sm:h-16 sm:w-32"
            />
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{t("siteTitle")}</p>
              <p className="truncate text-lg font-extrabold text-slate-900 sm:text-xl">
                {isLoginRoute && !isAuthenticated ? t("loginPage") : t(currentPage)}
              </p>
            </div>
          </Link>

          <div className="flex w-full flex-wrap items-end justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-500">
              <span>{t("language")}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                aria-label={t("language")}
              >
                {languageOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {isReady && isAuthenticated && currentUser ? (
              <>
                <div className="hidden items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 sm:flex">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.initials}
                  </span>
                  <span className="text-sm leading-tight">
                    <strong className="block text-slate-800">{currentUser.name}</strong>
                    <span className="text-slate-500">{currentUser.role}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    router.push("/login");
                    router.refresh();
                  }}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-strong"
                >
                  {t("logout")}
                </button>
              </>
            ) : isReady && !isLoginRoute ? (
              <Link href="/login" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-strong">
                {t("login")}
              </Link>
            ) : null}
          </div>
        </div>

        {isReady && isAuthenticated && !isLoginRoute ? (
          <nav aria-label="Primary navigation" className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4 [scrollbar-width:none]">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                    active ? "bg-primary text-white" : "bg-amber-50 text-primary hover:bg-amber-100"
                  }`}
                >
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
