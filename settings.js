import { supabase } from './supabase.js';

// Ambil data pengaturan sistem dari database
export async function loadSystemSettings() {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;
        if (!data) return;

        // Masukkan nilai ke dalam form HTML jika elemennya ada
        if (document.getElementById('setting-entry-time')) {
            document.getElementById('setting-entry-time').value = data.entry_time || '';
            document.getElementById('setting-exit-time').value = data.exit_time || '';
            document.getElementById('setting-tolerance').value = data.late_tolerance_minutes || 0;
            document.getElementById('setting-default-point').value = data.default_violation_point || 0;
            
            // Simpan ID baris setting ke form agar mudah saat di-update
            document.getElementById('form-system-settings').dataset.id = data.id;
        }
    } catch (err) {
        console.error('Gagal memuat system settings:', err.message);
    }
}

// Simpan perubahan pengaturan sistem
export async function saveSystemSettings(event) {
    event.preventDefault();
    const form = document.getElementById('form-system-settings');
    const settingId = form.dataset.id;

    const entry_time = document.getElementById('setting-entry-time').value;
    const exit_time = document.getElementById('setting-exit-time').value;
    const late_tolerance_minutes = parseInt(document.getElementById('setting-tolerance').value) || 0;
    const default_violation_point = parseInt(document.getElementById('setting-default-point').value) || 0;

    try {
        const { error } = await supabase
            .from('system_settings')
            .update({
                entry_time: entry_time,
                exit_time: exit_time,
                late_tolerance_minutes: late_tolerance_minutes,
                default_violation_point: default_violation_point,
                updated_at: new Date().toISOString()
            })
            .eq('id', settingId);

        if (error) throw error;

        alert('✅ Pengaturan sistem berhasil diperbarui!');
    } catch (err) {
        console.error('Gagal menyimpan pengaturan:', err.message);
        alert('Terjadi kesalahan saat menyimpan pengaturan.');
    }
}

// Pasang Event Listener saat form disubmit
const settingsForm = document.getElementById('form-system-settings');
if (settingsForm) {
    settingsForm.addEventListener('submit', saveSystemSettings);
}
