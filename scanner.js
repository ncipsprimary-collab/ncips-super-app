import { supabase } from './supabase.js';

// Set default waktu saat ini pada form piket
export function initPiketForm() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeInput = document.getElementById('piket-time');
    if (timeInput) timeInput.value = `${hours}:${minutes}`;
    
    loadPiketStudentsDropdown();
    loadPiketToday();
    loadStudentsForViolation();
}

// Memuat daftar siswa ke dropdown select
export async function loadPiketStudentsDropdown() {
    const select = document.getElementById('piket-student-select');
    if (!select) return;

    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, name, qr_code, rombel')
            .eq('status', 'AKTIF')
            .order('name', { ascending: true });

        if (error) throw error;

        select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        data.forEach(stu => {
            const opt = document.createElement('option');
            opt.value = stu.id;
            opt.textContent = `${stu.name} (${stu.rombel || '-'})`;
            opt.dataset.name = stu.name;
            opt.dataset.qr = stu.qr_code || 'MANUAL';
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Gagal memuat siswa:', err.message);
    }
}

// Menyimpan entri piket manual ke tabel attendance (Disesuaikan dengan 7 kolom databasemu)
export async function savePiketEntry(e) {
    e.preventDefault();
    const select = document.getElementById('piket-student-select');
    const selectedOpt = select.options[select.selectedIndex];
    
    if (!select.value) {
        alert('Silakan pilih siswa terlebih dahulu!');
        return;
    }

    const studentName = selectedOpt.dataset.name;
    const qrCode = selectedOpt.dataset.qr;
    const status = document.getElementById('piket-status-select').value;
    const time = document.getElementById('piket-time').value;
    const today = new Date().toISOString().split('T')[0];

    try {
        const { error } = await supabase
            .from('attendance')
            .insert([{
                qr_code: qrCode,
                user_type: 'SISWA',
                user_name: studentName,
                status: status, // SAKIT, IZIN, ALPHA, TERLAMBAT
                date: today,
                scan_time: time + ':00'
            }]);

        if (error) throw error;

        alert(`Berhasil mencatat ${status} untuk ${studentName}!`);
        document.getElementById('form-piket').reset();
        initPiketForm(); 
    } catch (err) {
        console.error('Gagal menyimpan:', err.message);
        alert('Terjadi kesalahan saat menyimpan data piket.');
    }
}

// Memuat daftar catatan piket hari ini (Disesuaikan dengan 7 kolom databasemu)
export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat rekap piket...</div>`;
    const today = new Date().toISOString().split('T')[0];

    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT'])
            .order('scan_time', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan absen khusus hari ini.</div>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(item => {
            let badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
            if (item.status === 'SAKIT') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
            if (item.status === 'IZIN') badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
            if (item.status === 'ALPHA') badgeColor = 'bg-red-100 text-red-700 border-red-200';
            if (item.status === 'TERLAMBAT') badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';

            // Bersihkan format waktu jika berupa timestamp panjang
            let timeDisplay = item.scan_time;
            if (timeDisplay && timeDisplay.includes('T')) {
                timeDisplay = new Date(timeDisplay).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            }

            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center";
            card.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${badgeColor}">${item.status}</span>
                        <h4 class="text-xs font-black text-ncipsNavy">${item.user_name || 'Tidak Diketahui'}</h4>
                    </div>
                    <p class="text-[10px] text-gray-500 font-bold">Tipe: ${item.user_type || 'SISWA'}</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-xl text-slate-700 border border-gray-100">${timeDisplay || '-'}</span>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Gagal memuat rekap:', err.message);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-400 text-xs">Gagal memuat data.</div>`;
    }
}

// Fungsi dropdown Pelanggaran
export async function loadStudentsForViolation() {
  const violationSelect = document.getElementById('violationStudent');
  if (!violationSelect) return;

  const { data, error } = await supabase
    .from('students')
    .select('id, name, rombel')
    .eq('status', 'AKTIF')
    .order('name', { ascending: true });

  if (error) {
    console.error('Gagal memuat daftar siswa:', error);
    return;
  }

  violationSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>';
  data.forEach(student => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.name} (${student.rombel})`;
    violationSelect.appendChild(option);
  });
}

// Fungsi Simpan Pelanggaran (Sanksi/Tindak Lanjut)
export async function recordManualViolation(event) {
  event.preventDefault();
  const studentId = document.getElementById('violationStudent').value;
  const violationType = document.getElementById('violationType').value;
  const actionTaken = document.getElementById('violationAction').value;
  const officerName = localStorage.getItem('user_name') || 'Guru Piket'; 

  const { error } = await supabase.from('student_violations').insert([{
    student_id: studentId,
    violation_type: violationType,
    action_taken: actionTaken,
    recorded_by: officerName,
    date: new Date().toISOString().split('T')[0]
  }]);

  if (error) {
    alert('Gagal menyimpan pelanggaran: ' + error.message);
  } else {
    alert('✅ Pelanggaran dan tindak lanjut berhasil dicatat!');
    document.getElementById('violationForm').reset();
  }
}

// Pasang Listener Form
const violationForm = document.getElementById('violationForm');
if (violationForm) {
  violationForm.addEventListener('submit', recordManualViolation);
}

export function initScannerUI() {
    const btnStartCamera = document.getElementById('btn-start-camera');
    const startOverlay = document.getElementById('scanner-start-overlay');
    
    if (btnStartCamera) {
        btnStartCamera.addEventListener('click', () => {
            // Sembunyikan layar instruksi "Nyalakan Kamera"
            if (startOverlay) startOverlay.classList.add('hidden');
            
            // Panggil fungsi utama untuk menyalakan scanner
            startScanner();
        });
    }
}
