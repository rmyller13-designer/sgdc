import { createClient, type SupportedStorage } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sgdc_auth_session",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: obterStorageSessao(),
  },
});

function obterStorageSessao(): SupportedStorage | undefined {
  if (typeof window === "undefined") return undefined;

  return window.sessionStorage;
}
