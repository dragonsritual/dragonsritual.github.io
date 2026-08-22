import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

export async function requireAdmin() {
  const supabase = getSupabaseBrowserClient();

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) {
    return {
      ok: false as const,
      reason: "signed-out" as const,
      user: null,
      supabase
    };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      ok: false as const,
      reason: "unauthorized" as const,
      user: session.user,
      supabase
    };
  }

  return {
    ok: true as const,
    reason: null,
    user: session.user,
    supabase
  };
}