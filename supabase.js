import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kvailwyhpvggpwlvtlxc.supabase.co';
const supabaseKey = 'sb_publishable_PUBqX34BtP9OmCcuQcSivQ_fo5nsQkS';

// Ekspor utama
export const supabase = createClient(supabaseUrl, supabaseKey);

// TAMBAHKAN BARIS INI: Supaya file lama yang manggil 'supabaseClient' tidak error lagi
export const supabaseClient = supabase;
