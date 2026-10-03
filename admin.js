import { supabase } from './supabase.js';

export async function loadAdminSettings() {
  const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (data) {
    document.getElementById('setEntryTime').value = data.entry_time || '07:00';
    document.getElementById('setExitTime').value = data.exit_time || '13:00';
    document.getElementById('setTolerance').value = data.late_tolerance_minutes || 15;
  }
}

export async function saveAdminSettings(event) {
  event.preventDefault();
  const entryTime = document.getElementById('setEntryTime').value;
  const exitTime = document.getElementById('setExitTime').value;
  const tolerance = parseInt(document.getElementById('setTolerance').value);

  const { error } = await supabase
    .from('system_settings')
    .update({ entry_time: entryTime, exit_time: exitTime, late_tolerance_minutes: tolerance, updated_at: new Date() })
    .eq('id', 1);

  if (error) alert('Gagal menyimpan: ' + error.message);
  else alert('✅ Parameter Sistem YPKR berhasil diperbarui!');
}

document.addEventListener('DOMContentLoaded', () => {
  const adminForm = document.getElementById('adminSettingsForm');
  if (adminForm) {
    adminForm.addEventListener('submit', saveAdminSettings);
    // Panggil loadAdminSettings saat view admin dibuka (bisa disesuaikan dengan fungsi switchView kamu)
    loadAdminSettings(); 
  }
});
