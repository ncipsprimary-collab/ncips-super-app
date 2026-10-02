import { supabaseClient } from './supabase.js';

let html5QrCode;
let isScanning = false;

export function initScannerUI() {
    const btnStart = document.getElementById('btn-start-camera');
    if (btnStart) {
        btnStart.addEventListener('click', startScanningProcess);
    }
}

export function startScanner() {
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-start-overlay').classList.remove('hidden');
    document.getElementById('scanner-overlay').classList.replace('flex', 'hidden');
    document.getElementById('scanner-status').innerText = "SIAP DIGUNAKAN";
}

async function startScanningProcess() {
    const startOverlay = document.getElementById('scanner-start-overlay');
    const scannerOverlay = document.getElementById('scanner-overlay');
    const statusText = document.getElementById('scanner-status');
    
    startOverlay.classList.add('hidden');
    statusText.innerText = "MEMINTA IZIN KAMERA...";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader"); 
    }

    try {
        await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
            onScanFailure
        );
        isScanning = true;
        scannerOverlay.classList.replace('hidden', 'flex');
        statusText.innerText = "ARAHKAN KAMERA KE QR CODE E-CARD";
    } catch (err) {
        console.error("Kesalahan Kamera:", err);
        startOverlay.classList.remove('hidden');
        statusText.innerText = "GAGAL MENGAKSES KAMERA!";
        alert("Peringatan: Gagal mengakses kamera. Mohon pastikan browser Anda memiliki izin kamera.");
    }
}

export function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            document.getElementById('scanner-overlay').classList.replace('flex', 'hidden');
        }).catch(err => console.log(err));
    }
}

async function onScanSuccess(decodedText) {
    if (!isScanning) return;
    
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
        
        // Cek ke gudang siswa menggunakan maybeSingle (aman dari error 0 data)
        let { data: student } = await supabaseClient
            .from('students')
            .select('*')
            .eq('qr_code', decodedText)
            .maybeSingle();
        
        if (student) {
            userName = student.full_name;
        } else {
            // Cek ke gudang guru
            let { data: teacher } = await supabaseClient
                .from('teachers')
                .select('*')
                .eq('qr_code', decodedText)
                .maybeSingle();
                
            if (teacher) {
                userType = 'GURU';
                userName = teacher.full_name;
            }
        }

        // Jika QR Code tidak terdaftar di database
        if (!userName) {
            statusText.innerText = "❌ QR CODE TIDAK DIKENAL!";
            setTimeout(resumeScanning, 3فل00); // 3 detik lalu scan lagi
            return;
        }

        // Simpan ke tabel attendance (buku absen)
        const { error: insertErr } = await supabaseClient.from('attendance').insert([{
            qr_code: decodedText,
            user_type: userType,
            user_name: userName
        }]);

        if (insertErr) throw insertErr;

        // Tampilkan hasil sukses presensi
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
        console.error(err);
        statusText.innerText = "⚠️ TERJADI GANGGUAN JARINGAN";
        setTimeout(resumeScanning, 3000);
    }
}

function resumeScanning() {
    if (html5QrCode) {
        html5QrCode.resume();
        isScanning = true;
        document.getElementById('scanner-overlay').classList.replace('hidden', 'flex');
        statusText.innerText = "ARAHKAN KAMERA KE QR CODE E-CARD";
    }
}

function onScanFailure(error) {
    // Abaikan gagal baca frame kecil
}
