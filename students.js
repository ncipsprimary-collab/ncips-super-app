import { supabaseClient } from './supabase.js';

export async function loadStudents() {
    const container = document.getElementById('student-list-container');
    const totalText = document.getElementById('total-students');
    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Sedang menyinkronkan data...</div>`;

    try {
        const { data: students, error } = await supabaseClient
            .from('students')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        if (!students || students.length === 0) {
            totalText.innerText = "0";
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-500 text-xs font-medium">Belum ada data siswa di database.</div>`;
            return;
        }

        totalText.innerText = students.length;

        let html = '';
        students.forEach((student) => {
            const statusColor = student.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
            const initial = student.full_name ? student.full_name.charAt(0).toUpperCase() : '?';

            html += `
                <div onclick="window.viewStudentDetail('${student.id}')" class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:border-ncipsYellow transition-all">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 text-ncipsNavy flex items-center justify-center font-black text-sm shadow-inner">
                                ${initial}
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-ncipsNavy">${student.full_name}</h3>
                                <p class="text-[10px] text-gray-500 font-medium">Rombel: ${student.rombel || '-'} | NIPD: ${student.nipd || '-'}</p>
                            </div>
                        </div>
                        <span class="${statusColor} px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border border-white">
                            ${student.status || 'AKTIF'}
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

// ============================================
// DETAIL & E-CARD (KOREKSI POSISI DATA SESUAI TEMPLATE 1)
// ============================================
window.viewStudentDetail = async function(studentId) {
    const modal = document.getElementById('modal-detail-student');
    
    document.getElementById('detail-name-title').innerText = "Memuat...";
    document.getElementById('detail-qr-image').src = "";
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const { data: student, error } = await supabaseClient
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (error) throw error;

        // 1. Render Data ke Kartu E-Card (Template 1)
        // Penyesuaian kamar data:
        // - NISN di kartu mengambil dari `student.nisn`
        // - NIPD di kartu mengambil dari `student.nipd`
        // - JK di kartu mengambil dari `student.gender`
        document.getElementById('detail-name-title').innerText = student.full_name;
        document.getElementById('detail-nisn-title').innerText = student.nisn || '-';
        document.getElementById('detail-nipd-title').innerText = student.nipd || '-';
        document.getElementById('detail-jk-title').innerText = student.gender || '-';
        document.getElementById('detail-rombel-title').innerText = `STUDENT - GRADE ${student.rombel || '-'}`;
        document.getElementById('detail-qr-text').innerText = student.qr_code;
        
        // QR Code ukuran besar maksimal 700x700
        document.getElementById('detail-qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${student.qr_code}`;

        // 2. Render Foto Profil (Atau Inisial jika kosong dengan background merah pasfoto)
        const avatarContainer = document.getElementById('detail-avatar-container');
        if (student.photo_url && student.photo_url.trim() !== '') {
            avatarContainer.innerHTML = `<img src="${student.photo_url}" class="w-full h-full rounded-full object-cover">`;
        } else {
            const initial = student.full_name ? student.full_name.charAt(0).toUpperCase() : '?';
            avatarContainer.innerHTML = `<div class="w-full h-full rounded-full bg-red-600 flex items-center justify-center text-white font-black text-2xl shadow-inner">${initial}</div>`;
        }

        // 3. Isi Form Edit
        document.getElementById('edit-id').value = student.id;
        document.getElementById('edit-name').value = student.full_name;
        document.getElementById('edit-nisn').value = student.nisn || '';
        document.getElementById('edit-nipd').value = student.nipd || '';
        document.getElementById('edit-jk').value = student.gender || '';
        document.getElementById('edit-rombel').value = student.rombel || '';
        document.getElementById('edit-status').value = student.status || 'AKTIF';

    } catch (err) {
        alert("Gagal menarik data siswa: " + err.message);
        closeDetailModal();
    }
};

export function closeDetailModal() {
    const modal = document.getElementById('modal-detail-student');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// UPDATE DATA (EDIT)
export async function updateStudent(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-update-student');
    btn.innerText = "Menyimpan...";

    const id = document.getElementById('edit-id').value;
    const payload = {
        full_name: document.getElementById('edit-name').value,
        nisn: document.getElementById('edit-nisn').value,
        nipd: document.getElementById('edit-nipd').value,
        gender: document.getElementById('edit-jk').value,
        rombel: document.getElementById('edit-rombel').value,
        status: document.getElementById('edit-status').value
    };

    try {
        const { error } = await supabaseClient.from('students').update(payload).eq('id', id);
        if (error) throw error;
        
        closeDetailModal();
        loadStudents(); 
    } catch (err) {
        alert('Gagal update: ' + err.message);
    } finally {
        btn.innerText = "Simpan Perubahan";
    }
}

// HAPUS DATA (DELETE)
export async function deleteStudent() {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    
    const confirmDelete = confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN data siswa bernama ${name}?`);
    if (!confirmDelete) return;

    try {
        const { error } = await supabaseClient.from('students').delete().eq('id', id);
        if (error) throw error;
        
        closeDetailModal();
        loadStudents();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}

// ============================================
// TAMBAH & UPLOAD MASSAL
// ============================================
export async function addStudent(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-student');
    btn.innerText = 'Menyimpan...';

    const payload = {
        full_name: document.getElementById('stu-name').value,
        nipd: document.getElementById('stu-nipd').value,
        nisn: document.getElementById('stu-nisn').value,
        rombel: document.getElementById('stu-rombel').value,
        status: document.getElementById('stu-status').value,
        qr_code: `QR-NCIPS-${Date.now()}`
    };

    try {
        const { error } = await supabaseClient.from('students').insert([payload]);
        if (error) throw error;
        
        closeAddStudentModal();
        document.getElementById('form-add-student').reset();
        loadStudents();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerText = 'Simpan Data';
    }
}

export function downloadCSVTemplate() {
    const csvContent = "Nama,NIPD,NISN,JK,Tempat Lahir,Tanggal Lahir,NIK,Agama,Alamat,Rombel,Status,URL Foto\nBudi Santoso,1234,0012345,L,Kupang,2010-12-31,537123,Kristen,Jl. Merdeka No 1,7A,AKTIF,\nSusi Susanti,1235,0012346,P,Atambua,2011-01-15,537124,Katolik,Jl. El Tari,7A,AKTIF,";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Template_Data_Siswa_NCIPS.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('upload-status');
    statusText.classList.remove('hidden', 'text-red-600', 'text-green-600');
    statusText.classList.add('text-blue-600');
    statusText.innerText = "Membaca file CSV...";

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const rows = results.data;
            if(rows.length === 0) return;
            statusText.innerText = `Menyiapkan ${rows.length} data...`;
            
            const dataToInsert = rows.map((row, index) => {
                return {
                    full_name: row['Nama'],
                    nipd: row['NIPD'],
                    nisn: row['NISN'],
                    gender: row['JK'],
                    birth_place: row['Tempat Lahir'],
                    birth_date: row['Tanggal Lahir'] || null,
                    nik: row['NIK'],
                    religion: row['Agama'],
                    address: row['Alamat'],
                    rombel: row['Rombel'],
                    status: row['Status'] || 'AKTIF',
                    photo_url: row['URL Foto'] || null,
                    qr_code: `QR-NCIPS-${Date.now()}-${index}`
                };
            });

            try {
                const { error } = await supabaseClient.from('students').insert(dataToInsert);
                if (error) throw error;
                statusText.innerText = `✅ Berhasil mengunggah ${rows.length} siswa!`;
                statusText.classList.replace('text-blue-600', 'text-green-600');
                loadStudents();
            } catch (err) {
                statusText.innerText = `❌ Gagal: ${err.message}`;
                statusText.classList.replace('text-blue-600', 'text-red-600');
            }
            document.getElementById('input-csv-file').value = '';
        }
    });
}

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
