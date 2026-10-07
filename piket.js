import { supabase } from './supabase.js';

// Helper Toast Alert Premium 
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-rose-600';
    const icon = type === 'success' ? '✅' : '⚠️';

    toast.className = `${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold transition-all duration-300 transform translate-y-[-10px] opacity-0 pointer-events-auto`;
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-[-10px]', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getLocalDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function extractTime(timeVal, createdAtVal) {
    if (timeVal) {
        let cleanTime = timeVal;
        if (cleanTime.includes('T')) cleanTime = cleanTime.split('T')[1];
        if (cleanTime.includes(' ')) cleanTime = cleanTime.split(' ')[1];
        const parts = cleanTime.split(':');
        if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    if (createdAtVal) {
        const d = new Date(createdAtVal);
        if (!isNaN(d.getTime())) {
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        }
    }
    return '-';
}

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
        console.error('Gagal memuat siswa:', err.message);
    }
}

export async function savePiketEntry(e) {
    e.preventDefault();
    const select = document.getElementById('piket-student-select');
    if (!select || !select.value) {
        showToast('Silakan pilih siswa terlebih dahulu!', 'error');
        return;
    }

    const selectedOpt = select.options[select.selectedIndex];
    const studentName = selectedOpt.dataset.name;
    const qrCode = selectedOpt.dataset.nisn || select.value; 
    const status = document.getElementById('piket-status-select').value;
    const time = document.getElementById('piket-time').value;
    const today = getLocalDateString();

    try {
        const { error } = await supabase
            .from('attendance')
            .insert([{
                qr_code: qrCode,
                user_name: studentName,
                user_type: 'SISWA',
                status: status,
                date: today,
                scan_time: `${time}:00`
            }]);

        if (error) throw error;

        showToast(`Berhasil mencatat ${status} untuk ${studentName}!`, 'success');
        document.getElementById('form-piket').reset();
        initPiketForm();
        loadPiketToday();
    } catch (err) {
        showToast('Terjadi kesalahan saat menyimpan data.', 'error');
    }
}

// LOGIKA BARU: Tarik hari ini + 7 hari ke belakang untuk yang tertunda
export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs font-bold animate-pulse">Memuat data rekap & tunggakan...</div>`;
    
    const now = new Date();
    const today = getLocalDateString(now);
    
    // Setel mundur 7 hari untuk mengecek yang tertunda
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 7);
    const pastDateString = getLocalDateString(pastDate);

    const startOfPast = `${pastDateString}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    try {
        const { data: masterStudents } = await supabase.from('students').select('id, name, nisn, rombel');
        const studentMap = {};
        if (masterStudents) {
            masterStudents.forEach(s => {
                if (s.id) studentMap[String(s.id)] = s;
                if (s.nisn) studentMap[String(s.nisn)] = s;
            });
        }

        // Ambil attendance 7 hari terakhir
        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*') 
            .gte('date', pastDateString)
            .lte('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT']);

        // Ambil disciplines 7 hari terakhir
        const { data: disiplineData } = await supabase
            .from('disciplines')
            .select('*, students(id, name, rombel)')
            .gte('created_at', startOfPast)
            .lte('created_at', endOfDay);

        let combinedData = [];

        if (attendanceData) {
            attendanceData.forEach(item => {
                const key = item.qr_code ? String(item.qr_code) : '';
                const stuFallback = studentMap[key];
                const validStudentId = stuFallback ? stuFallback.id : item.qr_code;
                
                // Cek apakah diabsen ini SUDAH ditindak di hari yang sama
                const hasFollowUp = disiplineData?.some(d => {
                    const dDate = new Date(d.created_at).toISOString().split('T')[0];
                    return String(d.student_id) === String(validStudentId) && dDate === item.date;
                });

                // TAMPILKAN JIKA: Absen Hari ini, ATAU Absen masa lalu TAPI belum ditindak
                if (item.date === today || !hasFollowUp) {
                    const stuName = item.user_name || (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                    const stuRombel = stuFallback ? stuFallback.rombel : '-';
                    const isPast = item.date !== today;
                    
                    combinedData.push({
                        type: 'ABSEN',
                        student_id: validStudentId,
                        name: stuName,
                        rombel: stuRombel,
                        status: item.status,
                        dateStr: item.date,
                        time: extractTime(item.scan_time, null),
                        desc: isPast ? `Peringatan: Belum ditindaklanjuti sejak ${item.date}` : 'Kehadiran Piket',
                        isPast: isPast,
                        isProcessed: hasFollowUp
                    });
                }
            });
        }

        if (disiplineData) {
            disiplineData.forEach(item => {
                const dDate = new Date(item.created_at).toISOString().split('T')[0];
                
                // TAMPILKAN SEBAGAI KARTU TINDAK LANJUT HANYA JIKA ITU HARI INI
                if (dDate === today) {
                    const stuRelation = item.students;
                    const key = item.student_id ? String(item.student_id) : '';
                    const stuFallback = studentMap[key];
                    
                    const stuName = (stuRelation && stuRelation.name) ? stuRelation.name : (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                    const stuRombel = (stuRelation && stuRelation.rombel) ? stuRelation.rombel : (stuFallback ? stuFallback.rombel : '-');
                    const validStudentId = (stuRelation && stuRelation.id) ? stuRelation.id : (stuFallback ? stuFallback.id : item.student_id);

                    combinedData.push({
                        type: 'DISIPLIN',
                        student_id: validStudentId,
                        name: stuName,
                        rombel: stuRombel,
                        status: item.violation_desc,
                        dateStr: dDate,
                        time: extractTime(null, item.created_at),
                        desc: item.action_taken, // Sudah mengandung nama penindak
                        isPast: false,
                        isProcessed: true
                    });
                }
            });
        }

        if (combinedData.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan hari ini dan tidak ada tunggakan.</div>`;
            return;
        }
        
        // Sorting: Dahulukan yang tertunda (isPast), lalu dari jam terbaru
        combinedData.sort((a, b) => {
            if (a.isPast && !b.isPast) return -1;
            if (!a.isPast && b.isPast) return 1;
            return b.time > a.time ? 1 : -1;
        });

        container.innerHTML = '';

        combinedData.forEach(item => {
            let badgeColor = item.type === 'DISIPLIN' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-orange-100 text-orange-700 border-orange-200';
            
            const card = document.createElement('div');
            const isDone = item.isProcessed;

            // Jika item ini dari hari yang lalu, beri gaya border merah berkedip ringan
            let extraStyles = item.isPast ? 'border-red-300 bg-red-50' : 'border-gray-100 hover:border-ncipsNavy hover:bg-slate-50';
            if (isDone) extraStyles = 'border-emerald-200 bg-emerald-50/20 opacity-80 cursor-not-allowed';
