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
    loadStudentsForViolation(); // Fungsi ini ditambahkan di sini agar otomatis jalan
}

// Memuat daftar siswa ke dropdown select
export async function loadPiketStudentsDropdown() {
    const select = document.getElementById('piket-student-select');
    if (!select) return;

    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, name, nisn, rombel')
            .eq('status', 'AKTIF')
            .order('name', { ascending: true });

        if (error) throw error;

        select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        data.forEach(stu => {
            const opt = document.createElement('option');
            opt.value = stu.id;
            opt.textContent = `${stu.name} (${stu.rombel || 'Tanpa Rombel'}) - NISN: ${stu.nisn || '-'}`;
            opt.dataset.name = stu.name;
            opt.dataset.rombel = stu.rombel || '-';
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Gagal memuat siswa untuk piket:', err.message);
        select.innerHTML = '<option value="">Gagal memuat data siswa</option>';
    }
}

// Menyimpan entri piket manual ke tabel kehadiran (attendance)
export async function savePiketEntry(e) {
    e.preventDefault();
    const select = document.getElementById('piket-student-select');
    const selectedOpt = select.options[select.selectedIndex];
    
    if (!select.value) {
        alert('Silakan pilih siswa terlebih dahulu!');
        return;
    }

    const studentId = select.value;
    const studentName = selectedOpt.dataset.name;
    const rombel = selectedOpt.dataset.rombel;
    const status = document.getElementById('piket-status-select').value;
    const time = document.getElementById('piket-time').value;
    const notes = document.getElementById('piket-notes').value || '-';
    
    const today = new Date().toISOString().split('T')[0];

    try {
        // Simpan ke tabel attendance dengan tipe SISWA dan status khusus piket
        const { error } = await supabase
            .from('attendance')
            .insert([{
                student_id: studentId,
                name: studentName,
                rombel: rombel,
                type: 'SISWA',
                status: status, // SAKIT, IZIN, ALPHA, TERLAMBAT
                date: today,
                scan_time: time + ':00',
                notes: `Piket: ${notes}`
            }]);

        if (error) throw error;

        alert(`Berhasil mencatat ${status} untuk ${studentName}!`);
        document.getElementById('form-piket').reset();
        initPiketForm(); // Reset waktu & dropdown
        loadPiketToday(); // Refresh daftar hari ini
    } catch (err) {
        console.error('Gagal menyimpan data piket:', err.message);
        alert('Terjadi kesalahan saat menyimpan data piket.');
    }
}

// Memuat daftar catatan piket & pelanggaran hari ini (GABUNGAN)
export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat rekap piket & pelanggaran...</div>`;

    const today = new Date().toISOString().split('T')[0];

    try {
        // 1. Ambil data absen hari ini (Sakit, Izin, Alpha, Terlambat)
        const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT']);

        if (attendanceError) throw attendanceError;

        // 2. Ambil data pelanggaran hari ini 
        // Menggunakan join 'students(name, rombel)' untuk menarik nama otomatis dari relasi tabel
        const { data: violationData, error: violationError } = await supabase
            .from('student_violations')
            .select('*, students(name, rombel)')
            .eq('date', today);

        if (violationError) throw violationError;

        // 3. Gabungkan kedua data ke dalam satu Array
        let combinedData = [];

        if (attendanceData) {
            attendanceData.forEach(item => {
                combinedData.push({
                    id: item.id,
                    name: item.name,
                    rombel: item.rombel || '-',
                    status: item.status,
                    time: item.scan_time || '-',
                    notes: item.notes || 'Tanpa catatan',
                    // Jika dia terlambat, kita beri status tindak lanjut default
                    action_taken: item.status === 'TERLAMBAT' ? 'Menunggu Pembinaan / Belum ada tindakan' : null
                });
            });
        }

        if (violationData) {
            violationData.forEach(item => {
                // Tarik nama dari tabel students (hasil join)
                const studentName = item.students ? item.students.name : 'Siswa Tidak Diketahui';
                const studentRombel = item.students ? item.students.rombel : '-';
                
                // Format jam (karena tabel violations mungkin memakai created_at bawaan Supabase)
                const jamPelanggaran = item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';

                combinedData.push({
                    id: item.id,
                    name: studentName,
                    rombel: studentRombel,
                    status: 'PELANGGARAN',
                    time: jamPelanggaran,
                    notes: item.violation_type,
                    action_taken: item.action_taken || 'Belum ada tindak lanjut'
                });
            });
        }

        // 4. Tampilkan pesan jika kosong
        if (combinedData.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan kehadiran tidak wajar atau pelanggaran hari ini.</div>`;
            return;
        }

        // 5. Urutkan berdasarkan waktu (yang terbaru ada di paling atas)
        combinedData.sort((a, b) => (b.time > a.time ? 1 : -1));

        // 6. Cetak ke HTML
        container.innerHTML = '';
        combinedData.forEach(item => {
            // Setting warna badge
            let badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
            if (item.status === 'SAKIT') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
            if (item.status === 'IZIN') badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
            if (item.status === 'ALPHA') badgeColor = 'bg-red-100 text-red-700 border-red-200';
            if (item.status === 'TERLAMBAT') badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
            if (item.status === 'PELANGGARAN') badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';

            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2";
            
            // Logika UI: Hanya tampilkan kolom Tindak Lanjut jika statusnya TERLAMBAT atau PELANGGARAN
            const actionTakenHtml = (item.status === 'TERLAMBAT' || item.status === 'PELANGGARAN') 
                ? `<p class="text-[10px] text-gray-500 font-bold border-t border-gray-200 pt-1 mt-1">
                     Tindak Lanjut: <span class="text-ncipsNavy font-black">${item.action_taken}</span>
                   </p>` 
                : '';

            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${badgeColor}">${item.status}</span>
                        <h4 class="text-xs font-black text-ncipsNavy">${item.name}</h4>
                    </div>
                    <span class="text-[10px] font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-xl text-slate-700 border border-gray-100">${item.time}</span>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1">
                    <p class="text-[10px] text-gray-500 font-bold">Rombel: <span class="text-gray-700">${item.rombel}</span></p>
                    <p class="text-[10px] text-gray-500 font-bold">Keterangan: <span class="text-gray-700 italic">${item.notes}</span></p>
                    ${actionTakenHtml}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Gagal memuat rekap piket hari ini:', err.message);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-400 text-xs">Gagal memuat data rekap. Info Error: ${err.message}</div>`;
    }
}
}

// Fungsi untuk memuat siswa ke dalam dropdown Kedisiplinan
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

  // Kosongkan opsi sebelumnya lalu isi dengan data baru
  violationSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>';
  data.forEach(student => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.name} (${student.rombel})`;
    violationSelect.appendChild(option);
  });
}

// Fungsi Simpan Pelanggaran Manual ke tabel Disipline
export async function saveViolationEntry(event) {
  event.preventDefault();

  const studentId = document.getElementById('violationStudent').value;
  const violationType = document.getElementById('violationType').value;
  const actionTaken = document.getElementById('violationAction').value;
  const actionStatus = document.getElementById('violationStatus').value; // Input baru
  const notes = document.getElementById('violationNotes').value || '-'; // Input baru
  const officerName = localStorage.getItem('user_name') || 'Guru Piket'; 

  // Simpan ke tabel 'Disipline' sesuai yang mas bro buat di Supabase
  const { error } = await supabase.from('Disipline').insert([{
    student_id: studentId,
    violation_type: violationType,
    action_taken: actionTaken,
    action_status: actionStatus,
    notes: notes,
    recorded_by: officerName,
    date: new Date().toISOString().split('T')[0]
  }]);

  if (error) {
    alert('Gagal menyimpan pelanggaran: ' + error.message);
  } else {
    alert('✅ Pelanggaran dan tindak lanjut berhasil dicatat ke tabel Disipline!');
    document.getElementById('violationForm').reset();
    loadPiketToday(); // Refresh daftar di bawahnya otomatis
  }
}

// Pasang Event Listener ke Form Pelanggaran
const violationForm = document.getElementById('violationForm');
if (violationForm) {
  violationForm.addEventListener('submit', saveViolationEntry);
}
