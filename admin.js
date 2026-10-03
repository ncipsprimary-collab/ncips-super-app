import { supabase } from './supabase.js';

export async function loadAdminSettings() {
  // 1. Cek Otoritas Role dari sesi login
  const userRole = localStorage.getItem('user_role');
  const adminContainer = document.getElementById('admin-settings-container');

  // Jika bukan ADMIN, sembunyikan form dan hentikan proses
  if (userRole !== 'ADMIN') {
    if (adminContainer) adminContainer.style.display = 'none';
    return; 
  } else {
    // Jika ADMIN, pastikan form terlihat
    if (adminContainer) adminContainer.style.display = 'block';
  }

  // 2. Load data dari Supabase jika dia benar-benar ADMIN
  const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (data) {
    document.getElementById('setEntryTime').value = data.entry_time || '07:00';
    document.getElementById('setExitTime').value = data.exit_time || '13:00';
    document.getElementById('setTolerance').value = data.late_tolerance_minutes || 15;
  }
}

// ... (Biarkan fungsi saveAdminSettings dan event listener di bawahnya tetap sama)

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
