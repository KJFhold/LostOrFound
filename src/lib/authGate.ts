// src/lib/authGate.ts
import { supabase } from "./supabase";

export function isAnonymousUser(user: any): boolean {
  if (!user) return false;

  // Supabase Auth can expose anonymous state in slightly different places
  // depending on SDK/version and JWT claims.
  return (
    user.is_anonymous === true ||
    user.isAnonymous === true ||
    user.app_metadata?.provider === "anonymous" ||
    user.user_metadata?.is_anonymous === true
  );
}

// FOUND: use existing session if it exists, otherwise create anonymous session silently.
export async function ensureFoundIdentity() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;

  const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
  if (anonErr) throw anonErr;
  return anon.session;
}

// LOST: requires real account, not anonymous guest.
export async function ensureLostAuthenticated() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  if (!session) {
    const err: any = new Error("LOGIN_REQUIRED");
    err.code = "LOGIN_REQUIRED";
    throw err;
  }

  if (isAnonymousUser(session.user)) {
    const err: any = new Error("UPGRADE_REQUIRED");
    err.code = "UPGRADE_REQUIRED";
    throw err;
  }

  return session;
}
