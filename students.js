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
            // Tampilan Kartu Diperkaya
            const statusColor = student.status === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
            html += `
                <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-100 text-ncipsNavy flex items-center justify-center font-black text-[10px]">
                                ${index + 1}
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

// LOGIKA INPUT 1 SISWA (MANUAL)
export async function addStudent(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-student');
    btn.innerText = 'Menyimpan...';

    // Ambil semua data dari form
    const payload = {
        full_name: document.getElementById('stu-name').value,
        nipd: document.getElementById('stu-nipd').value,
        nisn: document.getElementById('stu-nisn').value,
        gender: document.getElementById('stu-jk').value,
        religion: document.getElementById('stu-agama').value,
        birth_place: document.getElementById('stu-tempat').value,
        birth_date: document.getElementById('stu-tgl').value || null, // Pastikan format tanggal aman
        nik: document.getElementById('stu-nik').value,
        address: document.getElementById('stu-alamat').value,
        rombel: document.getElementById('stu-rombel').value,
        status: document.getElementById('stu-status').value,
        qr_code: `QR-NCIPS-${Date.now()}` // Buat QR otomatis
    };

    try {
        const { error } = await supabaseClient.from('students').insert([payload]);
        if (error) throw error;
        
        alert('Data siswa berhasil disimpan!');
        closeAddStudentModal();
        document.getElementById('form-add-student').reset();
        loadStudents();
    } catch (err) {
        alert('Gagal menyimpan: ' + err.message);
    } finally {
        btn.innerText = 'Simpan Data';
    }
}

// FUNGSI 1: Download Template CSV
export function downloadCSVTemplate() {
    // Header CSV sesuai format
    const csvContent = "Nama,NIPD,NISN,JK,Tempat Lahir,Tanggal Lahir,NIK,Agama,Alamat,Rombel,Status\nBudi Santoso,1234,0012345,L,Kupang,2010-12-31,537123,Kristen,Jl. Merdeka No 1,7A,AKTIF\nSusi Susanti,1235,0012346,P,Atambua,2011-01-15,537124,Katolik,Jl. El Tari,7A,AKTIF";
    
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

// FUNGSI 2: Upload CSV Massal menggunakan PapaParse
export function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('upload-status');
    statusText.classList.remove('hidden', 'text-red-600', 'text-green-600');
    statusText.classList.add('text-blue-600');
    statusText.innerText = "Membaca file CSV...";

    Papa.parse(file, {
        header: true, // Beri tahu PapaParse baris pertama adalah nama kolom
        skipEmptyLines: true,
        complete: async function(results) {
            const rows = results.data;
            if(rows.length === 0) {
                statusText.innerText = "File CSV kosong!";
                statusText.classList.add('text-red-600');
                return;
            }

            statusText.innerText = `Menyiapkan ${rows.length} data siswa...`;
            
            // Konversi data CSV agar sesuai dengan kolom tabel database kita
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
                    qr_code: `QR-NCIPS-${Date.now()}-${index}` // QR Unik massal
                };
            });

            try {
                // Tembak massal ke Supabase
                const { error } = await supabaseClient.from('students').insert(dataToInsert);
                if (error) throw error;

                statusText.innerText = `✅ Berhasil mengunggah ${rows.length} siswa!`;
                statusText.classList.replace('text-blue-600', 'text-green-600');
                
                // Refresh data di layar
                loadStudents();
            } catch (err) {
                console.error(err);
                statusText.innerText = `❌ Gagal: ${err.message}`;
                statusText.classList.replace('text-blue-600', 'text-red-600');
            }
            
            // Bersihkan input file agar bisa upload ulang file yang sama nanti
            document.getElementById('input-csv-file').value = '';
        }
    });
}

// Kontrol Modal
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
