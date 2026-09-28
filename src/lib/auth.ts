import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser, RoleName } from "@/lib/types";

/**
 * Returns the signed-in employee together with their role, or null.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  const roleRelation = profile?.roles as { name?: string } | { name?: string }[] | null | undefined;
  const roleName = Array.isArray(roleRelation) ? roleRelation[0]?.name : roleRelation?.name;

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.email?.split("@")[0] ?? "User",
    role: (roleName as RoleName) ?? "Officer",
  };
}

/**
 * Same as getCurrentUser but redirects to /login when there is no session.
 * Used by every protected page and server action.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/* ------------------------------------------------------------------ */
/* Role rules                                                          */
/*                                                                     */
/* Administrator : register and edit assets, retire / decommission     */
/* Officer       : lifecycle changes up to Operational, inspections,   */
/*                 maintenance                                         */
/* ------------------------------------------------------------------ */

export function canManageAssets(user: CurrentUser): boolean {
  return user.role === "Administrator";
}

export function canRetireAssets(user: CurrentUser): boolean {
  return user.role === "Administrator";
}

export function canRecordFieldWork(_user: CurrentUser): boolean {
  return true;
}
