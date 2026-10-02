import { supabaseClient } from './supabase.js';

export async function loadTeachers() {
    const container = document.getElementById('teacher-list-container');
    const totalText = document.getElementById('total-teachers');
    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat data guru...</div>`;

    try {
        const { data: teachers, error } = await supabaseClient
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
                            <div class="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-sm shadow-inner">
                                ${initial}
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-ncipsNavy">${tch.full_name}</h3>
                                <p class="text-[10px] text-gray-500 font-medium">NUPTK: ${tch.nuptk || '-'}</p>
                            </div>
                        </div>
                        <span class="${statusColor} px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border border-white">
                            ${tch.status || 'AKTIF'}
                        </span>
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

// BUKA E-CARD GURU
window.viewTeacherDetail = async function(tchId) {
    const modal = document.getElementById('modal-detail-teacher');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const { data: tch, error } = await supabaseClient.from('teachers').select('*').eq('id', tchId).single();
        if (error) throw error;

        // Render Data ke Kartu Guru (Template 2)
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

        // Isi Form Edit
        document.getElementById('edit-tch-id').value = tch.id;
        document.getElementById('edit-tch-name').value = tch.full_name;
        document.getElementById('edit-tch-nuptk').value = tch.nuptk || '';
        document.getElementById('edit-tch-jk').value = tch.gender || '';
        document.getElementById('edit-tch-status').value = tch.status || 'AKTIF';

    } catch (err) {
        alert("Gagal menarik data guru: " + err.message);
        closeDetailTeacherModal();
    }
};

export function closeDetailTeacherModal() {
    const modal = document.getElementById('modal-detail-teacher');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

export async function addTeacher(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-teacher');
    btn.innerText = 'Menyimpan...';

    const payload = {
        full_name: document.getElementById('tch-name').value,
        nuptk: document.getElementById('tch-nuptk').value,
        gender: document.getElementById('tch-jk').value,
        qr_code: `TCH-NCIPS-${Date.now()}` // Kode unik khusus guru
    };

    try {
        const { error } = await supabaseClient.from('teachers').insert([payload]);
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
        status: document.getElementById('edit-tch-status').value
    };

    try {
        const { error } = await supabaseClient.from('teachers').update(payload).eq('id', id);
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
        const { error } = await supabaseClient.from('teachers').delete().eq('id', id);
        if (error) throw error;
        closeDetailTeacherModal();
        loadTeachers();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}

export function openAddTeacherModal() { document.getElementById('modal-add-teacher').classList.replace('hidden', 'flex'); }
export function closeAddTeacherModal() { document.getElementById('modal-add-teacher').classList.replace('flex', 'hidden'); }
