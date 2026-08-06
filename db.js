/**
 * Database layer using Node.js built-in node:sqlite (Node 22+)
 * Zero native deps. Easy to switch to MySQL later.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'asmatawalle.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Enable WAL for better concurrent reads
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      phone TEXT,
      gender TEXT,
      dob TEXT,
      parent TEXT,
      state TEXT,
      lga TEXT,
      address TEXT,
      programme TEXT,
      duration TEXT,
      qualification TEXT,
      passport_photo TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
      admission_number TEXT UNIQUE,
      lecture_start_date TEXT,
      payment_allowed_from TEXT,
      payment_status TEXT NOT NULL DEFAULT 'Not Paid',
      paid_at TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT,
      user_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      topic TEXT,
      file_name TEXT,
      file_url TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_email TEXT NOT NULL COLLATE NOCASE,
      student_name TEXT,
      score REAL,
      grade TEXT,
      published_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_apps_email ON applications(email);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // Seed primary admin if not exists
  const adminEmail = 'shuaibuabubakar5656@gmail.com';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('Aliyu@2024', 10);
    db.prepare(
      `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'admin')`
    ).run('Shuaibu Abubakar', adminEmail, '08082917651', hash);
    console.log('✓ Primary admin seeded:', adminEmail);
  }

  console.log('✓ Database ready:', DB_PATH);
}

init();

module.exports = db;
