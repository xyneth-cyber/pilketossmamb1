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

/*export default {
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
                console.log("Nama:", nama, "Kelas:", kelas, "angkatan:", angkatan, "Paslon:", pilih_nomor_berapa);

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

                let sql = `SELECT id, nama, kelas, angkatan, waktu_pemilihan FROM voting_results WHERE 1=1`;
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
};*/

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Helper untuk response JSON + Headers CORS
        const jsonResponse = (data, status = 200) => {
            return new Response(JSON.stringify(data), {
                status,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        };

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
                const body = await request.json().catch(() => ({}));
                const { nama, kelas, angkatan, pilih_nomor_berapa } = body;

                // Periksa field mana yang hilang/kosong
                const missing = [];
                if (!nama) missing.push("nama");
                if (!kelas) missing.push("kelas");
                if (!angkatan) missing.push("angkatan");
                if (!pilih_nomor_berapa) missing.push("pilih_nomor_berapa");

                if (missing.length > 0) {
                    return jsonResponse({ 
                        success: false, 
                        message: `Data tidak terbaca di server. Field kosong: ${missing.join(", ")}` 
                    }, 400);
                }

                // Cek apakah nama dan kelas sudah pernah coblos
                const existing = await env.DB.prepare(
                    `SELECT id FROM voting_results WHERE nama = ? AND kelas = ?`
                ).bind(nama, kelas).first();

                if (existing) {
                    return jsonResponse({ 
                        success: false, 
                        message: 'Nama Anda sudah terdaftar menggunakan hak suara!' 
                    }, 400);
                }

                // Simpan suara ke database D1
                await env.DB.prepare(
                    `INSERT INTO voting_results (nama, kelas, angkatan, pilih_nomor_berapa) VALUES (?, ?, ?, ?)`
                ).bind(nama, kelas, angkatan, Number(pilih_nomor_berapa)).run();

                return jsonResponse({ success: true, message: 'Suara Anda berhasil disimpan!' });
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // 2. API LOGIN ADMIN (/api/admin/login)
        if (path === "/api/admin/login" && method === "POST") {
            try {
                const { username, password } = await request.json();
                const adminUser = env.ADMIN_USERNAME || "adminmb1";
                const adminPass = env.ADMIN_PASSWORD || "AdminLogin";

                if (username === adminUser && password === adminPass) {
                    return jsonResponse({ success: true, token: "session-admin-authorized" });
                }
                return jsonResponse({ success: false, message: "Kredensial Admin Salah!" }, 401);
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }
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
        /*if (path === "/api/stats/public" && method === "GET") {
            try {
                const { results: total } = await env.DB.prepare(
                    `SELECT pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY pilih_nomor_berapa`
                ).all();

                const { results: angkatan } = await env.DB.prepare(
                    `SELECT angkatan, pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY angkatan, pilih_nomor_berapa`
                ).all();

                //return jsonResponse({ total, angkatan });
                return jsonResponse({ 
                    success: true, 
                    total: query.results || [] 
                });
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }*/
        if (path === "/api/stats/public" && method === "GET") {
            try {
                const { results } = await env.DB.prepare(
                    `SELECT pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY pilih_nomor_berapa`
                ).all();

                return jsonResponse({ 
                    success: true, 
                    total: results || [] 
                });
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
                return jsonResponse(results || []);
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // API KHUSUS LIST PEMILIH REALTIME (/api/voters)
        if (path === "/api/voters" && method === "GET") {
            try {
                const { results } = await env.DB.prepare(
                    `SELECT nama, kelas FROM voting_results ORDER BY id DESC`
                ).all();

                return jsonResponse({ 
                    success: true, 
                    voters: results || [] 
                });
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // DELETE VOTE BY ID (KHUSUS ADMIN)
        if (path === "/api/admin/delete-vote" && method === "DELETE") {
            try {
                const { searchParams } = new URL(request.url);
                const id = searchParams.get("id");

                if (!id) {
                    return jsonResponse({ success: false, message: "ID data tidak ditemukan" }, 400);
                }

                await env.DB.prepare(`DELETE FROM voting_results WHERE id = ?`).bind(id).run();

                return jsonResponse({ 
                    success: true, 
                    message: "Data suara berhasil dihapus" 
                });
            } catch (err) {
                return jsonResponse({ success: false, message: err.message }, 500);
            }
        }

        // Menyajikan file statis frontend (index.html, data.txt, dll)
        return env.ASSETS.fetch(request);
    }
};
