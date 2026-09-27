const ADMIN_USERNAME = "adminmb1";
const ADMIN_PASSWORD = "AdminMB1#2027";

// Helper untuk format response JSON & CORS Header
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS Preflight (OPTIONS)
        if (method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        // 1. API SIMPAN SUARA (/api/vote)
        if (path === "/api/vote" && method === "POST") {
            try {
                const { nama, kelas, angkatan, pilih_nomor_berapa } = await request.json();

                if (!nama || !kelas || !angkatan || !pilih_nomor_berapa) {
                    return jsonResponse({ success: false, message: 'Data wajib diisi!' }, 400);
                }

                const existing = await env.DB.prepare(
                    `SELECT id FROM voting_results WHERE nama = ? AND kelas = ?`
                ).bind(nama, kelas).first();

                if (existing) {
                    return jsonResponse({ success: false, message: 'Nama Anda sudah terdaftar menggunakan hak suara!' }, 400);
                }

                await env.DB.prepare(
                    `INSERT INTO voting_results (nama, kelas, angkatan, pilih_nomor_berapa) VALUES (?, ?, ?, ?)`
                ).bind(nama, kelas, angkatan, pilih_nomor_berapa).run();

                return jsonResponse({ success: true, message: 'Suara Anda berhasil disimpan!' });
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // 2. API LOGIN ADMIN (/api/admin/login)
        if (path === "/api/admin/login" && method === "POST") {
            try {
                const { username, password } = await request.json();
                if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                    return jsonResponse({ success: true, token: "session-admin-authorized" });
                }
                return jsonResponse({ success: false, message: "Kredensial Admin Salah!" }, 401);
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // 3. API STATISTIK PUBLIK (/api/stats/public)
        if (path === "/api/stats/public" && method === "GET") {
            try {
                const { results: total } = await env.DB.prepare(
                    `SELECT pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY pilih_nomor_berapa`
                ).all();

                const { results: angkatan } = await env.DB.prepare(
                    `SELECT angkatan, pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY angkatan, pilih_nomor_berapa`
                ).all();

                return jsonResponse({ total, angkatan });
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // 4. API DATA TABEL ADMIN (/api/admin/votes)
        if (path === "/api/admin/votes" && method === "GET") {
            try {
                const angkatan = url.searchParams.get('angkatan');
                const kelas = url.searchParams.get('kelas');

                let sql = `SELECT id, nama, kelas, angkatan, pilih_nomor_berapa, waktu_pemilihan FROM voting_results WHERE 1=1`;
                const params = [];

                if (angkatan && angkatan !== 'All') {
                    sql += ` AND angkatan = ?`;
                    params.push(angkatan);
                }
                if (kelas && kelas !== 'All') {
                    sql += ` AND kelas = ?`;
                    params.push(kelas);
                }
                sql += ` ORDER BY waktu_pemilihan DESC`;

                const { results } = await env.DB.prepare(sql).bind(...params).all();
                return jsonResponse(results);
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // Jika request bukan diawali /api, sajikan frontend static (index.html, data.txt)
        return env.ASSETS.fetch(request);
    }
            async function fetchAdminTableData() {
            const angkatan = document.getElementById('admin-filter-angkatan').value;
            const containerKelasVisible = !document.getElementById('container-admin-filter-kelas').classList.contains('hidden');
            const kelas = containerKelasVisible ? document.getElementById('admin-filter-kelas').value : 'All';

            const tbody = document.getElementById('admin-table-body');
            const containerUnvoted = document.getElementById('container-unvoted-info');
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading data...</td></tr>';

            try {
                const res = await fetch(`/api/admin/votes?angkatan=${angkatan}&kelas=${kelas}`);
                const rows = await res.json();

                tbody.innerHTML = '';
                if (!rows || rows.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Tidak ada data ditemukan.</td></tr>';
                } else {
                    rows.forEach((row, index) => {
                        const tr = document.createElement('tr');
                        tr.className = "hover:bg-blue-50/50 transition border-b border-slate-100";
                        tr.innerHTML = `
                            <td class="p-4 text-slate-500 font-bold">${index + 1}</td>
                            <td class="p-4 font-bold text-slate-900">${row.nama}</td>
                            <td class="p-4 text-slate-700">${row.kelas}</td>
                            <td class="p-4 text-slate-600">${row.angkatan}</td>
                            <td class="p-4 text-center">
                                <span class="px-2.5 py-1 rounded-full text-xs font-black ${row.pilih_nomor_berapa === 1 ? 'bg-blue-100 text-mbBlue' : 'bg-slate-900 text-white'}">
                                    Paslon 0${row.pilih_nomor_berapa}
                                </span>
                            </td>
                            <td class="p-4 text-slate-500 text-[11px] font-mono">${row.waktu_pemilihan}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }

                // CEK & TAMPILKAN DAFTAR SISWA YANG BELUM MEMILIH (Hanya jika filter kelas spesifik)
                if (kelas !== 'All' && databaseMurid[kelas]) {
                    const totalSiswaKelas = databaseMurid[kelas];
                    const sudahMilihSet = new Set((rows || []).map(r => r.nama));
                    const belumMilihList = totalSiswaKelas.filter(nama => !sudahMilihSet.has(nama));

                    const unvotedListEl = document.getElementById('unvoted-list');
                    const unvotedCountEl = document.getElementById('unvoted-count');
                    const unvotedStatEl = document.getElementById('unvoted-stat');

                    unvotedCountEl.textContent = `${belumMilihList.length} orang`;
                    unvotedStatEl.textContent = `(${sudahMilihSet.size} dari ${totalSiswaKelas.length} siswa sudah memilih)`;
                    unvotedListEl.innerHTML = '';

                    if (belumMilihList.length === 0) {
                        unvotedListEl.innerHTML = '<span class="text-xs text-emerald-700 font-bold flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Luar biasa! Semua siswa di kelas ini sudah menggunakan hak pilihnya.</span>';
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
                tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Gagal terhubung ke database.</td></tr>';
                containerUnvoted.classList.add('hidden');
            }
            }
};
