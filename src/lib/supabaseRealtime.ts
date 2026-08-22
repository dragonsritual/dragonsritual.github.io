import { createClient } from '@supabase/supabase-js';

let realtimeClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseRealtimeClient() {
  if (realtimeClient) return realtimeClient;
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || /YOUR_PROJECT_REF|YOUR_PUBLISHABLE_KEY/i.test(`${url} ${key}`)) {
    throw new Error('Supabase realtime configuration is missing.');
  }
  realtimeClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  });
  return realtimeClient;
}
