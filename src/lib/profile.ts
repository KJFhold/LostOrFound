// src/lib/profile.ts
import { supabase } from "./supabase";

/**
 * Ensures that a profile row exists for userId.
 *
 * - If the row exists: return it.
 * - If it does not exist: insert { id } and optionally display_name.
 * - If insert hits duplicate race: select again and return.
 */
export async function ensureProfileRow(userId: string, displayName?: string | null) {
  if (!userId) return null;

  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return existing;

  const payload: { id: string; display_name?: string } = { id: userId };
  const dn = (displayName ?? "").trim();
  if (dn) payload.display_name = dn;

  const { data: inserted, error: insErr } = await supabase
    .from("profiles")
    .insert(payload)
    .select("id, display_name")
    .single();

  if (!insErr) return inserted;

  const code = (insErr as any)?.code;
  const msg = String((insErr as any)?.message ?? "").toLowerCase();
  const isDuplicate = code === "23505" || msg.includes("duplicate");

  if (isDuplicate) {
    const { data: again, error: againErr } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", userId)
      .single();

    if (againErr) throw againErr;
    return again;
  }

  throw insErr;
}
