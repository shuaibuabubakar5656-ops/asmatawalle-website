/**
 * A.S Matawalle Portal API
 * Pure Node.js (built-in modules only) + SQLite
 * No npm install required.
 *
 * Run:  node server.js
 * Open: http://localhost:3000
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'asmatawalle-demo-secret-change-in-production-2026';
const FRONTEND = path.join(__dirname, '..');
const DB_PATH = path.join(__dirname, 'data', 'asmatawalle.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    phone TEXT, gender TEXT, dob TEXT, parent TEXT,
    state TEXT, lga TEXT, address TEXT,
    programme TEXT, duration TEXT, qualification TEXT,
    passport_photo TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    admission_number TEXT UNIQUE,
    lecture_start_date TEXT, payment_allowed_from TEXT,
    payment_status TEXT NOT NULL DEFAULT 'Not Paid',
    paid_at TEXT, applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT, user_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, topic TEXT, file_name TEXT, file_url TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_email TEXT NOT NULL COLLATE NOCASE,
    student_name TEXT, score REAL, grade TEXT,
    published_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS admin_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_apps_email ON applications(email);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Seed admin
const adminEmail = 'shuaibuabubakar5656@gmail.com';
if (!db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)) {
  const hash = hashPassword('Aliyu@2024');
  db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)`)
    .run('Shuaibu Abubakar', adminEmail, '08082917651', hash, 'admin');
  console.log('✓ Admin seeded:', adminEmail);
}
console.log('✓ Database ready:', DB_PATH);

/* ---------- Password + JWT (built-in crypto) ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return header + '.' + body + '.' + sig;
}
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function getAuth(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return verifyToken(h.slice(7));
}

function mapApp(row) {
  if (!row) return null;
  return {
    id: row.id, fullName: row.full_name, email: row.email, phone: row.phone,
    gender: row.gender, dob: row.dob, parent: row.parent, state: row.state, lga: row.lga,
    address: row.address, programme: row.programme, duration: row.duration,
    qualification: row.qualification, passportPhoto: row.passport_photo,
    status: row.status, admissionNumber: row.admission_number,
    lectureStartDate: row.lecture_start_date, paymentAllowedFrom: row.payment_allowed_from,
    paymentStatus: row.payment_status, paidAt: row.paid_at,
    appliedAt: row.applied_at, approvedAt: row.approved_at
  };
}

function nextAdmNo() {
  const year = new Date().getFullYear();
  const row = db.prepare(`SELECT COUNT(*) AS c FROM applications WHERE admission_number LIKE ?`).get(`ASM/${year}/%`);
  return `ASM/${year}/${String((row?.c || 0) + 1).padStart(3, '0')}`;
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    });
    return res.end();
  }

  try {
    /* ===== API ===== */
    if (pathname === '/api/health') {
      return json(res, 200, { ok: true, service: 'A.S Matawalle API', time: new Date().toISOString() });
    }

    // POST /api/auth/register
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readBody(req);
      const { name, email, phone, password } = body;
      if (!name || !email || !phone || !password || password.length < 6) {
        return json(res, 400, { ok: false, message: 'Please fill all fields. Password min 6 characters.' });
      }
      const cleanEmail = String(email).trim().toLowerCase();
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)) {
        return json(res, 409, { ok: false, message: 'An account with this email already exists. Please login.' });
      }
      const hash = hashPassword(password);
      const info = db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)`)
        .run(name.trim(), cleanEmail, String(phone).trim(), hash, 'student');
      const user = { id: Number(info.lastInsertRowid), name: name.trim(), email: cleanEmail, phone: String(phone).trim(), role: 'student' };
      return json(res, 201, { ok: true, token: signToken(user), user });
    }

    // POST /api/auth/login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readBody(req);
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
      if (!row || !verifyPassword(body.password || '', row.password_hash)) {
        return json(res, 401, { ok: false, message: 'Invalid email or password' });
      }
      const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
      return json(res, 200, { ok: true, token: signToken(user), user });
    }

    // GET /api/auth/me
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!auth) return json(res, 401, { ok: false, message: 'Login required' });
      const row = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(auth.id);
      if (!row) return json(res, 404, { ok: false, message: 'User not found' });
      return json(res, 200, { ok: true, user: row });
    }

    // POST /api/applications
    if (pathname === '/api/applications' && req.method === 'POST') {
      const d = await readBody(req);
      if (!d.fullName || !d.email || !d.phone || !d.programme) {
        return json(res, 400, { ok: false, message: 'Full name, email, phone and programme are required' });
      }
      const id = 'APP-' + Date.now();
      const email = String(d.email).trim().toLowerCase();
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      db.prepare(`INSERT INTO applications (
        id, full_name, email, phone, gender, dob, parent, state, lga, address,
        programme, duration, qualification, passport_photo, status, user_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, d.fullName, email, d.phone || null, d.gender || null, d.dob || null,
        d.parent || null, d.state || null, d.lga || null, d.address || null,
        d.programme, d.duration || null, d.qualification || null,
        d.passportPhoto || null, 'Pending', user?.id || null
      );
      db.prepare('INSERT INTO admin_alerts (message) VALUES (?)')
        .run(`New admission application from ${d.fullName} (${d.programme}). Please review and approve.`);
      const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
      return json(res, 201, { ok: true, application: mapApp(app) });
    }

    // GET /api/applications/me
    if (pathname === '/api/applications/me' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!auth) return json(res, 401, { ok: false, message: 'Login required' });
      const app = db.prepare('SELECT * FROM applications WHERE email = ? ORDER BY applied_at DESC LIMIT 1').get(auth.email);
      return json(res, 200, { ok: true, application: app ? mapApp(app) : null });
    }

    // GET /api/applications (admin)
    if (pathname === '/api/applications' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!auth || auth.role !== 'admin') return json(res, 403, { ok: false, message: 'Admin access only' });
      const apps = db.prepare('SELECT * FROM applications ORDER BY applied_at DESC').all();
      return json(res, 200, { ok: true, applications: apps.map(mapApp) });
    }

    // POST /api/applications/:id/approve
    const approveMatch = pathname.match(/^\/api\/applications\/([^/]+)\/approve$/);
    if (approveMatch && req.method === 'POST') {
      const auth = getAuth(req);
      if (!auth || auth.role !== 'admin') return json(res, 403, { ok: false, message: 'Admin access only' });
      const appId = decodeURIComponent(approveMatch[1]);
      const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
      if (!app) return json(res, 404, { ok: false, message: 'Application not found' });
      if (app.status === 'Approved') return json(res, 200, { ok: true, application: mapApp(app) });
      const body = await readBody(req);
      const lectureStart = body.lectureStartDate ? new Date(body.lectureStartDate) : new Date();
      const paymentFrom = new Date(lectureStart);
      paymentFrom.setDate(paymentFrom.getDate() + 21);
      const admNo = nextAdmNo();
      db.prepare(`UPDATE applications SET status='Approved', admission_number=?, lecture_start_date=?,
        payment_allowed_from=?, approved_at=datetime('now') WHERE id=?`)
        .run(admNo, lectureStart.toISOString().slice(0, 10), paymentFrom.toISOString().slice(0, 10), appId);
      const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
      return json(res, 200, { ok: true, application: mapApp(updated) });
    }

    // POST /api/applications/:id/reject
    const rejectMatch = pathname.match(/^\/api\/applications\/([^/]+)\/reject$/);
    if (rejectMatch && req.method === 'POST') {
      const auth = getAuth(req);
      if (!auth || auth.role !== 'admin') return json(res, 403, { ok: false, message: 'Admin access only' });
      const appId = decodeURIComponent(rejectMatch[1]);
      if (!db.prepare('SELECT id FROM applications WHERE id = ?').get(appId)) {
        return json(res, 404, { ok: false, message: 'Not found' });
      }
      db.prepare(`UPDATE applications SET status='Rejected' WHERE id=?`).run(appId);
      return json(res, 200, { ok: true });
    }

    // POST /api/applications/:id/pay
    const payMatch = pathname.match(/^\/api\/applications\/([^/]+)\/pay$/);
    if (payMatch && req.method === 'POST') {
      const auth = getAuth(req);
      if (!auth) return json(res, 401, { ok: false, message: 'Login required' });
      const appId = decodeURIComponent(payMatch[1]);
      const app = db.prepare('SELECT * FROM applications WHERE id = ? AND email = ?').get(appId, auth.email);
      if (!app) return json(res, 404, { ok: false, message: 'Application not found' });
      db.prepare(`UPDATE applications SET payment_status='Paid', paid_at=datetime('now') WHERE id=?`).run(appId);
      const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
      return json(res, 200, { ok: true, application: mapApp(updated) });
    }

    /* ===== Static frontend ===== */
    let filePath = path.join(FRONTEND, pathname === '/' ? 'index.html' : pathname);
    // prevent path traversal
    if (!filePath.startsWith(FRONTEND)) {
      res.writeHead(403); return res.end('Forbidden');
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(FRONTEND, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch (e) {
    console.error(e);
    json(res, 500, { ok: false, message: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✓ A.S Matawalle API + Website running');
  console.log('  → http://localhost:' + PORT);
  console.log('  → Health: http://localhost:' + PORT + '/api/health');
  console.log('  Admin: shuaibuabubakar5656@gmail.com / Aliyu@2024\n');
});
