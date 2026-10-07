import { supabase } from './supabase.js';

// Helper Tanggal Lokal (YYYY-MM-DD)
function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper Ekstraksi Jam (HH:mm) agar tidak muncul "2026-"
function extractTime(timeVal, createdAtVal) {
    if (timeVal) {
        let cleanTime = timeVal;
        if (cleanTime.includes('T')) cleanTime = cleanTime.split('T')[1];
        if (cleanTime.includes(' ')) cleanTime = cleanTime.split(' ')[1];
        const parts = cleanTime.split(':');
        if (parts.length >= 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
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

// Inisialisasi Form Piket
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

// Menyimpan piket manual (Disesuaikan dengan header tabel attendance)
export async function savePiketEntry(e) {
    e.preventDefault();
    const select = document.getElementById('piket-student-select');
    const selectedOpt = select.options[select.selectedIndex];
    
    if (!select.value) {
        alert('Silakan pilih siswa terlebih dahulu!');
        return;
    }

    const studentName = selectedOpt.dataset.name;
    // Mengambil NISN untuk dimasukkan ke qr_code, jika tidak ada pakai ID
    const qrCode = selectedOpt.dataset.nisn || select.value; 
    const status = document.getElementById('piket-status-select').value;
    const time = document.getElementById('piket-time').value;
    const notes = document.getElementById('piket-notes').value || '-';
    
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

        alert(`Berhasil mencatat ${status} untuk ${studentName}!`);
        document.getElementById('form-piket').reset();
        initPiketForm();
        loadPiketToday();
    } catch (err) {
        console.error('Gagal menyimpan data piket:', err.message);
        alert('Terjadi kesalahan saat menyimpan data piket.');
    }
}

// Memuat daftar rekap piket (Disesuaikan dengan qr_code dan user_name)
export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat rekap piket & disiplin...</div>`;
    
    const today = getLocalDateString();
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    try {
        const { data: masterStudents } = await supabase
            .from('students')
            .select('id, name, nisn, rombel');
        
        // Pemetaan ganda berdasarkan ID dan NISN
        const studentMap = {};
        if (masterStudents) {
            masterStudents.forEach(s => {
                if (s.id) studentMap[String(s.id)] = s;
                if (s.nisn) studentMap[String(s.nisn)] = s;
            });
        }

        const { data: attendanceData, error: attError } = await supabase
            .from('attendance')
            .select('*') 
            .eq('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT']);

        if (attError) console.error('Error attendance:', attError);

        const { data: disiplineData, error: disError } = await supabase
            .from('disciplines')
            .select('*, students(id, name, rombel)')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (disError) console.error('Error disciplines:', disError);

        let combinedData = [];

        if (attendanceData) {
            attendanceData.forEach(item => {
                // PERBAIKAN: Gunakan qr_code sebagai kunci pencarian ke tabel master
                const key = item.qr_code ? String(item.qr_code) : '';
                const stuFallback = studentMap[key];
                
                // PERBAIKAN: Gunakan user_name dari tabel attendance
                const stuName = item.user_name || (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                const stuRombel = stuFallback ? stuFallback.rombel : '-';
                
                // Ambil ID asli (primary key tabel students) agar form dropdown berfungsi
                const validStudentId = stuFallback ? stuFallback.id : item.qr_code;
                const timeDisplay = extractTime(item.scan_time, null);

                combinedData.push({
                    type: 'ABSEN',
                    student_id: validStudentId,
                    name: stuName,
                    rombel: stuRombel,
                    status: item.status,
                    time: timeDisplay,
                    desc: 'Kehadiran manual/scanner' // Tabel attendance tidak punya kolom notes, kita hardcode
                });
            });
        }

        if (disiplineData) {
            disiplineData.forEach(item => {
                const stuRelation = item.students;
                const key = item.student_id ? String(item.student_id) : '';
                const stuFallback = studentMap[key];
                
                const stuName = (stuRelation && stuRelation.name) ? stuRelation.name : (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                const stuRombel = (stuRelation && stuRelation.rombel) ? stuRelation.rombel : (stuFallback ? stuFallback.rombel : '-');
                const validStudentId = (stuRelation && stuRelation.id) ? stuRelation.id : (stuFallback ? stuFallback.id : item.student_id);
                const timeDisplay = extractTime(null, item.created_at);

                combinedData.push({
                    type: 'DISIPLIN',
                    student_id: validStudentId,
                    name: stuName,
                    rombel: stuRombel,
                    status: item.violation_desc,
                    time: timeDisplay,
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
                    window.fillViolationForm(item.student_id, defaultViolationType, item.name);
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
                <p class="text-[8px] text-gray-400 font-bold text-center mt-1 pointer-events-none">👉 Klik untuk beri tindak lanjut</p>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Gagal memuat rekap gabungan:', err.message);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-400 text-xs">Gagal memuat data. ${err.message}</div>`;
    }
}

// Memuat daftar siswa ke dropdown Kedisiplinan / Pelanggaran
export async function loadStudentsForViolation() {
    const violationSelect = document.getElementById('violationStudent');
    if (!violationSelect) return;

    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, name, rombel, nisn')
            .eq('status', 'AKTIF')
            .order('name', { ascending: true });

        if (error) throw error;

        violationSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        data.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name} (${student.rombel || 'Tanpa Rombel'})`;
            option.dataset.name = student.name;
            option.dataset.nisn = student.nisn || '';
            violationSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Gagal memuat daftar siswa pelanggaran:', err);
    }
}

// Menyimpan catatan pelanggaran
export async function saveViolationEntry(event) {
    event.preventDefault();

    const studentId = document.getElementById('violationStudent').value;
    const violationType = document.getElementById('violationType').value;
    const actionTaken = document.getElementById('violationAction').value;
    const actionStatus = document.getElementById('violationStatus').value;
    const notes = document.getElementById('violationNotes').value || '-';
    const officerName = localStorage.getItem('user_name') || 'Guru Piket'; 

    if (!studentId) {
        alert('Silakan pilih siswa terlebih dahulu!');
        return;
    }

    const detailAction = `[${actionStatus}] ${actionTaken} | Catatan: ${notes}`;

    const { error } = await supabase.from('disciplines').insert([{
        student_id: studentId,
        violation_desc: violationType,
        action_taken: detailAction,
        reported_by: officerName,
        points: 0
    }]);

    if (error) {
        alert('Gagal menyimpan pelanggaran: ' + error.message);
    } else {
        alert('✅ Pelanggaran dan tindak lanjut berhasil dicatat!');
        document.getElementById('violationForm').reset();
        loadPiketToday();
    }
}

// Auto-fill form pelanggaran saat rekap diklik
window.fillViolationForm = async function(studentId, violationType, studentName) {
    const studentSelect = document.getElementById('violationStudent');
    const typeSelect = document.getElementById('violationType');
    
    if (studentSelect && studentSelect.options.length <= 1) {
        await loadStudentsForViolation();
    }
    
    if (studentSelect) {
        let matched = false;
        if (studentId) {
            for (let opt of studentSelect.options) {
                if (String(opt.value) === String(studentId)) {
                    studentSelect.value = opt.value;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched && studentName) {
            for (let opt of studentSelect.options) {
                if (opt.textContent.toLowerCase().includes(studentName.toLowerCase()) || 
                   (opt.dataset.name && opt.dataset.name.toLowerCase() === studentName.toLowerCase())) {
                    studentSelect.value = opt.value;
                    break;
                }
            }
        }
    }
    
    if (typeSelect && violationType) {
        const exists = Array.from(typeSelect.options).some(opt => opt.value === violationType);
        if (exists) typeSelect.value = violationType;
    }
    
    const formElement = document.getElementById('violationForm');
    if (formElement) {
        // Buka form jika berada dalam wadah tersembunyi
        const parentHidden = formElement.closest('.hidden');
        if (parentHidden) parentHidden.classList.remove('hidden');

        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        formElement.classList.add('ring-2', 'ring-ncipsYellow', 'transition-all');
        
        const actionInput = document.getElementById('violationAction') || document.getElementById('violationNotes');
        if (actionInput) actionInput.focus();

        setTimeout(() => {
            formElement.classList.remove('ring-2', 'ring-ncipsYellow');
        }, 1500);
    }
};
