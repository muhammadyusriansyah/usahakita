/* ============================================================
   app/js/pos.js — Kasir / POS
   ============================================================ */
(function () {
  'use strict';

  var S = {
    q: '', kategori: '', cart: [], customerId: '',
    diskonMode: 'rp', diskonVal: 0, metode: 'Tunai', dibayar: 0
  };
  var rootEl = null, ctxRef = null;

  function tenantId() { return ctxRef.tenant.id; }

  function holdKey() { return 'uk_hold_' + tenantId(); }

  function bacaTahan() {
    try {
      var raw = localStorage.getItem(holdKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function simpanTahan(data) {
    try {
      if (data) localStorage.setItem(holdKey(), JSON.stringify(data));
      else localStorage.removeItem(holdKey());
    } catch (e) { UK.toast('Gagal menyimpan transaksi tertahan.', 'err'); }
  }

  function subtotal() {
    return S.cart.reduce(function (a, it) { return a + it.harga * it.qty; }, 0);
  }
  function nilaiDiskon() {
    var sub = subtotal();
    var v = Math.max(0, Number(S.diskonVal) || 0);
    var d = S.diskonMode === '%' ? Math.round(sub * Math.min(100, v) / 100) : v;
    return Math.min(d, sub);
  }
  function pajak() {
    var s = ctxRef.settings || {};
    var pct = Number(s.pajakPersen) || 0;
    return Math.round((subtotal() - nilaiDiskon()) * pct / 100);
  }
  function total() {
    return subtotal() - nilaiDiskon() + pajak();
  }

  function qtyProduk(pid) {
    return S.cart.filter(function (it) { return it.productId === pid; })
      .reduce(function (a, it) { return a + it.qty; }, 0);
  }

  /* ---------------- render ---------------- */
  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    S.q = ctx.query && ctx.query.q ? ctx.query.q : '';
    var settings = db.settings.get(ctx.tenant.id);
    var held = bacaTahan();

    root.innerHTML =
      '<div class="page-head"><div><h1>Kasir</h1>' +
      '<div class="sub">Cari produk (F2) lalu tekan Enter untuk menambah. F9 untuk membayar.</div></div>' +
      '<div class="page-actions">' +
      '<a class="btn btn-light btn-sm" href="#/produk">Kelola produk</a>' +
      (held ? '<button class="btn btn-light btn-sm" type="button" id="btnLanjut">Lanjutkan transaksi tertahan</button>' : '') +
      '</div></div>' +

      '<div class="pos-layout">' +
      '<section class="panel">' +
      '<div class="panel-head"><div class="search-box grow">' +
      '<span class="ico">🔍</span>' +
      '<input type="search" id="posSearch" placeholder="Cari nama / kode / barcode produk…" value="' + UK.escapeHTML(S.q) + '" aria-label="Cari produk">' +
      '</div><span class="tiny muted nowrap">F2</span></div>' +
      '<div class="panel-body"><div class="chips" id="posChips" style="margin-bottom:10px"></div>' +
      '<div id="posGrid"></div></div>' +
      '</section>' +

      '<aside class="panel cart" id="posCart"></aside>' +
      '</div>';

    var search = document.getElementById('posSearch');
    search.addEventListener('input', UK.debounce(function () {
      S.q = search.value; renderGrid();
    }, 180));
    search.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var first = document.querySelector('#posGrid [data-add]:not(.out)');
      if (first) first.click();
      else UK.toast('Produk tidak ditemukan atau stok habis.', 'warn');
    });

    var btnLanjut = document.getElementById('btnLanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', function () {
        var data = bacaTahan();
        if (!data) return;
        S.cart = data.cart || [];
        S.customerId = data.customerId || '';
        S.diskonMode = data.diskonMode || 'rp';
        S.diskonVal = data.diskonVal || 0;
        simpanTahan(null);
        UK.toast('Transaksi tertahan dipulihkan.', 'ok');
        render(root, ctx);
      });
    }

    renderChips();
    renderGrid();
    renderCart();

    document.onkeydown = function (e) {
      if (e.key === 'F2') { e.preventDefault(); var s = document.getElementById('posSearch'); if (s) s.focus(); }
      if (e.key === 'F9') { e.preventDefault(); bayar(); }
    };
  }

  function renderChips() {
    var cats = db.categories.list({ tenantId: tenantId() });
    var box = document.getElementById('posChips');
    if (!box) return;
    box.innerHTML = '<button class="chip' + (S.kategori === '' ? ' active' : '') + '" type="button" data-kat="">Semua</button>' +
      cats.map(function (c) {
        return '<button class="chip' + (S.kategori === c.id ? ' active' : '') + '" type="button" data-kat="' + c.id + '">' + UK.escapeHTML(c.nama) + '</button>';
      }).join('');
    box.querySelectorAll('[data-kat]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.kategori = b.getAttribute('data-kat');
        renderChips(); renderGrid();
      });
    });
  }

  function renderGrid() {
    var box = document.getElementById('posGrid');
    if (!box) return;
    var products = db.products.list({ tenantId: tenantId() }).filter(function (p) {
      return p.status !== 'diarsipkan';
    });
    if (S.kategori) products = products.filter(function (p) { return p.kategoriId === S.kategori; });
    if (S.q) {
      var q = S.q.toLowerCase();
      products = products.filter(function (p) {
        return String(p.nama).toLowerCase().indexOf(q) >= 0 ||
          String(p.kode || '').toLowerCase().indexOf(q) >= 0 ||
          String(p.barcode || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    products.sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });

    if (!products.length) {
      box.innerHTML = '<div class="empty-note"><span class="ico">🔍</span><b>Tidak ada produk</b><span>Ubah kata kunci atau tambahkan produk baru.</span></div>';
      return;
    }

    box.innerHTML = '<div class="product-grid">' + products.map(function (p) {
      var sisa = Math.max(0, p.stok - qtyProduk(p.id));
      var out = sisa <= 0;
      return '<button class="pcard' + (out ? ' out' : '') + '" type="button" data-add="' + p.id + '"' +
        (out ? ' disabled aria-disabled="true"' : '') + ' aria-label="Tambah ' + UK.escapeHTML(p.nama) + '">' +
        '<div class="ph">' + (p.foto ? '<img src="' + p.foto + '" alt="">' : UK.escapeHTML(p.emoji || '📦')) + '</div>' +
        '<div class="nm">' + UK.escapeHTML(p.nama) + '</div>' +
        '<div class="pr">' + UK.rupiah(p.hargaJual) + '</div>' +
        '<div class="st">' + (out ? '<span class="red">Stok habis</span>' : 'Stok ' + sisa) + '</div>' +
        '</button>';
    }).join('') + '</div>';

    box.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () { tambah(b.getAttribute('data-add')); });
    });
  }

  function renderCart() {
    var box = document.getElementById('posCart');
    if (!box) return;
    var customers = db.customers.list({ tenantId: tenantId() });
    var held = bacaTahan();
    var s = ctxRef.settings || db.settings.get(tenantId());
    var metodeAktif = (s.metodeAktif && s.metodeAktif.length) ? s.metodeAktif : ['Tunai', 'QRIS', 'Transfer'];
    if (metodeAktif.indexOf(S.metode) < 0) S.metode = metodeAktif[0];

    box.innerHTML =
      '<div class="panel-head"><h3>Keranjang</h3>' +
      '<div class="row" style="gap:5px">' +
      '<button class="btn btn-xs btn-light" type="button" id="btnTahan"' + (S.cart.length ? '' : ' disabled') + '>Tahan</button>' +
      '<button class="btn btn-xs btn-light" type="button" id="btnKosong"' + (S.cart.length ? '' : ' disabled') + '>Kosongkan</button>' +
      '</div></div>' +
      '<div class="panel-body" style="padding:12px">' +
      (held ? '<div class="tiny amber" style="margin-bottom:8px">Ada transaksi tertahan. Klik "Lanjutkan" di atas.</div>' : '') +
      '<div class="cart-items" id="cartItems">' +
      (S.cart.length ? S.cart.map(function (it, i) {
        return '<div class="cart-line">' +
          '<div style="min-width:0"><div class="nm ellipsis">' + UK.escapeHTML(it.nama) + '</div>' +
          '<div class="sub">' + UK.rupiah(it.harga) + ' · <b>' + UK.rupiah(it.harga * it.qty) + '</b></div></div>' +
          '<div class="row" style="gap:4px">' +
          '<div class="qty-box">' +
          '<button type="button" data-qty-minus="' + i + '" aria-label="Kurangi jumlah">−</button>' +
          '<input type="number" min="1" step="1" value="' + it.qty + '" data-qty="' + i + '" aria-label="Jumlah ' + UK.escapeHTML(it.nama) + '">' +
          '<button type="button" data-qty-plus="' + i + '" aria-label="Tambah jumlah">+</button>' +
          '</div>' +
          '<button class="btn btn-xs btn-danger" type="button" data-hapus="' + i + '" aria-label="Hapus item">✕</button>' +
          '</div></div>';
      }).join('')
        : '<div class="empty-note" style="padding:22px 10px"><span class="ico">🛒</span><b>Keranjang kosong</b><span class="tiny">Pilih produk di sebelah kiri.</span></div>') +
      '</div>' +

      '<div style="margin-top:10px">' +
      '<label class="field-label" for="cartCust" style="display:block;margin-bottom:4px">Pelanggan (opsional)</label>' +
      '<div class="input-group">' +
      '<select id="cartCust" aria-label="Pilih pelanggan">' +
      '<option value="">Umum (tanpa pelanggan)</option>' +
      customers.map(function (c) {
        return '<option value="' + c.id + '"' + (S.customerId === c.id ? ' selected' : '') + '>' + UK.escapeHTML(c.nama) + '</option>';
      }).join('') + '</select>' +
      '<button class="btn btn-light btn-sm" type="button" id="btnCustBaru" title="Tambah pelanggan cepat" aria-label="Tambah pelanggan cepat">＋</button>' +
      '</div></div>' +

      '<div style="margin-top:10px">' +
      '<label class="field-label" style="display:block;margin-bottom:4px">Diskon</label>' +
      '<div class="input-group">' +
      '<select id="cartDiskonMode" style="width:76px" aria-label="Jenis diskon">' +
      '<option value="rp"' + (S.diskonMode === 'rp' ? ' selected' : '') + '>Rp</option>' +
      '<option value="%"' + (S.diskonMode === '%' ? ' selected' : '') + '>%</option>' +
      '</select>' +
      '<input type="number" id="cartDiskon" min="0" step="500" value="' + (S.diskonVal || '') + '" placeholder="0">' +
      '</div></div>' +

      '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:8px">' +
      '<div class="summary-line"><span class="muted">Subtotal</span><span id="cartSub">' + UK.rupiah(subtotal()) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Diskon</span><span id="cartDisc" class="red">-' + UK.rupiah(nilaiDiskon()) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Pajak (' + (Number(s.pajakPersen) || 0) + '%)</span><span id="cartTax">' + UK.rupiah(pajak()) + '</span></div>' +
      '<div class="summary-line total"><span>Total</span><span id="cartTotal">' + UK.rupiah(total()) + '</span></div>' +
      '</div>' +

      '<div style="margin-top:10px">' +
      '<label class="field-label" style="display:block;margin-bottom:4px">Metode pembayaran</label>' +
      '<div class="pay-methods" id="metodeWrap">' +
      metodeAktif.map(function (m) {
        return '<button type="button" data-metode="' + UK.escapeHTML(m) + '" class="' + (S.metode === m ? 'active' : '') + '">' + UK.escapeHTML(m) + '</button>';
      }).join('') + '</div></div>' +

      '<div id="tunaiWrap" style="margin-top:10px">' +
      '<label class="field-label" for="cartBayar" style="display:block;margin-bottom:4px">Uang diterima</label>' +
      '<input type="number" id="cartBayar" min="0" step="1000" value="' + (S.dibayar || '') + '" placeholder="0">' +
      '<div class="quick-cash" id="quickCash"></div>' +
      '<div class="summary-line" style="margin-top:6px"><span class="muted">Kembalian</span><b id="cartKembali">' + UK.rupiah(Math.max(0, (S.dibayar || 0) - total())) + '</b></div>' +
      '</div>' +

      '<button class="btn btn-primary btn-block btn-lg" type="button" id="btnBayar" style="margin-top:12px">Bayar ' + UK.rupiah(total()) + '</button>' +
      '<p class="tiny muted center" style="margin:6px 0 0">F9 untuk membayar</p>' +
      '</div>';

    bindCart();
  }

  function bindCart() {
    var box = document.getElementById('posCart');
    if (!box) return;

    box.querySelectorAll('[data-qty-plus]').forEach(function (b) {
      b.addEventListener('click', function () { ubahQty(Number(b.getAttribute('data-qty-plus')), 1); });
    });
    box.querySelectorAll('[data-qty-minus]').forEach(function (b) {
      b.addEventListener('click', function () { ubahQty(Number(b.getAttribute('data-qty-minus')), -1); });
    });
    box.querySelectorAll('[data-qty]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var i = Number(inp.getAttribute('data-qty'));
        var v = Math.max(1, parseInt(inp.value, 10) || 1);
        ubahQty(i, v - S.cart[i].qty);
      });
    });
    box.querySelectorAll('[data-hapus]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.cart.splice(Number(b.getAttribute('data-hapus')), 1);
        renderCart(); renderGrid();
      });
    });

    var cust = box.querySelector('#cartCust');
    cust.addEventListener('change', function () { S.customerId = cust.value; });
    box.querySelector('#btnCustBaru').addEventListener('click', function () { modalPelangganBaru(); });

    var mode = box.querySelector('#cartDiskonMode');
    mode.addEventListener('change', function () {
      S.diskonMode = mode.value;
      S.diskonVal = 0;
      renderCart();
    });
    var disk = box.querySelector('#cartDiskon');
    disk.addEventListener('input', function () {
      S.diskonVal = Math.max(0, Number(disk.value) || 0);
      updateTotals();
    });
    disk.addEventListener('change', function () {
      if (S.diskonMode === '%' && S.diskonVal > 100) { S.diskonVal = 100; disk.value = 100; }
      updateTotals();
    });

    box.querySelectorAll('[data-metode]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.metode = b.getAttribute('data-metode');
        renderCart();
      });
    });

    var bayarInput = box.querySelector('#cartBayar');
    if (bayarInput) {
      bayarInput.addEventListener('input', function () {
        S.dibayar = Math.max(0, UK.parseRupiahInput(bayarInput.value));
        updateTotals();
      });
      var exact = total();
      var options = [exact, 20000, 50000, 100000];
      var uniq = [];
      options.forEach(function (v) { if (uniq.indexOf(v) < 0) uniq.push(v); });
      var qc = box.querySelector('#quickCash');
      qc.innerHTML = '<button type="button" data-cash="' + exact + '">Uang pas</button>' +
        uniq.filter(function (v) { return v !== exact; }).map(function (v) {
          return '<button type="button" data-cash="' + v + '">' + UK.rupiah(v) + '</button>';
        }).join('');
      qc.querySelectorAll('[data-cash]').forEach(function (b) {
        b.addEventListener('click', function () {
          S.dibayar = Number(b.getAttribute('data-cash'));
          bayarInput.value = S.dibayar;
          updateTotals();
        });
      });
    }

    box.querySelector('#btnTahan').addEventListener('click', function () {
      if (!S.cart.length) return;
      simpanTahan({ cart: S.cart, customerId: S.customerId, diskonMode: S.diskonMode, diskonVal: S.diskonVal });
      S.cart = []; S.customerId = ''; S.diskonVal = 0; S.dibayar = 0;
      UK.toast('Transaksi ditahan. Lanjutkan kapan saja.', 'ok');
      render(rootEl, ctxRef);
    });
    box.querySelector('#btnKosong').addEventListener('click', function () {
      UK.confirmDialog('Kosongkan keranjang?', { danger: true, okText: 'Kosongkan' }).then(function (yes) {
        if (!yes) return;
        S.cart = []; S.diskonVal = 0; S.dibayar = 0;
        renderCart(); renderGrid();
      });
    });
    box.querySelector('#btnBayar').addEventListener('click', bayar);
  }

  function updateTotals() {
    var set = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
    set('cartSub', UK.rupiah(subtotal()));
    set('cartDisc', '-' + UK.rupiah(nilaiDiskon()));
    set('cartTax', UK.rupiah(pajak()));
    set('cartTotal', UK.rupiah(total()));
    set('cartKembali', UK.rupiah(Math.max(0, (S.dibayar || 0) - total())));
    var btn = document.getElementById('btnBayar');
    if (btn) btn.textContent = 'Bayar ' + UK.rupiah(total());
    var tunai = document.getElementById('tunaiWrap');
    if (tunai) tunai.style.display = S.metode === 'Tunai' ? '' : 'none';
  }

  /* ---------------- cart ops ---------------- */
  function ubahQty(index, delta) {
    var it = S.cart[index];
    if (!it) return;
    var prod = db.products.get(it.productId, tenantId());
    var max = prod ? prod.stok : it.qty;
    var next = Math.max(1, it.qty + delta);
    if (next > max) { UK.toast('Melebihi stok tersedia (' + max + ').', 'warn'); return; }
    it.qty = next;
    renderCart(); renderGrid();
  }

  function tambah(pid) {
    var prod = db.products.get(pid, tenantId());
    if (!prod) return;
    var sisa = prod.stok - qtyProduk(prod.id);
    if (sisa <= 0) { UK.toast('Stok produk habis.', 'warn'); return; }

    if (prod.varian && prod.varian.length) {
      pilihVarian(prod);
      return;
    }
    masukCart(prod, null);
  }

  function masukCart(prod, varian) {
    var nama = prod.nama + (varian ? ' (' + varian.nama + ')' : '');
    var harga = prod.hargaJual + (varian ? Number(varian.tambahan) || 0 : 0);
    var found = S.cart.filter(function (it) { return it.productId === prod.id && it.nama === nama; })[0];
    var sisa = prod.stok - qtyProduk(prod.id);
    if (sisa <= 0) { UK.toast('Stok produk habis.', 'warn'); return; }
    if (found) found.qty += 1;
    else S.cart.push({ productId: prod.id, nama: nama, harga: harga, qty: 1 });
    UK.toast(prod.nama + ' ditambahkan.', 'ok');
    renderCart(); renderGrid();
  }

  function pilihVarian(prod) {
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="vTitle">' +
      '<div class="modal-head"><h3 id="vTitle">Pilih varian</h3><button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body"><p class="small muted">' + UK.escapeHTML(prod.nama) + '</p>' +
      '<div class="stack" style="gap:6px">' +
      '<label class="check"><input type="radio" name="vPick" value="-1" checked> Tanpa varian — ' + UK.rupiah(prod.hargaJual) + '</label>' +
      prod.varian.map(function (v, i) {
        return '<label class="check"><input type="radio" name="vPick" value="' + i + '"> ' + UK.escapeHTML(v.nama) +
          ' — ' + UK.rupiah(prod.hargaJual + (Number(v.tambahan) || 0)) + '</label>';
      }).join('') +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="vAdd">Tambah ke keranjang</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.querySelector('#vAdd').addEventListener('click', function () {
      var picked = wrap.querySelector('input[name="vPick"]:checked');
      var idx = picked ? Number(picked.value) : -1;
      close();
      masukCart(prod, idx >= 0 ? prod.varian[idx] : null);
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  }

  function modalPelangganBaru() {
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="cTitle">' +
      '<div class="modal-head"><h3 id="cTitle">Pelanggan baru</h3><button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="field"><label for="qcNama">Nama *</label><input type="text" id="qcNama" placeholder="Nama pelanggan"></div>' +
      '<div class="field"><label for="qcTelp">Telepon (WhatsApp)</label><input type="tel" id="qcTelp" inputmode="numeric" placeholder="0812…"></div>' +
      '</div><div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="qcSave">Simpan</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.querySelector('#qcSave').addEventListener('click', function () {
      var nama = wrap.querySelector('#qcNama').value.trim();
      var telp = UK.normalisasiWA(wrap.querySelector('#qcTelp').value);
      if (nama.length < 2) { UK.toast('Nama pelanggan wajib diisi.', 'err'); return; }
      var dup = db.customers.list({ tenantId: tenantId() }).some(function (c) { return telp && c.telepon === telp; });
      if (dup) { UK.toast('Nomor telepon sudah terdaftar.', 'err'); return; }
      var c = db.customers.create({
        tenantId: tenantId(), nama: nama, telepon: telp, piutang: 0,
        dibuatPada: new Date().toISOString()
      });
      S.customerId = c.id;
      close();
      UK.toast('Pelanggan ditambahkan.', 'ok');
      renderCart();
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  }

  /* ---------------- pembayaran ---------------- */
  function bayar() {
    if (!ctxRef) return;
    if (!S.cart.length) { UK.toast('Keranjang masih kosong.', 'warn'); return; }

    var tot = total();
    var dibayar = S.metode === 'Tunai' ? (Number(S.dibayar) || 0) : tot;
    var customer = S.customerId ? db.customers.get(S.customerId, tenantId()) : null;

    if (S.metode === 'Tunai' && dibayar < tot) {
      if (!customer) {
        UK.toast('Uang diterima kurang dari total. Pilih pelanggan untuk mencatat piutang.', 'err');
        return;
      }
      UK.confirmDialog('Uang diterima <b>' + UK.rupiah(dibayar) + '</b>, kurang <b>' + UK.rupiah(tot - dibayar) +
        '</b>. Catat kekurangan sebagai piutang <b>' + UK.escapeHTML(customer.nama) + '</b>?',
        { okText: 'Catat piutang' }).then(function (yes) {
          if (yes) prosesBayar(dibayar, customer);
        });
      return;
    }
    prosesBayar(dibayar, customer);
  }

  function prosesBayar(dibayar, customer) {
    var tid = tenantId();
    var tot = total();
    var tgl = new Date().toISOString();
    var items = S.cart.map(function (it) {
      return { productId: it.productId, nama: it.nama, qty: it.qty, harga: it.harga };
    });

    try {
      var trxId = db.transactions.nextId(tid);
      var trx = db.transactions.create({
        id: trxId, tenantId: tid, waktu: tgl,
        pelangganId: customer ? customer.id : null,
        items: items,
        subtotal: subtotal(), diskon: nilaiDiskon(), pajak: pajak(), total: tot,
        metode: S.metode, dibayar: dibayar,
        kembalian: Math.max(0, dibayar - tot),
        status: dibayar < tot ? 'Menunggu' : 'Selesai',
        kasir: ctxRef.session.nama,
        catatan: ''
      });

      /* kurangi stok + riwayat */
      S.cart.forEach(function (it) {
        var prod = db.products.get(it.productId, tid);
        if (!prod) return;
        var baru = Math.max(0, prod.stok - it.qty);
        db.products.update(prod.id, { stok: baru }, tid);
        db.stockMovements.create({
          tenantId: tid, productId: prod.id, tipe: 'penjualan',
          jumlah: -it.qty, saldo: baru,
          catatan: 'Penjualan ' + trx.id, waktu: tgl
        });
      });

      /* piutang */
      if (dibayar < tot && customer) {
        var selisih = tot - dibayar;
        var riwayat = (customer.piutangHistory || []).concat([{
          id: 'ph-' + Date.now(), waktu: tgl, jumlah: selisih,
          tipe: 'tambah', catatan: 'Pembayaran kurang pada ' + trx.id
        }]);
        db.customers.update(customer.id, {
          piutang: (Number(customer.piutang) || 0) + selisih,
          piutangHistory: riwayat
        }, tid);
      }

      S.cart = []; S.diskonVal = 0; S.dibayar = 0; S.customerId = '';
      renderGrid(); renderCart();
      if (ctxRef.refreshShell) ctxRef.refreshShell();
      modalStruk(trx, customer);
    } catch (e) {
      console.error(e);
      UK.toast('Gagal menyimpan transaksi: ' + e.message, 'err');
    }
  }

  function modalStruk(trx, customer) {
    var tenant = ctxRef.tenant;
    var settings = db.settings.get(tenant.id);
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="sTitle">' +
      '<div class="modal-head"><h3 id="sTitle">Transaksi berhasil</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="status success" style="margin-bottom:10px">✓ ' + UK.escapeHTML(trx.id) + ' · ' + UK.rupiah(trx.total) + '</div>' +
      (trx.status === 'Menunggu' ? '<div class="banner warn" style="margin-bottom:10px">Pembayaran kurang ' + UK.rupiah(trx.total - trx.dibayar) + ' dicatat sebagai piutang' + (customer ? ' ' + UK.escapeHTML(customer.nama) : '') + '.</div>' : '') +
      '<div style="border:1px dashed var(--line);border-radius:10px;padding:12px;background:#fcfcfd">' +
      UK.renderStruk(trx, tenant, settings) + '</div>' +
      '</div>' +
      '<div class="modal-foot" style="justify-content:space-between">' +
      '<button class="btn btn-light btn-sm" type="button" id="rCetak">🖨 Cetak</button>' +
      '<div class="row" style="gap:6px">' +
      '<button class="btn btn-light btn-sm" type="button" id="rPdf">Unduh PDF</button>' +
      '<button class="btn btn-primary btn-sm" type="button" id="rBaru">Transaksi baru</button>' +
      '</div></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    var html = UK.renderStruk(trx, tenant, settings);
    wrap.querySelector('#rCetak').addEventListener('click', function () { UK.cetakStruk(html); });
    wrap.querySelector('#rPdf').addEventListener('click', function () {
      UK.toast('Pilih "Simpan sebagai PDF" pada dialog cetak.', 'ok');
      UK.cetakStruk(html);
    });
    wrap.querySelector('#rBaru').addEventListener('click', function () {
      close();
      var s = document.getElementById('posSearch');
      if (s) { s.value = ''; S.q = ''; s.focus(); }
      renderGrid();
    });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  }

  UK.registerModule('pos', {
    render: function (root, ctx) {
      render(root, ctx);
      setTimeout(function () {
        var s = document.getElementById('posSearch');
        if (s) s.focus();
      }, 50);
    }
  });
})();
