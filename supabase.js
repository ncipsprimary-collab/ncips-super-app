import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'URL_SUPABASE_PROJECT_KAMU';
const supabaseKey = 'ANON_KEY_SUPABASE_KAMU';

// Baris ini yang paling penting: wajib pakai "export const supabase"
export const supabase = createClient(supabaseUrl, supabaseKey);
