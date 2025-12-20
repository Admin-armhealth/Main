
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase keys are missing. Auth and Logs will not work.');
}

export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
