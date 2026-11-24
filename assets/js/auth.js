/* ============================================================
   UsahaKita — auth.js
   Autentikasi demo sisi klien (sessionStorage + fallback memori).
   PERINGATAN PRODUKSI: validasi di sini hanya simulasi. Wajib backend,
   password ter-hash (bcrypt/argon2), HTTPS, sesi httpOnly, dan
   pembatasan percobaan login (rate limit + CAPTCHA).
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'uk_session';
  var memSession = null;

  function readSession() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : (memSession || null);
    } catch (e) {
      return memSession || null;
    }
  }

  function writeSession(sess) {
    memSession = sess;
    try {
      if (sess) window.sessionStorage.setItem(KEY, JSON.stringify(sess));
      else window.sessionStorage.removeItem(KEY);
    } catch (e) { /* fallback memori sudah dipakai */ }
  }

  function currentSession() {
    var s = readSession();
    if (!s) return null;
    if (s.role === 'admin') return s;
    // validasi ulang tenant (mis. ditangguhkan setelah login)
    var tenant = db.tenants.get(s.tenantId);
    if (!tenant) return null;
    if (tenant.status === 'Ditangguhkan') return null;
    s.tenantNama = tenant.nama;
    return s;
  }

  function login(identifier, password, peran) {
    var id = String(identifier || '').trim();
    var pass = String(password || '');
    if (!id || !pass) return { ok: false, error: 'Email/username dan kata sandi wajib diisi.' };

    if (peran === 'admin') {
      if (id.toLowerCase() === 'admin' && pass === 'admin') {
        var sessAdmin = {
          role: 'admin', userId: 'admin', nama: 'Admin Platform',
          email: 'admin@usahakita.id', username: 'admin',
          loginAt: new Date().toISOString()
        };
        writeSession(sessAdmin);
        return { ok: true, session: sessAdmin };
      }
      return { ok: false, error: 'Username atau kata sandi salah.' };
    }

    var user = db.users.findByEmail(id);
    if (!user || user.passwordDemo !== pass) {
      return { ok: false, error: 'Email atau kata sandi salah.' };
    }
    var tenant = db.tenants.get(user.tenantId);
    if (!tenant) return { ok: false, error: 'Akun belum terhubung ke usaha. Hubungi dukungan.' };
    if (tenant.status === 'Ditangguhkan') {
      return { ok: false, error: 'Akun usaha Anda sedang ditangguhkan. Hubungi dukungan UsahaKita.' };
    }

    var sess = {
      role: user.peran, userId: user.id, tenantId: user.tenantId,
      nama: user.nama, email: user.email, tenantNama: tenant.nama,
      tenantSlug: tenant.slug, paket: tenant.paket,
      loginAt: new Date().toISOString()
    };
    writeSession(sess);
    return { ok: true, session: sess };
  }

  function logout() {
    writeSession(null);
  }

  function requireAuth(peran) {
    var sess = currentSession();
    if (!sess) {
      writeSession(null);
      location.replace(loginUrl());
      return null;
    }
    if (peran === 'admin' && sess.role !== 'admin') {
      location.replace('../app/index.html');
      return null;
    }
    if (peran === 'pemilik' && sess.role === 'admin') {
      location.replace('../admin/index.html');
      return null;
    }
    return sess;
  }

  function loginUrl() {
    // app/index.html ada di dalam folder app/, admin di folder admin/
    var path = location.pathname;
    if (/\/admin\//.test(path)) return 'index.html';
    return '../masuk.html';
  }

  function tenant() {
    var s = currentSession();
    return s && s.tenantId ? db.tenants.get(s.tenantId) : null;
  }

  function patchSession(patch) {
    var s = readSession();
    if (!s) return null;
    var next = Object.assign({}, s, patch);
    writeSession(next);
    return next;
  }

  function isAdmin() {
    var s = currentSession();
    return !!s && s.role === 'admin';
  }

  /* Dipakai daftar.html: membuat tenant + user pemilik baru */
  function register(payload) {
    var nama = String(payload.nama || '').trim();
    var email = String(payload.email || '').trim().toLowerCase();
    var password = String(payload.password || '');
    if (!nama || !email || !password) return { ok: false, error: 'Data akun belum lengkap.' };
    if (db.users.findByEmail(email)) return { ok: false, error: 'Email sudah terdaftar. Gunakan email lain.' };

    var slug = payload.slug || '';
    var base = slug || 'usaha';
    var n = 1;
    while (db.tenants.slugTaken(slug || base)) {
      slug = base + '-' + n;
      n++;
    }

    var tenantRec = db.tenants.create({
      slug: slug,
      nama: payload.namaUsaha || 'Usaha ' + nama,
      jenis: payload.jenis || 'kuliner',
      pemilik: nama,
      email: email,
      wa: payload.wa || '',
      alamat: payload.alamat || '',
      deskripsi: 'Selamat datang di ' + (payload.namaUsaha || 'usaha kami') + '.',
      logo: '',
      jamOperasional: {
        senin: { buka: true, dari: '08:00', sampai: '20:00' },
        selasa: { buka: true, dari: '08:00', sampai: '20:00' },
        rabu: { buka: true, dari: '08:00', sampai: '20:00' },
        kamis: { buka: true, dari: '08:00', sampai: '20:00' },
        jumat: { buka: true, dari: '08:00', sampai: '20:00' },
        sabtu: { buka: true, dari: '09:00', sampai: '18:00' },
        minggu: { buka: false, dari: '09:00', sampai: '17:00' }
      },
      katalogAktif: true,
      paket: 'free',
      status: 'Menunggu verifikasi',
      dibuatPada: new Date().toISOString()
    });

    var user = db.users.create({
      tenantId: tenantRec.id, nama: nama, email: email,
      passwordDemo: password, peran: 'pemilik'
    });

    db.categories.create({ tenantId: tenantRec.id, nama: 'Umum' });
    db.settings.update(tenantRec.id, { pajakPersen: 0, emailTerverifikasi: false });
    db.systemLogs.add('info', 'Pendaftaran UMKM baru: ' + tenantRec.nama);

    var sess = {
      role: 'pemilik', userId: user.id, tenantId: tenantRec.id,
      nama: user.nama, email: user.email, tenantNama: tenantRec.nama,
      tenantSlug: tenantRec.slug, paket: tenantRec.paket,
      loginAt: new Date().toISOString()
    };
    writeSession(sess);
    return { ok: true, session: sess, tenant: tenantRec };
  }

  window.Auth = {
    login: login,
    logout: logout,
    currentSession: currentSession,
    requireAuth: requireAuth,
    register: register,
    patchSession: patchSession,
    tenant: tenant,
    isAdmin: isAdmin
  };
})();
