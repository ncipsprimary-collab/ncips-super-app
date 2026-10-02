import { supabase } from './supabase.js';

export async function loadTeachers() {
    const container = document.getElementById('teacher-list-container');
    const totalText = document.getElementById('total-teachers');
    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat data guru...</div>`;

    try {
        const { data: teachers, error } = await supabase
            .from('teachers')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        if (!teachers || teachers.length === 0) {
            totalText.innerText = "0";
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-500 text-xs font-medium">Belum ada data guru.</div>`;
            return;
        }

        totalText.innerText = teachers.length;
        let html = '';
        teachers.forEach((tch) => {
            const statusColor = tch.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
            const initial = tch.full_name ? tch.full_name.charAt(0).toUpperCase() : '?';

            html += `
                <div onclick="window.viewTeacherDetail('${tch.id}')" class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:border-slate-800 transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-sm shadow-inner">${initial}</div>
                            <div>
                                <h3 class="text-sm font-bold text-ncipsNavy">${tch.full_name}</h3>
                                <p class="text-[10px] text-gray-500 font-medium">NUPTK: ${tch.nuptk || '-'}</p>
                            </div>
                        </div>
                        <span class="${statusColor} px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border border-white">${tch.status || 'AKTIF'}</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-500 text-xs font-medium">Gagal memuat data guru.</div>`;
    }
}

window.viewTeacherDetail = async function(tchId) {
    const modal = document.getElementById('modal-detail-teacher');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const { data: tch, error } = await supabase.from('teachers').select('*').eq('id', tchId).single();
        if (error) throw error;

        // Render E-Card
        document.getElementById('tch-name-title').innerText = tch.full_name;
        document.getElementById('tch-nuptk-title').innerText = tch.nuptk || '-';
        document.getElementById('tch-jk-title').innerText = tch.gender || '-';
        document.getElementById('tch-qr-text').innerText = tch.qr_code;
        document.getElementById('tch-qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${tch.qr_code}`;

        const avatarContainer = document.getElementById('tch-avatar-container');
        if (tch.photo_url) {
            avatarContainer.innerHTML = `<img src="${tch.photo_url}" class="w-full h-full rounded-full object-cover">`;
        } else {
            const initial = tch.full_name ? tch.full_name.charAt(0).toUpperCase() : '?';
            avatarContainer.innerHTML = `<div class="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-white font-black text-2xl">${initial}</div>`;
        }

        // Form Edit (Termasuk Tempat & Tanggal Lahir)
        document.getElementById('edit-tch-id').value = tch.id;
        document.getElementById('edit-tch-name').value = tch.full_name;
        document.getElementById('edit-tch-nuptk').value = tch.nuptk || '';
        document.getElementById('edit-tch-jk').value = tch.gender || '';
        document.getElementById('edit-tch-tempat').value = tch.birth_place || '';
        document.getElementById('edit-tch-tgl').value = tch.birth_date || '';
        document.getElementById('edit-tch-status').value = tch.status || 'AKTIF';

    } catch (err) {
        alert("Gagal menarik data guru: " + err.message);
        closeDetailTeacherModal();
    }
};

export function closeDetailTeacherModal() { document.getElementById('modal-detail-teacher').classList.replace('flex', 'hidden'); }

export async function addTeacher(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-teacher');
    btn.innerText = 'Menyimpan...';

    const payload = {
        full_name: document.getElementById('tch-name').value,
        nuptk: document.getElementById('tch-nuptk').value,
        gender: document.getElementById('tch-jk').value,
        birth_place: document.getElementById('tch-tempat').value,
        birth_date: document.getElementById('tch-tgl').value || null,
        status: document.getElementById('tch-status').value,
        qr_code: `TCH-NCIPS-${Date.now()}`
    };

    try {
        const { error } = await supabase.from('teachers').insert([payload]);
        if (error) throw error;
        closeAddTeacherModal();
        document.getElementById('form-add-teacher').reset();
        loadTeachers();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerText = 'Simpan Data Guru';
    }
}

export async function updateTeacher(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-update-teacher');
    btn.innerText = "Menyimpan...";
    
    const id = document.getElementById('edit-tch-id').value;
    const payload = {
        full_name: document.getElementById('edit-tch-name').value,
        nuptk: document.getElementById('edit-tch-nuptk').value,
        gender: document.getElementById('edit-tch-jk').value,
        birth_place: document.getElementById('edit-tch-tempat').value,
        birth_date: document.getElementById('edit-tch-tgl').value || null,
        status: document.getElementById('edit-tch-status').value
    };

    try {
        const { error } = await supabase.from('teachers').update(payload).eq('id', id);
        if (error) throw error;
        closeDetailTeacherModal();
        loadTeachers(); 
    } catch (err) {
        alert('Gagal update: ' + err.message);
    } finally {
        btn.innerText = "Simpan";
    }
}

export async function deleteTeacher() {
    const id = document.getElementById('edit-tch-id').value;
    if (!confirm(`Hapus guru ini permanen?`)) return;
    try {
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) throw error;
        closeDetailTeacherModal();
        loadTeachers();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}

// ============================================
// UPLOAD MASSAL GURU VIA CSV
// ============================================
export function downloadTeacherCSVTemplate() {
    // Sesuai pesanan mas bro: Nama, NUPTK, JK, Tempat Lahir, Tanggal Lahir, Status Keaktifan
    const csvContent = "Nama,NUPTK,JK,Tempat Lahir,Tanggal Lahir,Status Keaktifan,URL Foto\nEman Huler,12345678,L,Kupang,1980-05-20,AKTIF,\nMaria Goreti,87654321,P,Ende,1985-08-15,AKTIF,";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Data_Guru_NCIPS.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function handleTeacherCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('upload-teacher-status');
    statusText.classList.remove('hidden', 'text-red-600', 'text-green-600');
    statusText.classList.add('text-amber-600');
    statusText.innerText = "Membaca file CSV Guru...";

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const rows = results.data;
            if(rows.length === 0) return;
            statusText.innerText = `Menyiapkan ${rows.length} data guru...`;
            
            const dataToInsert = rows.map((row, index) => {
                return {
                    full_name: row['Nama'],
                    nuptk: row['NUPTK'],
                    gender: row['JK'],
                    birth_place: row['Tempat Lahir'],
                    birth_date: row['Tanggal Lahir'] || null,
                    status: row['Status Keaktifan'] || 'AKTIF',
                    photo_url: row['URL Foto'] || null,
                    qr_code: `TCH-NCIPS-${Date.now()}-${index}`
                };
            });

            try {
                const { error } = await supabase.from('teachers').insert(dataToInsert);
                if (error) throw error;
                statusText.innerText = `✅ Berhasil mengunggah ${rows.length} guru!`;
                statusText.classList.replace('text-amber-600', 'text-green-600');
                loadTeachers();
            } catch (err) {
                statusText.innerText = `❌ Gagal: ${err.message}`;
                statusText.classList.replace('text-amber-600', 'text-red-600');
            }
            document.getElementById('input-teacher-csv-file').value = '';
        }
    });
}

export function openAddTeacherModal() { document.getElementById('modal-add-teacher').classList.replace('hidden', 'flex'); }
export function closeAddTeacherModal() { document.getElementById('modal-add-teacher').classList.replace('flex', 'hidden'); }
