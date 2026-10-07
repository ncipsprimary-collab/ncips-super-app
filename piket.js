import { supabase } from './supabase.js';

// Helper Tanggal Lokal (Format YYYY-MM-DD agar akurat dengan jam lokal)
function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Set default waktu saat ini pada form piket & inisialisasi dropdown
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

// Memuat daftar siswa ke dropdown form piket manual
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
            opt.textContent = `${stu.name} (${stu.rombel \vert{}\vert{} 'Tanpa Rombel'}) - NISN:${stu.nisn || '-'}`;
            opt.dataset.name = stu.name;
            opt.dataset.rombel = stu.rombel || '-';
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Gagal memuat siswa untuk piket:', err.message);
        select.innerHTML = '<option value="">Gagal memuat data siswa</option>';
    }
}

// Menyimpan entri piket manual ke tabel attendance
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
    
    const today = getLocalDateString();

    try {
        const { error } = await supabase
            .from('attendance')
            .insert([{
                student_id: studentId,
                name: studentName,
                rombel: rombel,
                type: 'SISWA',
                status: status,
                date: today,
                scan_time: time + ':00',
                notes: `Piket: ${notes}`
            }]);

        if (error) throw error;

        alert(`Berhasil mencatat ${status} untuk${studentName}!`);
        document.getElementById('form-piket').reset();
        initPiketForm();
        loadPiketToday();
    } catch (err) {
        console.error('Gagal menyimpan data piket:', err.message);
        alert('Terjadi kesalahan saat menyimpan data piket.');
    }
}

// Memuat daftar rekap piket & disiplin hari ini (dengan fallback pencarian nama)
export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat rekap piket & disiplin...</div>`;
    
    const today = getLocalDateString();
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    try {
        // Ambil data master siswa sebagai fallback nama
        const { data: masterStudents } = await supabase
            .from('students')
            .select('id, name, rombel');
        
        const studentMap = {};
        if (masterStudents) {
            masterStudents.forEach(s => { studentMap[s.id] = s; });
        }

        // 1. Ambil data absen tidak wajar
        const { data: attendanceData, error: attError } = await supabase
            .from('attendance')
            .select('*') 
            .eq('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT']);

        if (attError) console.error('Error attendance:', attError);

        // 2. Ambil data pelanggaran dari tabel disciplines
        const { data: disiplineData, error: disError } = await supabase
            .from('disciplines')
            .select('*, students(name, rombel)')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (disError) console.error('Error disciplines:', disError);

        let combinedData = [];

        // Mapping data attendance
        if (attendanceData) {
            attendanceData.forEach(item => {
                const stuFallback = studentMap[item.student_id];
                const stuName = item.name || (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                const stuRombel = item.rombel || (stuFallback ? stuFallback.rombel : '-');
                
                let timeDisplay = '-';
                if (item.scan_time && item.scan_time.length >= 5) {
                    timeDisplay = item.scan_time.substring(0, 5);
                } else if (item.created_at) {
                    timeDisplay = new Date(item.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
                }

                combinedData.push({
                    type: 'ABSEN',
                    student_id: item.student_id,
                    name: stuName,
                    rombel: stuRombel,
                    status: item.status,
                    time: timeDisplay,
                    desc: item.notes || 'Tanpa catatan'
                });
            });
        }

        // Mapping data disciplines
        if (disiplineData) {
            disiplineData.forEach(item => {
                const stuRelation = item.students;
                const stuFallback = studentMap[item.student_id];
                
                const stuName = (stuRelation && stuRelation.name) ? stuRelation.name : (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                const stuRombel = (stuRelation && stuRelation.rombel) ? stuRelation.rombel : (stuFallback ? stuFallback.rombel : '-');
                const jamInput = item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';

                combinedData.push({
                    type: 'DISIPLIN',
                    student_id: item.student_id,
                    name: stuName,
                    rombel: stuRombel,
                    status: item.violation_desc,
                    time: jamInput,
                    desc: item.action_taken
                });
            });
        }

        if (combinedData.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan kehadiran tidak wajar atau pelanggaran hari ini.</div>`;
            return;
        }
        
        combinedData.sort((a, b) => (b.time > a.time ? 1 : -1));
        container.innerHTML = '';

        combinedData.forEach(item => {
            let badgeColor = item.type === 'DISIPLIN' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-orange-100 text-orange-700 border-orange-200';
            if (item.status === 'SAKIT') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
            if (item.status === 'IZIN') badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
            if (item.status === 'ALPHA') badgeColor = 'bg-red-100 text-red-700 border-red-200';

            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 cursor-pointer hover:border-ncipsNavy hover:bg-slate-50 transition-all active:scale-[0.98]";
            
            card.onclick = () => {
                if(window.fillViolationForm) {
                    const defaultViolationType = item.status === 'TERLAMBAT' ? 'Terlambat' : 'Lainnya';
                    window.fillViolationForm(item.student_id, defaultViolationType);
                }
            };

            card.innerHTML = `
                <div class="flex justify-between items-center pointer-events-none">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${badgeColor}">${item.status}</span>
                        <h4 class="text-xs font-black text-ncipsNavy">${item.name}</h4>
                    </div>
                    <span class="text-[10px] font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-xl text-slate-700 border border-gray-100">${item.time}</span>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1 pointer-events-none">
                    <p class="text-[10px] text-gray-500 font-bold mb-1">Rombel: <span class="text-gray-700">${item.rombel}</span></p>
                    <p class="text-[10px] text-gray-700 font-medium leading-relaxed">${item.desc}</p>
                </div>
