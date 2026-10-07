import { supabase } from './supabase.js';

// --- HELPER TOAST NOTIFICATION PREMIUM ---
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

// Helper Format Tanggal
function getLocalDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper Rentang Waktu (Mingguan, Bulanan, Semesteran)
function getDateRange(period) {
    const end = new Date();
    const start = new Date();

    if (period === 'mingguan') {
        start.setDate(end.getDate() - 7);
    } else if (period === 'bulanan') {
        start.setDate(end.getDate() - 30);
    } else if (period === 'semesteran') {
        start.setMonth(end.getMonth() - 6);
    }

    return {
        startDate: getLocalDateString(start),
        endDate: getLocalDateString(end)
    };
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

// Ambil Nama Guru Piket yang sedang login
function getOfficerName() {
    return localStorage.getItem('user_name') || 
           localStorage.getItem('nama') || 
           localStorage.getItem('userName') || 
           'Guru Piket';
}

// --- INISIALISASI UTAMA & TAB SWITCHER ---
export function initPiketForm() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeInput = document.getElementById('piket-time');
    if (timeInput) timeInput.value = `${hours}:${minutes}`;
    
    setupPiketTabs();
    loadPiketStudentsDropdown();
    loadPiketToday();
    loadStudentsForViolation();
}

export function setupPiketTabs() {
    const btnInput = document.getElementById('btn-tab-input');
    const btnAnalitik = document.getElementById('btn-tab-analitik');
    const sectionInput = document.getElementById('section-input-piket');
    const sectionAnalitik = document.getElementById('section-analitik-disiplin');

    if (btnInput && btnAnalitik) {
        btnInput.onclick = () => {
            btnInput.className = 'px-5 py-2.5 rounded-xl font-bold text-xs bg-ncipsNavy text-white shadow-md transition-all';
            btnAnalitik.className = 'px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all';
            if (sectionInput) sectionInput.classList.remove('hidden');
            if (sectionAnalitik) sectionAnalitik.classList.add('hidden');
        };

        btnAnalitik.onclick = () => {
            btnAnalitik.className = 'px-5 py-2.5 rounded-xl font-bold text-xs bg-ncipsNavy text-white shadow-md transition-all';
            btnInput.className = 'px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all';
            if (sectionInput) sectionInput.classList.add('hidden');
            if (sectionAnalitik) sectionAnalitik.classList.remove('hidden');
            
            // Auto load analitik default: Siswa & Mingguan
            loadAnalitikDisiplin('SISWA', 'mingguan');
        };
    }
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

// --- REKAP PIKET HARIAN + GURU PIKET & TUNGGAKAN ---
export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs font-bold animate-pulse">Memuat data rekap & tunggakan...</div>`;
    
    const now = new Date();
    const today = getLocalDateString(now);
    
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

        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*') 
            .gte('date', pastDateString)
            .lte('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT']);

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
                
                // Cari data disiplin yang cocok untuk mengambil info tindak lanjut + nama penindak
                const followUpItem = disiplineData?.find(d => {
                    const dDate = new Date(d.created_at).toISOString().split('T')[0];
                    return String(d.student_id) === String(validStudentId) && dDate === item.date;
                });

                const hasFollowUp = !!followUpItem;

                if (item.date === today || !hasFollowUp) {
                    const stuName = item.user_name || (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                    const stuRombel = stuFallback ? stuFallback.rombel : '-';
                    const isPast = item.date !== today;
                    
                    // Ekstrak nama penindak jika sudah ditindak
                    let officerInCharge = '-';
                    if (followUpItem && followUpItem.action_taken) {
                        const match = followUpItem.action_taken.match(/Penindak:\s*([^|]+)/);
                        if (match) officerInCharge = match[1].trim();
                    }

                    combinedData.push({
                        type: 'ABSEN',
                        student_id: validStudentId,
                        name: stuName,
                        rombel: stuRombel,
                        status: item.status,
                        dateStr: item.date,
                        time: extractTime(item.scan_time, null),
                        desc: isPast ? `Peringatan: Belum ditindaklanjuti sejak ${item.date}` : (hasFollowUp ? followUpItem.action_taken : 'Kehadiran Piket'),
                        isPast: isPast,
                        isProcessed: hasFollowUp,
                        officer: officerInCharge
                    });
                }
            });
        }

        if (disiplineData) {
            disiplineData.forEach(item => {
                const dDate = new Date(item.created_at).toISOString().split('T')[0];
                
                if (dDate === today) {
                    const stuRelation = item.students;
                    const key = item.student_id ? String(item.student_id) : '';
                    const stuFallback = studentMap[key];
                    
                    const stuName = (stuRelation && stuRelation.name) ? stuRelation.name : (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                    const stuRombel = (stuRelation && stuRelation.rombel) ? stuRelation.rombel : (stuFallback ? stuFallback.rombel : '-');
                    const validStudentId = (stuRelation && stuRelation.id) ? stuRelation.id : (stuFallback ? stuFallback.id : item.student_id);

                    let officerInCharge = getOfficerName();
                    if (item.action_taken) {
                        const match = item.action_taken.match(/Penindak:\s*([^|]+)/);
                        if (match) officerInCharge = match[1].trim();
                    }

                    combinedData.push({
                        type: 'DISIPLIN',
                        student_id: validStudentId,
                        name: stuName,
                        rombel: stuRombel,
                        status: item.violation_desc,
                        dateStr: dDate,
                        time: extractTime(null, item.created_at),
                        desc: item.action_taken,
                        isPast: false,
                        isProcessed: true,
                        officer: officerInCharge
                    });
                }
            });
        }

        if (combinedData.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan hari ini dan tidak ada tunggakan.</div>`;
            return;
        }
        
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

            let extraStyles = item.isPast ? 'border-red-300 bg-red-50' : 'border-gray-100 hover:border-ncipsNavy hover:bg-slate-50';
            if (isDone) extraStyles = 'border-emerald-200 bg-emerald-50/20 opacity-80 cursor-not-allowed';

            card.className = `bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer active:scale-[0.98] ${extraStyles}`;
            
            card.onclick = () => {
                if (isDone) {
                    showToast('Siswa ini sudah diberikan tindak lanjut!', 'error');
                    return;
                }
                if(window.fillViolationForm) {
                    const defaultViolationType = item.status === 'TERLAMBAT' ? 'Terlambat Datang Sekolah' : 'Pelanggaran Tata Tertib';
                    window.fillViolationForm(item.student_id, defaultViolationType, item.name);
                }
            };

            let statusTindakLanjut = isDone 
                ? `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">✓ SUDAH DITINDAK</span>`
                : `<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">⏳ BELUM DITINDAK</span>`;

            if (item.isPast) {
                 statusTindakLanjut = `<span class="bg-red-100 text-red-800 border border-red-300 text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">⚠️ TERTUNDA</span>`;
            }

            card.innerHTML = `
                <div class="flex justify-between items-center pointer-events-none">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${badgeColor}">${item.status}</span>
                        <h4 class="text-xs font-black text-ncipsNavy">${item.name}</h4>
                    </div>
                    <span class="text-[10px] font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-xl text-slate-700 border border-gray-100">${item.isPast ? item.dateStr : item.time}</span>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-2 pointer-events-none flex flex-col gap-1.5">
                    <div class="flex justify-between items-center gap-3">
                        <div>
                            <p class="text-[10px] text-gray-500 font-bold">Rombel: <span class="text-gray-700">${item.rombel}</span></p>
                            <p class="text-[10px] ${item.isPast ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'} leading-tight mt-0.5">${item.desc}</p>
                        </div>
                        ${statusTindakLanjut}
                    </div>
                    <div class="border-t border-gray-200/60 pt-1.5 flex justify-between items-center text-[9px] text-slate-500">
                        <span>👨‍🏫 Guru Piket: <strong class="text-ncipsNavy font-black">${item.officer}</strong></span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-400 text-xs">Gagal memuat data.</div>`;
    }
}

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
            violationSelect.appendChild(option);
        });
    } catch (err) {
        console.error(err);
    }
}

// --- FORM TINDAK LANJUT WITH MANUAL INPUT FOR VIOLATION TYPE ---
export async function saveViolationEntry(event) {
    event.preventDefault();

    const studentId = document.getElementById('violationStudent')?.value;
    
    // MENERIMA INPUT TEKS MANUAL DARI USER
    const violationTypeInput = document.getElementById('violationType');
    const violationType = violationTypeInput ? violationTypeInput.value.trim() : 'Terlambat';

    const actionTakenInput = document.getElementById('violationAction');
    const actionStatusInput = document.getElementById('violationStatus');
    const notesInput = document.getElementById('violationNotes');

    if (!studentId) {
        showToast('Silakan pilih siswa terlebih dahulu!', 'error');
        return;
    }

    if (!violationType) {
        showToast('Silakan ketik jenis pelanggaran!', 'error');
        return;
    }

    const today = getLocalDateString();
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { data: existing } = await supabase
        .from('disciplines')
        .select('id')
        .eq('student_id', studentId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

    if (existing && existing.length > 0) {
        showToast('Siswa ini sudah tercatat memiliki tindak lanjut hari ini!', 'error');
        return;
    }

    const officerName = getOfficerName();

    const actionTaken = actionTakenInput ? actionTakenInput.value : (notesInput ? notesInput.value : '-');
    const actionStatus = actionStatusInput ? actionStatusInput.value : 'SELESAI';
    const notes = notesInput ? notesInput.value : '-';
    
    // FORMAT OTOMATIS TERCATAT DENGAN NAMA GURU PIKET
    const detailAction = actionStatusInput 
        ? `[${actionStatus}] ${actionTaken} | Penindak: ${officerName} | Cat: ${notes}` 
        : `${notes} | Penindak: ${officerName}`;

    const { error } = await supabase.from('disciplines').insert([{
        student_id: studentId,
        violation_desc: violationType,
        action_taken: detailAction,
        points: 0
    }]);

    if (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } else {
        showToast('Tindak lanjut berhasil dicatat!', 'success');
        const formEl = document.getElementById('violationForm');
        if (formEl) formEl.reset();
        
        const modalEl = document.getElementById('modal-violation');
        if (modalEl) {
            modalEl.classList.add('hidden');
            modalEl.classList.remove('flex');
        }
        loadPiketToday();
    }
}

window.fillViolationForm = async function(studentId, violationType, studentName) {
    const studentSelect = document.getElementById('violationStudent');
    const typeInput = document.getElementById('violationType');
    const formElement = document.getElementById('violationForm');
    const modalElement = document.getElementById('modal-violation');

    if (!formElement) return;

    if (modalElement) {
        modalElement.classList.remove('hidden');
        modalElement.classList.add('flex');
    }
    
    if (studentSelect && studentSelect.options.length <= 1) {
        await loadStudentsForViolation();
    }
    
    if (studentSelect && studentId) studentSelect.value = studentId;
    
    // Pengisian manual jenis pelanggaran
    if (typeInput && violationType) {
        typeInput.value = violationType;
    }

    const hiddenClasses = ['hidden', 'invisible', 'opacity-0'];
    hiddenClasses.forEach(cls => formElement.classList.remove(cls));
    formElement.style.display = 'block';

    setTimeout(() => {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const actionInput = document.getElementById('violationAction') || document.getElementById('violationNotes');
        if (actionInput) actionInput.focus();
    }, 100);
};

// --- MODUL ANALITIK DISIPLIN (GURU & SISWA: MINGGUAN, BULANAN, SEMESTERAN) ---
export async function loadAnalitikDisiplin(role = 'SISWA', period = 'mingguan') {
    const container = document.getElementById('analitik-content-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-8 rounded-3xl text-center text-gray-400 text-xs font-bold animate-pulse">Menghitung analitik kedisiplinan ${role.toLowerCase()} (${period})...</div>`;

    const { startDate, endDate } = getDateRange(period);

    try {
        let attendanceQuery = supabase
            .from('attendance')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (role === 'GURU') {
            attendanceQuery = attendanceQuery.eq('user_type', 'GURU');
        } else {
            attendanceQuery = attendanceQuery.eq('user_type', 'SISWA');
        }

        const { data: attendanceData, error: attErr } = await attendanceQuery;
        if (attErr) throw attErr;

        let totalTerlambat = 0;
        let totalAlpha = 0;
        let totalIzinSakit = 0;
        const rankMap = {};

        if (attendanceData) {
            attendanceData.forEach(item => {
                const name = item.user_name || 'Tidak Diketahui';
                if (!rankMap[name]) rankMap[name] = { total: 0, terlambat: 0, alpha: 0 };

                if (item.status === 'TERLAMBAT') {
                    totalTerlambat++;
                    rankMap[name].terlambat++;
                    rankMap[name].total++;
                } else if (item.status === 'ALPHA') {
                    totalAlpha++;
                    rankMap[name].alpha++;
                    rankMap[name].total++;
                } else if (item.status === 'SAKIT' || item.status === 'IZIN') {
                    totalIzinSakit++;
                }
            });
        }

        // Susun Ranking Top 5
        const sortedRank = Object.keys(rankMap)
            .map(key => ({ name: key, ...rankMap[key] }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        let rankingHTML = sortedRank.length === 0 
            ? `<p class="text-xs text-gray-400 text-center py-4">Sempurna! Tidak ada catatan ketidakdisiplinan pada periode ini.</p>`
            : sortedRank.map((item, idx) => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full ${idx === 0 ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'} text-[10px] font-black flex items-center justify-center">${idx + 1}</span>
                        <span class="text-xs font-bold text-slate-800">${item.name}</span>
                    </div>
                    <div class="flex gap-2 text-[10px] font-mono">
                        <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">${item.terlambat} Terlambat</span>
                        <span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">${item.alpha} Alpha</span>
                    </div>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Filter Header -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                    <div class="flex gap-1.5">
                        <button onclick="window.loadAnalitikDisiplin('SISWA', '${period}')" class="px-4 py-1.5 rounded-xl text-xs font-bold ${role === 'SISWA' ? 'bg-ncipsNavy text-white' : 'bg-white text-gray-600 border'}">Siswa</button>
                        <button onclick="window.loadAnalitikDisiplin('GURU', '${period}')" class="px-4 py-1.5 rounded-xl text-xs font-bold ${role === 'GURU' ? 'bg-ncipsNavy text-white' : 'bg-white text-gray-600 border'}">Guru & Staf</button>
                    </div>
                    <div class="flex gap-1.5">
                        <button onclick="window.loadAnalitikDisiplin('${role}', 'mingguan')" class="px-3 py-1.5 rounded-xl text-[11px] font-bold ${period === 'mingguan' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}">Mingguan</button>
                        <button onclick="window.loadAnalitikDisiplin('${role}', 'bulanan')" class="px-3 py-1.5 rounded-xl text-[11px] font-bold ${period === 'bulanan' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}">Bulanan</button>
                        <button onclick="window.loadAnalitikDisiplin('${role}', 'semesteran')" class="px-3 py-1.5 rounded-xl text-[11px] font-bold ${period === 'semesteran' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'}">Semesteran</button>
                    </div>
                </div>

                <!-- Cards Summary -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                        <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Keterlambatan</p>
                        <h3 class="text-3xl font-black text-amber-900 mt-1">${totalTerlambat} <span class="text-xs font-normal text-amber-700">kejadian</span></h3>
                    </div>
                    <div class="bg-rose-50 p-5 rounded-2xl border border-rose-200">
                        <p class="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Tanpa Keterangan (Alpha)</p>
                        <h3 class="text-3xl font-black text-rose-900 mt-1">${totalAlpha} <span class="text-xs font-normal text-rose-700">kejadian</span></h3>
                    </div>
                    <div class="bg-blue-50 p-5 rounded-2xl border border-blue-200">
                        <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total Izin / Sakit</p>
                        <h3 class="text-3xl font-black text-blue-900 mt-1">${totalIzinSakit} <span class="text-xs font-normal text-blue-700">kejadian</span></h3>
                    </div>
                </div>

                <!-- Top Ranked Table -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 class="text-xs font-black text-ncipsNavy uppercase tracking-wider mb-3">Top 5 Perlu Perhatian Khusus (${role})</h4>
                    <div class="space-y-2">${rankingHTML}</div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="bg-white p-6 rounded-2xl text-center text-rose-500 text-xs">Gagal memuat analitik kedisiplinan.</div>`;
    }
}

window.loadAnalitikDisiplin = loadAnalitikDisiplin;
