import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono().basePath('/api');

app.use('*', cors());

const ADMIN_USERNAME = "adminmb1";
const ADMIN_PASSWORD = "AdminMB1#2027";

// --- ENDPOINT API ---

// 1. Simpan Suara
app.post('/vote', async (c) => {
    const { nama, kelas, angkatan, pilih_nomor_berapa } = await c.req.json();

    if (!nama || !kelas || !angkatan || !pilih_nomor_berapa) {
        return c.json({ success: false, message: 'Data wajib diisi!' }, 400);
    }

    const existing = await c.env.DB.prepare(
        `SELECT id FROM voting_results WHERE nama = ? AND kelas = ?`
    ).bind(nama, kelas).first();

    if (existing) {
        return c.json({ success: false, message: 'Nama Anda sudah terdaftar menggunakan hak suara!' }, 400);
    }

    await c.env.DB.prepare(
        `INSERT INTO voting_results (nama, kelas, angkatan, pilih_nomor_berapa) VALUES (?, ?, ?, ?)`
    ).bind(nama, kelas, angkatan, pilih_nomor_berapa).run();

    return c.json({ success: true, message: 'Suara Anda berhasil disimpan!' });
});

// 2. Login Admin
app.post('/admin/login', async (c) => {
    const { username, password } = await c.req.json();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return c.json({ success: true, token: "session-admin-authorized" });
    }
    return c.json({ success: false, message: "Kredensial Admin Salah!" }, 401);
});

// 3. Grafik Statistik Publik
app.get('/stats/public', async (c) => {
    const { results: total } = await c.env.DB.prepare(
        `SELECT pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY pilih_nomor_berapa`
    ).all();

    const { results: angkatan } = await c.env.DB.prepare(
        `SELECT angkatan, pilih_nomor_berapa, COUNT(*) as total FROM voting_results GROUP BY angkatan, pilih_nomor_berapa`
    ).all();

    return c.json({ total, angkatan });
});

// 4. Tabel Admin (Filter)
app.get('/admin/votes', async (c) => {
    const angkatan = c.req.query('angkatan');
    const kelas = c.req.query('kelas');

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

    const { results } = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json(results);
});

// --- ROUTER PENYAMBUNG (Frontend vs Backend) ---
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Jika URL diawali /api, serahkan ke Hono (Backend)
        if (url.pathname.startsWith('/api')) {
            return app.fetch(request, env, ctx);
        }

        // Selain itu, sajikan Frontend Static (index.html, data.txt)
        return env.ASSETS.fetch(request);
    }
};
