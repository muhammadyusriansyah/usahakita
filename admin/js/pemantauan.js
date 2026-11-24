/* ============================================================
   admin/js/pemantauan.js — Admin: pemantauan sistem, laporan
   platform, dukungan pengguna, pengaturan admin.
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     MODUL: PEMANTAUAN SISTEM
     ============================================================ */
  var SYS = { data: null, level: '' };

  function buatDataSistem() {
    var rnd = Math.random;
    var layanan = [
      { nama: 'API Utama', status: 'hijau', respons: 120 + Math.round(rnd() * 60) },
      { nama: 'Database', status: 'hijau', respons: 18 + Math.round(rnd() * 12) },
      { nama: 'Penyimpanan gambar', status: 'hijau', respons: 90 + Math.round(rnd() * 40) },
      { nama: 'Website katalog', status: 'hijau', respons: 140 + Math.round(rnd() * 80) }
    ];
    var roll = rnd();
    if (roll > 0.75) layanan[2].status = 'kuning';
    else if (roll > 0.92) layanan[3].status = 'merah';

    var series = [];
    for (var i = 23; i >= 0; i--) {
      var jam = new Date();
      jam.setHours(jam.getHours() - i);
      series.push({ label: String(jam.getHours()).padStart(2, '0') + ':00', value: 110 + Math.round(rnd() * 90) });
    }
    return {
      layanan: layanan,
      uptime: (99.5 + rnd() * 0.45).toFixed(2),
      respons: Math.round(series.reduce(function (a, s) { return a + s.value; }, 0) / series.length),
      storage: (48 + rnd() * 32).toFixed(0),
      backup: 'Berhasil · ' + UK.tanggalIndo(new Date(Date.now() - 3600000), true),
      series: series,
      waktu: new Date().toISOString()
    };
  }

  UK.admRegister('sistem', {
    render: function (root, ctx) {
      if (!SYS.data) SYS.data = buatDataSistem();
      var d = SYS.data;
      var logs = db.systemLogs.list().filter(function (l) {
        return !SYS.level || l.level === SYS.level;
      }).sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); }).slice(0, 30);

      function warna(s) {
        return s === 'hijau' ? 'success' : (s === 'kuning' ? 'pending' : 'danger');
      }
      function labelStatus(s) {
        return s === 'hijau' ? 'Normal' : (s === 'kuning' ? 'Melambat' : 'Gangguan');
      }

      root.innerHTML =
        '<div class="page-head"><div><h1>Pemantauan Sistem</h1>' +
        '<div class="sub">Diperbarui ' + UK.tanggalIndo(d.waktu, true) + ' · data dummy prototype</div></div>' +
        '<div class="page-actions"><button class="btn btn-primary btn-sm" type="button" id="sysRefresh">↻ Segarkan</button></div></div>' +

        '<div class="kpi-grid">' +
        '<div class="stat-card"><div class="stat-label">Uptime 30 hari</div><div class="stat-value green">' + d.uptime + '%</div>' +
        '<div class="stat-sub">target 99,5%</div></div>' +
        '<div class="stat-card"><div class="stat-label">Waktu respons rata-rata</div><div class="stat-value">' + d.respons + ' ms</div>' +
        '<div class="stat-sub">24 jam terakhir</div></div>' +
        '<div class="stat-card"><div class="stat-label">Penyimpanan terpakai</div><div class="stat-value">' + d.storage + '%</div>' +
        '<div class="stat-sub">gambar &amp; lampiran</div></div>' +
        '<div class="stat-card"><div class="stat-label">Backup terakhir</div><div class="stat-value" style="font-size:13px">Berhasil</div>' +
        '<div class="stat-sub">' + UK.tanggalIndo(new Date(Date.now() - 3600000), true) + '</div></div>' +
        '</div>' +

        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h3>Status layanan</h3></div><div class="panel-body">' +
        d.layanan.map(function (l) {
          return '<div class="row between" style="padding:7px 0;border-bottom:1px solid #f3f5f9">' +
            '<div><b class="small">' + UK.escapeHTML(l.nama) + '</b>' +
            '<div class="tiny muted">respons ' + l.respons + ' ms</div></div>' +
            '<span class="status ' + warna(l.status) + '"><span class="dot"></span>' + labelStatus(l.status) + '</span></div>';
        }).join('') +
        '<p class="tiny muted" style="margin:10px 0 0">Uptime dihitung dari health check setiap 60 detik.</p>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Respons API 24 jam</h3></div>' +
        '<div class="panel-body">' + UK.svgLine(d.series, { height: 190 }) + '</div></div>' +
        '</div>' +

        '<div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Log sistem</h3>' +
        '<select id="sysLevel" style="width:auto" aria-label="Filter level log">' +
        [['', 'Semua level'], ['info', 'Info'], ['peringatan', 'Peringatan'], ['error', 'Error']].map(function (o) {
          return '<option value="' + o[0] + '"' + (SYS.level === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Waktu</th><th>Level</th><th>Pesan</th></tr></thead><tbody>' +
        (logs.length ? logs.map(function (l) {
          var cls = l.level === 'error' ? 'danger' : (l.level === 'peringatan' ? 'pending' : 'success');
          return '<tr><td class="nowrap">' + UK.tanggalIndo(l.waktu, true) + '</td>' +
            '<td><span class="status ' + cls + '">' + UK.escapeHTML(l.level) + '</span></td>' +
            '<td>' + UK.escapeHTML(l.pesan) + '</td></tr>';
        }).join('') : '<tr><td colspan="3" class="center muted" style="padding:20px">Tidak ada log pada level ini.</td></tr>') +
        '</tbody></table></div></div>';

      document.getElementById('sysRefresh').addEventListener('click', function () {
        SYS.data = buatDataSistem();
        db.systemLogs.add('info', 'Pemantauan sistem disegarkan manual');
        UK.toast('Status sistem diperbarui.', 'ok');
        ctx.navigate('#/sistem');
      });
      document.getElementById('sysLevel').addEventListener('change', function () {
        SYS.level = this.value;
        ctx.navigate('#/sistem');
      });
    }
  });

  /* ============================================================
     MODUL: LAPORAN PLATFORM
     ============================================================ */
  var LAP = { periode: '30', dari: '', sampai: '' };

  UK.admRegister('laporan', {
    render: function (root, ctx) {
      var now = new Date();
      var from, to, label;
      if (LAP.periode === '7') { from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); label = '7 hari terakhir'; }
      else if (LAP.periode === 'bulan') { from = new Date(now.getFullYear(), now.getMonth(), 1); label = 'Bulan ' + UK.BULAN[now.getMonth()] + ' ' + now.getFullYear(); }
      else if (LAP.periode === 'tahun') { from = new Date(now.getFullYear(), 0, 1); label = 'Tahun ' + now.getFullYear(); }
      else if (LAP.periode === 'kustom') {
        from = LAP.dari ? new Date(LAP.dari + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
        to = LAP.sampai ? new Date(LAP.sampai + 'T23:59:59') : now;
        label = UK.tanggalIndo(from) + ' – ' + UK.tanggalIndo(to);
      } else { from = new Date(now); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0); label = '30 hari terakhir'; }
      to = to || new Date(now);

      var tenants = db.tenants.list();
      var trxAll = db.transactions.listAll();
      var plans = db.plans.list();
      var planMap = {};
      plans.forEach(function (p) { planMap[p.id] = p; });

      var tenantBaru = tenants.filter(function (t) {
        var w = new Date(t.dibuatPada).getTime();
        return w >= from.getTime() && w <= to.getTime();
      });
      var trxPeriod = trxAll.filter(function (t) {
        var w = new Date(t.waktu).getTime();
        return w >= from.getTime() && w <= to.getTime();
      });
      var nilaiTrx = trxPeriod.filter(function (t) { return t.status === 'Selesai'; })
        .reduce(function (a, t) { return a + t.total; }, 0);
      var berbayar = tenants.filter(function (t) {
        var p = planMap[t.paket];
        return p && p.harga > 0 && t.status !== 'Ditangguhkan';
      });
      var pendapatan = berbayar.reduce(function (a, t) { return a + planMap[t.paket].harga; }, 0);

      var perHari = {};
      tenantBaru.forEach(function (t) {
        var d = new Date(t.dibuatPada);
        var k = d.getDate() + '/' + (d.getMonth() + 1);
        perHari[k] = (perHari[k] || 0) + 1;
      });
      var chart = Object.keys(perHari).map(function (k) { return { label: k, value: perHari[k] }; });

      root.innerHTML =
        '<div class="page-head"><div><h1>Laporan Platform</h1>' +
        '<div class="sub">Periode: <b>' + UK.escapeHTML(label) + '</b></div></div>' +
        '<div class="page-actions no-print">' +
        '<button class="btn btn-light btn-sm" type="button" id="lapPrint">🖨 Cetak</button>' +
        '<button class="btn btn-light btn-sm" type="button" id="lapCsv">Ekspor CSV</button></div></div>' +

        '<div class="panel no-print" style="padding:11px 13px;margin-bottom:14px"><div class="toolbar">' +
        '<select id="platPeriode" aria-label="Periode">' +
        [['7', '7 hari'], ['30', '30 hari'], ['bulan', 'Bulan ini'], ['tahun', 'Tahun ini'], ['kustom', 'Kustom']].map(function (o) {
          return '<option value="' + o[0] + '"' + (LAP.periode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>' +
        '<input type="date" id="platDari" value="' + (LAP.dari || UK.tanggalInput(from)) + '" aria-label="Dari" style="width:auto"' + (LAP.periode === 'kustom' ? '' : ' disabled') + '>' +
        '<input type="date" id="platSampai" value="' + (LAP.sampai || UK.tanggalInput(now)) + '" aria-label="Sampai" style="width:auto"' + (LAP.periode === 'kustom' ? '' : ' disabled') + '>' +
        '<button class="btn btn-xs btn-light" type="button" id="platTerapkan"' + (LAP.periode === 'kustom' ? '' : ' disabled') + '>Terapkan</button>' +
        '</div></div>' +

        '<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">' +
        '<div class="stat-card"><div class="stat-label">Pendaftaran UMKM</div><div class="stat-value">' + tenantBaru.length + '</div>' +
        '<div class="stat-sub">' + tenants.length + ' total UMKM</div></div>' +
        '<div class="stat-card"><div class="stat-label">Transaksi platform</div><div class="stat-value">' + UK.formatAngka(trxPeriod.length) + '</div>' +
        '<div class="stat-sub">nilai selesai ' + UK.rupiah(nilaiTrx) + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Pendapatan langganan</div><div class="stat-value">' + UK.rupiah(pendapatan) + '</div>' +
        '<div class="stat-sub">' + berbayar.length + ' tenant berbayar (bulanan)</div></div>' +
        '</div>' +

        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h3>Pendaftaran UMKM</h3></div>' +
        '<div class="panel-body">' + (chart.length ? UK.svgLine(chart, { height: 190 }) :
          '<div class="empty-note"><span class="ico">📭</span><b>Tidak ada pendaftaran</b><span>Pada periode ini belum ada UMKM baru.</span></div>') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>UMKM baru pada periode</h3></div>' +
        (tenantBaru.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Usaha</th><th>Paket</th><th>Tanggal</th><th class="num">Nilai paket</th></tr></thead><tbody>' +
          tenantBaru.sort(function (a, b) { return new Date(b.dibuatPada) - new Date(a.dibuatPada); }).map(function (t) {
            var p = planMap[t.paket];
            return '<tr><td>' + UK.escapeHTML(t.nama) + '</td><td>' + UK.escapeHTML(p ? p.nama : t.paket) + '</td>' +
              '<td class="nowrap">' + UK.tanggalIndo(t.dibuatPada) + '</td>' +
              '<td class="num">' + UK.rupiah(p ? p.harga : 0) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="empty-note"><span class="ico">🏬</span><b>Belum ada UMKM baru</b></div>') +
        '</div></div>';

      document.getElementById('platPeriode').addEventListener('change', function () {
        LAP.periode = this.value;
        ctx.navigate('#/laporan');
      });
      document.getElementById('platTerapkan').addEventListener('click', function () {
        var a = document.getElementById('platDari').value;
        var b = document.getElementById('platSampai').value;
        if (!a || !b) { UK.toast('Lengkapi rentang tanggal.', 'err'); return; }
        if (new Date(a) > new Date(b)) { UK.toast('Tanggal awal harus sebelum akhir.', 'err'); return; }
        LAP.dari = a; LAP.sampai = b;
        ctx.navigate('#/laporan');
      });
      document.getElementById('lapPrint').addEventListener('click', function () { UK.cetakHalaman(); });
      document.getElementById('lapCsv').addEventListener('click', function () {
        var rows = [['Laporan Platform', label], [],
          ['Pendaftaran UMKM', tenantBaru.length],
          ['Total UMKM', tenants.length],
          ['Transaksi platform', trxPeriod.length],
          ['Nilai transaksi selesai', nilaiTrx],
          ['Pendapatan langganan (bulanan)', pendapatan], [],
          ['Usaha', 'Paket', 'Tanggal daftar', 'Nilai paket']];
        tenantBaru.forEach(function (t) {
          var p = planMap[t.paket];
          rows.push([t.nama, p ? p.nama : t.paket, UK.tanggalIndo(t.dibuatPada), p ? p.harga : 0]);
        });
        UK.downloadCSV('laporan-platform-' + UK.tanggalInput(new Date()), rows);
        UK.toast('Laporan platform diekspor.', 'ok');
      });
    }
  });

  /* ============================================================
     MODUL: DUKUNGAN PENGGUNA
     ============================================================ */
  var D = { status: '', prioritas: '', active: '' };

  UK.admRegister('dukungan', {
    render: function (root, ctx) {
      var tickets = db.tickets.listAll().sort(function (a, b) {
        return new Date(b.dibuatPada) - new Date(a.dibuatPada);
      });
      if (!D.active && tickets.length) D.active = tickets[0].id;
      var list = tickets.filter(function (t) {
        if (D.status && t.status !== D.status) return false;
        if (D.prioritas && t.prioritas !== D.prioritas) return false;
        return true;
      });
      var active = tickets.filter(function (t) { return t.id === D.active; })[0] || list[0];
      if (active) D.active = active.id;

      function prioPill(p) {
        var c = p === 'Tinggi' ? 'danger' : (p === 'Sedang' ? 'pending' : 'info');
        return '<span class="status ' + c + '">' + UK.escapeHTML(p) + '</span>';
      }
      function statPill(s) {
        var c = s === 'Baru' ? 'pending' : (s === 'Diproses' ? 'info' : 'success');
        return '<span class="status ' + c + '">' + UK.escapeHTML(s) + '</span>';
      }

      root.innerHTML =
        '<div class="page-head"><div><h1>Dukungan Pengguna</h1>' +
        '<div class="sub">' + tickets.filter(function (t) { return t.status !== 'Selesai'; }).length + ' tiket belum selesai</div></div></div>' +
        '<div class="support-grid">' +
        '<div class="panel"><div class="panel-head" style="display:grid;gap:7px">' +
        '<div class="toolbar"><select id="tktStatus" aria-label="Filter status" style="min-width:0"><option value="">Semua status</option>' +
        ['Baru', 'Diproses', 'Selesai'].map(function (s) {
          return '<option' + (D.status === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select>' +
        '<select id="tktPrio" aria-label="Filter prioritas" style="min-width:0"><option value="">Semua prioritas</option>' +
        ['Tinggi', 'Sedang', 'Rendah'].map(function (s) {
          return '<option' + (D.prioritas === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select></div></div>' +
        '<div style="max-height:520px;overflow-y:auto">' +
        (list.length ? list.map(function (t) {
          var ten = db.tenants.get(t.tenantId);
          return '<div class="conv' + (t.id === D.active ? ' active' : '') + '" data-tiket="' + t.id + '" role="button" tabindex="0">' +
            '<div class="nm"><span class="ellipsis">' + UK.escapeHTML(t.subjek) + '</span>' + prioPill(t.prioritas) + '</div>' +
            '<div class="pv">' + UK.escapeHTML(ten ? ten.nama : 'Tenant dihapus') + '</div>' +
            '<div class="row between" style="margin-top:3px"><span class="tiny muted">' + UK.tanggalIndo(t.dibuatPada) + '</span>' + statPill(t.status) + '</div></div>';
        }).join('') : '<div class="empty-note">Tidak ada tiket.</div>') +
        '</div></div>' +

        '<div class="panel" id="ticketDetail">' + (active ? detailTicket(active) : '<div class="empty-note">Pilih tiket.</div>') + '</div>' +
        '</div>';

      document.getElementById('tktStatus').addEventListener('change', function () { D.status = this.value; ctx.navigate('#/dukungan'); });
      document.getElementById('tktPrio').addEventListener('change', function () { D.prioritas = this.value; ctx.navigate('#/dukungan'); });

      root.querySelectorAll('[data-tiket]').forEach(function (el) {
        function open() {
          D.active = el.getAttribute('data-tiket');
          ctx.navigate('#/dukungan');
        }
        el.addEventListener('click', open);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });

      if (!active) return;
      var detailBox = document.getElementById('ticketDetail');
      detailBox.querySelector('#tktBalas').addEventListener('click', function () {
        var ta = detailBox.querySelector('#tktPesan');
        var teks = ta.value.trim();
        if (teks.length < 2) { UK.toast('Tulis balasan terlebih dahulu.', 'err'); return; }
        var msgs = (active.pesan || []).concat([{ dari: 'admin', teks: teks, waktu: new Date().toISOString() }]);
        db.tickets.update(active.id, { pesan: msgs, status: active.status === 'Baru' ? 'Diproses' : active.status }, active.tenantId);
        db.systemLogs.add('info', 'Balasan admin untuk tiket: ' + active.subjek);
        UK.toast('Balasan terkirim.', 'ok');
        ctx.navigate('#/dukungan');
        ctx.refresh();
      });
      detailBox.querySelectorAll('[data-status]').forEach(function (b) {
        b.addEventListener('click', function () {
          var s = b.getAttribute('data-status');
          db.tickets.update(active.id, { status: s }, active.tenantId);
          UK.toast('Status tiket: ' + s, 'ok');
          ctx.navigate('#/dukungan');
          ctx.refresh();
        });
      });
    }
  });

  function detailTicket(t) {
    var ten = db.tenants.get(t.tenantId);
    return '<div class="panel-head"><div><h3>' + UK.escapeHTML(t.subjek) + '</h3>' +
      '<div class="tiny muted">' + UK.escapeHTML(ten ? ten.nama : 'Tenant dihapus') + ' · ' + UK.tanggalIndo(t.dibuatPada, true) + '</div></div>' +
      '<div class="row" style="gap:5px"><span class="status ' + (t.prioritas === 'Tinggi' ? 'danger' : (t.prioritas === 'Sedang' ? 'pending' : 'info')) + '">' +
      UK.escapeHTML(t.prioritas) + '</span></div></div>' +
      '<div class="panel-body" style="max-height:330px;overflow-y:auto;display:grid;gap:8px">' +
      (t.pesan || []).map(function (m) {
        var admin = m.dari === 'admin';
        return '<div class="bubble' + (admin ? ' owner' : '') + '" style="max-width:85%">' +
          '<div class="tiny" style="opacity:.8;margin-bottom:2px">' + (admin ? 'Admin' : 'Pengguna') + '</div>' +
          UK.escapeHTML(m.teks).replace(/\n/g, '<br>') +
          '<span class="t">' + UK.tanggalIndo(m.waktu, true) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="panel-body" style="border-top:1px solid var(--line)">' +
      '<div class="field"><label for="tktPesan">Balas tiket</label>' +
      '<textarea id="tktPesan" rows="3" maxlength="600" placeholder="Tulis balasan untuk pengguna…"></textarea></div>' +
      '<div class="row between wrap" style="gap:8px">' +
      '<div class="chips">' +
      ['Baru', 'Diproses', 'Selesai'].map(function (s) {
        return '<button class="chip' + (t.status === s ? ' active' : '') + '" type="button" data-status="' + s + '">' + s + '</button>';
      }).join('') + '</div>' +
      '<button class="btn btn-primary btn-sm" type="button" id="tktBalas">Kirim balasan</button>' +
      '</div></div>';
  }

  /* ============================================================
     MODUL: PENGATURAN ADMIN
     ============================================================ */
  UK.admRegister('setelan', {
    render: function (root, ctx) {
      var s = db.adminSettings.get();
      root.innerHTML =
        '<div class="page-head"><div><h1>Pengaturan Admin</h1>' +
        '<div class="sub">Profil internal dan preferensi notifikasi platform.</div></div></div>' +
        '<div class="grid-2">' +
        '<div class="panel"><div class="panel-head"><h3>Profil admin</h3></div><div class="panel-body">' +
        '<div class="field" id="saNamaF"><label for="saNama">Nama tampilan</label>' +
        '<input type="text" id="saNama" maxlength="60" value="' + UK.escapeHTML(s.nama || 'Admin Platform') + '">' +
        '<span class="err">Nama wajib diisi.</span></div>' +
        '<div class="field" id="saEmailF"><label for="saEmail">Email admin</label>' +
        '<input type="email" id="saEmail" value="' + UK.escapeHTML(s.email || '') + '">' +
        '<span class="err">Email tidak valid.</span></div>' +
        '<button class="btn btn-primary btn-block" type="button" id="saSimpan">Simpan profil</button>' +
        '<hr>' +
        '<div class="row between" style="margin-bottom:10px"><div><b class="small">Kata sandi</b>' +
        '<div class="tiny muted">Terakhir diubah: tidak tercatat (demo)</div></div>' +
        '<button class="btn btn-light btn-sm" type="button" id="saSandi">Ubah sandi</button></div>' +
        '<p class="tiny muted" style="margin:0">Mode demo: kredensial admin tetap <b>admin / admin</b>.</p>' +
        '</div></div>' +

        '<div class="panel"><div class="panel-head"><h3>Notifikasi</h3></div><div class="panel-body">' +
        '<div class="row between" style="padding:9px 0;border-bottom:1px solid #f3f5f9">' +
        '<div><b class="small">Email ringkasan harian</b><div class="tiny muted">Statistik platform setiap pagi.</div></div>' +
        '<label class="switch"><input type="checkbox" id="saNotifEmail"' + (s.notifEmail ? ' checked' : '') + ' aria-label="Email ringkasan"><span></span></label></div>' +
        '<div class="row between" style="padding:9px 0">' +
        '<div><b class="small">Notifikasi tiket baru</b><div class="tiny muted">Saat ada tiket dukungan masuk.</div></div>' +
        '<label class="switch"><input type="checkbox" id="saNotifTiket"' + (s.notifTicket ? ' checked' : '') + ' aria-label="Notifikasi tiket"><span></span></label></div>' +
        '<p class="tiny muted" style="margin-top:12px">Preferensi disimpan di perangkat ini (prototype).</p>' +
        '</div></div></div>';

      document.getElementById('saSimpan').addEventListener('click', function () {
        var nama = document.getElementById('saNama').value.trim();
        var email = document.getElementById('saEmail').value.trim();
        var bad = false;
        document.getElementById('saNamaF').classList.toggle('invalid', nama.length < 2);
        if (nama.length < 2) bad = true;
        document.getElementById('saEmailF').classList.toggle('invalid', !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad = true;
        if (bad) { UK.toast('Periksa kembali profil admin.', 'err'); return; }
        db.adminSettings.update({ nama: nama, email: email, notifEmail: document.getElementById('saNotifEmail').checked, notifTicket: document.getElementById('saNotifTiket').checked });
        Auth.patchSession({ nama: nama, email: email });
        document.getElementById('adminName').textContent = nama;
        document.getElementById('adminAvatar').textContent = UK.inisial(nama);
        UK.toast('Profil admin disimpan.', 'ok');
      });

      document.getElementById('saSandi').addEventListener('click', function () {
        var wrap = document.createElement('div');
        wrap.className = 'modal';
        wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="pwTitle">' +
          '<div class="modal-head"><h3 id="pwTitle">Ubah kata sandi</h3>' +
          '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
          '<div class="modal-body">' +
          '<div class="field"><label for="pwLama">Kata sandi saat ini</label><input type="password" id="pwLama" autocomplete="current-password"></div>' +
          '<div class="field" id="pwBaruF"><label for="pwBaru">Kata sandi baru</label><input type="password" id="pwBaru" autocomplete="new-password">' +
          '<span class="err">Minimal 8 karakter.</span></div>' +
          '<div class="field" id="pwUlangF"><label for="pwUlang">Ulangi kata sandi baru</label><input type="password" id="pwUlang" autocomplete="new-password">' +
          '<span class="err">Konfirmasi tidak sama.</span></div>' +
          '<p class="tiny muted">Mode demo: kredensial tidak benar-benar diubah.</p></div>' +
          '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
          '<button class="btn btn-primary" type="button" id="pwOk">Simpan</button></div></div>';
        document.body.appendChild(wrap);
        UK.openModal(wrap);
        function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
        wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
        wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
        wrap.querySelector('#pwOk').addEventListener('click', function () {
          var lama = wrap.querySelector('#pwLama').value;
          var baru = wrap.querySelector('#pwBaru').value;
          var ulang = wrap.querySelector('#pwUlang').value;
          var bad = false;
          if (lama !== 'admin') { UK.toast('Kata sandi saat ini salah.', 'err'); bad = true; }
          if (baru.length < 8) { wrap.querySelector('#pwBaruF').classList.add('invalid'); bad = true; }
          if (baru !== ulang) { wrap.querySelector('#pwUlangF').classList.add('invalid'); bad = true; }
          if (bad) return;
          close();
          db.systemLogs.add('info', 'Permintaan ubah kata sandi admin (demo, tidak diterapkan)');
          UK.toast('Mode demo: kata sandi tidak diubah.', 'warn');
        });
      });

      document.getElementById('saNotifEmail').addEventListener('change', function () {
        db.adminSettings.update({ notifEmail: this.checked });
        UK.toast('Preferensi notifikasi disimpan.', 'ok');
      });
      document.getElementById('saNotifTiket').addEventListener('change', function () {
        db.adminSettings.update({ notifTicket: this.checked });
        UK.toast('Preferensi notifikasi disimpan.', 'ok');
      });
    }
  });
})();
