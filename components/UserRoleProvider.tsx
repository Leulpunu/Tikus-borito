"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTeam, type TeamMember } from "@/lib/team";
import { getTranslation, languages, type Language } from "@/lib/i18n";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type OperationResult = { ok: boolean; error?: string };

type UserRoleContextValue = {
  currentUser: TeamMember | null;
  selectedUserId: string;
  allUsers: TeamMember[];
  setSelectedUserId: (id: string) => void;
  login: (email?: string, password?: string) => Promise<OperationResult>;
  logout: () => Promise<void>;
  registerUser: (name: string, role: TeamMember["role"], email: string, password?: string) => Promise<OperationResult>;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  languageOptions: Array<{ code: Language; label: string }>;
  isAuthenticated: boolean;
  isReady: boolean;
  usesSupabase: boolean;
};

const UserRoleContext = createContext<UserRoleContextValue | null>(null);
const USER_STORAGE_KEY = "foodstore.currentUserId";
const CUSTOM_USERS_STORAGE_KEY = "foodstore.customUsers";
const LANGUAGE_STORAGE_KEY = "foodstore.language";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function createCustomUser(name: string, role: TeamMember["role"], email: string): TeamMember {
  return {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    role,
    area: "Custom",
    email,
    initials: getInitials(name),
    color: "#fb7185",
  };
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || "The request could not be completed.";
}

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const defaultUsers = useMemo(() => getTeam(), []);
  const usesSupabase = useMemo(() => isSupabaseConfigured(), []);
  const [customUsers, setCustomUsers] = useState<TeamMember[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUsers[0]?.id ?? "");
  const [language, setLanguage] = useState<Language>("en");
  const [isReady, setIsReady] = useState(false);

  const allUsers = useMemo(
    () => (usesSupabase ? remoteUsers : [...defaultUsers, ...customUsers]),
    [usesSupabase, remoteUsers, defaultUsers, customUsers],
  );

  const refreshRemoteSession = useCallback(async () => {
    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    if (!sessionResponse.ok) {
      setCurrentUser(null);
      setRemoteUsers([]);
      return;
    }

    const session = (await sessionResponse.json()) as { user: TeamMember };
    setCurrentUser(session.user);
    setSelectedUserId(session.user.id);

    const teamResponse = await fetch("/api/team", { cache: "no-store" });
    if (teamResponse.ok) {
      setRemoteUsers((await teamResponse.json()) as TeamMember[]);
    } else {
      setRemoteUsers([session.user]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage === "en" || savedLanguage === "am") setLanguage(savedLanguage);

        if (usesSupabase) {
          await refreshRemoteSession();
        } else {
          const savedCustomUsers = window.localStorage.getItem(CUSTOM_USERS_STORAGE_KEY);
          let restoredUsers: TeamMember[] = [];
          if (savedCustomUsers) {
            const parsed: unknown = JSON.parse(savedCustomUsers);
            if (Array.isArray(parsed)) restoredUsers = parsed as TeamMember[];
          }
          setCustomUsers(restoredUsers);

          const savedUserId = window.localStorage.getItem(USER_STORAGE_KEY);
          const restoredUser = [...defaultUsers, ...restoredUsers].find((user) => user.id === savedUserId);
          if (restoredUser) {
            setCurrentUser(restoredUser);
            setSelectedUserId(restoredUser.id);
          }
        }
      } catch {
        window.localStorage.removeItem(CUSTOM_USERS_STORAGE_KEY);
      } finally {
        if (active) setIsReady(true);
      }
    };

    void initialize();
    const supabase = usesSupabase ? createSupabaseClient() : null;
    const listener = supabase?.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshRemoteSession(), 0);
    });

    return () => {
      active = false;
      listener?.data.subscription.unsubscribe();
    };
  }, [defaultUsers, refreshRemoteSession, usesSupabase]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const login = async (email = "", password = ""): Promise<OperationResult> => {
    if (usesSupabase) {
      const supabase = createSupabaseClient();
      if (!supabase) return { ok: false, error: "Supabase is not configured." };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: error.message };
      await refreshRemoteSession();
      return { ok: true };
    }

    const selectedUser = allUsers.find((user) => user.id === selectedUserId);
    if (!selectedUser) return { ok: false, error: "Select a staff account." };
    setCurrentUser(selectedUser);
    window.localStorage.setItem(USER_STORAGE_KEY, selectedUserId);
    return { ok: true };
  };

  const registerUser = async (
    name: string,
    role: TeamMember["role"],
    email: string,
    password = "",
  ): Promise<OperationResult> => {
    if (usesSupabase) {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, email, password }),
      });
      if (!response.ok) return { ok: false, error: await responseError(response) };
      const newUser = (await response.json()) as TeamMember;
      setRemoteUsers((previous) => [newUser, ...previous.filter((user) => user.id !== newUser.id)]);
      return { ok: true };
    }

    const newUser = createCustomUser(name, role, email);
    setCustomUsers((previous) => {
      const next = [newUser, ...previous];
      window.localStorage.setItem(CUSTOM_USERS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSelectedUserId(newUser.id);
    setCurrentUser(newUser);
    window.localStorage.setItem(USER_STORAGE_KEY, newUser.id);
    return { ok: true };
  };

  const logout = async () => {
    if (usesSupabase) await createSupabaseClient()?.auth.signOut();
    setCurrentUser(null);
    setRemoteUsers([]);
    window.localStorage.removeItem(USER_STORAGE_KEY);
  };

  const updateLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value: UserRoleContextValue = {
    currentUser,
    selectedUserId,
    allUsers,
    setSelectedUserId,
    login,
    logout,
    registerUser,
    language,
    setLanguage: updateLanguage,
    t: (key: string) => getTranslation(language, key),
    languageOptions: languages,
    isAuthenticated: currentUser !== null,
    isReady,
    usesSupabase,
  };

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>;
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) throw new Error("useUserRole must be used within UserRoleProvider");
  return context;
}

export function useTranslation() {
  return useUserRole();
}
