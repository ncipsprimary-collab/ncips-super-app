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
        const entryTimeInput = document.getElementById('setting-entry-time');
        if (entryTimeInput) {
            entryTimeInput.value = data.entry_time || '';
            
            const exitTimeInput = document.getElementById('setting-exit-time');
            if (exitTimeInput) exitTimeInput.value = data.exit_time || '';

            const toleranceInput = document.getElementById('setting-tolerance');
            if (toleranceInput) toleranceInput.value = data.late_tolerance_minutes || 0;

            const defaultPointInput = document.getElementById('setting-default-point');
            if (defaultPointInput) defaultPointInput.value = data.default_violation_point || 0;
            
            // Simpan ID baris setting ke form agar mudah saat di-update
            const form = document.getElementById('form-system-settings');
            if (form) form.dataset.id = data.id;
        }
    } catch (err) {
        console.error('Gagal memuat system settings:', err.message);
    }
}

// Simpan perubahan pengaturan sistem
export async function saveSystemSettings(event) {
    event.preventDefault();
    const form = document.getElementById('form-system-settings');
    if (!form) return;
    const settingId = form.dataset.id;
    if (!settingId) return;

    const entryTimeInput = document.getElementById('setting-entry-time');
    const exitTimeInput = document.getElementById('setting-exit-time');
    const toleranceInput = document.getElementById('setting-tolerance');
    const defaultPointInput = document.getElementById('setting-default-point');

    const entry_time = entryTimeInput ? entryTimeInput.value : '';
    const exit_time = exitTimeInput ? exitTimeInput.value : '';
    const late_tolerance_minutes = toleranceInput ? parseInt(toleranceInput.value) || 0 : 0;
    const default_violation_point = defaultPointInput ? parseInt(defaultPointInput.value) || 0 : 0;

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
        alert('Terjadi kesalahan saat menyimpan pengaturan: ' + err.message);
    }
}

// Pasang Event Listener saat dokumen selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('form-system-settings');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSystemSettings);
    }
});
