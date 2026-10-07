import { supabase } from './supabase.js';

// Helper Toast Alert Premium (Menggantikan alert biasa)
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

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
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

export async function loadPiketToday() {
    const container = document.getElementById('piket-list-container');
    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs font-bold animate-pulse">Memuat data rekap...</div>`;
    
    const today = getLocalDateString();
    const startOfDay = `${today}T00:00:00.000Z`;
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
            .eq('date', today)
            .in('status', ['SAKIT', 'IZIN', 'ALPHA', 'TERLAMBAT']);

        const { data: disiplineData } = await supabase
            .from('disciplines')
            .select('*, students(id, name, rombel)')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        let combinedData = [];

        if (attendanceData) {
            attendanceData.forEach(item => {
                const key = item.qr_code ? String(item.qr_code) : '';
                const stuFallback = studentMap[key];
                const stuName = item.user_name || (stuFallback ? stuFallback.name : 'Siswa Tidak Diketahui');
                const stuRombel = stuFallback ? stuFallback.rombel : '-';
                const validStudentId = stuFallback ? stuFallback.id : item.qr_code;
                
                // Cek apakah siswa ini sudah memiliki catatan tindak lanjut di tabel disciplines
                const hasFollowUp = disiplineData?.some(d => String(d.student_id) === String(validStudentId));

                combinedData.push({
                    type: 'ABSEN',
                    student_id: validStudentId,
                    name: stuName,
                    rombel: stuRombel,
                    status: item.status,
                    time: extractTime(item.scan_time, null),
                    desc: 'Kehadiran Piket',
                    isProcessed: hasFollowUp
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

                combinedData.push({
                    type: 'DISIPLIN',
                    student_id: validStudentId,
                    name: stuName,
                    rombel: stuRombel,
                    status: item.violation_desc,
                    time: extractTime(null, item.created_at),
                    desc: item.action_taken,
                    isProcessed: true
                });
            });
        }

        if (combinedData.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada catatan hari ini.</div>`;
            return;
        }
        
        combinedData.sort((a, b) => (b.time > a.time ? 1 : -1));
        container.innerHTML = '';

        combinedData.forEach(item => {
            let badgeColor = item.type === 'DISIPLIN' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-orange-100 text-orange-700 border-orange-200';
            
            const card = document.createElement('div');
            const isDone = item.isProcessed;

            card.className = `bg-white p-4 rounded-2xl shadow-sm border transition-all ${
                isDone ? 'border-emerald-200 bg-emerald-50/20 opacity-80 cursor-not-allowed' : 'border-gray-100 cursor-pointer hover:border-ncipsNavy hover:bg-slate-50 active:scale-[0.98]'
            }`;
            
            card.onclick = () => {
                if (isDone) {
                    showToast('Siswa ini sudah diberikan tindak lanjut!', 'error');
                    return;
                }
                if(window.fillViolationForm) {
                    const defaultViolationType = item.status === 'TERLAMBAT' ? 'Terlambat' : 'Lainnya';
                    window.fillViolationForm(item.student_id, defaultViolationType, item.name);
                }
            };

            const statusTindakLanjut = isDone 
                ? `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-black px-2 py-0.5 rounded-full">✓ SUDAH DITINDAK</span>`
                : `<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[8px] font-black px-2 py-0.5 rounded-full">⏳ BELUM DITINDAK</span>`;

            card.innerHTML = `
                <div class="flex justify-between items-center pointer-events-none">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${badgeColor}">${item.status}</span>
                        <h4 class="text-xs font-black text-ncipsNavy">${item.name}</h4>
                    </div>
                    <span class="text-[10px] font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-xl text-slate-700 border border-gray-100">${item.time}</span>
                </div>
                <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-2 pointer-events-none flex justify-between items-center">
                    <div>
                        <p class="text-[10px] text-gray-500 font-bold">Rombel: <span class="text-gray-700">${item.rombel}</span></p>
                        <p class="text-[10px] text-gray-700 font-medium">${item.desc}</p>
                    </div>
                    ${statusTindakLanjut}
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

export async function saveViolationEntry(event) {
    event.preventDefault();

    const studentId = document.getElementById('violationStudent')?.value;
    const violationType = document.getElementById('violationType')?.value;
    const actionTakenInput = document.getElementById('violationAction');
    const actionStatusInput = document.getElementById('violationStatus');
    const notesInput = document.getElementById('violationNotes');

    if (!studentId) {
        showToast('Silakan pilih siswa terlebih dahulu!', 'error');
        return;
    }

    const today = getLocalDateString();
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    // Proteksi ganda: Cek ke database apakah siswa sudah pernah ditindak hari ini
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

    const actionTaken = actionTakenInput ? actionTakenInput.value : (notesInput ? notesInput.value : '-');
    const actionStatus = actionStatusInput ? actionStatusInput.value : 'SELESAI';
    const notes = notesInput ? notesInput.value : '-';
    const detailAction = actionStatusInput ? `[${actionStatus}] ${actionTaken} | Catatan: ${notes}` : notes;

    const { error } = await supabase.from('disciplines').insert([{
        student_id: studentId,
        violation_desc: violationType || 'Lainnya',
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
    const typeSelect = document.getElementById('violationType');
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
    if (typeSelect && violationType) typeSelect.value = violationType;

    const hiddenClasses = ['hidden', 'invisible', 'opacity-0'];
    hiddenClasses.forEach(cls => formElement.classList.remove(cls));
    formElement.style.display = 'block';

    setTimeout(() => {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const actionInput = document.getElementById('violationAction') || document.getElementById('violationNotes');
        if (actionInput) actionInput.focus();
    }, 100);
};
