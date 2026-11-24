/* ============================================================
   app/js/stok.js — Persediaan stok & riwayat perubahan
   ============================================================ */
(function () {
  'use strict';

  var S = { tab: 'stok', q: '', status: 'semua', onlyLow: false, tipe: '', dari: '', sampai: '', page: 1 };
  var PER_PAGE = 10;
  var rootEl = null, ctxRef = null;

  function statusOf(p) {
    if (p.stok <= 0) return 'habis';
    if (p.stok <= p.stokMin) return 'menipis';
    return 'aman';
  }
  function pill(p) {
    var s = statusOf(p);
    if (s === 'habis') return '<span class="status danger">Habis</span>';
    if (s === 'menipis') return '<span class="status pending">Menipis</span>';
    return '<span class="status success">Aman</span>';
  }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    var products = db.products.list({ tenantId: ctx.tenant.id }).filter(function (p) { return p.status !== 'diarsipkan'; });
    var totalSku = products.length;
    var aman = products.filter(function (p) { return statusOf(p) === 'aman'; }).length;
    var menipis = products.filter(function (p) { return statusOf(p) === 'menipis'; }).length;
    var habis = products.filter(function (p) { return statusOf(p) === 'habis'; }).length;
    var nilai = products.reduce(function (a, p) { return a + p.stok * (Number(p.hargaBeli) || 0); }, 0);

    root.innerHTML =
      '<div class="page-head"><div><h1>Persediaan Stok</h1>' +
      '<div class="sub">Pantau stok, catat barang masuk/keluar, dan lakukan stok opname.</div></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-light btn-sm" type="button" id="btnRiwayat">Riwayat perubahan</button>' +
      '<button class="btn btn-light btn-sm" type="button" id="btnEksporStok">Ekspor CSV</button>' +
      '</div></div>' +

      (menipis + habis > 0 ? '<div class="banner warn"><span>⚠️</span><div class="grow"><b>' + (menipis + habis) +
        ' produk</b> perlu perhatian: ' + menipis + ' menipis, ' + habis + ' habis. Segera restock agar penjualan tidak terhenti.</div>' +
        '<button class="x" type="button" id="bannerLow" aria-label="Tampilkan hanya stok menipis">Lihat</button></div>' : '') +

      '<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
      '<div class="stat-card"><div class="stat-label">Total SKU</div><div class="stat-value">' + totalSku + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Stok aman</div><div class="stat-value green">' + aman + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Stok menipis</div><div class="stat-value amber">' + menipis + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Stok habis</div><div class="stat-value red">' + habis + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Nilai persediaan</div><div class="stat-value">' + UK.rupiah(nilai) + '</div>' +
      '<div class="stat-sub">stok × harga beli</div></div>' +
      '</div>' +

      '<div class="panel" style="margin-top:14px">' +
      '<div class="panel-head"><div class="chips">' +
      '<button class="chip' + (S.tab === 'stok' ? ' active' : '') + '" type="button" data-tab="stok">Stok Produk</button>' +
      '<button class="chip' + (S.tab === 'riwayat' ? ' active' : '') + '" type="button" data-tab="riwayat">Riwayat Perubahan</button>' +
      '</div></div>' +
      '<div id="stokBody"></div>' +
      '</div>';

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.tab = b.getAttribute('data-tab');
        S.page = 1;
        render(root, ctx);
      });
    });
    var bl = document.getElementById('bannerLow');
    if (bl) bl.addEventListener('click', function () {
      S.onlyLow = true;
      S.status = 'semua';
      render(root, ctx);
    });
    document.getElementById('btnRiwayat').addEventListener('click', function () {
      S.tab = 'riwayat'; S.page = 1; render(root, ctx);
    });
    document.getElementById('btnEksporStok').addEventListener('click', function () { eksporStok(ctx, products); });

    renderBody(ctx);
  }

  function renderBody(ctx) {
    var box = document.getElementById('stokBody');
    if (!box) return;
    if (S.tab === 'riwayat') { box.innerHTML = riwayatHTML(ctx); bindRiwayat(ctx); return; }

    var products = db.products.list({ tenantId: ctx.tenant.id }).filter(function (p) { return p.status !== 'diarsipkan'; });
    var list = products.filter(function (p) {
      var s = statusOf(p);
      if (S.onlyLow && s === 'aman') return false;
      if (S.status !== 'semua' && s !== S.status) return false;
      if (S.q) {
        var q = S.q.toLowerCase();
        if (String(p.nama).toLowerCase().indexOf(q) < 0 && String(p.kode || '').toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return a.stok - b.stok || String(a.nama).localeCompare(String(b.nama)); });

    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (S.page > pages) S.page = pages;
    var slice = list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);

    box.innerHTML =
      '<div class="panel-head" style="border-top:1px solid var(--line)">' +
      '<div class="toolbar grow">' +
      '<div class="search-box"><span class="ico">🔍</span>' +
      '<input type="search" id="stokCari" placeholder="Cari produk…" value="' + UK.escapeHTML(S.q) + '" aria-label="Cari produk"></div>' +
      '<select id="stokStatus" aria-label="Filter status stok">' +
      ['semua|Semua status', 'aman|Aman', 'menipis|Menipis', 'habis|Habis'].map(function (o) {
        var v = o.split('|');
        return '<option value="' + v[0] + '"' + (S.status === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
      }).join('') + '</select>' +
      '<label class="check"><input type="checkbox" id="stokLow"' + (S.onlyLow ? ' checked' : '') + '> Hanya stok menipis</label>' +
      '</div></div>' +
      (slice.length ?
        '<div class="table-wrap"><table class="data"><thead><tr><th>Produk</th><th>Status</th>' +
        '<th class="num">Stok</th><th class="num">Min.</th><th class="num">Harga beli</th><th class="num">Nilai stok</th><th>Aksi</th>' +
        '</tr></thead><tbody>' +
        slice.map(function (p) {
          return '<tr>' +
            '<td><div class="cell-main"><span class="thumb">' + (p.foto ? '<img src="' + p.foto + '" alt="">' : UK.escapeHTML(p.emoji || '📦')) + '</span>' +
            '<div><div class="t">' + UK.escapeHTML(p.nama) + '</div><div class="s">' + UK.escapeHTML(p.kode || '-') + '</div></div></div></td>' +
            '<td>' + pill(p) + '</td>' +
            '<td class="num"><b>' + p.stok + '</b></td>' +
            '<td class="num"><input type="number" min="0" step="1" value="' + p.stokMin + '" data-min="' + p.id +
            '" style="width:56px;padding:3px 5px;text-align:center" aria-label="Stok minimum ' + UK.escapeHTML(p.nama) + '"></td>' +
            '<td class="num">' + UK.rupiah(p.hargaBeli) + '</td>' +
            '<td class="num">' + UK.rupiah(p.stok * p.hargaBeli) + '</td>' +
            '<td><div class="action-btns">' +
            '<button class="btn btn-xs btn-light" type="button" data-move="masuk" data-id="' + p.id + '">＋ Masuk</button>' +
            '<button class="btn btn-xs btn-light" type="button" data-move="keluar" data-id="' + p.id + '">− Keluar</button>' +
            '<button class="btn btn-xs btn-light" type="button" data-move="sesuai" data-id="' + p.id + '">Opname</button>' +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>' + UK.pager(list.length, S.page, PER_PAGE)
        : '<div class="empty-note"><span class="ico">📊</span><b>Tidak ada produk</b><span>Ubah filter atau tambahkan produk baru.</span></div>');

    var cari = document.getElementById('stokCari');
    cari.addEventListener('input', UK.debounce(function () { S.q = cari.value; S.page = 1; renderBody(ctx); }, 200));
    document.getElementById('stokStatus').addEventListener('change', function () {
      S.status = this.value; S.page = 1; renderBody(ctx);
    });
    document.getElementById('stokLow').addEventListener('change', function () {
      S.onlyLow = this.checked; S.page = 1; renderBody(ctx);
    });
    UK.bindPager(box, function (n) { S.page = n; renderBody(ctx); });

    box.querySelectorAll('[data-min]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var v = Math.max(0, parseInt(inp.value, 10) || 0);
        db.products.update(inp.getAttribute('data-min'), { stokMin: v }, ctx.tenant.id);
        UK.toast('Stok minimum diperbarui.', 'ok');
        if (ctx.refreshShell) ctx.refreshShell();
      });
    });
    box.querySelectorAll('[data-move]').forEach(function (b) {
      b.addEventListener('click', function () {
        var prod = db.products.get(b.getAttribute('data-id'), ctx.tenant.id);
        if (prod) modalPergerakan(prod, b.getAttribute('data-move'), ctx);
      });
    });
  }

  function modalPergerakan(prod, mode, ctx) {
    var titles = { masuk: 'Barang masuk', keluar: 'Barang keluar', sesuai: 'Penyesuaian stok (opname)' };
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML =
      '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="mvTitle">' +
      '<div class="modal-head"><h3 id="mvTitle">' + titles[mode] + '</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="row between" style="margin-bottom:10px"><span class="small muted">Produk</span><b class="small">' + UK.escapeHTML(prod.nama) + '</b></div>' +
      '<div class="row between" style="margin-bottom:12px"><span class="small muted">Stok saat ini</span><b>' + prod.stok + '</b></div>' +
      (mode === 'sesuai'
        ? '<div class="field"><label for="mvAktual">Stok aktual hasil hitung *</label>' +
          '<input type="number" id="mvAktual" min="0" step="1" value="' + prod.stok + '">' +
          '<span class="hint">Selisih: <b id="mvSelisih">0</b></span></div>'
        : '<div class="field"><label for="mvJumlah">Jumlah *</label>' +
          '<input type="number" id="mvJumlah" min="1" step="1" value="1">' +
          '<span class="hint">Stok setelah: <b id="mvHasil">' + (mode === 'masuk' ? prod.stok + 1 : Math.max(0, prod.stok - 1)) + '</b></span></div>') +
      '<div class="field"><label for="mvCatatan">Catatan' + (mode === 'sesuai' ? ' *' : '') + '</label>' +
      '<input type="text" id="mvCatatan" maxlength="120" placeholder="' +
      (mode === 'masuk' ? 'Contoh: Restock dari supplier' : (mode === 'keluar' ? 'Contoh: Barang rusak' : 'Contoh: Hasil stok opname mingguan')) + '"></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="mvSave">Simpan</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });

    var input = wrap.querySelector(mode === 'sesuai' ? '#mvAktual' : '#mvJumlah');
    function preview() {
      if (mode === 'sesuai') {
        var aktual = Math.max(0, parseInt(input.value, 10) || 0);
        wrap.querySelector('#mvSelisih').textContent = (aktual - prod.stok > 0 ? '+' : '') + (aktual - prod.stok);
      } else {
        var n = Math.max(1, parseInt(input.value, 10) || 1);
        wrap.querySelector('#mvHasil').textContent = mode === 'masuk' ? prod.stok + n : Math.max(0, prod.stok - n);
      }
    }
    input.addEventListener('input', preview);
    preview();

    wrap.querySelector('#mvSave').addEventListener('click', function () {
      var catatan = wrap.querySelector('#mvCatatan').value.replace(/\s+/g, ' ').trim();
      var jumlah, saldo;
      if (mode === 'sesuai') {
        var aktual = parseInt(input.value, 10);
        if (isNaN(aktual) || aktual < 0) { UK.toast('Stok aktual tidak valid.', 'err'); return; }
        jumlah = aktual - prod.stok;
        saldo = aktual;
        if (!catatan) { UK.toast('Catatan wajib diisi untuk penyesuaian.', 'err'); return; }
        if (jumlah === 0) { UK.toast('Tidak ada selisih untuk disesuaikan.', 'warn'); close(); return; }
      } else {
        var n = parseInt(input.value, 10);
        if (isNaN(n) || n <= 0) { UK.toast('Jumlah harus lebih dari 0.', 'err'); return; }
        if (mode === 'keluar' && n > prod.stok) { UK.toast('Jumlah keluar melebihi stok tersedia (' + prod.stok + ').', 'err'); return; }
        jumlah = mode === 'masuk' ? n : -n;
        saldo = prod.stok + jumlah;
      }
      if (saldo < 0) { UK.toast('Stok tidak boleh negatif.', 'err'); return; }

      try {
        db.products.update(prod.id, { stok: saldo }, ctx.tenant.id);
        db.stockMovements.create({
          tenantId: ctx.tenant.id, productId: prod.id, tipe: mode === 'sesuai' ? 'penyesuaian' : mode,
          jumlah: jumlah, saldo: saldo,
          catatan: catatan || (mode === 'masuk' ? 'Barang masuk' : 'Barang keluar'),
          waktu: new Date().toISOString()
        });
        db.systemLogs.add('info', 'Stok ' + prod.nama + ' → ' + saldo + ' (' + (jumlah > 0 ? '+' : '') + jumlah + ')');
        close();
        UK.toast('Stok diperbarui: ' + prod.nama + ' → ' + saldo, 'ok');
        render(rootEl, ctx);
        if (ctx.refreshShell) ctx.refreshShell();
      } catch (e) { UK.toast(e.message, 'err'); }
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  }

  /* ---------------- riwayat ---------------- */
  function movementList(ctx) {
    var products = {};
    db.products.list({ tenantId: ctx.tenant.id }).forEach(function (p) { products[p.id] = p; });
    var list = db.stockMovements.list({ tenantId: ctx.tenant.id }).filter(function (m) {
      if (S.tipe && m.tipe !== S.tipe) return false;
      var w = new Date(m.waktu).getTime();
      if (S.dari && w < new Date(S.dari + 'T00:00:00').getTime()) return false;
      if (S.sampai && w > new Date(S.sampai + 'T23:59:59').getTime()) return false;
      return true;
    }).sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
    return { list: list, products: products };
  }

  function riwayatHTML(ctx) {
    var res = movementList(ctx);
    var pages = Math.max(1, Math.ceil(res.list.length / PER_PAGE));
    if (S.page > pages) S.page = pages;
    var slice = res.list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
    var tipeLabel = { masuk: '<span class="status success">Masuk</span>', keluar: '<span class="status pending">Keluar</span>', penyesuaian: '<span class="status info">Penyesuaian</span>', penjualan: '<span class="status orange">Penjualan</span>' };

    return '<div class="panel-head" style="border-top:1px solid var(--line)">' +
      '<div class="toolbar grow">' +
      '<select id="rwTipe" aria-label="Filter tipe"><option value="">Semua tipe</option>' +
      ['masuk|Masuk', 'keluar|Keluar', 'penyesuaian|Penyesuaian', 'penjualan|Penjualan'].map(function (o) {
        var v = o.split('|');
        return '<option value="' + v[0] + '"' + (S.tipe === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
      }).join('') + '</select>' +
      '<input type="date" id="rwDari" value="' + S.dari + '" aria-label="Dari tanggal" style="width:auto">' +
      '<input type="date" id="rwSampai" value="' + S.sampai + '" aria-label="Sampai tanggal" style="width:auto">' +
      '<button class="btn btn-xs btn-light" type="button" id="rwReset">Reset</button>' +
      '</div>' +
      '<button class="btn btn-xs btn-light" type="button" id="rwEkspor">Ekspor CSV</button></div>' +
      (slice.length ?
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Waktu</th><th>Produk</th><th>Tipe</th><th class="num">Jumlah</th><th class="num">Saldo</th><th>Catatan</th>' +
        '</tr></thead><tbody>' +
        slice.map(function (m) {
          var p = res.products[m.productId];
          return '<tr><td class="nowrap">' + UK.tanggalIndo(m.waktu, true) + '</td>' +
            '<td>' + UK.escapeHTML(p ? p.nama : 'Produk dihapus') + '</td>' +
            '<td>' + (tipeLabel[m.tipe] || UK.escapeHTML(m.tipe)) + '</td>' +
            '<td class="num ' + (m.jumlah > 0 ? 'green' : (m.jumlah < 0 ? 'red' : '')) + '">' +
            (m.jumlah > 0 ? '+' : '') + m.jumlah + '</td>' +
            '<td class="num"><b>' + (m.saldo == null ? '-' : m.saldo) + '</b></td>' +
            '<td class="small muted">' + UK.escapeHTML(m.catatan || '-') + '</td></tr>';
        }).join('') + '</tbody></table></div>' + UK.pager(res.list.length, S.page, PER_PAGE)
        : '<div class="empty-note"><span class="ico">🗂️</span><b>Belum ada riwayat</b><span>Perubahan stok akan tercatat di sini.</span></div>');
  }

  function bindRiwayat(ctx) {
    var box = document.getElementById('stokBody');
    document.getElementById('rwTipe').addEventListener('change', function () { S.tipe = this.value; S.page = 1; renderBody(ctx); });
    document.getElementById('rwDari').addEventListener('change', function () { S.dari = this.value; S.page = 1; renderBody(ctx); });
    document.getElementById('rwSampai').addEventListener('change', function () { S.sampai = this.value; S.page = 1; renderBody(ctx); });
    document.getElementById('rwReset').addEventListener('click', function () {
      S.tipe = ''; S.dari = ''; S.sampai = ''; S.page = 1; renderBody(ctx);
    });
    document.getElementById('rwEkspor').addEventListener('click', function () {
      var res = movementList(ctx);
      var rows = [['Waktu', 'Produk', 'Tipe', 'Jumlah', 'Saldo', 'Catatan']];
      res.list.forEach(function (m) {
        var p = res.products[m.productId];
        rows.push([UK.tanggalIndo(m.waktu, true), p ? p.nama : '-', m.tipe, m.jumlah, m.saldo == null ? '' : m.saldo, m.catatan || '']);
      });
      UK.downloadCSV('riwayat-stok-' + UK.tanggalInput(new Date()), rows);
      UK.toast('Riwayat stok diekspor.', 'ok');
    });
    UK.bindPager(box, function (n) { S.page = n; renderBody(ctx); });
  }

  function eksporStok(ctx, products) {
    var rows = [['Kode', 'Nama', 'Kategori', 'Stok', 'Stok minimum', 'Status', 'Harga beli', 'Nilai stok']];
    var cats = {};
    db.categories.list({ tenantId: ctx.tenant.id }).forEach(function (c) { cats[c.id] = c.nama; });
    products.forEach(function (p) {
      rows.push([p.kode || '', p.nama, cats[p.kategoriId] || '', p.stok, p.stokMin,
        statusOf(p), p.hargaBeli, p.stok * p.hargaBeli]);
    });
    UK.downloadCSV('stok-produk-' + UK.tanggalInput(new Date()), rows);
    UK.toast('Data stok diekspor.', 'ok');
  }

  UK.registerModule('stok', { render: render });
})();
