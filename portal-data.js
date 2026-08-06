/**
 * A.S Matawalle Portal – Frontend data layer
 * Talks to the real backend (Node + SQLite) at /api
 * Works across any phone / browser.
 */
const ASM = {
  /**
   * Resolve API base URL:
   * - When page is served by our Node server → same origin (empty string)
   * - When opened as file:// or other port → try localhost:3000
   */
  get API() {
    if (typeof location === 'undefined') return 'http://localhost:3000';
    // Served by our backend (any host, port 3000) or any path on same server that has /api
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      // Prefer same origin so phones on LAN work with the computer's IP
      return '';
    }
    // file:// protocol
    return 'http://localhost:3000';
  },

  STUDENT_SESSION_KEY: 'asm_student_session',
  TOKEN_KEY: 'asm_token',
  ADMIN_SESSION_KEY: 'asm_admin_session',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) || '';
  },
  setToken(token) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    else localStorage.removeItem(this.TOKEN_KEY);
  },

  async api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const url = this.API + path;
    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (networkErr) {
      const err = new Error(
        'Cannot reach the server. Start it with:  cd backend && node server.js   then open http://localhost:3000'
      );
      err.status = 0;
      err.data = { message: err.message };
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  /* ---------- Auth ---------- */
  async registerStudent({ name, email, phone, password }) {
    try {
      const data = await this.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password })
      });
      this.setToken(data.token);
      this.setStudentSession(data.user);
      return { ok: true, account: data.user };
    } catch (e) {
      return { ok: false, message: e.data?.message || e.message || 'Registration failed' };
    }
  },

  async loginStudent(email, password) {
    try {
      const data = await this.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      this.setToken(data.token);
      this.setStudentSession(data.user);
      return { ok: true, account: data.user };
    } catch (e) {
      return { ok: false, message: e.data?.message || e.message || 'Login failed' };
    }
  },

  async loginAdmin(email, password) {
    try {
      const data = await this.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!data.user || data.user.role !== 'admin') {
        return { ok: false, message: 'Access restricted to authorised admin only.' };
      }
      this.setToken(data.token);
      // Persist admin session (same as student, but mark role)
      const session = {
        loggedIn: true,
        email: data.user.email,
        name: data.user.name,
        role: 'admin',
        id: data.user.id
      };
      localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem('adminLoggedIn', 'true');
      sessionStorage.setItem('adminName', data.user.name);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, message: e.data?.message || e.message || 'Login failed' };
    }
  },

  getAdminSession() {
    try {
      const raw = localStorage.getItem(this.ADMIN_SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.loggedIn && s.role === 'admin') return s;
      }
    } catch (e) {}
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      return { loggedIn: true, name: sessionStorage.getItem('adminName') || 'Admin', role: 'admin' };
    }
    // Also accept a valid JWT that has role admin
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role === 'admin' && (!payload.exp || payload.exp > Date.now() / 1000)) {
          return { loggedIn: true, name: payload.name, email: payload.email, role: 'admin', id: payload.id };
        }
      } catch (e) {}
    }
    return null;
  },

  setStudentSession(user) {
    const session = {
      loggedIn: true,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      id: user.id || '',
      role: user.role || 'student'
    };
    localStorage.setItem(this.STUDENT_SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem('studentLoggedIn', 'true');
    sessionStorage.setItem('studentEmail', user.email);
    sessionStorage.setItem('studentName', user.name);
  },

  getStudentSession() {
    try {
      const raw = localStorage.getItem(this.STUDENT_SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.loggedIn) return s;
      }
    } catch (e) {}
    if (sessionStorage.getItem('studentLoggedIn') === 'true') {
      return {
        loggedIn: true,
        email: sessionStorage.getItem('studentEmail') || '',
        name: sessionStorage.getItem('studentName') || 'Student'
      };
    }
    return null;
  },

  clearStudentSession() {
    localStorage.removeItem(this.STUDENT_SESSION_KEY);
    localStorage.removeItem(this.ADMIN_SESSION_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem('studentLoggedIn');
    sessionStorage.removeItem('studentEmail');
    sessionStorage.removeItem('studentName');
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminName');
  },

  /* ---------- Applications ---------- */
  async submitApplication(data) {
    const res = await this.api('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.application;
  },

  async getMyApplication() {
    try {
      const res = await this.api('/api/applications/me');
      return res.application;
    } catch {
      return null;
    }
  },

  async getAllApplications() {
    try {
      const res = await this.api('/api/applications');
      return res.applications || [];
    } catch (e) {
      console.warn('getAllApplications failed', e);
      return [];
    }
  },

  async approveApplication(appId, lectureStartDateStr) {
    const res = await this.api('/api/applications/' + encodeURIComponent(appId) + '/approve', {
      method: 'POST',
      body: JSON.stringify({ lectureStartDate: lectureStartDateStr })
    });
    return res.application;
  },

  async rejectApplication(appId) {
    await this.api('/api/applications/' + encodeURIComponent(appId) + '/reject', { method: 'POST' });
  },

  async markPaid(appId) {
    await this.api('/api/applications/' + encodeURIComponent(appId) + '/pay', { method: 'POST' });
  },

  findByEmail() { return null; },
  canMakePayment(app) {
    if (!app || app.status !== 'Approved') return { allowed: false, reason: 'Admission not yet approved by Admin.' };
    if (app.paymentStatus === 'Paid') return { allowed: false, reason: 'Payment already completed.' };
    if (!app.paymentAllowedFrom) return { allowed: false, reason: 'Payment window not set yet.' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(app.paymentAllowedFrom);
    if (today < from) {
      return {
        allowed: false,
        reason: 'Payment opens 3 weeks after lectures start. Available from ' + app.paymentAllowedFrom + '.'
      };
    }
    return { allowed: true, reason: '' };
  },
  async syncFromRemote() { return true; },
  async syncToRemote() { return true; },
  getApplications() { return []; },
  getStudents() { return []; },
  getAccounts() { return []; },
  getAlerts() { return []; }
};
