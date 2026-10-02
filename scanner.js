import { supabaseClient } from './supabase.js';

let html5QrcodeScanner;

export function startScanner() {
    const statusText = document.getElementById('scanner-status');
    const resultBox = document.getElementById('scanner-result');
    
    resultBox.classList.add('hidden');
    statusText.innerText = "Kamera aktif. Arahkan ke QR Code...";

    // Pastikan scanner sebelumnya dibersihkan dulu jika ada
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(err => console.log(err));
    }

    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", 
        { fps: 10, qrbox: { width: 250, height: 250 }, facingMode: "environment" }, 
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

export function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(err => console.log(err));
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    // 1. Matikan kamera sementara saat memproses data
    html5QrcodeScanner.clear();
    
    const statusText = document.getElementById('scanner-status');
    const resultBox = document.getElementById('scanner-result');
    const resultName = document.getElementById('result-name');
    const resultType = document.getElementById('result-type');
    const resultTime = document.getElementById('result-time');
    
    statusText.innerText = "⏳ Memproses data...";

    try {
        let userType = 'SISWA';
        let userName = '';
        
        // 2. Cek apakah QR Code ini milik Siswa
        let { data: student } = await supabaseClient.from('students').select('*').eq('qr_code', decodedText).single();
        
        if (student) {
            userName = student.full_name;
        } else {
            // 3. Jika bukan siswa, cek apakah ini milik Guru
            let { data: teacher } = await supabaseClient.from('teachers').select('*').eq('qr_code', decodedText).single();
            if (teacher) {
                userType = 'GURU';
                userName = teacher.full_name;
            }
        }

        // 4. Jika QR Code bodong / tidak ditemukan
        if (!userName) {
            statusText.innerText = "❌ QR Code Tidak Terdaftar!";
            setTimeout(startScanner, 3000); // Nyalakan kamera lagi setelah 3 detik
            return;
        }

        // 5. Masukkan ke buku absen (Tabel Attendance)
        const { error: insertErr } = await supabaseClient.from('attendance').insert([{
            qr_code: decodedText,
            user_type: userType,
            user_name: userName
        }]);

        if (insertErr) throw insertErr;

        // 6. Tampilkan Hasil Sukses
        statusText.innerText = "✅ Berhasil!";
        resultBox.classList.remove('hidden');
        resultName.innerText = userName;
        resultType.innerText = userType;
        
        // Ambil waktu saat ini (WITA / Jam Indonesia)
        const now = new Date();
        resultTime.innerText = now.toLocaleTimeString('id-ID');

        // Nyalakan kamera lagi setelah 4 detik agar bisa scan siswa berikutnya
        setTimeout(startScanner, 4000);

    } catch (err) {
        statusText.innerText = "⚠️ Terjadi kesalahan: " + err.message;
        setTimeout(startScanner, 3000);
    }
}

function onScanFailure(error) {
    // Abaikan error saat kamera sedang mencari-cari QR Code
}
