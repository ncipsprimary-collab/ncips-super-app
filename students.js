// Modul Khusus Direktori Data Siswa
import { supabaseClient } from './supabase.js';

export async function loadStudents() {
    const container = document.getElementById('student-list-container');
    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Sedang menyinkronkan data...</div>`;

    try {
        const { data: students, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        if (!students || students.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-500 text-xs font-medium">Belum ada penumpang (siswa) di database.</div>`;
            return;
        }

        let html = '';
        students.forEach((student, index) => {
            html += `
                <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-ncipsNavy to-slate-800 text-ncipsYellow flex items-center justify-center font-black text-xs shadow-md">
                            ${index + 1}
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-ncipsNavy">${student.full_name}</h3>
                            <p class="text-[11px] text-gray-400 font-medium mt-0.5">NISN: ${student.nisn || '-'}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black border border-blue-100 tracking-wider">
                            ${student.qr_code || 'Tanpa QR'}
                        </span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-500 text-xs font-medium">Gagal memuat data siswa.</div>`;
    }
}

// FUNGSI BARU: Logika Simpan Penumpang Baru
export async function addStudent(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-student');
    btn.innerText = 'Mencetak Tiket...';

    const name = document.getElementById('new-student-name').value;
    const nisn = document.getElementById('new-student-nisn').value;

    // KEAJAIBAN: Bikin kode QR statis otomatis berdasarkan waktu (Anti-kembar)
    const generatedQrText = `QR-NCIPS-${Date.now()}`;

    try {
        const { error } = await supabaseClient
            .from('students')
            .insert([
                { full_name: name, nisn: nisn, qr_code: generatedQrText }
            ]);

        if (error) throw error;

        alert('Siswa berhasil didaftarkan! Kode QR otomatis: ' + generatedQrText);
        
        // Tutup jendela dan bersihkan isian
        closeAddStudentModal();
        document.getElementById('form-add-student').reset();
        
        // Langsung muat ulang daftar siswa agar yang baru langsung muncul
        loadStudents();

    } catch (err) {
        console.error(err);
        alert('Gagal mendaftar: ' + err.message);
    } finally {
        btn.innerText = 'Daftarkan Penumpang';
    }
}

// Kontrol Jendela (Modal) Pendaftaran
export function openAddStudentModal() {
    const modal = document.getElementById('modal-add-student');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function closeAddStudentModal() {
    const modal = document.getElementById('modal-add-student');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
