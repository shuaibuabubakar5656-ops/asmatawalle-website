const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function nextAdmissionNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM applications WHERE admission_number IS NOT NULL AND admission_number LIKE ?`
  ).get(`ASM/${year}/%`);
  const num = (row?.c || 0) + 1;
  return `ASM/${year}/${String(num).padStart(3, '0')}`;
}

/** POST /api/applications  – student submits admission form */
router.post('/', (req, res) => {
  try {
    const d = req.body || {};
    if (!d.fullName || !d.email || !d.phone || !d.programme) {
      return res.status(400).json({ ok: false, message: 'Full name, email, phone and programme are required' });
    }
    const id = 'APP-' + Date.now();
    const email = String(d.email).trim().toLowerCase();

    // Link to user if they already registered
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    db.prepare(`
      INSERT INTO applications (
        id, full_name, email, phone, gender, dob, parent, state, lga, address,
        programme, duration, qualification, passport_photo, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `).run(
      id, d.fullName, email, d.phone || null, d.gender || null, d.dob || null,
      d.parent || null, d.state || null, d.lga || null, d.address || null,
      d.programme, d.duration || null, d.qualification || null,
      d.passportPhoto || null, user?.id || null
    );

    db.prepare('INSERT INTO admin_alerts (message) VALUES (?)').run(
      `New admission application from ${d.fullName} (${d.programme}). Please review and approve.`
    );

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.status(201).json({ ok: true, application: mapApp(app) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Failed to submit application' });
  }
});

/** GET /api/applications/me  – logged-in student's application */
router.get('/me', requireAuth, (req, res) => {
  const app = db.prepare(
    'SELECT * FROM applications WHERE email = ? ORDER BY applied_at DESC LIMIT 1'
  ).get(req.user.email);
  res.json({ ok: true, application: app ? mapApp(app) : null });
});

/** GET /api/applications  – admin list all */
router.get('/', requireAdmin, (req, res) => {
  const apps = db.prepare('SELECT * FROM applications ORDER BY applied_at DESC').all();
  res.json({ ok: true, applications: apps.map(mapApp) });
});

/** POST /api/applications/:id/approve */
router.post('/:id/approve', requireAdmin, (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ ok: false, message: 'Application not found' });
    if (app.status === 'Approved') return res.json({ ok: true, application: mapApp(app) });

    const lectureStart = req.body?.lectureStartDate
      ? new Date(req.body.lectureStartDate)
      : new Date();
    const paymentFrom = new Date(lectureStart);
    paymentFrom.setDate(paymentFrom.getDate() + 21);

    const admNo = nextAdmissionNumber();
    db.prepare(`
      UPDATE applications SET
        status = 'Approved',
        admission_number = ?,
        lecture_start_date = ?,
        payment_allowed_from = ?,
        approved_at = datetime('now')
      WHERE id = ?
    `).run(
      admNo,
      lectureStart.toISOString().slice(0, 10),
      paymentFrom.toISOString().slice(0, 10),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json({ ok: true, application: mapApp(updated) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Approve failed' });
  }
});

/** POST /api/applications/:id/reject */
router.post('/:id/reject', requireAdmin, (req, res) => {
  const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ ok: false, message: 'Not found' });
  db.prepare(`UPDATE applications SET status = 'Rejected' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

/** POST /api/applications/:id/pay  – mark paid (student uploads receipt conceptually) */
router.post('/:id/pay', requireAuth, (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ? AND email = ?').get(req.params.id, req.user.email);
  if (!app) return res.status(404).json({ ok: false, message: 'Application not found' });
  db.prepare(`UPDATE applications SET payment_status = 'Paid', paid_at = datetime('now') WHERE id = ?`).run(req.params.id);
  const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  res.json({ ok: true, application: mapApp(updated) });
});

function mapApp(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    dob: row.dob,
    parent: row.parent,
    state: row.state,
    lga: row.lga,
    address: row.address,
    programme: row.programme,
    duration: row.duration,
    qualification: row.qualification,
    passportPhoto: row.passport_photo,
    status: row.status,
    admissionNumber: row.admission_number,
    lectureStartDate: row.lecture_start_date,
    paymentAllowedFrom: row.payment_allowed_from,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    appliedAt: row.applied_at,
    approvedAt: row.approved_at
  };
}

module.exports = router;
