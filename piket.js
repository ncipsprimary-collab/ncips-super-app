import { supabase } from './supabaseClient.js';

// Set default waktu saat ini pada form piket
export function initPiketForm() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeInput = document.getElementById('piket-time');
    if (timeInput) timeInput.value = `${hours}:${minutes}`;
    
    loadPiketStudentsDropdown();
    loadPiketToday();
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
                time: time + ':00',
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

// Memuat daftar catatan piket hari ini
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
            .order('time', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan piket/izin hari ini.</div>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(item => {
            let badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
            if (item.status === 'SAKIT') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
            if (item.status === 'IZIN') badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
            if (item.status === 'ALPHA') badgeColor = 'bg-red-100 text-red-700 border-red-200';
            if (item.status === 'TERLAMBAT') badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';

            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center";
            card.innerHTML = `
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${badgeColor}">${item.status}</span>
                        <h4 class="text-xs font-black text-ncipsNavy">${item.name}</h4>
                    </div>
                    <p class="text-[10px] text-gray-500 font-bold">Rombel: ${item.rombel || '-'} • <span class="text-gray-400 italic">${item.notes || 'Tanpa catatan'}</span></p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-xl text-slate-700 border border-gray-100">${item.time}</span>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Gagal memuat rekap piket hari ini:', err.message);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-400 text-xs">Gagal memuat data piket.</div>`;
    }
}
