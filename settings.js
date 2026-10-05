/**
 * NCIPS Super App - System Settings Module
 * Mengelola konfigurasi jam sekolah, toleransi keterlambatan, dan poin pelanggaran via Supabase.
 */

// Fungsi untuk mengambil pengaturan sistem dari Supabase
async function loadSystemSettings() {
    try {
        // Memastikan klien Supabase tersedia secara global
        if (typeof window.supabaseClient === 'undefined') {
            console.warn('Klien Supabase belum terinisialisasi.');
            return null;
        }

        const { data, error } = await window.supabaseClient
            .from('system_settings')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            console.error('Gagal mengambil pengaturan sistem:', error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Terjadi kesalahan pada loadSystemSettings:', err);
        return null;
    }
}

// Fungsi untuk menyimpan pengaturan sistem ke Supabase
async function saveSystemSettings(settingsData) {
    try {
        if (typeof window.supabaseClient === 'undefined') {
            alert('Klien Supabase belum terhubung!');
            return false;
        }

        const { error } = await window.supabaseClient
            .from('system_settings')
            .upsert([settingsData]);

        if (error) {
            console.error('Gagal menyimpan pengaturan:', error.message);
            alert('Gagal menyimpan pengaturan: ' + error.message);
            return false;
        }

        alert('Pengaturan sistem berhasil diperbarui!');
        return true;
    } catch (err) {
        console.error('Terjadi kesalahan pada saveSystemSettings:', err);
        return false;
    }
}
