import { supabaseClient } from './supabase.js';

export async function loadAttendance() {
    const container = document.getElementById('attendance-list-container');
    const totalSpan = document.getElementById('total-attendance');
    const dateFilter = document.getElementById('filter-date').value;
    const typeFilter = document.getElementById('filter-type').value;

    if (!container) return;

    container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Memuat rekap presensi...</div>`;

    try {
        let query = supabaseClient
            .from('attendance')
            .select('*')
            .order('scan_time', { ascending: false });

        // Filter berdasarkan tanggal jika dipilih
        if (dateFilter) {
            const start = new Date(dateFilter);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateFilter);
            end.setHours(23, 59, 59, 999);
            query = query.gte('scan_time', start.toISOString()).lte('scan_time', end.toISOString());
        }

        // Filter berdasarkan tipe pengguna (SISWA / GURU)
        if (typeFilter && typeFilter !== 'ALL') {
            query = query.eq('user_type', typeFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        totalSpan.innerText = data.length;

        if (data.length === 0) {
            container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-gray-400 text-xs">Belum ada data presensi untuk kriteria ini.</div>`;
            return;
        }

        let html = '';
        data.forEach((item, index) => {
            const timeStr = new Date(item.scan_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = new Date(item.scan_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const badgeColor = item.user_type === 'GURU' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200';

            html += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-xs text-ncipsNavy">${index + 1}</div>
                        <div>
                            <h4 class="font-black text-slate-800 text-sm uppercase">${item.user_name}</h4>
                            <p class="text-[10px] text-gray-500 font-bold">${dateStr}</p>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                        <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${badgeColor}">${item.user_type}</span>
                        <span class="text-xs font-mono font-bold text-slate-700">${timeStr}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="bg-white p-6 rounded-[2rem] text-center text-red-500 text-xs">Gagal memuat data presensi.</div>`;
    }
}

export async function exportAttendanceCSV() {
    const dateFilter = document.getElementById('filter-date').value;
    const typeFilter = document.getElementById('filter-type').value;

    try {
        let query = supabaseClient
            .from('attendance')
            .select('*')
            .order('scan_time', { ascending: false });

        if (dateFilter) {
            const start = new Date(dateFilter);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateFilter);
            end.setHours(23, 59, 59, 999);
            query = query.gte('scan_time', start.toISOString()).lte('scan_time', end.toISOString());
        }

        if (typeFilter && typeFilter !== 'ALL') {
            query = query.eq('user_type', typeFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
            alert("Tidak ada data presensi untuk diexport!");
            return;
        }

        const csvData = data.map((item, idx) => ({
            No: idx + 1,
            Nama: item.user_name,
            Tipe: item.user_type,
            QR_Code: item.qr_code,
            Waktu_Scan: item.scan_time
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Rekap_Presensi_${dateFilter || 'Semua'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error(err);
        alert("Gagal mengunduh CSV.");
    }
}
