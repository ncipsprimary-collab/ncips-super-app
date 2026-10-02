import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'URL_SUPABASE_PROJECT_KAMU';
const supabaseKey = 'ANON_KEY_SUPABASE_KAMU';

export const supabase = createClient(supabaseUrl, supabaseKey);
