// ==================== CONFIGURATIONS ====================
const TARGET_LAT = -6.1755180;      // Ganti LAT lokasi sekolah
const TARGET_LNG = 106.6918762;     // Ganti LNG lokasi sekolah
const MAX_RADIUS_METERS = 250;     // Jarak radius aman dalam meter
const MASTER_PIN_TV = "ByPaSsOpTiOn";    // PIN bypass lokasi untuk Smart TV / Laptop panitia

// Master Database Siswa untuk Cross-check Siswa Belum Memilih
const databaseMurid = {
    "X-1": ["Budi Santoso", "Citra Lestari", "Dewi Anggraini", "Eko Prasetyo"],
    "X-2": ["Andi Wijaya", "Siti Aminah", "Rizky Pratama", "Nabila Putri"],
    "XI-1": ["Fajar Hidayat", "Gita Gutawa", "Hendra Setiawan"],
    "XII-1": ["Kevin Sanjaya", "Marcus Gideon"]
};

const paslonNames = {
    1: "PASLON 01 - Ahmad Fauzi & Siti Rahma",
    2: "PASLON 02 - Budi Santoso & Dewi Lestari"
};

let voterData = { nama: '', angkatan: '', kelas: '' };
let selectedPaslon = null;
let adminToken = localStorage.getItem('adminToken') || null;

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    checkLocationLock();
    initApp();
});

async function initApp() {
    const mainContainer = document.getElementById('main-container');

    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        if (data.status === 'done') {
            renderChartUI(mainContainer, data.chartData);
        } else {
            renderVotingUI(mainContainer);
        }
    } catch (err) {
        mainContainer.innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-3xl text-center text-xs font-bold">Gagal terhubung ke backend server.</div>`;
    }
}

// ==================== LOCATION & GEOFENCING ====================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function checkLocationLock() {
    const statusEl = document.getElementById('location-status');
    const btnEl = document.getElementById('btn-check-location');
    const detailBox = document.getElementById('location-detail-box');
    const distEl = document.getElementById('current-distance');
    const iconBox = document.getElementById('location-icon-box');

    if (!navigator.geolocation) {
        statusEl.textContent = "Browser tidak mendukung Geolocation.";
        return;
    }

    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const distance = calculateDistance(position.coords.latitude, position.coords.longitude, TARGET_LAT, TARGET_LNG);
            detailBox.classList.remove('hidden');
            distEl.textContent = distance;

            if (distance <= MAX_RADIUS_METERS) {
                statusEl.textContent = "Lokasi terverifikasi!";
                statusEl.className = "text-emerald-600 text-xs mt-1 font-bold";
                iconBox.className = "w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-emerald-200";
                setTimeout(() => document.getElementById('location-lock-overlay').classList.add('hidden'), 1000);
            } else {
                statusEl.textContent = `Akses Ditolak. Anda berada ${distance}m dari lokasi (Maks ${MAX_RADIUS_METERS}m).`;
                statusEl.className = "text-rose-600 text-xs mt-1 font-bold";
                iconBox.className = "w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-rose-200";
                btnEl.disabled = false;
                btnEl.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Coba Cek Lagi';
            }
        },
        () => {
            btnEl.disabled = false;
            btnEl.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Cek Lokasi Saya';
            statusEl.textContent = "Gagal membaca GPS. Aktifkan Izin Lokasi/GPS.";
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function unlockWithAdminPin() {
    const pin = prompt("Masukkan PIN Master Panitia:");
    if (pin === MASTER_PIN_TV) {
        document.getElementById('location-lock-overlay').classList.add('hidden');
    } else if (pin !== null) {
        alert("PIN Salah!");
    }
}

// ==================== RENDERING UI VOTING & CHART ====================
function renderVotingUI(container) {
    container.innerHTML = `
        <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 border border-slate-100">
            <div class="space-y-4">
                <h2 class="text-base font-bold text-slate-900 border-b pb-2">Data Pemilih</h2>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Angkatan</label>
                    <select id="voter-angkatan" onchange="handleAngkatanChange()" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold outline-none focus:border-mbBlue">
                        <option value="">-- Pilih Angkatan --</option>
                        <option value="X">Angkatan X</option>
                        <option value="XI">Angkatan XI</option>
                        <option value="XII">Angkatan XII</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Kelas</label>
                    <select id="voter-kelas" onchange="handleKelasChange()" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold outline-none focus:border-mbBlue" disabled>
                        <option value="">-- Pilih Angkatan Dulu --</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Lengkap</label>
                    <select id="voter-nama" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold outline-none focus:border-mbBlue" disabled>
                        <option value="">-- Pilih Kelas Dulu --</option>
                    </select>
                </div>
            </div>

            <div class="space-y-3 pt-2">
                <h2 class="text-base font-bold text-slate-900 border-b pb-2">Surat Suara</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" onclick="coblos(1)" class="bg-gradient-to-b from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 text-mbBlueDark p-5 rounded-2xl font-black text-center transition active:scale-95 shadow-sm">
                        <div class="text-xs uppercase text-blue-500 mb-1">PASLON 01</div>
                        <div class="text-sm">Ahmad Fauzi & Siti Rahma</div>
                    </button>
                    <button type="button" onclick="coblos(2)" class="bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border-2 border-slate-200 text-slate-800 p-5 rounded-2xl font-black text-center transition active:scale-95 shadow-sm">
                        <div class="text-xs uppercase text-slate-400 mb-1">PASLON 02</div>
                        <div class="text-sm">Budi Santoso & Dewi Lestari</div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function handleAngkatanChange() {
    const angkatan = document.getElementById('voter-angkatan').value;
    const kelasSelect = document.getElementById('voter-kelas');
    const namaSelect = document.getElementById('voter-nama');

    kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    namaSelect.innerHTML = '<option value="">-- Pilih Kelas Dulu --</option>';
    namaSelect.disabled = true;

    if (!angkatan) {
        kelasSelect.disabled = true;
        return;
    }

    const availableKelas = Object.keys(databaseMurid).filter(k => k.startsWith(angkatan));
    availableKelas.forEach(k => {
        kelasSelect.innerHTML += `<option value="${k}">Kelas ${k}</option>`;
    });
    kelasSelect.disabled = false;
}

function handleKelasChange() {
    const kelas = document.getElementById('voter-kelas').value;
    const namaSelect = document.getElementById('voter-nama');

    namaSelect.innerHTML = '<option value="">-- Pilih Nama --</option>';

    if (!kelas || !databaseMurid[kelas]) {
        namaSelect.disabled = true;
        return;
    }

    databaseMurid[kelas].forEach(nama => {
        namaSelect.innerHTML += `<option value="${nama}">${nama}</option>`;
    });
    namaSelect.disabled = false;
}

function renderChartUI(container, chartData) {
    container.innerHTML = `
        <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 text-center border border-slate-100">
            <span class="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Pemilihan Telah Selesai</span>
            <h2 class="text-xl font-black text-slate-900">Hasil Akhir Perolehan Suara</h2>
            <div class="w-full h-64">
                <canvas id="resultsChart"></canvas>
            </div>
        </div>
    `;

    const ctx = document.getElementById('resultsChart').getContext('2d');
    const labels = (chartData || []).map(item => `Paslon 0${item.pilih_nomor_berapa}`);
    const values = (chartData || []).map(item => item.total);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Suara',
                data: values,
                backgroundColor: ['#2563eb', '#0f172a'],
                borderRadius: 12
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==================== DUAL VERIFIKASI LOGIC ====================
function coblos(paslonNum) {
    const angkatan = document.getElementById('voter-angkatan')?.value;
    const kelas = document.getElementById('voter-kelas')?.value;
    const nama = document.getElementById('voter-nama')?.value;

    if (!angkatan || !kelas || !nama) {
        alert("Lengkapi data Angkatan, Kelas, dan Nama sebelum memilih!");
        return;
    }

    voterData = { nama, angkatan, kelas };
    selectedPaslon = paslonNum;

    document.getElementById('confirm-paslon-title').textContent = paslonNames[paslonNum] || `Paslon 0${paslonNum}`;
    document.getElementById('modal-confirm-vote').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('modal-confirm-vote').classList.add('hidden');
    selectedPaslon = null;
}

async function confirmCoblos() {
    if (!selectedPaslon) return;

    const btnSubmit = document.getElementById('btn-submit-vote');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

    closeConfirmModal();

    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nama: voterData.nama,
                angkatan: voterData.angkatan,
                kelas: voterData.kelas,
                pilih_nomor_berapa: selectedPaslon
            })
        });

        const res = await response.json();
        if (res.success) {
            alert(`Terima kasih ${voterData.nama}, suara Anda berhasil tersimpan!`);
            initApp();
        } else {
            alert(res.message || "Gagal menyimpan suara.");
        }
    } catch (err) {
        alert("Gagal terhubung ke server.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Ya, Yakin';
    }
}

// ==================== ADMIN DASHBOARD DYNAMIC INJECTION ====================
async function promptAdminLogin() {
    const password = prompt("Masukkan Password Admin:");
    if (!password) return;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (data.success) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            injectAdminDashboard();
            fetchAdminTableData();
        } else {
            alert("Password Admin Salah!");
        }
    } catch (err) {
        alert("Gagal melakukan login admin.");
    }
}

function injectAdminDashboard() {
    const root = document.getElementById('admin-portal-root');
    root.innerHTML = `
        <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 p-4 overflow-y-auto">
            <div class="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
                <div class="flex justify-between items-center border-b pb-4">
                    <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <i class="fa-solid fa-user-shield text-mbBlue"></i> Panel Kontrol Admin
                    </h3>
                    <button onclick="closeAdminDashboard()" class="bg-slate-100 hover:bg-slate-200 text-slate-600 w-8 h-8 rounded-full font-bold transition">✕</button>
                </div>

                <!-- POLLING STATUS TOGGLE -->
                <div class="bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 border border-slate-200">
                    <div>
                        <p class="text-xs font-bold text-slate-800">Status Sesi Polling</p>
                        <p class="text-[11px] text-slate-500">Kunci pemilihan untuk menampilkan chart hasil secara otomatis ke pemilih.</p>
                    </div>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button onclick="setPollingStatus('active')" class="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">Buka Polling</button>
                        <button onclick="setPollingStatus('done')" class="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">Tutup & Tampil Chart</button>
                    </div>
                </div>

                <!-- FILTER & REFRESH BAR -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <span class="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                            <i class="fa-solid fa-filter text-mbBlue"></i> Filter Data:
                        </span>
                        <select id="admin-filter-angkatan" onchange="handleAdminAngkatanChange()" class="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-mbBlue">
                            <option value="All">Semua Angkatan</option>
                            <option value="X">Angkatan X</option>
                            <option value="XI">Angkatan XI</option>
                            <option value="XII">Angkatan XII</option>
                        </select>
                        <div id="container-admin-filter-kelas" class="hidden">
                            <select id="admin-filter-kelas" onchange="fetchAdminTableData()" class="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-mbBlue"></select>
                        </div>
                    </div>
                    <button onclick="fetchAdminTableData()" class="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95">
                        <i class="fa-solid fa-rotate-right text-mbBlue"></i> Refresh Tabel
                    </button>
                </div>

                <!-- UNVOTED INFO BOX -->
                <div id="container-unvoted-info" class="hidden bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-900 flex items-center gap-2">
                            <i class="fa-solid fa-user-clock text-amber-600"></i> Siswa Belum Memilih: <span id="unvoted-count" class="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[11px] font-black">0</span>
                        </span>
                        <span id="unvoted-stat" class="text-[11px] text-amber-700 font-medium"></span>
                    </div>
                    <div id="unvoted-list" class="flex flex-wrap gap-1.5 pt-1"></div>
                </div>

                <!-- VOTES TABLE -->
                <div class="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                                <th class="p-3">#</th>
                                <th class="p-3">Nama Siswa</th>
                                <th class="p-3">Kelas</th>
                                <th class="p-3">Angkatan</th>
                                <th class="p-3 text-center">Pilihan</th>
                                <th class="p-3">Waktu</th>
                            </tr>
                        </thead>
                        <tbody id="admin-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function handleAdminAngkatanChange() {
    const angkatan = document.getElementById('admin-filter-angkatan').value;
    const containerKelas = document.getElementById('container-admin-filter-kelas');
    const selectKelas = document.getElementById('admin-filter-kelas');

    if (angkatan === 'All') {
        containerKelas.classList.add('hidden');
    } else {
        selectKelas.innerHTML = '<option value="All">Semua Kelas</option>';
        Object.keys(databaseMurid).filter(k => k.startsWith(angkatan)).forEach(k => {
            selectKelas.innerHTML += `<option value="${k}">Kelas ${k}</option>`;
        });
        containerKelas.classList.remove('hidden');
    }
    fetchAdminTableData();
}

async function fetchAdminTableData() {
    const angkatan = document.getElementById('admin-filter-angkatan').value;
    const containerKelasVisible = !document.getElementById('container-admin-filter-kelas').classList.contains('hidden');
    const kelas = containerKelasVisible ? document.getElementById('admin-filter-kelas').value : 'All';

    const tbody = document.getElementById('admin-table-body');
    const containerUnvoted = document.getElementById('container-unvoted-info');
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading data...</td></tr>';

    try {
        const res = await fetch(`/api/admin/votes?angkatan=${angkatan}&kelas=${kelas}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const rows = await res.json();

        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Tidak ada data ditemukan.</td></tr>';
        } else {
            rows.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-blue-50/50 transition border-b border-slate-100";
                tr.innerHTML = `
                    <td class="p-3 text-slate-500 font-bold">${index + 1}</td>
                    <td class="p-3 font-bold text-slate-900">${row.nama}</td>
                    <td class="p-3 text-slate-700">${row.kelas}</td>
                    <td class="p-3 text-slate-600">${row.angkatan}</td>
                    <td class="p-3 text-center">
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-black ${row.pilih_nomor_berapa === 1 ? 'bg-blue-100 text-mbBlue' : 'bg-slate-900 text-white'}">
                            Paslon 0${row.pilih_nomor_berapa}
                        </span>
                    </td>
                    <td class="p-3 text-slate-500 text-[11px] font-mono">${row.waktu_pemilihan}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Cross-check Unvoted Students
        if (kelas !== 'All' && databaseMurid[kelas]) {
            const totalSiswaKelas = databaseMurid[kelas];
            const sudahMilihSet = new Set((rows || []).map(r => r.nama));
            const belumMilihList = totalSiswaKelas.filter(nama => !sudahMilihSet.has(nama));

            document.getElementById('unvoted-count').textContent = `${belumMilihList.length} orang`;
            document.getElementById('unvoted-stat').textContent = `(${sudahMilihSet.size} dari ${totalSiswaKelas.length} siswa sudah memilih)`;

            const unvotedListEl = document.getElementById('unvoted-list');
            unvotedListEl.innerHTML = '';

            if (belumMilihList.length === 0) {
                unvotedListEl.innerHTML = '<span class="text-xs text-emerald-700 font-bold flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Semua siswa di kelas ini sudah memilih.</span>';
            } else {
                belumMilihList.forEach(nama => {
                    const badge = document.createElement('span');
                    badge.className = "bg-white border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1";
                    badge.innerHTML = `<i class="fa-regular fa-clock text-[10px] text-amber-600"></i> ${nama}`;
                    unvotedListEl.appendChild(badge);
                });
            }

            containerUnvoted.classList.remove('hidden');
        } else {
            containerUnvoted.classList.add('hidden');
        }

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-rose-500">Gagal memuat data admin.</td></tr>';
        containerUnvoted.classList.add('hidden');
    }
}

async function setPollingStatus(status) {
    try {
        const res = await fetch('/api/admin/toggle-status', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            alert(`Status polling berhasil diubah menjadi: ${status.toUpperCase()}`);
            initApp();
        }
    } catch (err) {
        alert("Gagal mengubah status polling.");
    }
}

function closeAdminDashboard() {
    document.getElementById('admin-portal-root').innerHTML = '';
}
