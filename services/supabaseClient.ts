
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://peepzwkgwpreangledtj.supabase.co';
const supabaseAnonKey = 'sb_publishable_vcb9HB5XTem2UjcVKiYAFQ_g_gWCpBE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-sanfran-auth-token', // Custom storage key to avoid conflicts
    // No-op lock implementation to avoid timeouts in iframe/preview environments
    lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    },
  },
});
