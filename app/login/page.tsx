"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/components/UserRoleProvider";
import { type TeamMember } from "@/lib/team";

const roleOptions: TeamMember["role"][] = ["Manager", "Waiter", "Kitchen", "Cashier"];

export default function LoginPage() {
  const router = useRouter();
  const {
    t,
    currentUser,
    allUsers,
    selectedUserId,
    setSelectedUserId,
    login,
    registerUser,
    logout,
    isAuthenticated,
    isReady,
    usesSupabase,
  } = useUserRole();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("Waiter");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    const result = await login(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (!result.ok) {
      setIsError(true);
      setMessage(result.error || t("invalidLogin"));
      return;
    }
    router.push("/");
    router.refresh();
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || (usesSupabase && password.length < 8)) {
      setIsError(true);
      setMessage(t("fillSignupFields"));
      return;
    }
    setIsSubmitting(true);
    const result = await registerUser(name.trim(), role, email.trim(), password);
    setIsSubmitting(false);
    setIsError(!result.ok);
    setMessage(result.ok ? t(usesSupabase ? "staffAccountCreated" : "signupSuccess") : result.error || t("unableToLoad"));
    if (result.ok && !usesSupabase) {
      router.push("/");
      router.refresh();
    } else if (result.ok) {
      setName("");
      setEmail("");
      setPassword("");
    }
  };

  if (!isReady) {
    return <main className="mx-auto max-w-6xl p-8"><div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">{t("loading")}</div></main>;
  }

  const canCreateAccount = usesSupabase ? currentUser?.role === "Manager" : !isAuthenticated;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8 md:p-12">
      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 overflow-hidden rounded-3xl border border-amber-950/10 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-card-shadow sm:p-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:p-12">
        <div className="min-w-0">
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">{t("siteTitle")}</p>
          <h1 className="mb-4 text-3xl font-extrabold text-slate-900 md:text-4xl">{t("loginWelcome")}</h1>
          <p className="mb-3 text-slate-700">{t("loginDescription")}</p>
          <p className="mb-4 text-slate-700">{t(usesSupabase ? "secureLoginHelp" : "loginHeroHelp")}</p>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${usesSupabase ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-primary"}`}>
            {t(usesSupabase ? "secureMode" : "demoMode")}
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {["loginStepOne", "loginStepTwo", "loginStepThree"].map((key, index) => (
            <div key={key} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4">
              <strong className="text-lg text-primary">{index + 1}.</strong>
              <p className="mt-2 text-slate-700">{t(key)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={`mt-8 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 ${canCreateAccount ? "md:grid-cols-2" : "max-w-2xl"}`}>
        <section id="signin" className="min-w-0 rounded-2xl bg-white p-6 shadow md:p-8">
          <h2 className="mb-3 text-xl font-bold">{t("signIn")}</h2>
          {isAuthenticated && currentUser ? (
            <div className="space-y-3">
              <p className="text-slate-700">{t("alreadyLoggedIn")}</p>
              <p className="text-slate-700">{t("currentUser")}: <strong>{currentUser.name}</strong> ({currentUser.role})</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => router.push("/")} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">{t("dashboard")}</button>
                <button type="button" onClick={() => void logout()} className="rounded-lg bg-slate-100 px-4 py-2 text-slate-800">{t("logout")}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {usesSupabase ? (
                <>
                  <label className="grid gap-2 text-sm text-slate-700">
                    {t("email")}
                    <input type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    {t("password")}
                    <input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </label>
                </>
              ) : (
                <label className="grid gap-2 text-sm text-slate-700">
                  {t("selectUser")}
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200">
                    {allUsers.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
                  </select>
                </label>
              )}
              <button disabled={isSubmitting} type="submit" className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-strong disabled:opacity-60">
                {isSubmitting ? t("loading") : t("login")}
              </button>
            </form>
          )}
        </section>

        {canCreateAccount ? (
          <section id="signup" className="min-w-0 rounded-2xl bg-white p-6 shadow md:p-8">
            <h2 className="mb-3 text-xl font-bold">{t(usesSupabase ? "createStaffAccount" : "createAccount")}</h2>
            <p className="mb-4 text-sm text-slate-600">{t(usesSupabase ? "managerCreatesAccounts" : "loginSignupIntro")}</p>
            {!usesSupabase ? <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{t("accountNote")}</p> : null}
            <form onSubmit={handleSignup} className="space-y-4">
              <label className="grid gap-2 text-sm text-slate-700">{t("newUserName")}<input value={name} onChange={(event) => setName(event.target.value)} required className="rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="grid gap-2 text-sm text-slate-700">{t("newUserEmail")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="rounded-lg border border-slate-200 px-3 py-2" /></label>
              {usesSupabase ? <label className="grid gap-2 text-sm text-slate-700">{t("password")}<input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="rounded-lg border border-slate-200 px-3 py-2" /><span className="text-xs text-slate-500">{t("passwordMinimum")}</span></label> : null}
              <label className="grid gap-2 text-sm text-slate-700">{t("newUserRole")}<select value={role} onChange={(event) => setRole(event.target.value as TeamMember["role"])} className="rounded-lg border border-slate-200 px-3 py-2">{roleOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <button disabled={isSubmitting} type="submit" className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-strong disabled:opacity-60">{isSubmitting ? t("loading") : t("createAccount")}</button>
            </form>
          </section>
        ) : null}
      </div>

      {message ? <p role="status" className={`mx-auto mt-5 max-w-2xl rounded-xl px-4 py-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}
    </main>
  );
}
