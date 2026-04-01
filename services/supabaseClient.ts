
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://peepzwkgwpreangledtj.supabase.co';
const supabaseAnonKey = 'sb_publishable_vcb9HB5XTem2UjcVKiYAFQ_g_gWCpBE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-sanfran-auth-token', // Custom storage key to avoid conflicts
    // Simple in-memory lock implementation to prevent concurrent refreshes
    // which can lead to "Invalid Refresh Token" errors in multi-component environments
    lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
      const lockKey = `supabase-lock-${name}`;
      const start = Date.now();
      
      while (localStorage.getItem(lockKey)) {
        if (Date.now() - start > acquireTimeout) {
          console.warn(`[Supabase] Lock timeout for ${name}`);
          return await fn(); // Fallback to running anyway if timeout
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      localStorage.setItem(lockKey, 'locked');
      try {
        return await fn();
      } finally {
        localStorage.removeItem(lockKey);
      }
    },
  },
});
