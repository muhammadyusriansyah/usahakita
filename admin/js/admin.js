/* ============================================================
   admin/js/admin.js — Admin platform: login, shell, ringkasan,
   akun UMKM, paket langganan, kategori bisnis.
   ============================================================ */
(function () {
  'use strict';

  UK.adminModules = UK.adminModules || {};
  UK.admRegister = function (name, mod) { UK.adminModules[name] = mod; };

  var ROUTES = {
    ringkasan: 'Ringkasan',
    akun: 'Akun UMKM',
    paket: 'Paket Langganan',
    kategori: 'Kategori Bisnis',
    sistem: 'Pemantauan Sistem',
    laporan: 'Laporan Platform',
    dukungan: 'Dukungan Pengguna',
    setelan: 'Pengaturan Admin'
  };

  var rootEl = null;
  var session = null;

  function uang(n) { return UK.rupiah(n); }
  function sum(arr, fn) { return arr.reduce(function (a, x) { return a + (Number(fn(x)) || 0); }, 0); }
  function parseHash() {
    var raw = String(location.hash || '').replace(/^#\/?/, '');
    var qi = raw.indexOf('?');
    var name = (qi >= 0 ? raw.slice(0, qi) : raw) || 'ringkasan';
    var query = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    }
    return { name: name, query: query };
  }

  function navigate(hash) {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('adminTahun').textContent = new Date().getFullYear();

    var loginView = document.getElementById('loginView');
    var shell = document.getElementById('adminShell');
    var alertBox = document.getElementById('adminAlert');
    var form = document.getElementById('adminLogin');
    var submit = document.getElementById('adminSubmit');
    var userInput = document.getElementById('adminUser');
    var passInput = document.getElementById('adminPass');

    var existing = Auth.currentSession();
    if (existing && existing.role === 'admin') { masuk(existing); }
    else { userInput.focus(); }

    document.getElementById('adminPwToggle').addEventListener('click', function () {
      var show = passInput.type === 'password';
      passInput.type = show ? 'text' : 'password';
      this.textContent = show ? 'Sembunyikan' : 'Lihat';
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alertBox.className = 'form-alert';
      var u = userInput.value.trim();
      var p = passInput.value;
      if (!u || !p) {
        alertBox.textContent = 'Username dan kata sandi wajib diisi.';
        alertBox.className = 'form-alert show';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Memverifikasi…';
      setTimeout(function () {
        var res = Auth.login(u, p, 'admin');
        submit.disabled = false;
        submit.textContent = 'Masuk';
        if (!res.ok) {
          alertBox.textContent = 'Username atau kata sandi salah.';
          alertBox.className = 'form-alert show';
          var card = document.querySelector('#loginView .auth-card');
          card.classList.remove('shake');
          void card.offsetWidth;
          card.classList.add('shake');
          passInput.value = '';
          passInput.focus();
          return;
        }
        masuk(res.session);
      }, 700);
    });

    function masuk(sess) {
      session = sess;
      loginView.classList.add('hidden');
      shell.classList.remove('hidden');
      document.getElementById('adminName').textContent = sess.nama;
      document.getElementById('adminAvatar').textContent = UK.inisial(sess.nama);

      if (!location.hash) location.hash = '#/ringkasan';
      renderRoute();
      refreshChrome();

      window.addEventListener('hashchange', renderRoute);

      document.getElementById('adminLogout').addEventListener('click', function () {
        UK.confirmDialog('Keluar dari admin platform?', { okText: 'Keluar' }).then(function (yes) {
          if (!yes) return;
          Auth.logout();
          location.replace('index.html');
        });
      });

      var menuBtn = document.getElementById('adminMenuBtn');
      menuBtn.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.getElementById('adminBackdrop').addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });

      document.getElementById('adminSearch').addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var q = this.value.trim();
        this.blur();
        navigate('#/akun' + (q ? '?q=' + encodeURIComponent(q) : ''));
      });

      var notifBtn = document.getElementById('adminNotifBtn');
      notifBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var panel = document.getElementById('adminNotifPanel');
        var hidden = panel.classList.toggle('hidden');
        notifBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      });
      document.addEventListener('click', function (e) {
        var panel = document.getElementById('adminNotifPanel');
        if (!panel.classList.contains('hidden') && !panel.contains(e.target)) panel.classList.add('hidden');
      });
    }
  });

  /* ---------------- chrome ---------------- */
  function refreshChrome() {
    if (!session) return;
    var tiketBaru = db.tickets.listAll().filter(function (t) { return t.status === 'Baru'; });
    var menunggu = db.tenants.list().filter(function (t) { return t.status === 'Menunggu verifikasi'; });
    var badge = document.getElementById('badgeTiket');
    badge.textContent = tiketBaru.length;
    badge.classList.toggle('hidden', tiketBaru.length === 0);
    var dot = document.getElementById('adminNotifDot');
    dot.textContent = Math.min(9, tiketBaru.length + menunggu.length);
    dot.classList.toggle('hidden', tiketBaru.length + menunggu.length === 0);

    var rows = [];
    if (tiketBaru.length) {
      rows.push('<div class="tiny muted" style="font-weight:700;padding:2px 4px 5px">Tiket baru</div>');
      tiketBaru.slice(0, 4).forEach(function (t) {
        var ten = db.tenants.get(t.tenantId);
        rows.push('<a href="#/dukungan" style="display:block;padding:6px 4px;color:var(--ink);font-size:11.5px">🎧 ' +
          UK.escapeHTML(t.subjek) + '<div class="tiny muted">' + UK.escapeHTML(ten ? ten.nama : '-') + '</div></a>');
      });
    }
    if (menunggu.length) {
      rows.push('<div class="tiny muted" style="font-weight:700;padding:2px 4px 5px">Menunggu verifikasi</div>');
      menunggu.slice(0, 4).forEach(function (t) {
        rows.push('<a href="#/akun" style="display:block;padding:6px 4px;color:var(--ink);font-size:11.5px">🏬 ' +
          UK.escapeHTML(t.nama) + '</a>');
      });
    }
    if (!rows.length) rows.push('<div class="tiny muted" style="padding:12px;text-align:center">Tidak ada notifikasi.</div>');
    document.getElementById('adminNotifPanel').innerHTML = rows.join('');
    document.querySelectorAll('#adminNotifPanel a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.getElementById('adminNotifPanel').classList.add('hidden');
      });
    });
  }

  function renderRoute() {
    if (!session) return;
    var r = parseHash();
    if (!ROUTES[r.name]) { location.hash = '#/ringkasan'; return; }
    rootEl = document.getElementById('adminRoot');
    document.getElementById('adminCrumb').textContent = ROUTES[r.name];
    document.querySelectorAll('[data-anav]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-anav') === r.name);
    });
    document.body.classList.remove('nav-open');
    document.getElementById('adminMenuBtn').setAttribute('aria-expanded', 'false');
    document.title = ROUTES[r.name] + ' — Admin UsahaKita';
    rootEl.innerHTML = '';
    refreshChrome();

    var ctx = {
      session: session, query: r.query, navigate: navigate, refresh: refreshChrome,
      setTitle: function (t) { document.title = t + ' — Admin UsahaKita'; }
    };
    var mod = UK.adminModules[r.name];
    if (!mod) {
      rootEl.innerHTML = '<div class="card empty-note"><span class="ico">🚧</span><b>' + ROUTES[r.name] + ' segera hadir</b></div>';
      return;
    }
    try { mod.render(rootEl, ctx); }
    catch (err) {
      console.error(err);
      rootEl.innerHTML = '<div class="card empty-note"><span class="ico">⚠️</span><b>Gagal memuat modul</b><span>' +
        UK.escapeHTML(err.message) + '</span></div>';
    }
    window.scrollTo({ top: 0 });
  }

  /* ============================================================
     MODUL: RINGKASAN
     ============================================================ */
  UK.admRegister('ringkasan', {
    render: function (root, ctx) {
      var tenants = db.tenants.list();
      var trxAll = db.transactions.listAll();
      var plans = db.plans.list();
      var cats = db.businessCategories.list();
      var catMap = {};
      cats.forEach(function (c) { catMap[c.id] = c.nama; });

      var totalTenant = tenants.length;
      var since30 = Date.now() - 30 * 86400000;
      var aktifSet = {};
      trxAll.forEach(function (t) {
        if (new Date(t.waktu).getTime() >= since30) aktifSet[t.tenantId] = true;
      });
      var aktif30 = Object.keys(aktifSet).length;
      var totalTrx = trxAll.length;

      var planMap = {};
      plans.forEach(function (p) { planMap[p.id] = p; });
      var paidTenants = tenants.filter(function (t) {
        var p = planMap[t.paket];
        return p && p.harga > 0 && t.status !== 'Ditangguhkan';
      });
      var mrr = sum(paidTenants, function (t) { return planMap[t.paket].harga; });

      var now = new Date();
      function bulanSama(iso, ref) {
        var d = new Date(iso);
        return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
      }
      var lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      var berbayarBaruIni = paidTenants.filter(function (t) { return bulanSama(t.dibuatPada, now); }).length;
      var berbayarBaruLalu = paidTenants.filter(function (t) { return bulanSama(t.dibuatPada, lastMonth); }).length;
      var tren = berbayarBaruLalu ? Math.round(((berbayarBaruIni - berbayarBaruLalu) / berbayarBaruLalu) * 100) : (berbayarBaruIni ? 100 : 0);

      /* pertumbuhan UMKM 6 bulan (kumulatif) */
      var growth = [];
      for (var m = 5; m >= 0; m--) {
        var akhir = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
        var jumlah = tenants.filter(function (t) { return new Date(t.dibuatPada) <= akhir; }).length;
        growth.push({ label: UK.BULAN[akhir.getMonth()], value: jumlah });
      }

      /* distribusi paket */
      var dist = plans.map(function (p) {
        return { label: p.nama, value: tenants.filter(function (t) { return t.paket === p.id; }).length };
      });

      /* jenis usaha */
      var jenisCount = {};
      tenants.forEach(function (t) { jenisCount[t.jenis] = (jenisCount[t.jenis] || 0) + 1; });
      var jenisList = Object.keys(jenisCount).map(function (k) {
        return { label: catMap[k] || k, value: jenisCount[k] };
      }).sort(function (a, b) { return b.value - a.value; }).slice(0, 5);
      var maxJenis = jenisList.length ? jenisList[0].value : 1;

      /* indikator PRD */
      var katalogAktif = tenants.filter(function (t) { return t.katalogAktif && t.status !== 'Ditangguhkan'; }).length;
      var waClicks = db.waClicks.listAll();
      var wa30 = waClicks.filter(function (w) { return new Date(w.waktu).getTime() >= since30; }).length;
      var trxPerTenant = {};
      trxAll.forEach(function (t) { trxPerTenant[t.tenantId] = (trxPerTenant[t.tenantId] || 0) + 1; });
      var kembali = tenants.filter(function (t) { return (trxPerTenant[t.id] || 0) >= 2; }).length;
      var konversi = totalTenant ? Math.round((paidTenants.length / totalTenant) * 1000) / 10 : 0;

      var terbaru = tenants.slice().sort(function (a, b) {
        return new Date(b.dibuatPada) - new Date(a.dibuatPada);
      }).slice(0, 5);

      var logs = db.systemLogs.list().sort(function (a, b) {
        return new Date(b.waktu) - new Date(a.waktu);
      }).slice(0, 6);

      function statusPill(s) {
        if (s === 'Aktif') return '<span class="status success">Aktif</span>';
        if (s === 'Ditangguhkan') return '<span class="status danger">Ditangguhkan</span>';
        return '<span class="status pending">Menunggu verifikasi</span>';
      }

      root.innerHTML =
        '<div class="page-head"><div><h1>Ringkasan Platform</h1>' +
        '<div class="sub">' + UK.tanggalPanjang(now) + ' · seluruh ekosistem UsahaKita</div></div>' +
        '<div class="page-actions"><a class="btn btn-light btn-sm" href="#/akun">Kelola UMKM</a>' +
        '<a class="btn btn-primary btn-sm" href="#/laporan">Laporan platform</a></div></div>' +

        '<div class="kpi-grid">' +
        '<div class="stat-card"><div class="stat-label">Total UMKM</div>' +
        '<div class="stat-value">' + totalTenant + '</div><div class="stat-sub">' +
        tenants.filter(function (t) { return t.status === 'Aktif'; }).length + ' aktif · ' +
        tenants.filter(function (t) { return t.status === 'Menunggu verifikasi'; }).length + ' menunggu</div></div>' +
        '<div class="stat-card"><div class="stat-label">UMKM aktif 30 hari</div>' +
        '<div class="stat-value">' + aktif30 + '</div><div class="stat-sub">' +
        (totalTenant ? Math.round((aktif30 / totalTenant) * 100) : 0) + '% dari total</div></div>' +
        '<div class="stat-card"><div class="stat-label">Transaksi diproses</div>' +
        '<div class="stat-value">' + UK.formatAngka(totalTrx) + '</div><div class="stat-sub">seluruh tenant</div></div>' +
        '<div class="stat-card"><div class="stat-label">Pendapatan langganan</div>' +
        '<div class="stat-value">' + uang(mrr) + '</div>' +
        '<div class="stat-sub ' + (tren >= 0 ? 'green' : 'red') + '">' + (tren >= 0 ? '▲' : '▼') + ' ' + Math.abs(tren) +
        '% tenant berbayar baru vs bulan lalu</div></div>' +
        '</div>' +

        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h3>Pertumbuhan UMKM</h3><span class="tiny muted">6 bulan · kumulatif</span></div>' +
        '<div class="panel-body">' + UK.svgLine(growth, { height: 190 }) + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Distribusi paket</h3></div>' +
        '<div class="panel-body"><div style="display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center">' +
        '<div>' + UK.svgDonut(dist, { size: 150, stroke: 18 }) + '</div>' +
        '<div class="legend" style="display:grid;gap:7px;margin:0">' +
        dist.map(function (d, i) {
          return '<div class="li"><span class="sw" style="background:' + UK.PALET[i % UK.PALET.length] + '"></span>' +
            '<span class="grow">' + UK.escapeHTML(d.label) + '</span><b>' + d.value + ' UMKM</b></div>';
        }).join('') + '</div></div></div></div>' +
        '</div>' +

        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h3>Jenis usaha terbanyak</h3></div><div class="panel-body">' +
        (jenisList.length ? jenisList.map(function (j) {
          return '<div class="bar-row"><span class="ellipsis">' + UK.escapeHTML(j.label) + '</span>' +
            '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(6, Math.round((j.value / maxJenis) * 100)) + '%"></div></div>' +
            '<b class="tiny">' + j.value + '</b></div>';
        }).join('') : '<div class="empty-note">Belum ada data.</div>') +
        '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Indikator PRD</h3></div><div class="panel-body">' +
        indikator('Katalog dipublikasikan', katalogAktif + ' / ' + totalTenant + ' UMKM', totalTenant ? (katalogAktif / totalTenant) * 100 : 0) +
        indikator('Klik WhatsApp', UK.formatAngka(waClicks.length) + ' total · ' + wa30 + ' (30 hari)', Math.min(100, waClicks.length * 4)) +
        indikator('Pengguna yang kembali', kembali + ' UMKM dengan ≥2 transaksi', totalTenant ? (kembali / totalTenant) * 100 : 0) +
        indikator('Konversi Free → berbayar', konversi + '%', konversi) +
        '</div></div></div>' +

        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h3>UMKM terbaru</h3><a href="#/akun" class="btn btn-xs btn-light">Lihat semua</a></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Usaha</th><th>Paket</th><th>Daftar</th><th>Status</th></tr></thead><tbody>' +
        terbaru.map(function (t) {
          return '<tr><td><b>' + UK.escapeHTML(t.nama) + '</b><div class="tiny muted">' + UK.escapeHTML(t.pemilik) + '</div></td>' +
            '<td>' + UK.escapeHTML((planMap[t.paket] || {}).nama || t.paket) + '</td>' +
            '<td class="nowrap">' + UK.tanggalIndo(t.dibuatPada) + '</td>' +
            '<td>' + statusPill(t.status) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +

        '<div class="panel"><div class="panel-head"><h3>Log aktivitas</h3></div><div class="panel-body">' +
        (logs.length ? logs.map(function (l) {
          var ico = l.level === 'error' ? '🔴' : (l.level === 'peringatan' ? '🟡' : '🟢');
          return '<div class="row top" style="gap:8px;padding:6px 0;border-bottom:1px solid #f3f5f9">' +
            '<span>' + ico + '</span><div class="grow"><div class="small">' + UK.escapeHTML(l.pesan) + '</div>' +
            '<div class="tiny muted">' + UK.tanggalIndo(l.waktu, true) + ' · ' + UK.escapeHTML(l.level) + '</div></div></div>';
        }).join('') : '<div class="empty-note">Belum ada log.</div>') +
        '</div></div></div>';
    }
  });

  function indikator(label, value, pct) {
    var p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    return '<div style="margin-bottom:11px"><div class="row between"><span class="small">' + UK.escapeHTML(label) + '</span>' +
      '<b class="tiny">' + UK.escapeHTML(value) + '</b></div>' +
      '<div class="bar-track" style="margin-top:4px"><div class="bar-fill" style="width:' + p + '%"></div></div></div>';
  }

  /* ============================================================
     MODUL: AKUN UMKM
     ============================================================ */
  var A = { q: '', status: '', paket: '', sort: 'baru', page: 1 };
  var PER_PAGE = 8;

  UK.admRegister('akun', {
    render: function (root, ctx) {
      if (ctx.query && ctx.query.q != null && ctx.query.q !== A.q) { A.q = ctx.query.q; A.page = 1; }
      var tenants = db.tenants.list();
      var plans = db.plans.list();
      var planMap = {};
      plans.forEach(function (p) { planMap[p.id] = p; });
      var cats = db.businessCategories.list();
      var catMap = {};
      cats.forEach(function (c) { catMap[c.id] = c.nama; });

      var list = tenants.filter(function (t) {
        if (A.status && t.status !== A.status) return false;
        if (A.paket && t.paket !== A.paket) return false;
        if (A.q) {
          var q = A.q.toLowerCase();
          if (String(t.nama).toLowerCase().indexOf(q) < 0 &&
            String(t.pemilik).toLowerCase().indexOf(q) < 0 &&
            String(t.email).toLowerCase().indexOf(q) < 0 &&
            String(t.slug).toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      }).sort(function (a, b) {
        if (A.sort === 'nama') return String(a.nama).localeCompare(String(b.nama));
        if (A.sort === 'paket') return String(a.paket).localeCompare(String(b.paket));
        return new Date(b.dibuatPada) - new Date(a.dibuatPada);
      });

      var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      if (A.page > pages) A.page = pages;
      var slice = list.slice((A.page - 1) * PER_PAGE, A.page * PER_PAGE);

      function pill(s) {
        if (s === 'Aktif') return '<span class="status success">Aktif</span>';
        if (s === 'Ditangguhkan') return '<span class="status danger">Ditangguhkan</span>';
        return '<span class="status pending">Menunggu verifikasi</span>';
      }

      root.innerHTML =
        '<div class="page-head"><div><h1>Akun UMKM</h1>' +
        '<div class="sub">' + list.length + ' akun pada filter ini · ' + tenants.length + ' total</div></div>' +
        '<div class="page-actions"><button class="btn btn-light btn-sm" type="button" id="akunCsv">Ekspor CSV</button></div></div>' +

        '<div class="panel"><div class="panel-head"><div class="toolbar grow">' +
        '<div class="search-box"><span class="ico">🔍</span>' +
        '<input type="search" id="akunCari" placeholder="Cari usaha, pemilik, email…" value="' + UK.escapeHTML(A.q) + '" aria-label="Cari akun"></div>' +
        '<select id="akunStatus" aria-label="Filter status"><option value="">Semua status</option>' +
        ['Aktif', 'Menunggu verifikasi', 'Ditangguhkan'].map(function (s) {
          return '<option' + (A.status === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select>' +
        '<select id="akunPaket" aria-label="Filter paket"><option value="">Semua paket</option>' +
        plans.map(function (p) {
          return '<option value="' + p.id + '"' + (A.paket === p.id ? ' selected' : '') + '>' + UK.escapeHTML(p.nama) + '</option>';
        }).join('') + '</select>' +
        '<select id="akunSort" aria-label="Urutkan">' +
        [['baru', 'Terbaru'], ['nama', 'Nama A–Z'], ['paket', 'Paket']].map(function (s) {
          return '<option value="' + s[0] + '"' + (A.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
        }).join('') + '</select>' +
        '</div></div>' +
        (slice.length ?
          '<div class="table-wrap"><table class="data"><thead><tr>' +
          '<th>Usaha</th><th>Pemilik</th><th>Kategori</th><th>Paket</th><th>Terdaftar</th><th>Status</th><th>Katalog</th><th>Aksi</th>' +
          '</tr></thead><tbody>' +
          slice.map(function (t) {
            var paid = planMap[t.paket] && planMap[t.paket].harga > 0;
            return '<tr>' +
              '<td><div class="cell-main"><span class="thumb">' + (t.logo && /^data:/.test(t.logo) ? '<img src="' + t.logo + '" alt="">' : UK.escapeHTML(t.logo || '🏪')) + '</span>' +
              '<div><div class="t">' + UK.escapeHTML(t.nama) + '</div><div class="s">' + UK.escapeHTML(t.slug) + '</div></div></div></td>' +
              '<td>' + UK.escapeHTML(t.pemilik) + '</td>' +
              '<td>' + UK.escapeHTML(catMap[t.jenis] || t.jenis) + '</td>' +
              '<td>' + (paid ? '<b>' : '') + UK.escapeHTML((planMap[t.paket] || {}).nama || t.paket) + (paid ? '</b>' : '') + '</td>' +
              '<td class="nowrap">' + UK.tanggalIndo(t.dibuatPada) + '</td>' +
              '<td>' + pill(t.status) + '</td>' +
              '<td>' + (t.katalogAktif ? '<span class="status success">Aktif</span>' : '<span class="status">Nonaktif</span>') + '</td>' +
              '<td><div class="action-btns">' +
              '<button class="btn btn-xs btn-light" type="button" data-akun-detail="' + t.id + '">Detail</button>' +
              '<button class="btn btn-xs btn-light" type="button" data-akun-paket="' + t.id + '">Paket</button>' +
              (t.status === 'Ditangguhkan'
                ? '<button class="btn btn-xs btn-success" type="button" data-akun-aktif="' + t.id + '">Aktifkan</button>'
                : '<button class="btn btn-xs btn-danger" type="button" data-akun-suspend="' + t.id + '">Tangguhkan</button>') +
              '</div></td></tr>';
          }).join('') + '</tbody></table></div>' + UK.pager(list.length, A.page, PER_PAGE)
          : '<div class="empty-note"><span class="ico">🏬</span><b>Tidak ada akun</b><span>Ubah filter pencarian.</span></div>') +
        '</div>';

      var cari = document.getElementById('akunCari');
      cari.addEventListener('input', UK.debounce(function () { A.q = cari.value; A.page = 1; rerender(ctx); }, 220));
      document.getElementById('akunStatus').addEventListener('change', function () { A.status = this.value; A.page = 1; rerender(ctx); });
      document.getElementById('akunPaket').addEventListener('change', function () { A.paket = this.value; A.page = 1; rerender(ctx); });
      document.getElementById('akunSort').addEventListener('change', function () { A.sort = this.value; A.page = 1; rerender(ctx); });
      document.getElementById('akunCsv').addEventListener('click', function () {
        var rows = [['Usaha', 'Pemilik', 'Email', 'Kategori', 'Paket', 'Terdaftar', 'Status', 'Katalog']];
        list.forEach(function (t) {
          rows.push([t.nama, t.pemilik, t.email, catMap[t.jenis] || t.jenis,
            (planMap[t.paket] || {}).nama || t.paket, UK.tanggalIndo(t.dibuatPada), t.status, t.katalogAktif ? 'Aktif' : 'Nonaktif']);
        });
        UK.downloadCSV('akun-umkm-' + UK.tanggalInput(new Date()), rows);
        UK.toast('Data akun diekspor.', 'ok');
      });
      UK.bindPager(root, function (n) { A.page = n; rerender(ctx); });

      function rerender(c) {
        var hadFocus = document.activeElement && document.activeElement.id === 'akunCari';
        ctx.navigate('#/akun');
        if (hadFocus) {
          var el = document.getElementById('akunCari');
          if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }
      }

      root.querySelectorAll('[data-akun-detail]').forEach(function (b) {
        b.addEventListener('click', function () { modalDetail(b.getAttribute('data-akun-detail'), ctx); });
      });
      root.querySelectorAll('[data-akun-paket]').forEach(function (b) {
        b.addEventListener('click', function () { modalPaket(b.getAttribute('data-akun-paket'), ctx); });
      });
      root.querySelectorAll('[data-akun-suspend]').forEach(function (b) {
        b.addEventListener('click', function () {
          var t = db.tenants.get(b.getAttribute('data-akun-suspend'));
          UK.confirmDialog('Tangguhkan <b>' + UK.escapeHTML(t.nama) + '</b>?<br><span class="tiny muted">Pemilik tidak bisa login dan katalog otomatis dinonaktifkan.</span>',
            { danger: true, okText: 'Tangguhkan' }).then(function (yes) {
              if (!yes) return;
              db.tenants.update(t.id, { status: 'Ditangguhkan', katalogAktif: false });
              db.systemLogs.add('peringatan', 'Tenant ditangguhkan: ' + t.nama);
              UK.toast('Akun ditangguhkan.', 'ok');
              ctx.navigate('#/akun');
              ctx.refresh();
            });
        });
      });
      root.querySelectorAll('[data-akun-aktif]').forEach(function (b) {
        b.addEventListener('click', function () {
          var t = db.tenants.get(b.getAttribute('data-akun-aktif'));
          UK.confirmDialog('Aktifkan kembali <b>' + UK.escapeHTML(t.nama) + '</b>?', { okText: 'Aktifkan' }).then(function (yes) {
            if (!yes) return;
            db.tenants.update(t.id, { status: 'Aktif', katalogAktif: true });
            db.systemLogs.add('info', 'Tenant diaktifkan kembali: ' + t.nama);
            UK.toast('Akun diaktifkan kembali.', 'ok');
            ctx.navigate('#/akun');
            ctx.refresh();
          });
        });
      });
    }
  });

  function modalDetail(id, ctx) {
    var t = db.tenants.get(id);
    if (!t) return;
    var prods = db.products.list({ tenantId: id });
    var trx = db.transactions.list({ tenantId: id });
    var users = db.users.list({ tenantId: id });
    var plan = db.plans.get(t.paket);
    var cat = db.businessCategories.get(t.jenis);
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="adTitle">' +
      '<div class="modal-head"><h3 id="adTitle">' + UK.escapeHTML(t.nama) + '</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="grid-2" style="gap:8px">' +
      '<div class="stat-card" style="padding:10px"><div class="stat-label">Produk</div><div class="stat-value" style="font-size:17px">' + prods.length + '</div></div>' +
      '<div class="stat-card" style="padding:10px"><div class="stat-label">Transaksi</div><div class="stat-value" style="font-size:17px">' + trx.length + '</div></div>' +
      '</div>' +
      '<div class="card" style="padding:11px;margin-top:10px">' +
      baris('Pemilik', t.pemilik) + baris('Email', t.email) + baris('WhatsApp', '+' + t.wa) +
      baris('Kategori', cat ? cat.nama : t.jenis) + baris('Alamat', t.alamat || '-') +
      baris('Paket', plan ? plan.nama : t.paket) + baris('Status', t.status) +
      baris('Katalog', t.katalogAktif ? 'Aktif' : 'Nonaktif') +
      baris('Terdaftar', UK.tanggalIndo(t.dibuatPada)) +
      baris('Pengguna', users.map(function (u) { return u.nama + ' (' + u.peran + ')'; }).join(', ')) +
      '</div>' +
      '<p class="small muted" style="margin-top:10px">' + UK.escapeHTML(t.deskripsi || '') + '</p>' +
      '</div><div class="modal-foot">' +
      '<a class="btn btn-light btn-sm" href="../toko/index.html?u=' + encodeURIComponent(t.slug) + '" target="_blank" rel="noopener">Lihat katalog</a>' +
      '<button class="btn btn-primary btn-sm" type="button" data-x>Tutup</button></div></div>';
    function baris(k, v) {
      return '<div class="row between" style="padding:3px 0;gap:10px"><span class="tiny muted nowrap">' + k + '</span>' +
        '<span class="small" style="text-align:right">' + UK.escapeHTML(v == null ? '-' : v) + '</span></div>';
    }
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    wrap.querySelectorAll('[data-x]').forEach(function (b) {
      b.addEventListener('click', function () { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); });
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); } });
  }

  function modalPaket(id, ctx) {
    var t = db.tenants.get(id);
    if (!t) return;
    var plans = db.plans.list();
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="mpTitle">' +
      '<div class="modal-head"><h3 id="mpTitle">Ubah paket — ' + UK.escapeHTML(t.nama) + '</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body"><div class="field"><label for="mpPick">Paket</label><select id="mpPick">' +
      plans.map(function (p) {
        return '<option value="' + p.id + '"' + (t.paket === p.id ? ' selected' : '') + '>' +
          UK.escapeHTML(p.nama) + ' — ' + (p.harga ? UK.rupiah(p.harga) + '/bulan' : 'gratis') + '</option>';
      }).join('') + '</select></div>' +
      '<p class="tiny muted">Batas paket: produk &amp; pengguna mengikuti pengaturan paket di menu Paket Langganan.</p></div>' +
      '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="mpSave">Simpan paket</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('#mpSave').addEventListener('click', function () {
      var p = wrap.querySelector('#mpPick').value;
      db.tenants.update(t.id, { paket: p });
      db.systemLogs.add('info', 'Paket ' + t.nama + ' diubah menjadi ' + p);
      close();
      UK.toast('Paket diperbarui.', 'ok');
      ctx.navigate('#/akun');
      ctx.refresh();
    });
  }

  /* ============================================================
     MODUL: PAKET LANGGANAN
     ============================================================ */
  UK.admRegister('paket', {
    render: function (root, ctx) {
      var plans = db.plans.list();
      var tenants = db.tenants.list();

      root.innerHTML =
        '<div class="page-head"><div><h1>Paket Langganan</h1>' +
        '<div class="sub">Perubahan di sini langsung tampil di landing page dan pengaturan pemilik.</div></div></div>' +
        '<div class="plan-grid">' +
        plans.map(function (p) {
          var jumlahTenant = tenants.filter(function (t) { return t.paket === p.id; }).length;
          return '<div class="plan' + (p.id === 'pro' ? ' featured' : '') + '">' +
            (p.id === 'pro' ? '<span class="tag">PALING POPULER</span>' : '') +
            '<div class="field"><label for="pk-' + p.id + '-nama">Nama paket</label>' +
            '<input type="text" id="pk-' + p.id + '-nama" value="' + UK.escapeHTML(p.nama) + '" maxlength="24"></div>' +
            '<div class="field"><label for="pk-' + p.id + '-harga">Harga per bulan (Rp)</label>' +
            '<input type="number" id="pk-' + p.id + '-harga" min="0" step="1000" value="' + p.harga + '"></div>' +
            '<div class="grid-3" style="gap:8px">' +
            '<div class="field"><label for="pk-' + p.id + '-produk">Produk</label>' +
            '<input type="number" id="pk-' + p.id + '-produk" min="1" step="1" value="' + p.batas.produk + '"></div>' +
            '<div class="field"><label for="pk-' + p.id + '-pengguna">Pengguna</label>' +
            '<input type="number" id="pk-' + p.id + '-pengguna" min="1" step="1" value="' + p.batas.pengguna + '"></div>' +
            '<div class="field"><label for="pk-' + p.id + '-cabang">Cabang</label>' +
            '<input type="number" id="pk-' + p.id + '-cabang" min="1" step="1" value="' + p.batas.cabang + '"></div>' +
            '</div>' +
            '<div class="tiny muted" style="margin-bottom:10px">' + jumlahTenant + ' UMKM memakai paket ini</div>' +
            '<button class="btn btn-primary btn-sm" type="button" data-savepaket="' + p.id + '">Simpan paket</button>' +
            '</div>';
        }).join('') + '</div>' +
        '<p class="tiny muted center" style="margin-top:14px">Catatan: harga dan batas penggunaan masih draf, ditentukan setelah validasi pasar.</p>';

      root.querySelectorAll('[data-savepaket]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-savepaket');
          var nama = document.getElementById('pk-' + id + '-nama').value.trim();
          var harga = Math.max(0, Number(document.getElementById('pk-' + id + '-harga').value) || 0);
          var produk = Math.max(1, parseInt(document.getElementById('pk-' + id + '-produk').value, 10) || 1);
          var pengguna = Math.max(1, parseInt(document.getElementById('pk-' + id + '-pengguna').value, 10) || 1);
          var cabang = Math.max(1, parseInt(document.getElementById('pk-' + id + '-cabang').value, 10) || 1);
          if (nama.length < 2) { UK.toast('Nama paket wajib diisi.', 'err'); return; }
          db.plans.update(id, { nama: nama, harga: harga, batas: { produk: produk, pengguna: pengguna, cabang: cabang } });
          db.systemLogs.add('info', 'Paket ' + nama + ' diperbarui');
          UK.toast('Paket ' + nama + ' disimpan.', 'ok');
          ctx.navigate('#/paket');
        });
      });
    }
  });

  /* ============================================================
     MODUL: KATEGORI BISNIS
     ============================================================ */
  UK.admRegister('kategori', {
    render: function (root, ctx) {
      var cats = db.businessCategories.list();
      var tenants = db.tenants.list();

      root.innerHTML =
        '<div class="page-head"><div><h1>Kategori Bisnis</h1>' +
        '<div class="sub">Dipakai untuk dropdown jenis usaha saat pendaftaran UMKM.</div></div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Daftar kategori</h3>' +
        '<div class="toolbar grow" style="justify-content:flex-end;max-width:420px">' +
        '<input type="text" id="katBaru" placeholder="Nama kategori baru" maxlength="50" aria-label="Nama kategori baru">' +
        '<button class="btn btn-primary btn-sm" type="button" id="katTambah">Tambah</button>' +
        '</div></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Nama kategori</th><th>Aktif</th><th class="num">UMKM</th><th>Aksi</th>' +
        '</tr></thead><tbody>' +
        cats.map(function (c) {
          var used = tenants.filter(function (t) { return t.jenis === c.id; }).length;
          return '<tr>' +
            '<td><input type="text" value="' + UK.escapeHTML(c.nama) + '" data-katnama="' + c.id + '" aria-label="Nama kategori" style="max-width:300px"></td>' +
            '<td><label class="switch"><input type="checkbox" data-kataktif="' + c.id + '"' + (c.aktif ? ' checked' : '') +
            ' aria-label="Aktifkan kategori ' + UK.escapeHTML(c.nama) + '"><span></span></label></td>' +
            '<td class="num">' + used + '</td>' +
            '<td><div class="action-btns">' +
            '<button class="btn btn-xs btn-light" type="button" data-katsave="' + c.id + '">Simpan</button>' +
            '<button class="btn btn-xs btn-danger" type="button" data-kathapus="' + c.id + '">Hapus</button>' +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="panel-body" style="border-top:1px solid var(--line)">' +
        '<p class="tiny muted" style="margin:0">Kategori yang sudah dipakai UMKM tidak bisa dihapus — nonaktifkan saja agar tidak muncul di pendaftaran.</p>' +
        '</div></div>';

      document.getElementById('katTambah').addEventListener('click', function () {
        var val = document.getElementById('katBaru').value.trim();
        if (!val) { UK.toast('Nama kategori wajib diisi.', 'err'); return; }
        try {
          db.businessCategories.create({ nama: val, aktif: true });
          UK.toast('Kategori ditambahkan.', 'ok');
          ctx.navigate('#/kategori');
        } catch (e) { UK.toast(e.message, 'err'); }
      });
      document.getElementById('katBaru').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('katTambah').click(); }
      });

      root.querySelectorAll('[data-katsave]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-katsave');
          var nama = root.querySelector('[data-katnama="' + id + '"]').value.trim();
          try {
            db.businessCategories.update(id, { nama: nama });
            UK.toast('Kategori diperbarui.', 'ok');
            ctx.navigate('#/kategori');
          } catch (e) { UK.toast(e.message, 'err'); }
        });
      });
      root.querySelectorAll('[data-kataktif]').forEach(function (c) {
        c.addEventListener('change', function () {
          db.businessCategories.update(c.getAttribute('data-kataktif'), { aktif: c.checked });
          UK.toast(c.checked ? 'Kategori diaktifkan.' : 'Kategori dinonaktifkan.', 'ok');
        });
      });
      root.querySelectorAll('[data-kathapus]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-kathapus');
          var used = db.tenants.list().filter(function (t) { return t.jenis === id; }).length;
          if (used) {
            UK.toast('Kategori dipakai ' + used + ' UMKM. Nonaktifkan saja, atau pindahkan UMKM terlebih dahulu.', 'err');
            return;
          }
          UK.confirmDialog('Hapus kategori ini?', { danger: true, okText: 'Hapus' }).then(function (yes) {
            if (!yes) return;
            db.businessCategories.remove(id);
            UK.toast('Kategori dihapus.', 'ok');
            ctx.navigate('#/kategori');
          });
        });
      });
    }
  });
})();
