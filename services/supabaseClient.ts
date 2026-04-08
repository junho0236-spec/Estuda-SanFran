
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://peepzwkgwpreangledtj.supabase.co';
const supabaseAnonKey = 'sb_publishable_vcb9HB5XTem2UjcVKiYAFQ_g_gWCpBE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-sanfran-auth-token', // Custom storage key to avoid conflicts
    // Lock with TTL to avoid stale locks causing 30s waits.
    lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
      const lockKey = `supabase-lock-${name}`;
      const lockTtlMs = 5000;
      const start = Date.now();
      
      while (true) {
        const current = localStorage.getItem(lockKey);
        if (!current) break;

        const ts = Number(current);
        const isStale = Number.isFinite(ts) && Date.now() - ts > lockTtlMs;
        if (isStale) {
          localStorage.removeItem(lockKey);
          break;
        }

        if (Date.now() - start > acquireTimeout) {
          console.warn(`[Supabase] Lock timeout for ${name}`);
          localStorage.removeItem(lockKey);
          return await fn(); // Fallback to running anyway if timeout
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      localStorage.setItem(lockKey, String(Date.now()));
      try {
        return await fn();
      } finally {
        localStorage.removeItem(lockKey);
      }
    },
  },
});
