"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface LoginFormState {
  error?: string;
}

export async function signInAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectToRaw = String(formData.get("redirectTo") ?? "");
  const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/dashboard";

  if (!email || !password) {
    return { error: "Enter both the official email address and the password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Sign in failed. Check the email address and password and try again." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
