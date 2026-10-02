import { supabaseClient } from './supabase.js';

let html5QrCode;
let isScanning = false;

// 1. Fungsi ini dipanggil saat aplikasi dimuat untuk mengaktifkan tombol izin
export function initScannerUI() {
    const btnStart = document.getElementById('btn-start-camera');
    if (btnStart) {
        btnStart.addEventListener('click', startScanningProcess);
    }
}

// 2. Fungsi ini berjalan otomatis saat kita pindah ke Tab Scanner
export function startScanner() {
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-start-overlay').classList.remove('hidden'); // Munculkan Tombol Izin
    document.getElementById('scanner-overlay').classList.replace('flex', 'hidden'); // Sembunyikan Laser
    document.getElementById('scanner-status').innerText = "SIAP DIGUNAKAN";
}

// 3. Fungsi memanggil kamera (HANYA AKTIF SAAT TOMBOL DIKETUK)
async function startScanningProcess() {
    const startOverlay = document.getElementById('scanner-start-overlay');
    const scannerOverlay = document.getElementById('scanner-overlay');
    const statusText = document.getElementById('scanner-status');
    
    startOverlay.classList.add('hidden');
    statusText.innerText = "MEMINTA IZIN KAMERA...";

    if (!html5QrCode) {
        // Kita panggil inti mesin pemindai tanpa UI bawaannya yang jelek
        html5QrCode = new Html5Qrcode("qr-reader"); 
    }

    try {
        await html5QrCode.start(
            { facingMode: "environment" }, // Paksa pakai kamera belakang
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
            onScanFailure
        );
        isScanning = true;
        scannerOverlay.classList.replace('hidden', 'flex'); // Nyalakan animasi laser!
        statusText.innerText = "ARAHKAN KAMERA KE QR CODE E-CARD";
    } catch (err) {
        console.error("Kesalahan Kamera:", err);
        startOverlay.classList.remove('hidden');
        statusText.innerText = "GAGAL MENGAKSES KAMERA!";
        alert("Peringatan: Gagal mengakses kamera. Mohon pastikan browser (Chrome/Safari) memiliki izin mengakses kamera HP Anda.");
    }
}

// 4. Matikan kamera saat pindah menu
export function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            document.getElementById('scanner-overlay').classList.replace('flex', 'hidden');
        }).catch(err => console.log(err));
    }
}

// 5. Proses Sukses Membaca QR Code
async function onScanSuccess(decodedText) {
    if (!isScanning) return;
    
    // Jeda kamera sebentar agar tidak scan berulang kali
    isScanning = false;
    html5QrCode.pause();
    document.getElementById('scanner-overlay').classList.replace('flex', 'hidden');
    
    const statusText = document.getElementById('scanner-status');
    const resultBox = document.getElementById('scanner-result');
    const resultName = document.getElementById('result-name');
    const resultType = document.getElementById('result-type');
    const resultTime = document.getElementById('result-time');
    
    statusText.innerText = "⏳ MEMPROSES DATA KE SERVER...";

    try {
        let userType = 'SISWA';
        let userName = '';
        
        // Cek ke gudang siswa
        let { data: student } = await supabaseClient.from('students').select('*').eq('qr_code', decodedText).single();
        
        if (student) {
            userName = student.full_name;
        } else {
            // Cek ke gudang guru
            let { data: teacher } = await supabaseClient.from('teachers').select('*').eq('qr_code', decodedText).single();
            if (teacher) {
                userType = 'GURU';
                userName = teacher.full_name;
            }
        }

        if (!userName) {
            statusText.innerText = "❌ QR CODE TIDAK DIKENAL!";
            setTimeout(resumeScanning, 2500);
            return;
        }

        // Simpan data masuk ke buku absen
        const { error: insertErr } = await supabaseClient.from('attendance').insert([{
            qr_code: decodedText,
            user_type: userType,
            user_name: userName
        }]);

        if (insertErr) throw insertErr;

        // Munculkan notifikasi hijau sukses
        statusText.innerText = "✅ PRESENSI BERHASIL!";
        resultBox.classList.remove('hidden');
        resultName.innerText = userName;
        resultType.innerText = userType;
        
        const now = new Date();
        resultTime.innerText = now.toLocaleTimeString('id-ID');

        // Kembalikan ke mode scan setelah 3 detik
        setTimeout(() => {
            resultBox.classList.add('hidden');
            resumeScanning();
        }, 3000);

    } catch (err) {
        statusText.innerText = "⚠️ TERJADI GANGGUAN JARINGAN";
        setTimeout(resumeScanning, 3000);
    }
}

// Lanjutkan pemindaian kembali
function resumeScanning() {
    if (html5QrCode) {
        html5QrCode.resume();
        isScanning = true;
        document.getElementById('scanner-overlay').classList.replace('hidden', 'flex');
        document.getElementById('scanner-status').innerText = "ARAHKAN KAMERA KE QR CODE E-CARD";
    }
}

function onScanFailure(error) {
    // Mesin diam saat gagal membaca (normal)
}
