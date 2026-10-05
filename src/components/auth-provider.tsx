import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, getPrimaryRole, getUserRoles, type AppRole } from "@/lib/auth-roles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  dashboardPath: "/dashboard" | "/provider-dashboard" | "/admin-dashboard";
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const nextRole = data.session?.user ? getPrimaryRole(await getUserRoles(data.session.user.id)) : null;
      if (!active) return;
      setSession(data.session);
      setRole(nextRole);
      setIsLoading(false);
    }
    void loadSession();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "SIGNED_OUT" || !nextSession) {
        setRole(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      void getUserRoles(nextSession.user.id)
        .then((roles) => {
          if (active) setRole(getPrimaryRole(roles));
        })
        .catch(() => {
          if (active) setRole(null);
        });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Suspended or deactivated accounts are signed out (the database also refuses their new activity).
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    void supabase.from("profiles").select("status").eq("user_id", userId).maybeSingle().then(async ({ data }) => {
      if (data && data.status !== "active") {
        const { toast } = await import("sonner");
        toast.error(data.status === "suspended" ? "Your account is suspended. Please contact SERVICONNECT support." : "This account has been deactivated.");
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        await navigate({ to: "/auth", search: { mode: "login", role: "client" }, replace: true });
      }
    });
  }, [userId, navigate, queryClient]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      dashboardPath: getDashboardPath(role ?? "client"),
      isLoading,
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        await navigate({ to: "/", replace: true });
      },
    }),
    [isLoading, navigate, queryClient, role, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}