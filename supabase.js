// Konfigurasi Kunci & Koneksi Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://kvailwyhpvggpwlvtlxc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PUBqX34BtP9OmCcuQcSivQ_fo5nsQkS';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
