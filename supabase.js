import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'sb_publishable_PUBqX34BtP9OmCcuQcSivQ_fo5nsQkS';
const supabaseKey = 'https://kvailwyhpvggpwlvtlxc.supabase.co';

// Baris ini yang paling penting: wajib pakai "export const supabase"
export const supabase = createClient(supabaseUrl, supabaseKey);
