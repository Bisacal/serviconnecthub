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

// Profile, role and workspace records are created by the database signup trigger.
// The role is never written from the browser; admin can never be self-assigned.
export async function waitForUserRole(userId: string): Promise<AppRole> {
  for (let i = 0; i < 5; i++) {
    const roles = await getUserRoles(userId);
    if (roles.length) return getPrimaryRole(roles);
    await new Promise((r) => setTimeout(r, 400));
  }
  return "client";
}

export type { SignupRole as RequestedSignupRole };