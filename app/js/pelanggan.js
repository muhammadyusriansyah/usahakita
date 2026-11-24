/* ============================================================
   app/js/pelanggan.js — Pelanggan & piutang
   ============================================================ */
(function () {
  'use strict';

  var S = { q: '', piutang: false, page: 1 };
  var PER_PAGE = 10;
  var rootEl = null, ctxRef = null;

  function agregat(ctx, cust) {
    var trx = db.transactions.list({ tenantId: ctx.tenant.id }).filter(function (t) {
      return t.pelangganId === cust.id && t.status === 'Selesai';
    });
    var total = trx.reduce(function (a, t) { return a + t.total; }, 0);
    var terakhir = trx.length ? trx.sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); })[0].waktu : null;
    return { jumlah: trx.length, total: total, terakhir: terakhir, list: trx };
  }

  function aktif(terakhir) {
    if (!terakhir) return false;
    return (Date.now() - new Date(terakhir).getTime()) <= 30 * 86400000;
  }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    var customers = db.customers.list({ tenantId: ctx.tenant.id });
    var totalPiutang = customers.reduce(function (a, c) { return a + (Number(c.piutang) || 0); }, 0);
    var aktif30 = customers.filter(function (c) { return aktif(agregat(ctx, c).terakhir); }).length;

    var list = customers.filter(function (c) {
      if (S.piutang && !(Number(c.piutang) > 0)) return false;
      if (S.q) {
        var q = S.q.toLowerCase();
        if (String(c.nama).toLowerCase().indexOf(q) < 0 && String(c.telepon || '').indexOf(q) < 0) return false;
      }
      return true;
    }).map(function (c) {
      return Object.assign({}, c, { agg: agregat(ctx, c) });
    }).sort(function (a, b) {
      return (b.agg.terakhir ? new Date(b.agg.terakhir).getTime() : 0) - (a.agg.terakhir ? new Date(a.agg.terakhir).getTime() : 0);
    });

    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (S.page > pages) S.page = pages;
    var slice = list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);

    root.innerHTML =
      '<div class="page-head"><div><h1>Pelanggan</h1>' +
      '<div class="sub">' + customers.length + ' pelanggan terdaftar</div></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-light btn-sm" type="button" id="btnEkspor">Ekspor CSV</button>' +
      '<button class="btn btn-primary btn-sm" type="button" id="btnTambah">＋ Tambah pelanggan</button>' +
      '</div></div>' +

      '<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="stat-card"><div class="stat-label">Total pelanggan</div><div class="stat-value">' + customers.length + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Aktif 30 hari</div><div class="stat-value">' + aktif30 + '</div>' +
      '<div class="stat-sub">punya transaksi Selesai</div></div>' +
      '<div class="stat-card"><div class="stat-label">Total piutang</div><div class="stat-value ' + (totalPiutang ? 'amber' : 'green') + '">' + UK.rupiah(totalPiutang) + '</div>' +
      '<div class="stat-sub">' + customers.filter(function (c) { return c.piutang > 0; }).length + ' pelanggan</div></div>' +
      '</div>' +

      '<div class="panel" style="margin-top:14px"><div class="panel-head">' +
      '<div class="toolbar grow">' +
      '<div class="search-box"><span class="ico">🔍</span>' +
      '<input type="search" id="pelCari" placeholder="Cari nama atau telepon…" value="' + UK.escapeHTML(S.q) + '" aria-label="Cari pelanggan"></div>' +
      '<label class="check"><input type="checkbox" id="pelPiutang"' + (S.piutang ? ' checked' : '') + '> Hanya yang punya piutang</label>' +
      '</div></div>' +
      (slice.length ?
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Pelanggan</th><th>Telepon</th><th class="num">Transaksi</th><th class="num">Total belanja</th>' +
        '<th class="num">Piutang</th><th>Terakhir</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        slice.map(function (c) {
          var a = c.agg;
          return '<tr class="clickable" data-cust="' + c.id + '">' +
            '<td><div class="cell-main"><span class="avatar">' + UK.escapeHTML(UK.inisial(c.nama)) + '</span>' +
            '<div><div class="t">' + UK.escapeHTML(c.nama) + '</div><div class="s">Bergabung ' + UK.tanggalIndo(c.dibuatPada) + '</div></div></div></td>' +
            '<td class="nowrap">' + (c.telepon ? '+' + UK.escapeHTML(c.telepon) : '<span class="muted">-</span>') + '</td>' +
            '<td class="num">' + a.jumlah + '</td>' +
            '<td class="num">' + UK.rupiah(a.total) + '</td>' +
            '<td class="num">' + (c.piutang > 0 ? '<b class="amber">' + UK.rupiah(c.piutang) + '</b>' : '<span class="muted">-</span>') + '</td>' +
            '<td class="nowrap">' + (a.terakhir ? UK.tanggalIndo(a.terakhir) : '<span class="muted">Belum ada</span>') + '</td>' +
            '<td>' + (aktif(a.terakhir) ? '<span class="status success">Aktif</span>' : '<span class="status">Tidak aktif</span>') + '</td>' +
            '<td class="num"><button class="btn btn-xs btn-light" type="button" data-detail="' + c.id + '">Detail</button></td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>' + UK.pager(list.length, S.page, PER_PAGE)
        : '<div class="empty-note"><span class="ico">👥</span><b>Belum ada pelanggan</b>' +
        '<span>Tambahkan pelanggan atau buat dari halaman Kasir.</span></div>') +
      '</div>';

    var cari = document.getElementById('pelCari');
    cari.addEventListener('input', UK.debounce(function () { S.q = cari.value; S.page = 1; render(root, ctx); }, 200));
    document.getElementById('pelPiutang').addEventListener('change', function () {
      S.piutang = this.checked; S.page = 1; render(root, ctx);
    });
    document.getElementById('btnTambah').addEventListener('click', function () { modalPelanggan(ctx, null); });
    document.getElementById('btnEkspor').addEventListener('click', function () {
      var rows = [['Nama', 'Telepon', 'Transaksi', 'Total belanja', 'Piutang', 'Terakhir transaksi', 'Status']];
      list.forEach(function (c) {
        rows.push([c.nama, c.telepon, c.agg.jumlah, c.agg.total, c.piutang,
          c.agg.terakhir ? UK.tanggalIndo(c.agg.terakhir) : '-', aktif(c.agg.terakhir) ? 'Aktif' : 'Tidak aktif']);
      });
      UK.downloadCSV('pelanggan-' + UK.tanggalInput(new Date()), rows);
      UK.toast('Data pelanggan diekspor.', 'ok');
    });
    UK.bindPager(root, function (n) { S.page = n; render(root, ctx); });

    root.querySelectorAll('[data-cust]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        bukaDetail(tr.getAttribute('data-cust'), ctx);
      });
    });
    root.querySelectorAll('[data-detail]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        bukaDetail(b.getAttribute('data-detail'), ctx);
      });
    });
  }

  /* ---------------- modal tambah/ubah ---------------- */
  function modalPelanggan(ctx, cust) {
    var isEdit = !!cust;
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML =
      '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="pcTitle">' +
      '<div class="modal-head"><h3 id="pcTitle">' + (isEdit ? 'Ubah pelanggan' : 'Tambah pelanggan') + '</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="field" id="pcNamaF"><label for="pcNama">Nama *</label>' +
      '<input type="text" id="pcNama" maxlength="60" value="' + UK.escapeHTML(isEdit ? cust.nama : '') + '">' +
      '<span class="err">Nama wajib diisi.</span></div>' +
      '<div class="field" id="pcTelpF"><label for="pcTelp">Telepon / WhatsApp</label>' +
      '<input type="tel" id="pcTelp" inputmode="numeric" value="' + UK.escapeHTML(isEdit ? cust.telepon : '') + '" placeholder="0812…">' +
      '<span class="hint">Disimpan dalam format 62…</span><span class="err">Nomor sudah dipakai pelanggan lain.</span></div>' +
      (isEdit ? '<div class="field"><label>Piutang saat ini</label><div class="field-label" style="font-size:14px">' + UK.rupiah(cust.piutang) + '</div></div>' : '') +
      '</div>' +
      '<div class="modal-foot">' +
      (isEdit ? '<button class="btn btn-danger btn-sm" type="button" id="pcHapus" style="margin-right:auto">Hapus</button>' : '') +
      '<button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="pcSimpan">Simpan</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    wrap.querySelector('#pcTelp').addEventListener('blur', function () {
      this.value = UK.normalisasiWA(this.value);
    });

    wrap.querySelector('#pcSimpan').addEventListener('click', function () {
      var nama = wrap.querySelector('#pcNama').value.trim().replace(/\s+/g, ' ');
      var telp = UK.normalisasiWA(wrap.querySelector('#pcTelp').value);
      var bad = false;
      wrap.querySelector('#pcNamaF').classList.toggle('invalid', nama.length < 2);
      if (nama.length < 2) bad = true;
      var dup = telp && db.customers.list({ tenantId: ctx.tenant.id }).some(function (c) {
        return c.telepon === telp && (!isEdit || c.id !== cust.id);
      });
      wrap.querySelector('#pcTelpF').classList.toggle('invalid', !!dup);
      if (dup) bad = true;
      if (bad) { UK.toast('Periksa kembali data pelanggan.', 'err'); return; }

      try {
        if (isEdit) {
          db.customers.update(cust.id, { nama: nama, telepon: telp }, ctx.tenant.id);
          UK.toast('Data pelanggan diperbarui.', 'ok');
        } else {
          db.customers.create({
            tenantId: ctx.tenant.id, nama: nama, telepon: telp, piutang: 0,
            dibuatPada: new Date().toISOString()
          });
          UK.toast('Pelanggan ditambahkan.', 'ok');
        }
        close();
        render(rootEl, ctx);
      } catch (e) { UK.toast(e.message, 'err'); }
    });

    var btnHapus = wrap.querySelector('#pcHapus');
    if (btnHapus) {
      btnHapus.addEventListener('click', function () {
        UK.confirmDialog('Hapus pelanggan <b>' + UK.escapeHTML(cust.nama) + '</b>? Riwayat transaksi tetap tersimpan tanpa nama pelanggan.',
          { danger: true, okText: 'Hapus' }).then(function (yes) {
            if (!yes) return;
            db.customers.remove(cust.id, ctx.tenant.id);
            close();
            UK.toast('Pelanggan dihapus.', 'ok');
            render(rootEl, ctx);
          });
      });
    }
  }

  /* ---------------- drawer detail ---------------- */
  function bukaDetail(custId, ctx) {
    var cust = db.customers.get(custId, ctx.tenant.id);
    if (!cust) return;
    var a = agregat(ctx, cust);
    var tenant = ctx.tenant;

    var wrap = document.createElement('div');
    wrap.className = 'drawer-wrap open';
    wrap.innerHTML = '<div class="drawer" role="dialog" aria-modal="true" aria-labelledby="cdTitle">' +
      '<div class="drawer-head"><div class="row"><span class="avatar" style="width:36px;height:36px">' + UK.escapeHTML(UK.inisial(cust.nama)) + '</span>' +
      '<div><h3 id="cdTitle">' + UK.escapeHTML(cust.nama) + '</h3>' +
      '<div class="tiny muted">' + (cust.telepon ? '+' + UK.escapeHTML(cust.telepon) : 'Tanpa nomor telepon') + '</div></div></div>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="drawer-body">' +
      '<div class="grid-2" style="gap:8px">' +
      '<div class="stat-card" style="padding:10px"><div class="stat-label">Transaksi</div><div class="stat-value" style="font-size:16px">' + a.jumlah + '</div></div>' +
      '<div class="stat-card" style="padding:10px"><div class="stat-label">Total belanja</div><div class="stat-value" style="font-size:16px">' + UK.rupiah(a.total) + '</div></div>' +
      '</div>' +
      '<div class="card" style="padding:11px;margin-top:10px">' +
      '<div class="row between"><span class="small muted">Piutang</span><b class="' + (cust.piutang > 0 ? 'amber' : 'green') + '">' + UK.rupiah(cust.piutang) + '</b></div>' +
      (cust.piutang > 0 ? '<button class="btn btn-primary btn-sm btn-block" type="button" id="cdBayar" style="margin-top:8px">Catat pembayaran piutang</button>' : '') +
      '</div>' +
      '<div class="row" style="gap:6px;margin-top:10px">' +
      '<button class="btn btn-light btn-sm grow" type="button" id="cdWa"' + (cust.telepon ? '' : ' disabled title="Tambahkan nomor telepon dulu"') + '>💬 WhatsApp</button>' +
      '<button class="btn btn-light btn-sm grow" type="button" id="cdEdit">Ubah data</button>' +
      '</div>' +
      '<h4 style="margin:16px 0 6px;font-size:13px">Riwayat transaksi</h4>' +
      (a.list.length ? '<div class="stack" style="gap:6px">' + a.list.slice().sort(function (x, y) { return new Date(y.waktu) - new Date(x.waktu); }).map(function (t) {
        return '<div class="row between" style="border:1px solid var(--line);border-radius:9px;padding:7px 9px;font-size:11.5px">' +
          '<div><b class="mono">' + UK.escapeHTML(t.id) + '</b><div class="tiny muted">' + UK.tanggalIndo(t.waktu, true) + '</div></div>' +
          '<b>' + UK.rupiah(t.total) + '</b></div>';
      }).join('') + '</div>' : '<p class="tiny muted">Belum ada transaksi.</p>') +
      '<h4 style="margin:16px 0 6px;font-size:13px">Riwayat piutang</h4>' +
      ((cust.piutangHistory && cust.piutangHistory.length) ? '<div class="stack" style="gap:5px">' +
        cust.piutangHistory.slice().reverse().map(function (p) {
          return '<div class="row between tiny"><span class="muted">' + UK.tanggalIndo(p.waktu, true) + ' · ' + UK.escapeHTML(p.catatan || '') + '</span>' +
            '<b class="' + (p.tipe === 'tambah' ? 'amber' : 'green') + '">' + (p.tipe === 'tambah' ? '+' : '−') + UK.rupiah(p.jumlah) + '</b></div>';
        }).join('') + '</div>'
        : '<p class="tiny muted">Belum ada catatan piutang.</p>') +
      '</div></div>';
    document.body.appendChild(wrap);
    function close() { wrap.remove(); }
    wrap.querySelector('[data-x]').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap._ukEsc = close;

    var wa = wrap.querySelector('#cdWa');
    if (wa) {
      wa.addEventListener('click', function () {
        var teks = 'Halo ' + cust.nama + ', terima kasih sudah berbelanja di ' + tenant.nama + '.';
        var link = UK.buatLinkWA(cust.telepon, teks);
        if (link) window.open(link, '_blank', 'noopener');
      });
    }
    wrap.querySelector('#cdEdit').addEventListener('click', function () { close(); modalPelanggan(ctx, cust); });
    var bayarBtn = wrap.querySelector('#cdBayar');
    if (bayarBtn) {
      bayarBtn.addEventListener('click', function () { modalBayar(cust, ctx, close); });
    }
  }

  function modalBayar(cust, ctx, closeDrawer) {
    var sisa = Number(cust.piutang) || 0;
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="pbTitle">' +
      '<div class="modal-head"><h3 id="pbTitle">Catat pembayaran piutang</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="row between"><span class="small muted">Sisa piutang</span><b>' + UK.rupiah(sisa) + '</b></div>' +
      '<div class="field" style="margin-top:10px"><label for="pbJumlah">Jumlah dibayar (Rp) *</label>' +
      '<input type="number" id="pbJumlah" min="1" max="' + sisa + '" step="1000" value="' + sisa + '"></div>' +
      '<div class="field"><label for="pbCatatan">Catatan</label>' +
      '<input type="text" id="pbCatatan" maxlength="100" placeholder="Contoh: Pembayaran tunai"></div>' +
      '</div><div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="pbOk">Simpan pembayaran</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    wrap.querySelector('#pbOk').addEventListener('click', function () {
      var jumlah = UK.parseRupiahInput(wrap.querySelector('#pbJumlah').value);
      if (!jumlah || jumlah <= 0) { UK.toast('Jumlah pembayaran tidak valid.', 'err'); return; }
      if (jumlah > sisa) { UK.toast('Pembayaran melebihi sisa piutang (' + UK.rupiah(sisa) + ').', 'err'); return; }
      var catatan = wrap.querySelector('#pbCatatan').value.trim() || 'Pembayaran piutang';
      var riwayat = (cust.piutangHistory || []).concat([{
        id: 'ph-' + Date.now(), waktu: new Date().toISOString(), jumlah: jumlah,
        tipe: 'bayar', catatan: catatan
      }]);
      db.customers.update(cust.id, { piutang: sisa - jumlah, piutangHistory: riwayat }, ctx.tenant.id);
      close();
      if (closeDrawer) closeDrawer();
      UK.toast('Pembayaran piutang dicatat.', 'ok');
      render(rootEl, ctx);
    });
  }

  UK.registerModule('pelanggan', { render: render });
})();
