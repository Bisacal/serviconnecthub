import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type SignupRole = Exclude<AppRole, "admin">;
export type DashboardPath = "/dashboard" | "/provider-dashboard" | "/admin-dashboard";

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return data.map(({ role }) => role);
}

export function getPrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("provider")) return "provider";
  return "client";
}

export function getDashboardPath(role: AppRole): DashboardPath {
  if (role === "admin") return "/admin-dashboard";
  if (role === "provider") return "/provider-dashboard";
  return "/dashboard";
}

export async function createSignupRecords(userId: string, displayName: string, role: SignupRole) {
  const { error: profileError } = await supabase.from("profiles").upsert(
    { user_id: userId, display_name: displayName },
    { onConflict: "user_id" },
  );
  if (profileError) throw profileError;

  const { error: roleError } = await supabase.from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id,role" },
  );
  if (roleError) throw roleError;

  if (role === "client") {
    const { error } = await supabase.from("client_profiles").upsert(
      { user_id: userId },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase.from("provider_profiles").upsert(
      { user_id: userId },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  }
}