const ADMIN_SECRET_TOKEN = "ADMIN_SESSION_TOKEN_SECRET_999";
const ADMIN_PASSWORD = "admin123"; // Ganti dengan password admin pilihanmu

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers });
        }

        try {
            // 1. PUBLIC: Status Polling & Chart Summary
            if (path === '/api/status' && request.method === 'GET') {
                const statusRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'polling_status'").first();
                const status = statusRow ? statusRow.value : 'active';
                
                let chartData = null;
                if (status === 'done') {
                    const res = await env.DB.prepare("SELECT pilih_nomor_berapa, COUNT(*) as total FROM votes_result GROUP BY pilih_nomor_berapa").all();
                    chartData = res.results;
                }

                return new Response(JSON.stringify({ status, chartData }), { headers });
            }

            // 2. PUBLIC: Kirim Suara (Submit Vote)
            if (path === '/api/vote' && request.method === 'POST') {
                const { nama, angkatan, kelas, pilih_nomor_berapa } = await request.json();

                // Validasi status polling
                const statusRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'polling_status'").first();
                if (statusRow && statusRow.value === 'done') {
                    return new Response(JSON.stringify({ success: false, message: 'Pemilihan suara telah ditutup!' }), { status: 400, headers });
                }

                // Cek apakah sudah pernah memilih
                const existing = await env.DB.prepare("SELECT id FROM votes_result WHERE nama = ? AND kelas = ?").bind(nama, kelas).first();
                if (existing) {
                    return new Response(JSON.stringify({ success: false, message: 'Anda sudah menggunakan hak pilih sebelumnya!' }), { status: 400, headers });
                }

                await env.DB.prepare(
                    "INSERT INTO votes_result (nama, angkatan, kelas, pilih_nomor_berapa, waktu_pemilihan) VALUES (?, ?, ?, ?, DATETIME('now', '+7 hours'))"
                ).bind(nama, angkatan, kelas, pilih_nomor_berapa).run();

                return new Response(JSON.stringify({ success: true }), { headers });
            }

            // 3. PUBLIC: Login Admin
            if (path === '/api/admin/login' && request.method === 'POST') {
                const { password } = await request.json();
                if (password === ADMIN_PASSWORD) {
                    return new Response(JSON.stringify({ success: true, token: ADMIN_SECRET_TOKEN }), { headers });
                }
                return new Response(JSON.stringify({ success: false, message: 'Password Admin Salah!' }), { status: 401, headers });
            }

            // 4. PROTECTED ADMIN ROUTES (Wajib Bearer Token)
            if (path.startsWith('/api/admin/')) {
                const authHeader = request.headers.get('Authorization');
                if (authHeader !== `Bearer ${ADMIN_SECRET_TOKEN}`) {
                    return new Response(JSON.stringify({ success: false, message: 'Akses Ditolak!' }), { status: 403, headers });
                }

                // Toggle Polling Status (active / done)
                if (path === '/api/admin/toggle-status' && request.method === 'POST') {
                    const { status } = await request.json();
                    await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'polling_status'").bind(status).run();
                    return new Response(JSON.stringify({ success: true, status }), { headers });
                }

                // Fetch Tabel Data Votes (dengan filter)
                if (path === '/api/admin/votes' && request.method === 'GET') {
                    const angkatan = url.searchParams.get('angkatan') || 'All';
                    const kelas = url.searchParams.get('kelas') || 'All';

                    let query = "SELECT * FROM votes_result WHERE 1=1";
                    const params = [];

                    if (angkatan !== 'All') {
                        query += " AND angkatan = ?";
                        params.push(angkatan);
                    }
                    if (kelas !== 'All') {
                        query += " AND kelas = ?";
                        params.push(kelas);
                    }

                    query += " ORDER BY id DESC";

                    const votes = await env.DB.prepare(query).bind(...params).all();
                    return new Response(JSON.stringify(votes.results), { headers });
                }
            }

            return new Response("Not Found", { status: 404 });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
        }
    }
};
