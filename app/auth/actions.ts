"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSuccess, createError } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(
  email: string,
  password: string,
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return createError(error.message);
  return createSuccess(undefined);
}

export async function signUp(
  email: string,
  password: string,
): Promise<ActionResult<void>> {
  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });
  if (error) return createError(error.message);
  return createSuccess(undefined);
}

export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return createError(error.message);
  if (!data.url) return createError("Failed to get authorization URL");
  return createSuccess({ url: data.url });
}

export async function forgotPassword(email: string): Promise<ActionResult<void>> {
  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });
  if (error) return createError(error.message);
  return createSuccess(undefined);
}

export async function updatePassword(
  password: string,
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return createError(error.message);
  return createSuccess(undefined);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
