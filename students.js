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
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-500 text-xs font-medium">Belum ada data siswa di database.</div>`;
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
                    <span class="bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-100">
                        ${student.qr_code || 'Tanpa QR'}
                    </span>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-500 text-xs font-medium">Gagal memuat data siswa.</div>`;
    }
}
