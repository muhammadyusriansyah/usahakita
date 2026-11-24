/* ============================================================
   app/js/produk.js — Produk & kategori
   ============================================================ */
(function () {
  'use strict';

  var S = { q: '', kategori: '', status: 'semua', sort: 'nama', page: 1, view: 'tabel', dirty: false };
  var PER_PAGE = 10;
  var rootEl = null;
  var ctxRef = null;

  function money(n) { return UK.rupiah(n); }

  function statusPill(status) {
    if (status === 'dipublikasikan') return '<span class="status success">Dipublikasikan</span>';
    if (status === 'draf') return '<span class="status pending">Draf</span>';
    return '<span class="status">Diarsipkan</span>';
  }

  function filtered(ctx) {
    var products = db.products.list({ tenantId: ctx.tenant.id });
    var cats = {};
    db.categories.list({ tenantId: ctx.tenant.id }).forEach(function (c) { cats[c.id] = c; });

    var list = products.filter(function (p) {
      if (S.status === 'diarsipkan') { if (p.status !== 'diarsipkan') return false; }
      else {
        if (p.status === 'diarsipkan') return false;
        if (S.status !== 'semua' && p.status !== S.status) return false;
      }
      if (S.kategori && p.kategoriId !== S.kategori) return false;
      if (S.q) {
        var q = S.q.toLowerCase();
        if (String(p.nama).toLowerCase().indexOf(q) < 0 &&
          String(p.kode || '').toLowerCase().indexOf(q) < 0 &&
          String(p.barcode || '').toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });

    list.sort(function (a, b) {
      if (S.sort === 'nama') return String(a.nama).localeCompare(String(b.nama));
      if (S.sort === 'harga-asc') return a.hargaJual - b.hargaJual;
      if (S.sort === 'harga-desc') return b.hargaJual - a.hargaJual;
      if (S.sort === 'stok-asc') return a.stok - b.stok;
      return 0;
    });

    return { list: list, cats: cats };
  }

  function margin(p) {
    if (!p.hargaBeli) return '<span class="muted">-</span>';
    var m = Math.round(((p.hargaJual - p.hargaBeli) / p.hargaBeli) * 100);
    var cls = m >= 0 ? 'green' : 'red';
    return '<span class="' + cls + '">' + m + '%</span>';
  }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    var tenant = ctx.tenant;
    var productsAll = db.products.list({ tenantId: tenant.id });
    var active = productsAll.filter(function (p) { return p.status !== 'diarsipkan'; });
    var plan = db.plans.get(tenant.paket) || db.plans.get('free');
    var limit = plan.batas.produk;
    var full = active.length >= limit;

    var res = filtered(ctx);
    var total = res.list.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (S.page > pages) S.page = pages;
    var slice = res.list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
    var cats = db.categories.list({ tenantId: tenant.id });
    var slug = tenant.slug;

    var html = '' +
      '<div class="page-head"><div><h1>Produk</h1>' +
      '<div class="sub">' + active.length + ' produk aktif · ' + cats.length + ' kategori</div></div>' +
      '<div class="page-actions">' +
      '<button class="btn btn-light btn-sm" type="button" id="btnKategori">Kelola kategori</button>' +
      '<button class="btn btn-light btn-sm" type="button" id="btnSalin">Salin tautan katalog</button>' +
      '<a class="btn btn-light btn-sm" href="../toko/index.html?u=' + encodeURIComponent(slug) + '" target="_blank" rel="noopener">Lihat di katalog</a>' +
      (!ctx.isKasir ? '<button class="btn btn-primary btn-sm" type="button" id="btnTambah"' + (full ? ' disabled title="Batas paket tercapai"' : '') + '>＋ Tambah produk</button>' : '') +
      '</div></div>' +

      '<div class="card" style="padding:12px 14px;margin-bottom:12px">' +
      '<div class="row between wrap">' +
      '<div class="small"><b>Kapasitas paket ' + UK.escapeHTML(plan.nama) + '</b> — ' + active.length + ' / ' +
      (limit >= 100000 ? 'tak terbatas' : limit) + ' produk</div>' +
      '<span class="tiny muted">' + (full ? 'Batas tercapai. Upgrade untuk menambah produk.' : 'Masih bisa menambah ' + Math.max(0, limit - active.length) + ' produk') + '</span>' +
      '</div>' +
      '<div class="bar-track" style="margin-top:7px"><div class="bar-fill" style="width:' + Math.min(100, Math.round((active.length / Math.max(1, limit)) * 100)) + '%"></div></div>' +
      '</div>' +

      '<div class="panel">' +
      '<div class="panel-head no-print" style="gap:8px">' +
      '<div class="toolbar grow">' +
      '<div class="search-box"><span class="ico">🔍</span>' +
      '<input type="search" id="prodCari" placeholder="Cari nama, kode, atau barcode…" value="' + UK.escapeHTML(S.q) + '" aria-label="Cari produk"></div>' +
      '<select id="prodKategori" aria-label="Filter kategori"><option value="">Semua kategori</option>' +
      cats.map(function (c) {
        return '<option value="' + c.id + '"' + (S.kategori === c.id ? ' selected' : '') + '>' + UK.escapeHTML(c.nama) + '</option>';
      }).join('') + '</select>' +
      '<select id="prodStatus" aria-label="Filter status">' +
      ['semua|Semua status', 'dipublikasikan|Dipublikasikan', 'draf|Draf', 'diarsipkan|Diarsipkan'].map(function (o) {
        var v = o.split('|');
        return '<option value="' + v[0] + '"' + (S.status === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
      }).join('') + '</select>' +
      '<select id="prodSort" aria-label="Urutkan">' +
      ['nama|Nama A–Z', 'harga-asc|Harga terendah', 'harga-desc|Harga tertinggi', 'stok-asc|Stok tersedikit'].map(function (o) {
        var v = o.split('|');
        return '<option value="' + v[0] + '"' + (S.sort === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
      }).join('') + '</select>' +
      '</div>' +
      '<div class="row" style="gap:4px">' +
      '<button class="btn btn-xs ' + (S.view === 'tabel' ? 'btn-navy' : 'btn-light') + '" type="button" data-view="tabel" aria-label="Tampilan tabel">Tabel</button>' +
      '<button class="btn btn-xs ' + (S.view === 'kartu' ? 'btn-navy' : 'btn-light') + '" type="button" data-view="kartu" aria-label="Tampilan kartu">Kartu</button>' +
      '</div>' +
      '</div>' +
      '<div id="prodBody">' + bodyHTML(slice, total, cats, ctx) + '</div>' +
      '</div>';

    root.innerHTML = html;

    var cari = document.getElementById('prodCari');
    cari.addEventListener('input', UK.debounce(function () {
      S.q = cari.value; S.page = 1; refreshBody();
    }, 220));
    document.getElementById('prodKategori').addEventListener('change', function () {
      S.kategori = this.value; S.page = 1; refreshBody();
    });
    document.getElementById('prodStatus').addEventListener('change', function () {
      S.status = this.value; S.page = 1; refreshBody();
    });
    document.getElementById('prodSort').addEventListener('change', function () {
      S.sort = this.value; S.page = 1; refreshBody();
    });
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.view = b.getAttribute('data-view');
        UK.prefSet('produkView', S.view);
        render(root, ctx);
      });
    });
    document.getElementById('btnKategori').addEventListener('click', function () { openKategoriModal(ctx); });
    document.getElementById('btnSalin').addEventListener('click', function () {
      var url = location.origin + location.pathname.replace(/app\/index\.html$/, '') + 'toko/index.html?u=' + slug;
      salin(url);
    });
    var btnTambah = document.getElementById('btnTambah');
    if (btnTambah) {
      btnTambah.addEventListener('click', function () {
        if (full) { UK.toast('Batas produk paket ' + plan.nama + ' tercapai. Upgrade untuk menambah.', 'warn'); return; }
        openProductModal(ctx, null);
      });
    }
    bindBody(ctx);
  }

  function bodyHTML(slice, total, cats, ctx) {
    if (!total) {
      return '<div class="empty-note"><span class="ico">📦</span><b>Belum ada produk</b>' +
        '<span>Tambahkan produk pertama Anda agar bisa dijual di kasir dan tampil di katalog.</span>' +
        '<button class="btn btn-primary btn-sm" type="button" id="emptyTambah" style="margin-top:8px">Tambah produk</button></div>';
    }
    if (S.view === 'kartu') {
      return '<div class="panel-body"><div class="product-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">' +
        slice.map(function (p) {
          var cat = cats.filter(function (c) { return c.id === p.kategoriId; })[0];
          return '<div class="pcard" style="cursor:default">' +
            '<div class="ph">' + (p.foto ? '<img src="' + p.foto + '" alt="' + UK.escapeHTML(p.nama) + '">' : UK.escapeHTML(p.emoji || '📦')) + '</div>' +
            '<div class="nm">' + UK.escapeHTML(p.nama) + '</div>' +
            '<div class="pr">' + money(p.hargaJual) + '</div>' +
            '<div class="st">' + UK.escapeHTML(cat ? cat.nama : '-') + ' · stok ' + p.stok + '</div>' +
            '<div>' + statusPill(p.status) + '</div>' +
            '<div class="row" style="gap:4px;margin-top:2px">' +
            (!ctx.isKasir ? '<button class="btn btn-xs btn-light" type="button" data-edit="' + p.id + '">Ubah</button>' : '') +
            (p.status === 'diarsipkan'
              ? '<button class="btn btn-xs btn-light" type="button" data-restore="' + p.id + '">Pulihkan</button>'
              : (!ctx.isKasir ? '<button class="btn btn-xs btn-danger" type="button" data-archive="' + p.id + '">Arsipkan</button>' : '')) +
            '</div></div>';
        }).join('') +
        '</div></div>' + UK.pager(total, S.page, PER_PAGE);
    }
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Produk</th><th>Kategori</th><th class="num">Harga beli</th><th class="num">Harga jual</th>' +
      '<th class="num">Margin</th><th class="num">Stok</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      slice.map(function (p) {
        var cat = cats.filter(function (c) { return c.id === p.kategoriId; })[0];
        var low = p.stok <= p.stokMin;
        return '<tr>' +
          '<td><div class="cell-main"><span class="thumb">' + (p.foto ? '<img src="' + p.foto + '" alt="">' : UK.escapeHTML(p.emoji || '📦')) + '</span>' +
          '<div style="min-width:0"><div class="t ellipsis">' + UK.escapeHTML(p.nama) + '</div>' +
          '<div class="s">' + UK.escapeHTML(p.kode || '-') + (p.barcode ? ' · ' + UK.escapeHTML(p.barcode) : '') + '</div></div></div></td>' +
          '<td>' + UK.escapeHTML(cat ? cat.nama : '-') + '</td>' +
          '<td class="num">' + money(p.hargaBeli) + '</td>' +
          '<td class="num"><b>' + money(p.hargaJual) + '</b></td>' +
          '<td class="num">' + margin(p) + '</td>' +
          '<td class="num"><span class="' + (p.stok === 0 ? 'red' : (low ? 'amber' : '')) + '"><b>' + p.stok + '</b></span></td>' +
          '<td>' + statusPill(p.status) + '</td>' +
          '<td><div class="action-btns">' +
          (!ctx.isKasir ? '<button class="btn btn-xs btn-light" type="button" data-edit="' + p.id + '" aria-label="Ubah ' + UK.escapeHTML(p.nama) + '">Ubah</button>' : '') +
          (p.status === 'diarsipkan'
            ? '<button class="btn btn-xs btn-light" type="button" data-restore="' + p.id + '">Pulihkan</button>'
            : (!ctx.isKasir ? '<button class="btn btn-xs btn-danger" type="button" data-archive="' + p.id + '" aria-label="Arsipkan ' + UK.escapeHTML(p.nama) + '">Arsip</button>' : '')) +
          '</div></td></tr>';
      }).join('') +
      '</tbody></table></div>' + UK.pager(total, S.page, PER_PAGE);
  }

  function refreshBody() {
    var res = filtered(ctxRef);
    var total = res.list.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (S.page > pages) S.page = pages;
    var slice = res.list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
    var cats = db.categories.list({ tenantId: ctxRef.tenant.id });
    var box = document.getElementById('prodBody');
    if (!box) return;
    box.innerHTML = bodyHTML(slice, total, cats, ctxRef);
    bindBody(ctxRef);
  }

  function bindBody(ctx) {
    var box = document.getElementById('prodBody');
    if (!box) return;
    UK.bindPager(box, function (n) { S.page = n; refreshBody(); });
    box.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = db.products.get(b.getAttribute('data-edit'), ctx.tenant.id);
        if (p) openProductModal(ctx, p);
      });
    });
    box.querySelectorAll('[data-archive]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-archive');
        var p = db.products.get(id, ctx.tenant.id);
        if (!p) return;
        UK.confirmDialog('Arsipkan <b>' + UK.escapeHTML(p.nama) + '</b>? Produk tidak akan tampil di katalog dan kasir, tetapi riwayat transaksi tetap tersimpan.',
          { okText: 'Arsipkan', danger: true, title: 'Arsipkan produk' }).then(function (yes) {
            if (!yes) return;
            db.products.update(id, { status: 'diarsipkan' }, ctx.tenant.id);
            UK.toast('Produk diarsipkan.', 'ok');
            render(rootEl, ctx);
          });
      });
    });
    box.querySelectorAll('[data-restore]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-restore');
        db.products.update(id, { status: 'draf' }, ctx.tenant.id);
        UK.toast('Produk dipulihkan sebagai draf. Publikasikan bila siap tampil.', 'ok');
        render(rootEl, ctx);
      });
    });
    var emptyTambah = box.querySelector('#emptyTambah');
    if (emptyTambah) emptyTambah.addEventListener('click', function () { openProductModal(ctx, null); });
  }

  /* ---------------- form produk ---------------- */
  function openProductModal(ctx, product) {
    var tenantId = ctx.tenant.id;
    var cats = db.categories.list({ tenantId: tenantId });
    var isEdit = !!product;
    var p = product || {
      nama: '', kode: '', barcode: '', kategoriId: cats[0] ? cats[0].id : '', deskripsi: '',
      hargaBeli: 0, hargaJual: 0, stok: 0, stokMin: 5, foto: '', emoji: '📦',
      status: 'dipublikasikan', varian: []
    };
    var fotoData = p.foto || '';
    var varian = (p.varian || []).slice();

    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML =
      '<div class="modal-box wide" role="dialog" aria-modal="true" aria-labelledby="prodModalTitle">' +
      '<div class="modal-head"><h3 id="prodModalTitle">' + (isEdit ? 'Ubah produk' : 'Tambah produk') + '</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body"><form id="prodForm" novalidate>' +
      '<div class="grid-2">' +
      '<div class="field" id="pfNama"><label for="pfNamaI">Nama produk *</label>' +
      '<input type="text" id="pfNamaI" maxlength="80" value="' + UK.escapeHTML(p.nama) + '" required>' +
      '<span class="err">Nama produk wajib diisi.</span></div>' +
      '<div class="field"><label for="pfKode">Kode produk</label>' +
      '<input type="text" id="pfKode" value="' + UK.escapeHTML(p.kode || '') + '" placeholder="Otomatis bila kosong">' +
      '<span class="hint">Dipakai untuk pencarian cepat di kasir.</span></div>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="field"><label for="pfBarcode">Barcode</label>' +
      '<input type="text" id="pfBarcode" inputmode="numeric" value="' + UK.escapeHTML(p.barcode || '') + '" placeholder="Opsional"></div>' +
      '<div class="field"><label for="pfKategori">Kategori</label>' +
      '<div class="input-group"><select id="pfKategori">' +
      cats.map(function (c) {
        return '<option value="' + c.id + '"' + (p.kategoriId === c.id ? ' selected' : '') + '>' + UK.escapeHTML(c.nama) + '</option>';
      }).join('') + '</select>' +
      '<button class="btn btn-light btn-sm" type="button" id="pfAddCat" title="Tambah kategori baru">＋</button></div>' +
      '<div class="input-group hidden" id="pfCatRow" style="margin-top:6px">' +
      '<input type="text" id="pfCatName" placeholder="Nama kategori baru">' +
      '<button class="btn btn-primary btn-sm" type="button" id="pfCatSave">Simpan</button></div></div>' +
      '</div>' +
      '<div class="field"><label for="pfDesk">Deskripsi singkat</label>' +
      '<textarea id="pfDesk" maxlength="200" rows="2" placeholder="Tampil di katalog online">' + UK.escapeHTML(p.deskripsi || '') + '</textarea>' +
      '<span class="hint"><span id="pfDeskCount">' + String(p.deskripsi || '').length + '</span>/200 karakter</span></div>' +
      '<div class="grid-3">' +
      '<div class="field"><label for="pfBeli">Harga beli (Rp)</label>' +
      '<input type="number" id="pfBeli" min="0" step="500" value="' + (p.hargaBeli || 0) + '"></div>' +
      '<div class="field" id="pfJualF"><label for="pfJual">Harga jual (Rp) *</label>' +
      '<input type="number" id="pfJual" min="0" step="500" value="' + (p.hargaJual || 0) + '" required>' +
      '<span class="err">Harga jual harus lebih dari 0.</span>' +
      '<span class="hint red hidden" id="pfWarnJual">Harga jual lebih rendah dari harga beli.</span></div>' +
      '<div class="field"><label for="pfStok">Stok ' + (isEdit ? 'saat ini' : 'awal') + '</label>' +
      '<input type="number" id="pfStok" min="0" step="1" value="' + (p.stok || 0) + '">' +
      (isEdit ? '<span class="hint">Perubahan stok dicatat sebagai penyesuaian.</span>' : '') + '</div>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="field"><label for="pfMin">Stok minimum</label>' +
      '<input type="number" id="pfMin" min="0" step="1" value="' + (p.stokMin || 0) + '"></div>' +
      '<div class="field"><label for="pfStatus">Status</label>' +
      '<select id="pfStatus">' +
      '<option value="dipublikasikan"' + (p.status === 'dipublikasikan' ? ' selected' : '') + '>Dipublikasikan (tampil di katalog)</option>' +
      '<option value="draf"' + (p.status === 'draf' ? ' selected' : '') + '>Draf</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="field"><label>Foto produk</label>' +
      '<div class="row top" style="align-items:flex-start">' +
      '<div class="thumb" id="pfFotoPrev" style="width:76px;height:76px;border-radius:12px;font-size:30px">' +
      (fotoData ? '<img src="' + fotoData + '" alt="Pratinjau foto">' : UK.escapeHTML(p.emoji || '📦')) + '</div>' +
      '<div class="grow"><input type="file" id="pfFoto" accept="image/*" aria-label="Unggah foto produk">' +
      '<span class="hint">Maksimal 500 KB. Foto otomatis dipotong menjadi persegi 1:1.</span>' +
      '<div class="row" style="gap:6px;margin-top:6px">' +
      '<button class="btn btn-xs btn-light" type="button" id="pfFotoHapus">Hapus foto</button>' +
      '<select id="pfEmoji" style="width:auto;font-size:11px" aria-label="Emoji produk">' +
      ['📦', '🍛', '🍜', '🍗', '🧋', '☕', '🍊', '🍞', '🍌', '🍱', '🍟', '🌶️', '🍪', '👕', '💍', '🧴', '🔧'].map(function (e) {
        return '<option value="' + e + '"' + (p.emoji === e ? ' selected' : '') + '>' + e + ' Emoji</option>';
      }).join('') + '</select></div></div></div></div>' +
      '<div class="field"><label>Varian (opsional)</label>' +
      '<div id="pfVarianList" class="stack" style="gap:6px"></div>' +
      '<button class="btn btn-xs btn-light" type="button" id="pfAddVarian" style="justify-self:start">＋ Tambah varian</button></div>' +
      '</form></div>' +
      '<div class="modal-foot">' +
      '<button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="pfSimpan">' + (isEdit ? 'Simpan perubahan' : 'Simpan produk') + '</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);

    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 200); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    var desk = wrap.querySelector('#pfDesk');
    desk.addEventListener('input', function () {
      wrap.querySelector('#pfDeskCount').textContent = desk.value.length;
    });

    wrap.querySelector('#pfBeli').addEventListener('input', cekHarga);
    wrap.querySelector('#pfJual').addEventListener('input', cekHarga);
    function cekHarga() {
      var beli = UK.parseRupiahInput(wrap.querySelector('#pfBeli').value);
      var jual = UK.parseRupiahInput(wrap.querySelector('#pfJual').value);
      wrap.querySelector('#pfWarnJual').classList.toggle('hidden', !(jual > 0 && jual < beli));
    }

    /* kategori baru inline */
    wrap.querySelector('#pfAddCat').addEventListener('click', function () {
      wrap.querySelector('#pfCatRow').classList.toggle('hidden');
      wrap.querySelector('#pfCatName').focus();
    });
    wrap.querySelector('#pfCatSave').addEventListener('click', function () {
      var nama = wrap.querySelector('#pfCatName').value.trim();
      if (!nama) { UK.toast('Nama kategori wajib diisi.', 'err'); return; }
      try {
        var c = db.categories.create({ tenantId: tenantId, nama: titleCase(nama) });
        var sel = wrap.querySelector('#pfKategori');
        var opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.nama; opt.selected = true;
        sel.appendChild(opt);
        wrap.querySelector('#pfCatName').value = '';
        wrap.querySelector('#pfCatRow').classList.add('hidden');
        UK.toast('Kategori ditambahkan.', 'ok');
      } catch (e) { UK.toast(e.message, 'err'); }
    });

    /* varian */
    function renderVarian() {
      var box = wrap.querySelector('#pfVarianList');
      box.innerHTML = varian.map(function (v, i) {
        return '<div class="row" style="gap:6px">' +
          '<input type="text" data-vnama="' + i + '" value="' + UK.escapeHTML(v.nama) + '" placeholder="Nama varian" style="flex:2">' +
          '<input type="number" data-vtambah="' + i + '" value="' + (v.tambahan || 0) + '" placeholder="+Rp" style="flex:1" min="0">' +
          '<button class="btn btn-xs btn-danger" type="button" data-vdel="' + i + '" aria-label="Hapus varian">✕</button></div>';
      }).join('');
      box.querySelectorAll('[data-vnama]').forEach(function (inp) {
        inp.addEventListener('input', function () { varian[Number(inp.getAttribute('data-vnama'))].nama = inp.value; });
      });
      box.querySelectorAll('[data-vtambah]').forEach(function (inp) {
        inp.addEventListener('input', function () { varian[Number(inp.getAttribute('data-vtambah'))].tambahan = Math.max(0, Number(inp.value) || 0); });
      });
      box.querySelectorAll('[data-vdel]').forEach(function (b) {
        b.addEventListener('click', function () { varian.splice(Number(b.getAttribute('data-vdel')), 1); renderVarian(); });
      });
    }
    renderVarian();
    wrap.querySelector('#pfAddVarian').addEventListener('click', function () {
      varian.push({ nama: '', tambahan: 0 });
      renderVarian();
    });

    /* foto */
    var fotoInput = wrap.querySelector('#pfFoto');
    fotoInput.addEventListener('change', function () {
      var file = fotoInput.files && fotoInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { UK.toast('File harus berupa gambar.', 'err'); fotoInput.value = ''; return; }
      if (file.size > 500 * 1024) { UK.toast('Ukuran foto maksimal 500 KB.', 'err'); fotoInput.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () {
        cropSquare(reader.result, function (dataUrl) {
          fotoData = dataUrl;
          wrap.querySelector('#pfFotoPrev').innerHTML = '<img src="' + dataUrl + '" alt="Pratinjau foto">';
          UK.toast('Foto siap disimpan.', 'ok');
        });
      };
      reader.readAsDataURL(file);
    });
    wrap.querySelector('#pfFotoHapus').addEventListener('click', function () {
      fotoData = '';
      wrap.querySelector('#pfFotoPrev').innerHTML = UK.escapeHTML(wrap.querySelector('#pfEmoji').value || '📦');
    });
    wrap.querySelector('#pfEmoji').addEventListener('change', function () {
      if (fotoData) return;
      wrap.querySelector('#pfFotoPrev').textContent = this.value;
    });

    wrap.querySelector('#pfSimpan').addEventListener('click', function () {
      var nama = wrap.querySelector('#pfNamaI').value.trim().replace(/\s+/g, ' ');
      var jual = UK.parseRupiahInput(wrap.querySelector('#pfJual').value);
      var beli = UK.parseRupiahInput(wrap.querySelector('#pfBeli').value);
      var stok = Math.max(0, parseInt(wrap.querySelector('#pfStok').value, 10) || 0);
      var min = Math.max(0, parseInt(wrap.querySelector('#pfMin').value, 10) || 0);
      var bad = false;
      wrap.querySelector('#pfNama').classList.toggle('invalid', nama.length < 2);
      wrap.querySelector('#pfJualF').classList.toggle('invalid', jual <= 0);
      if (nama.length < 2 || jual <= 0) bad = true;
      if (bad) { UK.toast('Periksa kembali data produk.', 'err'); return; }

      var kode = wrap.querySelector('#pfKode').value.trim().toUpperCase();
      if (!kode) kode = autoKode(ctx, nama);
      var payload = {
        nama: nama,
        kode: kode,
        barcode: wrap.querySelector('#pfBarcode').value.trim(),
        kategoriId: wrap.querySelector('#pfKategori').value || '',
        deskripsi: wrap.querySelector('#pfDesk').value.replace(/\s+/g, ' ').trim(),
        hargaBeli: beli,
        hargaJual: jual,
        stokMin: min,
        foto: fotoData,
        emoji: wrap.querySelector('#pfEmoji').value || '📦',
        status: wrap.querySelector('#pfStatus').value,
        varian: varian.filter(function (v) { return String(v.nama).trim(); }).map(function (v) {
          return { nama: String(v.nama).trim(), tambahan: Math.max(0, Number(v.tambahan) || 0) };
        })
      };

      try {
        if (isEdit) {
          var lamaStok = product.stok;
          payload.stok = stok;
          db.products.update(product.id, payload, tenantId);
          if (stok !== lamaStok) {
            db.stockMovements.create({
              tenantId: tenantId, productId: product.id, tipe: 'penyesuaian',
              jumlah: stok - lamaStok, saldo: stok,
              catatan: 'Penyesuaian dari form produk (sebelumnya ' + lamaStok + ')',
              waktu: new Date().toISOString()
            });
          }
          UK.toast('Produk diperbarui.', 'ok');
        } else {
          payload.tenantId = tenantId;
          payload.stok = stok;
          var created = db.products.create(payload);
          if (stok > 0) {
            db.stockMovements.create({
              tenantId: tenantId, productId: created.id, tipe: 'masuk', jumlah: stok, saldo: stok,
              catatan: 'Stok awal produk baru', waktu: new Date().toISOString()
            });
          }
          UK.toast('Produk ditambahkan.', 'ok');
        }
        close();
        render(rootEl, ctx);
        if (ctx.refreshShell) ctx.refreshShell();
      } catch (e) {
        UK.toast(e.message || 'Gagal menyimpan produk.', 'err');
      }
    });
  }

  function titleCase(s) {
    return String(s || '').toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }).trim();
  }

  function autoKode(ctx, nama) {
    var existing = db.products.list({ tenantId: ctx.tenant.id });
    var base = String(nama).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 3) || 'PRD';
    var kode = base + '-001';
    var n = 1;
    while (existing.some(function (p) { return p.kode === kode; })) {
      n++;
      kode = base + '-' + String(n).padStart(3, '0');
    }
    return kode;
  }

  function cropSquare(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var side = Math.min(img.width, img.height);
      var canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 320;
      var g = canvas.getContext('2d');
      g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 320, 320);
      try { cb(canvas.toDataURL('image/jpeg', 0.82)); }
      catch (e) { cb(dataUrl); }
    };
    img.onerror = function () { cb(dataUrl); };
    img.src = dataUrl;
  }

  function salin(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        UK.toast('Tautan katalog disalin.', 'ok');
      }).catch(fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); UK.toast('Tautan katalog disalin.', 'ok'); }
      catch (e) { UK.toast(text, 'warn'); }
      ta.remove();
    }
  }

  /* ---------------- modal kategori ---------------- */
  function openKategoriModal(ctx) {
    var tenantId = ctx.tenant.id;
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    document.body.appendChild(wrap);
    UK.openModal(wrap);

    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 200); }

    function draw() {
      var cats = db.categories.list({ tenantId: tenantId });
      var products = db.products.list({ tenantId: tenantId });
      wrap.innerHTML =
        '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="katTitle">' +
        '<div class="modal-head"><h3 id="katTitle">Kategori produk</h3>' +
        '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
        '<div class="modal-body">' +
        '<div class="input-group" style="margin-bottom:12px">' +
        '<input type="text" id="katBaru" placeholder="Nama kategori baru" maxlength="40">' +
        '<button class="btn btn-primary" type="button" id="katTambah">Tambah</button></div>' +
        (cats.length ? '<div class="stack" style="gap:6px">' + cats.map(function (c) {
          var used = products.filter(function (p) { return p.kategoriId === c.id; }).length;
          return '<div class="row between" style="gap:8px;border:1px solid var(--line);border-radius:9px;padding:7px 9px">' +
            '<input type="text" value="' + UK.escapeHTML(c.nama) + '" data-katnama="' + c.id + '" aria-label="Nama kategori" style="border-color:transparent;background:transparent;padding:2px 4px">' +
            '<span class="tiny muted nowrap">' + used + ' produk</span>' +
            '<div class="row" style="gap:4px">' +
            '<button class="btn btn-xs btn-light" type="button" data-katsave="' + c.id + '">Simpan</button>' +
            '<button class="btn btn-xs btn-danger" type="button" data-kathapus="' + c.id + '" aria-label="Hapus kategori">Hapus</button>' +
            '</div></div>';
        }).join('') + '</div>'
          : '<div class="empty-note">Belum ada kategori.</div>') +
        '<p class="tiny muted" style="margin-top:10px">Kategori yang masih dipakai produk tidak bisa dihapus.</p>' +
        '</div>' +
        '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Selesai</button></div>' +
        '</div>';

      wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
      wrap.querySelector('#katTambah').addEventListener('click', function () {
        var val = wrap.querySelector('#katBaru').value.trim();
        if (!val) { UK.toast('Nama kategori wajib diisi.', 'err'); return; }
        try {
          db.categories.create({ tenantId: tenantId, nama: titleCase(val) });
          UK.toast('Kategori ditambahkan.', 'ok');
          draw();
          render(rootEl, ctx);
        } catch (e) { UK.toast(e.message, 'err'); }
      });
      wrap.querySelector('#katBaru').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); wrap.querySelector('#katTambah').click(); }
      });
      wrap.querySelectorAll('[data-katsave]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-katsave');
          var inp = wrap.querySelector('[data-katnama="' + id + '"]');
          try {
            db.categories.update(id, { nama: titleCase(inp.value) }, tenantId);
            UK.toast('Kategori diperbarui.', 'ok');
            draw();
            render(rootEl, ctx);
          } catch (e) { UK.toast(e.message, 'err'); }
        });
      });
      wrap.querySelectorAll('[data-kathapus]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-kathapus');
          var used = db.products.list({ tenantId: tenantId }).filter(function (p) { return p.kategoriId === id; }).length;
          if (used) { UK.toast('Kategori masih dipakai ' + used + ' produk. Pindahkan produknya dulu.', 'err'); return; }
          UK.confirmDialog('Hapus kategori ini?', { danger: true, okText: 'Hapus' }).then(function (yes) {
            if (!yes) return;
            db.categories.remove(id, tenantId);
            UK.toast('Kategori dihapus.', 'ok');
            draw();
            render(rootEl, ctx);
          });
        });
      });
    }
    draw();
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  }

  UK.registerModule('produk', {
    render: function (root, ctx) {
      S.view = UK.prefGet('produkView', 'tabel');
      // pencarian global topbar mengirim ?q=…
      if (ctx.query && ctx.query.q != null) { S.q = ctx.query.q; S.page = 1; }
      render(root, ctx);
    }
  });
})();
