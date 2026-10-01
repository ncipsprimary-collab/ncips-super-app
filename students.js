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
            const statusColor = student.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
            
            // Tampilkan foto jika ada, atau bulatan inisial jika kosong
            const photoContent = student.photo_url 
                ? `<img src="${student.photo_url}" class="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200">`
                : `<div class="w-10 h-10 rounded-full bg-slate-100 text-ncipsNavy flex items-center justify-center font-black text-[10px]">${index + 1}</div>`;

            html += `
                <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            ${photoContent}
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

// LOGIKA INPUT 1 SISWA + FOTO
export async function addStudent(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-student');
    btn.innerText = 'Mengunggah Data & Foto...';

    try {
        let photoUrl = null;
        const photoFile = document.getElementById('stu-photo').files[0];

        // Jika ada foto yang dipilih, unggah ke Storage dulu!
        if (photoFile) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `stu_${Date.now()}.${fileExt}`;
            
            // 1. Upload ke Storage Supabase
            const { error: uploadError } = await supabaseClient.storage
                .from('student_photos')
                .upload(fileName, photoFile);

            if (uploadError) throw new Error("Gagal mengunggah foto: " + uploadError.message);

            // 2. Ambil Link Publiknya
            const { data: publicUrlData } = supabaseClient.storage
                .from('student_photos')
                .getPublicUrl(fileName);
            
            photoUrl = publicUrlData.publicUrl;
        }

        // Ambil semua data teks
        const payload = {
            full_name: document.getElementById('stu-name').value,
            nipd: document.getElementById('stu-nipd').value,
            nisn: document.getElementById('stu-nisn').value,
            gender: document.getElementById('stu-jk').value,
            religion: document.getElementById('stu-agama').value,
            birth_place: document.getElementById('stu-tempat').value,
            birth_date: document.getElementById('stu-tgl').value || null,
            nik: document.getElementById('stu-nik').value,
            address: document.getElementById('stu-alamat').value,
            rombel: document.getElementById('stu-rombel').value,
            status: document.getElementById('stu-status').value,
            qr_code: `QR-NCIPS-${Date.now()}`,
            photo_url: photoUrl // Masukkan link foto ke tabel!
        };

        const { error } = await supabaseClient.from('students').insert([payload]);
        if (error) throw error;
        
        alert('Data siswa beserta foto berhasil disimpan!');
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
            if(rows.length === 0) {
                statusText.innerText = "File CSV kosong!";
                statusText.classList.add('text-red-600');
                return;
            }

            statusText.innerText = `Menyiapkan ${rows.length} data siswa...`;
            
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
                    photo_url: row['URL Foto'] || null, // Tangkap URL dari Excel kalau ada
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
                console.error(err);
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
