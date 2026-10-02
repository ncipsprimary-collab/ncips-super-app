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
    const resultBox = document.getElementById('scanner-result');
    const startOverlay = document.getElementById('scanner-start-overlay');
    const scannerOverlay = document.getElementById('scanner-overlay');
    const statusText = document.getElementById('scanner-status');

    if (resultBox) resultBox.classList.add('hidden');
    if (startOverlay) startOverlay.classList.remove('hidden');
    if (scannerOverlay) scannerOverlay.classList.replace('flex', 'hidden');
    if (statusText) statusText.innerText = "SIAP DIGUNAKAN";
}

async function startScanningProcess() {
    const startOverlay = document.getElementById('scanner-start-overlay');
    const scannerOverlay = document.getElementById('scanner-overlay');
    const statusText = document.getElementById('scanner-status');
    
    if (startOverlay) startOverlay.classList.add('hidden');
    if (statusText) statusText.innerText = "MEMINTA IZIN KAMERA...";

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
        if (scannerOverlay) scannerOverlay.classList.replace('hidden', 'flex');
        if (statusText) statusText.innerText = "ARAHKAN KAMERA KE QR CODE E-CARD";
    } catch (err) {
        console.error("Kesalahan Kamera:", err);
        if (startOverlay) startOverlay.classList.remove('hidden');
        if (statusText) statusText.innerText = "GAGAL MENGAKSES KAMERA!";
        alert("Peringatan: Gagal mengakses kamera. Mohon pastikan browser Anda memiliki izin kamera.");
    }
}

export function stopScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
            const scannerOverlay = document.getElementById('scanner-overlay');
            if (scannerOverlay) scannerOverlay.classList.replace('flex', 'hidden');
        }).catch(err => console.log(err));
    }
}

async function onScanSuccess(decodedText) {
    if (!isScanning) return;
    
    isScanning = false;
    try {
        await html5QrCode.pause();
    } catch (e) {
        console.log(e);
    }
    
    const scannerOverlay = document.getElementById('scanner-overlay');
    if (scannerOverlay) scannerOverlay.classList.replace('flex', 'hidden');
    
    const statusText = document.getElementById('scanner-status');
    const resultBox = document.getElementById('scanner-result');
    const resultName = document.getElementById('result-name');
    const resultType = document.getElementById('result-type');
    const resultTime = document.getElementById('result-time');
    
    if (statusText) statusText.innerText = "⏳ MEMPROSES DATA KE SERVER...";

    try {
        let userType = 'SISWA';
        let userName = '';
        
        // 1. Cek ke gudang siswa
        let { data: student } = await supabaseClient
            .from('students')
            .select('*')
            .eq('qr_code', decodedText)
            .maybeSingle();
        
        if (student) {
            userName = student.full_name;
        } else {
            // 2. Cek ke gudang guru
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

        // Jika QR Code tidak terdaftar di database mana pun
        if (!userName) {
            if (statusText) statusText.innerText = "❌ QR CODE TIDAK DIKENAL!";
            setTimeout(resumeScanning, 3000);
            return;
        }

        // 3. Simpan ke tabel attendance (buku absen)
        const { error: insertErr } = await supabaseClient.from('attendance').insert([{
            qr_code: decodedText,
            user_type: userType,
            user_name: userName
        }]);

        if (insertErr) throw insertErr;

        // Jika berhasil
        if (statusText) statusText.innerText = "✅ PRESENSI BERHASIL!";
        if (resultBox) resultBox.classList.remove('hidden');
        if (resultName) resultName.innerText = userName;
        if (resultType) resultType.innerText = userType;
        
        const now = new Date();
        if (resultTime) resultTime.innerText = now.toLocaleTimeString('id-ID');

        setTimeout(() => {
            if (resultBox) resultBox.classList.add('hidden');
            resumeScanning();
        }, 3000);

    } catch (err) {
        console.error("Detail Error:", err);
        // Tampilkan pesan error asli dari Supabase di layar agar terlihat jelas
        if (statusText) statusText.innerText = `⚠️ Gagal: ${err.message || "Kesalahan Server"}`;
        setTimeout(resumeScanning, 4000);
    }
}

function resumeScanning() {
    if (html5QrCode) {
        try {
            html5QrCode.resume();
            isScanning = true;
            const scannerOverlay = document.getElementById('scanner-overlay');
            const statusText = document.getElementById('scanner-status');
            if (scannerOverlay) scannerOverlay.classList.replace('hidden', 'flex');
            if (statusText) statusText.innerText = "ARAHKAN KAMERA KE QR CODE E-CARD";
        } catch (e) {
            console.log(e);
        }
    }
}

function onScanFailure(error) {
    // Abaikan frame kosong saat mencari QR
}
