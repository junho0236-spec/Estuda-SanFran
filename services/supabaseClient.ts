
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://peepzwkgwpreangledtj.supabase.co';
const supabaseAnonKey = 'sb_publishable_vcb9HB5XTem2UjcVKiYAFQ_g_gWCpBE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
