/* ============================================================
   app/js/pengaturan.js — Pengaturan usaha
   Tab: Profil, Katalog, Transaksi & Struk, Pengguna, Paket, Zona berbahaya
   ============================================================ */
(function () {
  'use strict';

  var S = { tab: 'profil' };
  var rootEl = null, ctxRef = null;
  var HARI = [['senin', 'Senin'], ['selasa', 'Selasa'], ['rabu', 'Rabu'], ['kamis', 'Kamis'],
    ['jumat', 'Jumat'], ['sabtu', 'Sabtu'], ['minggu', 'Minggu']];

  function TABS() {
    return [['profil', 'Profil Usaha'], ['katalog', 'Katalog Online'], ['transaksi', 'Transaksi & Struk'],
      ['pengguna', 'Pengguna'], ['paket', 'Paket'], ['bahaya', 'Zona Berbahaya']];
  }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    if (ctx.query && ctx.query.tab && TABS().some(function (t) { return t[0] === ctx.query.tab; })) {
      S.tab = ctx.query.tab;
    }
    root.innerHTML =
      '<div class="page-head"><div><h1>Pengaturan Usaha</h1>' +
      '<div class="sub">Kelola profil, katalog, transaksi, dan pengguna usaha Anda.</div></div></div>' +
      '<div class="chips" style="margin-bottom:14px">' +
      TABS().map(function (t) {
        return '<button class="chip' + (S.tab === t[0] ? ' active' : '') + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<div id="setBody"></div>';

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.tab = b.getAttribute('data-tab');
        render(root, ctx);
      });
    });
    renderBody(ctx);
  }

  function renderBody(ctx) {
    var box = document.getElementById('setBody');
    if (!box) return;
    if (S.tab === 'profil') profilHTML(box, ctx);
    else if (S.tab === 'katalog') katalogHTML(box, ctx);
    else if (S.tab === 'transaksi') transaksiHTML(box, ctx);
    else if (S.tab === 'pengguna') penggunaHTML(box, ctx);
    else if (S.tab === 'paket') paketHTML(box, ctx);
    else bahayaHTML(box, ctx);
  }

  /* ---------------- profil ---------------- */
  function profilHTML(box, ctx) {
    var t = ctx.tenant;
    var jenis = db.businessCategories.list();
    var jam = t.jamOperasional || {};
    box.innerHTML =
      '<div class="panel"><div class="panel-head"><h3>Profil usaha</h3>' +
      '<span class="tiny muted">Tampil di katalog publik</span></div>' +
      '<div class="panel-body"><form id="formProfil" novalidate>' +
      '<div class="grid-2">' +
      '<div class="field" id="pfNamaF"><label for="pfNm">Nama usaha *</label>' +
      '<input type="text" id="pfNm" value="' + UK.escapeHTML(t.nama) + '" maxlength="70">' +
      '<span class="err">Nama usaha wajib diisi.</span></div>' +
      '<div class="field"><label for="pfJenis">Jenis usaha</label><select id="pfJenis">' +
      jenis.map(function (j) {
        return '<option value="' + j.id + '"' + (t.jenis === j.id ? ' selected' : '') + '>' + UK.escapeHTML(j.nama) + '</option>';
      }).join('') + '</select></div>' +
      '</div>' +
      '<div class="field"><label for="pfDesk">Deskripsi usaha</label>' +
      '<textarea id="pfDesk" rows="3" maxlength="300">' + UK.escapeHTML(t.deskripsi || '') + '</textarea>' +
      '<span class="hint">Tampil di bagian atas katalog.</span></div>' +
      '<div class="grid-2">' +
      '<div class="field" id="pfWaF"><label for="pfWa">Nomor WhatsApp *</label>' +
      '<input type="tel" id="pfWa" inputmode="numeric" value="' + UK.escapeHTML(t.wa || '') + '">' +
      '<span class="hint">Format 62… — dipakai tombol pesan di katalog.</span>' +
      '<span class="err">Nomor WhatsApp tidak valid.</span></div>' +
      '<div class="field" id="pfEmailF"><label for="pfEmail">Email usaha</label>' +
      '<input type="email" id="pfEmail" value="' + UK.escapeHTML(t.email || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label for="pfAlamat">Alamat</label>' +
      '<textarea id="pfAlamat" rows="2">' + UK.escapeHTML(t.alamat || '') + '</textarea></div>' +

      '<div class="field"><label>Logo usaha</label>' +
      '<div class="row top">' +
      '<div class="shop-logo" id="logoPrev" style="width:60px;height:60px;border-radius:12px;font-size:20px">' +
      (t.logo && /^data:/.test(t.logo) ? '<img src="' + t.logo + '" alt="Logo usaha">' : UK.escapeHTML(t.logo || '🏪')) + '</div>' +
      '<div class="grow"><input type="file" id="pfLogo" accept="image/*" aria-label="Unggah logo">' +
      '<span class="hint">Maksimal 300 KB. Bila kosong, sistem memakai emoji/inisial.</span>' +
      '<button class="btn btn-xs btn-light" type="button" id="pfLogoHapus" style="margin-top:5px">Hapus logo</button></div>' +
      '</div></div>' +

      '<h4 style="margin:16px 0 8px">Jam operasional</h4>' +
      '<div class="stack" style="gap:6px">' +
      HARI.map(function (h) {
        var d = jam[h[0]] || { buka: false, dari: '08:00', sampai: '17:00' };
        return '<div class="row wrap" style="gap:8px;border:1px solid var(--line);border-radius:9px;padding:7px 9px">' +
          '<label class="switch"><input type="checkbox" data-jambuka="' + h[0] + '"' + (d.buka ? ' checked' : '') +
          ' aria-label="Buka hari ' + h[1] + '"><span></span></label>' +
          '<b class="small" style="width:64px">' + h[1] + '</b>' +
          '<input type="time" data-jamdari="' + h[0] + '" value="' + UK.escapeHTML(d.dari) + '" aria-label="Jam buka ' + h[1] + '" style="width:auto">' +
          '<span class="tiny muted">s/d</span>' +
          '<input type="time" data-jamsampai="' + h[0] + '" value="' + UK.escapeHTML(d.sampai) + '" aria-label="Jam tutup ' + h[1] + '" style="width:auto">' +
          '</div>';
      }).join('') + '</div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:14px">' +
      '<button class="btn btn-primary" type="submit" id="btnSimpanProfil">Simpan profil</button></div>' +
      '</form></div></div>';

    var logoData = t.logo || '';
    document.getElementById('pfWa').addEventListener('blur', function () {
      this.value = UK.normalisasiWA(this.value);
    });
    document.getElementById('pfLogo').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { UK.toast('File harus berupa gambar.', 'err'); this.value = ''; return; }
      if (file.size > 300 * 1024) { UK.toast('Ukuran logo maksimal 300 KB.', 'err'); this.value = ''; return; }
      var r = new FileReader();
      r.onload = function () {
        logoData = r.result;
        document.getElementById('logoPrev').innerHTML = '<img src="' + logoData + '" alt="Pratinjau logo">';
      };
      r.readAsDataURL(file);
    });
    document.getElementById('pfLogoHapus').addEventListener('click', function () {
      logoData = '';
      document.getElementById('logoPrev').textContent = UK.inisial(t.nama);
    });

    document.getElementById('formProfil').addEventListener('submit', function (e) {
      e.preventDefault();
      var nama = document.getElementById('pfNm').value.trim().replace(/\s+/g, ' ');
      var wa = UK.normalisasiWA(document.getElementById('pfWa').value);
      var email = document.getElementById('pfEmail').value.trim();
      var bad = false;
      document.getElementById('pfNamaF').classList.toggle('invalid', nama.length < 3);
      if (nama.length < 3) bad = true;
      document.getElementById('pfWaF').classList.toggle('invalid', wa.length < 9);
      if (wa.length < 9) bad = true;
      document.getElementById('pfEmailF').classList.toggle('invalid', !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad = true;
      if (bad) { UK.toast('Periksa kembali data profil.', 'err'); return; }

      var jamBaru = {};
      HARI.forEach(function (h) {
        jamBaru[h[0]] = {
          buka: document.querySelector('[data-jambuka="' + h[0] + '"]').checked,
          dari: document.querySelector('[data-jamdari="' + h[0] + '"]').value || '08:00',
          sampai: document.querySelector('[data-jamsampai="' + h[0] + '"]').value || '17:00'
        };
      });

      try {
        db.tenants.update(t.id, {
          nama: nama,
          jenis: document.getElementById('pfJenis').value,
          deskripsi: document.getElementById('pfDesk').value.trim(),
          alamat: document.getElementById('pfAlamat').value.trim(),
          email: email,
          wa: wa,
          logo: logoData || UK.inisial(nama),
          jamOperasional: jamBaru
        });
        UK.toast('Profil usaha disimpan.', 'ok');
        render(rootEl, ctx);
        if (ctx.refreshShell) ctx.refreshShell();
      } catch (err) { UK.toast(err.message, 'err'); }
    });
  }

  /* ---------------- katalog ---------------- */
  function katalogHTML(box, ctx) {
    var t = ctx.tenant;
    var s = db.settings.get(t.id);
    var url = location.origin + location.pathname.replace(/app\/index\.html$/, '') + 'toko/index.html?u=' + t.slug;
    box.innerHTML =
      '<div class="panel"><div class="panel-head"><h3>Katalog online</h3>' +
      '<label class="switch"><input type="checkbox" id="katAktif"' + (t.katalogAktif ? ' checked' : '') +
      ' aria-label="Aktifkan katalog"><span></span></label></div>' +
      '<div class="panel-body">' +
      '<div class="banner info" style="margin-bottom:14px"><span>🛍️</span><div class="grow">Katalog publik: ' +
      '<a href="../toko/index.html?u=' + encodeURIComponent(t.slug) + '" target="_blank" rel="noopener" class="mono">' +
      UK.escapeHTML(url) + '</a></div></div>' +

      '<div class="grid-2">' +
      '<div class="field" id="kSlugF"><label for="kSlug">Slug tautan toko</label>' +
      '<div class="input-group"><input type="text" id="kSlug" value="' + UK.escapeHTML(t.slug) + '">' +
      '<button class="btn btn-light" type="button" id="kSlugCek">Cek</button></div>' +
      '<span class="hint" id="kSlugHint">Hanya huruf kecil, angka, dan tanda hubung.</span>' +
      '<span class="err">Slug sudah dipakai usaha lain.</span></div>' +
      '<div class="field"><label>Tautan katalog</label>' +
      '<div class="row" style="gap:6px"><button class="btn btn-light btn-sm" type="button" id="kSalin">Salin tautan</button>' +
      '<a class="btn btn-light btn-sm" href="../toko/index.html?u=' + encodeURIComponent(t.slug) + '" target="_blank" rel="noopener">Buka katalog</a></div></div>' +
      '</div>' +

      '<div class="field"><label for="kTemplate">Pesan WhatsApp default</label>' +
      '<textarea id="kTemplate" rows="6">' + UK.escapeHTML(s.templateWA || '') + '</textarea>' +
      '<span class="hint">Placeholder: {produk} {harga} {jumlah} {tautan}</span></div>' +
      '<div class="field"><label>Pratinjau pesan</label>' +
      '<div class="card" style="padding:10px;background:#f9fafc"><pre id="kPreview" style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:11.5px"></pre></div></div>' +

      '<div class="row" style="justify-content:flex-end;margin-top:12px">' +
      '<button class="btn btn-primary" type="button" id="kSimpan">Simpan pengaturan katalog</button></div>' +
      '</div></div>';

    function preview() {
      var tpl = document.getElementById('kTemplate').value;
      var contoh = tpl
        .replace(/\{produk\}/g, 'Nasi Goreng Spesial')
        .replace(/\{harga\}/g, UK.rupiah(20000))
        .replace(/\{jumlah\}/g, '2')
        .replace(/\{tautan\}/g, url);
      document.getElementById('kPreview').textContent = contoh;
    }
    document.getElementById('kTemplate').addEventListener('input', preview);
    preview();

    document.getElementById('kSalin').addEventListener('click', function () {
      copyText(url);
    });
    document.getElementById('kSlugCek').addEventListener('click', function () {
      cekSlug(true);
    });
    function cekSlug(showToast) {
      var slug = UK.slugify(document.getElementById('kSlug').value);
      document.getElementById('kSlug').value = slug;
      var taken = !slug || db.tenants.slugTaken(slug, t.id);
      document.getElementById('kSlugF').classList.toggle('invalid', taken);
      if (showToast) UK.toast(taken ? 'Slug kosong atau sudah dipakai.' : 'Slug tersedia.', taken ? 'err' : 'ok');
      return !taken;
    }

    document.getElementById('katAktif').addEventListener('change', function () {
      db.tenants.update(t.id, { katalogAktif: this.checked });
      UK.toast(this.checked ? 'Katalog diaktifkan.' : 'Katalog dinonaktifkan.', 'ok');
      if (ctx.refreshShell) ctx.refreshShell();
    });

    document.getElementById('kSimpan').addEventListener('click', function () {
      var slug = UK.slugify(document.getElementById('kSlug').value);
      if (!slug || db.tenants.slugTaken(slug, t.id)) {
        document.getElementById('kSlugF').classList.add('invalid');
        UK.toast('Slug tidak valid atau sudah dipakai.', 'err');
        return;
      }
      var tpl = document.getElementById('kTemplate').value;
      if (!tpl.trim()) { UK.toast('Template pesan tidak boleh kosong.', 'err'); return; }
      db.tenants.update(t.id, { slug: slug });
      db.settings.update(t.id, { templateWA: tpl });
      UK.toast('Pengaturan katalog disimpan.', 'ok');
      render(rootEl, ctx);
      if (ctx.refreshShell) ctx.refreshShell();
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { UK.toast('Tautan disalin.', 'ok'); })
        .catch(fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); UK.toast('Tautan disalin.', 'ok'); }
      catch (e) { UK.toast(text, 'warn'); }
      ta.remove();
    }
  }

  /* ---------------- transaksi & struk ---------------- */
  function transaksiHTML(box, ctx) {
    var s = db.settings.get(ctx.tenant.id);
    var semuaMetode = ['Tunai', 'QRIS', 'Transfer'];
    var aktif = s.metodeAktif || semuaMetode;
    var contoh = {
      id: 'TRX-00099', waktu: new Date().toISOString(), kasir: ctx.session.nama,
      items: [{ nama: 'Contoh Produk', qty: 2, harga: 20000 }],
      subtotal: 40000, diskon: 4000, pajak: Math.round(36000 * (Number(s.pajakPersen) || 0) / 100),
      total: 36000 + Math.round(36000 * (Number(s.pajakPersen) || 0) / 100),
      metode: 'Tunai', dibayar: 50000, kembalian: 50000 - (36000 + Math.round(36000 * (Number(s.pajakPersen) || 0) / 100))
    };
    box.innerHTML =
      '<div class="grid-2">' +
      '<div class="panel"><div class="panel-head"><h3>Transaksi &amp; struk</h3></div><div class="panel-body">' +
      '<div class="field"><label for="tPajak">Persentase pajak (%)</label>' +
      '<input type="number" id="tPajak" min="0" max="100" step="0.5" value="' + (Number(s.pajakPersen) || 0) + '">' +
      '<span class="hint">Dihitung otomatis dari subtotal setelah diskon.</span></div>' +
      '<div class="field"><label>Metode pembayaran aktif</label>' +
      semuaMetode.map(function (m) {
        return '<label class="check" style="margin-bottom:4px"><input type="checkbox" data-metode="' + m + '"' +
          (aktif.indexOf(m) >= 0 ? ' checked' : '') + '> ' + m + '</label>';
      }).join('') + '</div>' +
      '<div class="field"><label for="tFooter">Footer struk</label>' +
      '<textarea id="tFooter" rows="2" maxlength="160">' + UK.escapeHTML(s.footerStruk || '') + '</textarea></div>' +
      '<button class="btn btn-primary btn-block" type="button" id="tSimpan">Simpan pengaturan transaksi</button>' +
      '</div></div>' +
      '<div class="panel"><div class="panel-head"><h3>Pratinjau struk</h3></div>' +
      '<div class="panel-body" id="strukPrev" style="background:#fcfcfd">' + UK.renderStruk(contoh, ctx.tenant, s) + '</div></div>' +
      '</div>';

    document.getElementById('tSimpan').addEventListener('click', function () {
      var pajak = Math.max(0, Math.min(100, Number(document.getElementById('tPajak').value) || 0));
      var metode = [];
      box.querySelectorAll('[data-metode]').forEach(function (c) { if (c.checked) metode.push(c.getAttribute('data-metode')); });
      if (!metode.length) { UK.toast('Pilih minimal satu metode pembayaran.', 'err'); return; }
      db.settings.update(ctx.tenant.id, {
        pajakPersen: pajak,
        metodeAktif: metode,
        footerStruk: document.getElementById('tFooter').value.trim()
      });
      UK.toast('Pengaturan transaksi disimpan.', 'ok');
      render(rootEl, ctx);
      if (ctx.refreshShell) ctx.refreshShell();
    });
  }

  /* ---------------- pengguna ---------------- */
  function penggunaHTML(box, ctx) {
    var users = db.users.list({ tenantId: ctx.tenant.id });
    var plan = db.plans.get(ctx.tenant.paket) || db.plans.get('free');
    var penuh = users.length >= plan.batas.pengguna;

    box.innerHTML =
      '<div class="panel"><div class="panel-head"><h3>Pengguna</h3>' +
      '<span class="tiny muted">' + users.length + ' / ' + plan.batas.pengguna + ' pengguna (paket ' + UK.escapeHTML(plan.nama) + ')</span></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Hak akses</th><th></th></tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr><td><div class="cell-main"><span class="avatar">' + UK.escapeHTML(UK.inisial(u.nama)) + '</span>' +
          '<b class="t">' + UK.escapeHTML(u.nama) + '</b></div></td>' +
          '<td>' + UK.escapeHTML(u.email) + '</td>' +
          '<td>' + (u.peran === 'pemilik' ? '<span class="status success">Pemilik</span>' : '<span class="status info">Kasir</span>') + '</td>' +
          '<td class="small muted">' + (u.peran === 'pemilik' ? 'Semua menu' : 'Kasir, Transaksi, Produk (baca)') + '</td>' +
          '<td class="num">' + (u.peran === 'kasir'
            ? '<button class="btn btn-xs btn-danger" type="button" data-deluser="' + u.id + '">Hapus</button>'
            : '<span class="tiny muted">—</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="panel-body" style="border-top:1px solid var(--line)">' +
      (penuh ? '<div class="banner warn"><span>⚠️</span><div>Batas pengguna paket ' + UK.escapeHTML(plan.nama) +
        ' tercapai. Upgrade paket untuk menambah kasir.</div><button class="btn btn-xs btn-light" type="button" id="btnUpgradeUser">Lihat paket</button></div>'
        : '<div class="grid-2"><div class="field"><label for="uNama">Nama kasir</label><input type="text" id="uNama" maxlength="60" placeholder="Nama lengkap"></div>' +
        '<div class="field"><label for="uEmail">Email kasir</label><input type="email" id="uEmail" placeholder="kasir@usaha.id"></div></div>' +
        '<div class="grid-2"><div class="field"><label for="uPass">Kata sandi demo</label><input type="text" id="uPass" placeholder="Minimal 6 karakter"></div>' +
        '<div class="field" style="justify-content:flex-end"><button class="btn btn-primary" type="button" id="uTambah">＋ Tambah kasir</button></div></div>') +
      '<p class="tiny muted">Kasir hanya dapat mengakses Kasir/POS, Transaksi, dan melihat Produk.</p>' +
      '</div></div>';

    var btnUp = document.getElementById('btnUpgradeUser');
    if (btnUp) btnUp.addEventListener('click', function () { S.tab = 'paket'; render(rootEl, ctx); });

    var btnTambah = document.getElementById('uTambah');
    if (btnTambah) {
      btnTambah.addEventListener('click', function () {
        var nama = document.getElementById('uNama').value.trim();
        var email = document.getElementById('uEmail').value.trim().toLowerCase();
        var pass = document.getElementById('uPass').value;
        if (nama.length < 3) { UK.toast('Nama kasir wajib diisi.', 'err'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UK.toast('Email kasir tidak valid.', 'err'); return; }
        if (db.users.findByEmail(email)) { UK.toast('Email sudah dipakai akun lain.', 'err'); return; }
        if (pass.length < 6) { UK.toast('Kata sandi minimal 6 karakter.', 'err'); return; }
        db.users.create({ tenantId: ctx.tenant.id, nama: nama, email: email, passwordDemo: pass, peran: 'kasir' });
        UK.toast('Kasir ditambahkan.', 'ok');
        render(rootEl, ctx);
      });
    }
    box.querySelectorAll('[data-deluser]').forEach(function (b) {
      b.addEventListener('click', function () {
        UK.confirmDialog('Hapus akun kasir ini?', { danger: true, okText: 'Hapus' }).then(function (yes) {
          if (!yes) return;
          db.users.remove(b.getAttribute('data-deluser'), ctx.tenant.id);
          UK.toast('Akun kasir dihapus.', 'ok');
          render(rootEl, ctx);
        });
      });
    });
  }

  /* ---------------- paket ---------------- */
  function paketHTML(box, ctx) {
    var plans = db.plans.list();
    var current = ctx.tenant.paket;
    box.innerHTML =
      '<div class="panel"><div class="panel-head"><h3>Paket langganan</h3>' +
      '<span class="status orange">Paket saat ini: ' + UK.escapeHTML((db.plans.get(current) || {}).nama || current) + '</span></div>' +
      '<div class="panel-body"><div class="plan-grid">' +
      plans.map(function (p) {
        var aktif = p.id === current;
        return '<div class="plan' + (aktif ? ' featured' : '') + '">' +
          (aktif ? '<span class="tag">PAKET ANDA</span>' : '') +
          '<h3>' + UK.escapeHTML(p.nama) + '</h3>' +
          '<div class="pr">' + (p.harga ? UK.rupiah(p.harga) : 'Rp 0') + '</div>' +
          '<div class="tiny muted">' + (p.harga ? 'per bulan' : 'gratis selamanya') + '</div>' +
          '<ul>' + p.fitur.map(function (f) { return '<li>' + UK.escapeHTML(f) + '</li>'; }).join('') + '</ul>' +
          '<button class="btn ' + (aktif ? 'btn-light' : 'btn-primary') + '" type="button" data-upgrade="' + p.id + '"' +
          (aktif ? ' disabled' : '') + '>' + (aktif ? 'Paket aktif' : 'Upgrade ke ' + UK.escapeHTML(p.nama)) + '</button>' +
          '</div>';
      }).join('') + '</div>' +
      '<p class="tiny muted" style="margin-top:12px">Harga dan batas penggunaan masih draf, ditentukan setelah validasi pasar.</p>' +
      '</div></div>';

    box.querySelectorAll('[data-upgrade]').forEach(function (b) {
      b.addEventListener('click', function () {
        UK.toast('Pembayaran belum tersedia di demo. Hubungi tim UsahaKita untuk upgrade.', 'warn');
      });
    });
  }

  /* ---------------- zona berbahaya ---------------- */
  function bahayaHTML(box, ctx) {
    box.innerHTML =
      '<div class="panel" style="border-color:#f3d3d3"><div class="panel-head"><h3 class="red">Zona berbahaya</h3></div>' +
      '<div class="panel-body">' +
      '<p class="small">Mengatur ulang data demo akan menghapus <b>seluruh data lokal</b> (termasuk tenant yang Anda daftarkan) ' +
      'dan mengembalikan data contoh UsahaKita.</p>' +
      '<button class="btn btn-danger" type="button" id="btnReset">Reset data demo</button>' +
      '</div></div>';

    document.getElementById('btnReset').addEventListener('click', function () {
      var wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="rzTitle">' +
        '<div class="modal-head"><h3 id="rzTitle" class="red">Reset data demo</h3>' +
        '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
        '<div class="modal-body"><p class="small">Tindakan ini tidak bisa dibatalkan. Ketik <b>RESET</b> untuk melanjutkan.</p>' +
        '<div class="field"><label class="sr-only" for="rzInput">Ketik RESET</label>' +
        '<input type="text" id="rzInput" placeholder="RESET" autocomplete="off"></div></div>' +
        '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
        '<button class="btn btn-danger" type="button" id="rzOk" disabled>Hapus &amp; reset</button></div></div>';
      document.body.appendChild(wrap);
      UK.openModal(wrap);
      function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
      wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      var input = wrap.querySelector('#rzInput');
      var ok = wrap.querySelector('#rzOk');
      input.addEventListener('input', function () { ok.disabled = input.value.trim().toUpperCase() !== 'RESET'; });
      ok.addEventListener('click', function () {
        db.reset();
        Auth.logout();
        try { localStorage.removeItem('uk_banner_' + ctx.tenant.id); } catch (e) {}
        location.href = '../masuk.html?reset=1';
      });
    });
  }

  UK.registerModule('pengaturan', { render: render });
})();
