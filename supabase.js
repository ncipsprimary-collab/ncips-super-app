import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kvailwyhpvggpwlvtlxc.supabase.co';
const supabaseKey = 'sb_publishable_PUBqX34BtP9OmCcuQcSivQ_fo5nsQkS';

// Baris ini yang paling penting: wajib pakai "export const supabase"
export const supabase = createClient(supabaseUrl, supabaseKey);
