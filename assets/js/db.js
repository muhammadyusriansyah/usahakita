/* ============================================================
   UsahaKita — db.js
   Lapisan data localStorage (prefix `uk_`) dengan isolasi tenant.
   Prototype: semua data di browser. Produksi: ganti isi repository
   ini dengan pemanggilan REST API (Laravel + PostgreSQL).
   ============================================================ */
(function () {
  'use strict';

  var PREFIX = 'uk_';
  var KEY = PREFIX + 'data';
  var memStore = {}; // fallback bila localStorage tidak tersedia / penuh
  var state = null;

  /* ---------------- storage helpers ---------------- */
  function storageGet(key) {
    try { return window.localStorage.getItem(key); }
    catch (e) { return memStore[key] != null ? memStore[key] : null; }
  }
  function storageSet(key, val) {
    try { window.localStorage.setItem(key, val); }
    catch (e) { memStore[key] = val; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); }
    catch (e) { delete memStore[key]; }
  }

  function readState() {
    var raw = storageGet(KEY);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tenants)) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function save() {
    try { storageSet(KEY, JSON.stringify(state)); }
    catch (e) { /* kuota penuh: biarkan fallback memori */ }
  }

  /* ---------------- identitas ---------------- */
  var seq = 0;
  function uid(prefix) {
    seq += 1;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + seq.toString(36) +
      Math.random().toString(36).slice(2, 6);
  }

  var DEFAULT_SETTINGS = {
    pajakPersen: 0,
    footerStruk: 'Terima kasih sudah berbelanja di toko kami 🙏',
    metodeAktif: ['Tunai', 'QRIS', 'Transfer'],
    templateWA: 'Halo, saya tertarik memesan produk berikut:\n\nNama Produk: {produk}\nHarga: {harga}\nJumlah: {jumlah}\nTautan: {tautan}\n\nApakah produk ini masih tersedia?',
    notifStok: true,
    notifPesan: true,
    emailTerverifikasi: false
  };

  /* ---------------- seed ---------------- */
  function lcg(seed) {
    var s = seed;
    return function () {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }
  function pick(arr, r) { return arr[Math.floor(r * arr.length) % arr.length]; }
  function iso(daysAgo, hour, minute) {
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute || 0, 0, 0);
    return d.toISOString();
  }

  var BIZ_CATEGORIES = [
    ['kuliner', 'Kuliner dan makanan'],
    ['minuman', 'Minuman dan kedai kopi'],
    ['retail', 'Retail dan perdagangan'],
    ['fashion', 'Fashion dan pakaian'],
    ['elektronik', 'Elektronik'],
    ['salon', 'Salon dan barbershop'],
    ['bengkel', 'Bengkel'],
    ['jasa', 'Usaha jasa'],
    ['produksi', 'Produksi dan manufaktur'],
    ['online', 'Usaha online']
  ];

  var DEMO_PRODUCTS = [
    ['Nasi Goreng Spesial', 'Makanan', '🍛', 12000, 20000, 40, 10, 'Nasi goreng dengan telur, ayam, dan kerupuk.'],
    ['Mie Aceh Spesial', 'Makanan', '🍜', 14000, 21000, 30, 8, 'Mie aceh kuah rempah dengan irisan daging.'],
    ['Ayam Geprek Sambal Ijo', 'Makanan', '🍗', 12000, 18000, 25, 8, 'Ayam goreng crispy dengan sambal ijo pedas.'],
    ['Nasi Uduk Ayam', 'Makanan', '🍚', 13000, 19000, 18, 6, 'Nasi uduk wangi dengan ayam goreng dan sambal.'],
    ['Es Teh Manis', 'Minuman', '🧋', 2000, 5000, 100, 20, 'Teh manis dingin segar.'],
    ['Kopi Susu Gula Aren', 'Minuman', '☕', 8000, 16000, 50, 12, 'Kopi susu dengan gula aren asli.'],
    ['Es Jeruk Peras', 'Minuman', '🍊', 3000, 7000, 60, 15, 'Jeruk peras segar dengan es batu.'],
    ['Roti Bakar Coklat', 'Camilan', '🍞', 5000, 10000, 20, 6, 'Roti bakar isi coklat keju.'],
    ['Pisang Goreng Keju', 'Camilan', '🍌', 6000, 12000, 15, 5, 'Pisang goreng crispy topping keju.'],
    ['Paket Hemat Nasi + Es Teh', 'Paket', '🍱', 14000, 22000, 30, 10, 'Nasi goreng spesial + es teh manis.'],
    ['Keripik Pisang', 'Camilan', '🍟', 7000, 12000, 8, 10, 'Keripik pisang renyah kemasan 150gr.'],
    ['Sambal Botol Rumahan', 'Camilan', '🌶️', 8000, 15000, 0, 5, 'Sambal botol pedas manis 200ml.'],
    ['Kue Kering Lebaran', 'Camilan', '🍪', 20000, 35000, 12, 4, 'Kue kering nastar dan kastengel.']
  ];

  var PRODUCT_STATUS = { 11: 'draf', 12: 'diarsipkan' }; // indeks 10 = Keripik tetap publikasi

  var DEMO_CUSTOMERS = [
    ['Rahmi Aulia', '6281234567891', 45000],
    ['Fajar Maulana', '6281234567892', 0],
    ['Siti Nurhaliza', '6281234567893', 0],
    ['Andi Pratama', '6281234567894', 12000],
    ['Dewi Lestari', '6281234567895', 0],
    ['Hendra Saputra', '6281234567896', 0]
  ];

  var DUMMY = [
    ['Warung Bu Tini', 'kuliner', 'free', 'Aktif', 'Banda Aceh', 'Bu Tini'],
    ['Kopi Senja', 'minuman', 'pro', 'Aktif', 'Yogyakarta', 'Dimas Prakoso'],
    ['Toko Bangunan Sejahtera', 'retail', 'business', 'Aktif', 'Medan', 'Hendra Gunawan'],
    ['Hijab Cantika', 'fashion', 'pro', 'Aktif', 'Bandung', 'Nadia Putri'],
    ['Gadget Center', 'elektronik', 'free', 'Menunggu verifikasi', 'Jakarta', 'Rizky Ramadhan'],
    ['Barbershop Ganteng', 'salon', 'pro', 'Aktif', 'Surabaya', 'Bagus Setiawan'],
    ['Bengkel Motor Jaya', 'bengkel', 'free', 'Ditangguhkan', 'Malang', 'Joko Susilo'],
    ['Jasa Desain Kreatif', 'jasa', 'business', 'Aktif', 'Jakarta', 'Anisa Rahma'],
    ['Keripik Mak Nyus', 'produksi', 'free', 'Aktif', 'Padang', 'Yusuf Maulana'],
    ['Batik Nusantara', 'fashion', 'business', 'Aktif', 'Solo', 'Ratna Wulandari'],
    ['Toko Sembako Murah', 'retail', 'free', 'Aktif', 'Bekasi', 'Sugeng Riyadi'],
    ['Katering Dapur Ibu', 'kuliner', 'pro', 'Aktif', 'Semarang', 'Ibu Wati'],
    ['Fresh Laundry', 'jasa', 'free', 'Menunggu verifikasi', 'Depok', 'Bayu Kurniawan'],
    ['Toko Emas Mulia', 'retail', 'business', 'Aktif', 'Palembang', 'Lina Marlina'],
    ['Mebel Kayu Asri', 'produksi', 'pro', 'Aktif', 'Jepara', 'Sutrisno']
  ];

  function buildSeed() {
    var now = Date.now();
    var data = {
      tenants: [], users: [], categories: [], products: [], stockMovements: [],
      customers: [], transactions: [], conversations: [], settings: [],
      plans: [], businessCategories: [], tickets: [], systemLogs: [], waClicks: [],
      adminSettings: {
        nama: 'Admin Platform',
        email: 'admin@usahakita.id',
        notifEmail: true,
        notifTicket: true
      },
      meta: { seededAt: new Date(now).toISOString(), version: 1 }
    };

    /* --- kategori bisnis --- */
    BIZ_CATEGORIES.forEach(function (c) {
      data.businessCategories.push({ id: c[0], nama: c[1], aktif: true });
    });

    /* --- paket --- */
    data.plans = [
      {
        id: 'free', nama: 'Free', harga: 0, batas: { produk: 20, pengguna: 1, cabang: 1 },
        fitur: ['20 produk', '1 pengguna', 'Kasir & struk digital', 'Katalog online + WhatsApp', 'Laporan penjualan dasar']
      },
      {
        id: 'pro', nama: 'Pro', harga: 99000, batas: { produk: 500, pengguna: 5, cabang: 2 },
        fitur: ['500 produk', '5 pengguna', 'Semua fitur Free', 'Laporan lengkap & ekspor CSV', 'Manajemen stok & piutang', 'Dukungan prioritas']
      },
      {
        id: 'business', nama: 'Business', harga: 249000, batas: { produk: 100000, pengguna: 25, cabang: 10 },
        fitur: ['Produk tanpa batas praktis', '25 pengguna', 'Semua fitur Pro', 'Multi-cabang', 'Audit stok lanjutan', 'Pendampingan onboarding']
      }
    ];

    /* --- tenant demo --- */
    var demoTenantId = 't-demo';
    data.tenants.push({
      id: demoTenantId, slug: 'bisnis-kita-store', nama: 'Bisnis Kita Store',
      jenis: 'kuliner', pemilik: 'Yusriansyah', email: 'demo@usahakita.id',
      wa: '6281234567890', alamat: 'Jl. Tgk. H. M. Daud Beureueh No. 12, Banda Aceh',
      deskripsi: 'Kuliner rumahan khas Aceh dengan bahan segar setiap hari. Melayani pesanan dine-in, take away, dan catering kecil.',
      logo: '🍛', jamOperasional: {
        senin: { buka: true, dari: '08:00', sampai: '21:00' },
        selasa: { buka: true, dari: '08:00', sampai: '21:00' },
        rabu: { buka: true, dari: '08:00', sampai: '21:00' },
        kamis: { buka: true, dari: '08:00', sampai: '21:00' },
        jumat: { buka: true, dari: '08:00', sampai: '21:30' },
        sabtu: { buka: true, dari: '09:00', sampai: '22:00' },
        minggu: { buka: false, dari: '09:00', sampai: '17:00' }
      },
      katalogAktif: true, paket: 'free', status: 'Aktif',
      dibuatPada: iso(95, 9, 15)
    });

    data.users.push({
      id: 'u-demo', tenantId: demoTenantId, nama: 'Yusriansyah',
      email: 'demo@usahakita.id', passwordDemo: 'demo1234', peran: 'pemilik'
    });

    data.settings.push({
      tenantId: demoTenantId, pajakPersen: 11,
      footerStruk: 'Terima kasih sudah berbelanja di Bisnis Kita Store 🙏',
      metodeAktif: ['Tunai', 'QRIS', 'Transfer'],
      templateWA: DEFAULT_SETTINGS.templateWA,
      notifStok: true, notifPesan: true, emailTerverifikasi: true
    });

    /* --- kategori & produk demo --- */
    var catNames = ['Makanan', 'Minuman', 'Camilan', 'Paket'];
    var catIds = {};
    catNames.forEach(function (n, i) {
      var id = 'cat-d' + (i + 1);
      catIds[n] = id;
      data.categories.push({ id: id, tenantId: demoTenantId, nama: n });
    });

    var demoProducts = [];
    DEMO_PRODUCTS.forEach(function (p, i) {
      var id = 'p-demo-' + (i + 1);
      var status = i === 11 ? 'draf' : (i === 12 ? 'diarsipkan' : 'dipublikasikan');
      var prod = {
        id: id, tenantId: demoTenantId, kode: 'BK' + String(i + 1).padStart(3, '0'),
        barcode: '89910000' + String(i + 1).padStart(4, '0'),
        nama: p[0], deskripsi: p[7], kategoriId: catIds[p[1]],
        hargaBeli: p[3], hargaJual: p[4], stok: p[5], stokMin: p[6],
        foto: '', emoji: p[2], status: status,
        varian: i === 0 ? [{ nama: 'Level pedas sedang', tambahan: 0 }, { nama: 'Extra telur', tambahan: 3000 }] : [],
        dibuatPada: iso(60 - i, 9, 0)
      };
      data.products.push(prod);
      demoProducts.push(prod);
    });

    /* --- pelanggan demo --- */
    var demoCustomers = [];
    DEMO_CUSTOMERS.forEach(function (c, i) {
      var id = 'c-demo-' + (i + 1);
      demoCustomers.push({
        id: id, tenantId: demoTenantId, nama: c[0], telepon: c[1],
        piutang: c[2], dibuatPada: iso(50 - i * 5, 10, 0)
      });
    });
    data.customers = demoCustomers;

    /* --- transaksi demo --- */
    var r = lcg(20240117);
    var sold = {}; // productId -> qty terjual (non-batal)
    var activeProducts = demoProducts.filter(function (p) { return p.status === 'dipublikasikan' && p.stok > 0; });

    function buildTrx(tenantId, id, dayAgo, hour, productPool, customerPool, taxPercent) {
      var items = [];
      var count = 1 + Math.floor(r() * 3);
      var used = {};
      for (var k = 0; k < count; k++) {
        var prod = pick(productPool, r());
        if (used[prod.id]) continue;
        used[prod.id] = true;
        var qty = 1 + Math.floor(r() * 2);
        items.push({ productId: prod.id, nama: prod.nama, qty: qty, harga: prod.hargaJual });
      }
      if (!items.length) items.push({ productId: productPool[0].id, nama: productPool[0].nama, qty: 1, harga: productPool[0].hargaJual });
      var subtotal = items.reduce(function (a, it) { return a + it.qty * it.harga; }, 0);
      var diskon = r() < 0.18 ? Math.round(subtotal * 0.1) : 0;
      var pajak = Math.round((subtotal - diskon) * (taxPercent / 100));
      var total = subtotal - diskon + pajak;
      var metode = pick(['Tunai', 'Tunai', 'QRIS', 'Transfer'], r());
      var status = r() < 0.06 ? 'Dibatalkan' : (r() < 0.04 ? 'Menunggu' : 'Selesai');
      var dibayar = status === 'Menunggu' ? Math.round(total * 0.4) : total;
      if (metode !== 'Tunai') dibayar = total;
      // jangan pernah membuat transaksi seed di masa depan (jam toko bisa > jam sekarang)
      var waktu = iso(dayAgo, hour, Math.floor(r() * 59));
      if (new Date(waktu).getTime() > Date.now()) {
        waktu = new Date(Date.now() - Math.floor(r() * 240 + 5) * 60000).toISOString();
      }
      var t = {
        id: id, tenantId: tenantId, waktu: waktu,
        pelangganId: customerPool.length && r() < 0.45 ? pick(customerPool, r()).id : null,
        items: items, subtotal: subtotal, diskon: diskon, pajak: pajak, total: total,
        metode: metode, dibayar: dibayar, kembalian: Math.max(0, dibayar - total),
        status: status, catatan: ''
      };
      if (status === 'Batal' ) t.status = 'Dibatalkan';
      return t;
    }

    var trxSeq = 0;
    for (var d = 29; d >= 0; d--) {
      var perDay = 1 + Math.floor(r() * 2);
      if (d > 20) perDay = 1;
      for (var j = 0; j < perDay; j++) {
        trxSeq++;
        var trx = buildTrx(demoTenantId, 'TRX-' + String(trxSeq).padStart(5, '0'), d,
          9 + Math.floor(r() * 10), activeProducts, demoCustomers, 11);
        data.transactions.push(trx);
        if (trx.status !== 'Dibatalkan') {
          trx.items.forEach(function (it) {
            sold[it.productId] = (sold[it.productId] || 0) + it.qty;
          });
        }
      }
    }

    /* --- riwayat stok demo (kronologis, saldo akurat) --- */
    var trxChrono = data.transactions.slice().sort(function (a, b) {
      return new Date(a.waktu) - new Date(b.waktu);
    });
    demoProducts.forEach(function (prod) {
      var terjual = sold[prod.id] || 0;
      var saldo = prod.stok + terjual;
      data.stockMovements.push({
        id: uid('sm'), tenantId: demoTenantId, productId: prod.id,
        tipe: 'masuk', jumlah: saldo, saldo: saldo,
        catatan: 'Stok awal pencatatan', waktu: iso(40, 8, 0)
      });
      trxChrono.forEach(function (trx) {
        if (trx.status === 'Dibatalkan') return;
        trx.items.forEach(function (it) {
          if (it.productId !== prod.id) return;
          saldo -= it.qty;
          data.stockMovements.push({
            id: uid('sm'), tenantId: demoTenantId, productId: prod.id,
            tipe: 'penjualan', jumlah: -it.qty, saldo: saldo,
            catatan: 'Penjualan ' + trx.id, waktu: trx.waktu
          });
        });
      });
      if (prod.stok === 8) {
        data.stockMovements.push({
          id: uid('sm'), tenantId: demoTenantId, productId: prod.id, tipe: 'penyesuaian',
          jumlah: 0, saldo: saldo, catatan: 'Stok opname mingguan: sesuai catatan', waktu: iso(2, 16, 0)
        });
      }
    });

    /* --- percakapan demo --- */
    data.conversations = [
      {
        id: 'conv-1', tenantId: demoTenantId, nama: 'Rahmi Aulia', kanal: 'WhatsApp', unread: 2,
        telepon: '6281234567891', catatan: 'Langganan paket hemat setiap Jumat.',
        messages: [
          { dari: 'pelanggan', teks: 'Halo, paket hematnya masih ada hari ini?', waktu: iso(0, 9, 12) },
          { dari: 'pemilik', teks: 'Halo Kak Rahmi, masih ada. Mau berapa paket?', waktu: iso(0, 9, 15) },
          { dari: 'pelanggan', teks: 'Ambil 5 ya, nanti diambil jam 12.', waktu: iso(0, 9, 18) },
          { dari: 'pelanggan', teks: 'Bisa tambah sambal 5 bungkus?', waktu: iso(0, 9, 19) }
        ]
      },
      {
        id: 'conv-2', tenantId: demoTenantId, nama: 'Fajar Maulana', kanal: 'Website', unread: 1,
        telepon: '', catatan: '',
        messages: [
          { dari: 'pelanggan', teks: 'Apakah bisa kirim ke Lueng Bata? Ongkir berapa?', waktu: iso(0, 8, 40) }
        ]
      },
      {
        id: 'conv-3', tenantId: demoTenantId, nama: 'Siti Nurhaliza', kanal: 'WhatsApp', unread: 0,
        telepon: '6281234567893', catatan: '',
        messages: [
          { dari: 'pelanggan', teks: 'Kopi susunya enak, kemarin pesan 2.', waktu: iso(1, 15, 2) },
          { dari: 'pemilik', teks: 'Terima kasih Kak Siti 🙏', waktu: iso(1, 15, 20) }
        ]
      },
      {
        id: 'conv-4', tenantId: demoTenantId, nama: 'Andi Pratama', kanal: 'Website', unread: 0,
        telepon: '6281234567894', catatan: 'Menanyakan catering 50 porsi.',
        messages: [
          { dari: 'pelanggan', teks: 'Saya butuh catering 50 porsi untuk acara kantor. Bisa?', waktu: iso(4, 11, 5) },
          { dari: 'pemilik', teks: 'Bisa Pak Andi, saya kirim detailnya via WhatsApp ya.', waktu: iso(4, 11, 30) }
        ]
      }
    ];

    /* --- tiket dukungan --- */
    data.tickets = [
      {
        id: 'tkt-1', tenantId: demoTenantId, subjek: 'Struk tidak muncul setelah transaksi',
        prioritas: 'Tinggi', status: 'Baru', dibuatPada: iso(1, 10, 12),
        pesan: [
          { dari: 'pemilik', teks: 'Setelah bayar, modal struk tidak muncul di HP saya.', waktu: iso(1, 10, 12) }
        ]
      },
      {
        id: 'tkt-2', tenantId: 't-2', subjek: 'Cara mengubah nomor WhatsApp katalog',
        prioritas: 'Sedang', status: 'Diproses', dibuatPada: iso(3, 14, 0),
        pesan: [
          { dari: 'pemilik', teks: 'Nomor WhatsApp di katalog masih nomor lama.', waktu: iso(3, 14, 0) },
          { dari: 'admin', teks: 'Silakan buka Pengaturan Usaha → Profil Usaha, lalu simpan nomor baru.', waktu: iso(3, 15, 0) }
        ]
      },
      {
        id: 'tkt-3', tenantId: 't-3', subjek: 'Permintaan upgrade paket Business',
        prioritas: 'Rendah', status: 'Selesai', dibuatPada: iso(10, 9, 0),
        pesan: [
          { dari: 'pemilik', teks: 'Saya ingin upgrade ke Business untuk 3 cabang.', waktu: iso(10, 9, 0) },
          { dari: 'admin', teks: 'Paket Business sudah aktif di akun Anda. Terima kasih!', waktu: iso(10, 11, 0) }
        ]
      }
    ];

    /* --- log sistem --- */
    data.systemLogs = [
      { id: uid('log'), level: 'info', pesan: 'Seed data demo dibuat', waktu: iso(0, 6, 0) },
      { id: uid('log'), level: 'info', pesan: 'Backup harian selesai (128 MB)', waktu: iso(1, 2, 0) },
      { id: uid('log'), level: 'peringatan', pesan: 'Penyimpanan gambar mencapai 68% kapasitas', waktu: iso(1, 13, 20) },
      { id: uid('log'), level: 'error', pesan: 'Kegagalan kirim email verifikasi untuk 1 akun', waktu: iso(2, 19, 45) },
      { id: uid('log'), level: 'info', pesan: 'Pemeliharaan terjadwal selesai tanpa downtime', waktu: iso(4, 1, 0) }
    ];

    /* --- tenant dummy + data pendukung --- */
    DUMMY.forEach(function (row, i) {
      var tid = 't-' + (i + 2);
      var slug = row[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      var buka = row[3] === 'Aktif';
      data.tenants.push({
        id: tid, slug: slug, nama: row[0], jenis: row[1], pemilik: row[5],
        email: 'pemilik@' + slug + '.id', wa: '62812' + String(30000000 + i * 7717),
        alamat: 'Jl. Merdeka No. ' + (i + 3) + ', ' + row[4],
        deskripsi: row[0] + ' melayani pelanggan di ' + row[4] + ' dan sekitarnya.',
        logo: ['🍜', '☕', '🏪', '🧕', '📱', '💈', '🔧', '🎨', '🍟', '🧵', '🛒', '🍲', '🧺', '💍', '🪑'][i] || '🏪',
        jamOperasional: {
          senin: { buka: true, dari: '08:00', sampai: '20:00' },
          selasa: { buka: true, dari: '08:00', sampai: '20:00' },
          rabu: { buka: true, dari: '08:00', sampai: '20:00' },
          kamis: { buka: true, dari: '08:00', sampai: '20:00' },
          jumat: { buka: true, dari: '08:00', sampai: '20:00' },
          sabtu: { buka: true, dari: '09:00', sampai: '18:00' },
          minggu: { buka: false, dari: '09:00', sampai: '17:00' }
        },
        katalogAktif: buka && i % 5 !== 0, paket: row[2], status: row[3],
        dibuatPada: iso(150 - i * 8, 10, 30)
      });

      data.users.push({
        id: 'u-' + (i + 2), tenantId: tid, nama: row[5],
        email: 'pemilik@' + slug + '.id', passwordDemo: 'demo1234', peran: 'pemilik'
      });

      var cid = 'cat-' + (i + 2) + '-1';
      data.categories.push({ id: cid, tenantId: tid, nama: 'Umum' });
      var prods = [];
      [1, 2, 3].forEach(function (n) {
        var p = {
          id: 'p-' + tid + '-' + n, tenantId: tid, kode: 'P' + n, barcode: '',
          nama: 'Produk ' + row[0] + ' ' + n, deskripsi: 'Produk unggulan ' + row[0] + '.',
          kategoriId: cid, hargaBeli: 10000 * n, hargaJual: 15000 * n,
          stok: 10 + n * 3, stokMin: 3, foto: '', emoji: '📦',
          status: 'dipublikasikan', varian: [], dibuatPada: iso(30, 9, 0)
        };
        data.products.push(p);
        prods.push(p);
      });

      var guests = [{ id: 'c-' + tid + '-1', tenantId: tid, nama: 'Pelanggan ' + row[5], telepon: '62812' + String(40000000 + i * 991), piutang: 0, dibuatPada: iso(20, 9, 0) }];
      data.customers = data.customers.concat(guests);

      var dummyTrxCount = 2 + Math.floor(r() * 4);
      for (var z = 0; z < dummyTrxCount; z++) {
        data.transactions.push(buildTrx(tid, 'TRX-' + String(z + 1).padStart(5, '0'),
          Math.floor(r() * 28), 9 + Math.floor(r() * 9), prods, guests, 0));
      }
      data.settings.push({
        tenantId: tid, pajakPersen: 0, footerStruk: 'Terima kasih 🙏',
        metodeAktif: ['Tunai', 'QRIS', 'Transfer'],
        templateWA: DEFAULT_SETTINGS.templateWA, notifStok: true, notifPesan: true,
        emailTerverifikasi: buka
      });
      if (i % 3 === 0) {
        data.waClicks.push({ id: uid('wa'), tenantId: tid, productId: prods[0].id, waktu: iso(1 + i, 12, 0) });
      }
    });

    /* geser waktu seed yang berada di masa depan agar riwayat tetap logis */
    function geserKeMasaLalu(list, menitLalu) {
      if (!list || !list.length) return;
      var max = 0;
      list.forEach(function (x) {
        var t = new Date(x.waktu).getTime();
        if (t > max) max = t;
      });
      var target = Date.now() - menitLalu * 60000;
      if (max <= target) return;
      var delta = max - target;
      list.forEach(function (x) {
        x.waktu = new Date(new Date(x.waktu).getTime() - delta).toISOString();
      });
    }

    data.conversations.forEach(function (c, i) {
      geserKeMasaLalu(c.messages, 5 + i * 17);
    });
    data.tickets.forEach(function (t, i) {
      geserKeMasaLalu(t.pesan, 25 + i * 90);
      if (t.pesan.length) t.dibuatPada = t.pesan[0].waktu;
    });

    return data;
  }

  /* ---------------- repositori ---------------- */
  function rows(name) {
    if (!state[name]) state[name] = [];
    return state[name];
  }

  function requireTenant(tenantId) {
    if (!tenantId) throw new Error('Akses ditolak: tenantId wajib untuk data bisnis.');
    return tenantId;
  }

  function scoped(name) {
    return {
      list: function (opts) {
        var tenantId = requireTenant(opts && opts.tenantId);
        return rows(name).filter(function (x) { return x.tenantId === tenantId; });
      },
      get: function (id, tenantId) {
        requireTenant(tenantId);
        var found = rows(name).filter(function (x) { return x.id === id; })[0];
        if (!found) return null;
        if (found.tenantId !== tenantId) throw new Error('Akses lintas tenant ditolak.');
        return found;
      },
      create: function (data) {
        var tenantId = requireTenant(data && data.tenantId);
        var record = Object.assign({}, data, { id: data.id || uid(name.slice(0, 2)) });
        record.tenantId = tenantId;
        rows(name).push(record);
        save();
        return record;
      },
      update: function (id, patch, tenantId) {
        requireTenant(tenantId);
        var rec = rows(name).filter(function (x) { return x.id === id; })[0];
        if (!rec) throw new Error('Data tidak ditemukan.');
        if (rec.tenantId !== tenantId) throw new Error('Akses lintas tenant ditolak.');
        Object.assign(rec, patch, { id: rec.id, tenantId: rec.tenantId });
        save();
        return rec;
      },
      remove: function (id, tenantId) {
        requireTenant(tenantId);
        var arr = rows(name);
        var idx = arr.findIndex(function (x) { return x.id === id; });
        if (idx < 0) return false;
        if (arr[idx].tenantId !== tenantId) throw new Error('Akses lintas tenant ditolak.');
        arr.splice(idx, 1);
        save();
        return true;
      }
    };
  }

  /* ---------------- API publik ---------------- */
  var db = {
    uid: uid,
    PREFIX: PREFIX,

    init: function () {
      if (state) return state;
      state = readState();
      if (!state) {
        state = buildSeed();
        save();
      }
      return state;
    },

    reset: function () {
      state = buildSeed();
      save();
      return state;
    },

    save: save,

    /* --- global (bukan data bisnis) --- */
    tenants: {
      list: function () { return rows('tenants').slice(); },
      get: function (id) { return rows('tenants').filter(function (t) { return t.id === id; })[0] || null; },
      bySlug: function (slug) {
        return rows('tenants').filter(function (t) { return t.slug === slug; })[0] || null;
      },
      create: function (data) {
        var rec = Object.assign({}, data);
        rec.id = rec.id || uid('t');
        rows('tenants').push(rec);
        save();
        return rec;
      },
      update: function (id, patch) {
        var rec = db.tenants.get(id);
        if (!rec) throw new Error('Tenant tidak ditemukan.');
        Object.assign(rec, patch, { id: rec.id });
        save();
        return rec;
      },
      remove: function (id) {
        var arr = rows('tenants');
        var idx = arr.findIndex(function (t) { return t.id === id; });
        if (idx < 0) return false;
        arr.splice(idx, 1);
        save();
        return true;
      },
      slugTaken: function (slug, exceptId) {
        return rows('tenants').some(function (t) { return t.slug === slug && t.id !== exceptId; });
      }
    },

    users: {
      list: function (opts) {
        var tenantId = requireTenant(opts && opts.tenantId);
        return rows('users').filter(function (u) { return u.tenantId === tenantId; });
      },
      get: function (id, tenantId) {
        requireTenant(tenantId);
        var u = rows('users').filter(function (x) { return x.id === id; })[0];
        if (!u) return null;
        if (u.tenantId !== tenantId) throw new Error('Akses lintas tenant ditolak.');
        return u;
      },
      findByEmail: function (email) {
        var e = String(email || '').trim().toLowerCase();
        return rows('users').filter(function (u) { return String(u.email).toLowerCase() === e; })[0] || null;
      },
      create: function (data) {
        var tenantId = requireTenant(data && data.tenantId);
        var rec = Object.assign({}, data, { id: data.id || uid('u'), tenantId: tenantId });
        rows('users').push(rec);
        save();
        return rec;
      },
      update: function (id, patch, tenantId) {
        requireTenant(tenantId);
        var u = rows('users').filter(function (x) { return x.id === id; })[0];
        if (!u) throw new Error('Pengguna tidak ditemukan.');
        if (u.tenantId !== tenantId) throw new Error('Akses lintas tenant ditolak.');
        Object.assign(u, patch, { id: u.id, tenantId: u.tenantId });
        save();
        return u;
      },
      remove: function (id, tenantId) {
        requireTenant(tenantId);
        var arr = rows('users');
        var idx = arr.findIndex(function (x) { return x.id === id; });
        if (idx < 0) return false;
        if (arr[idx].tenantId !== tenantId) throw new Error('Akses lintas tenant ditolak.');
        arr.splice(idx, 1);
        save();
        return true;
      }
    },

    categories: scoped('categories'),
    products: scoped('products'),
    stockMovements: scoped('stockMovements'),
    customers: scoped('customers'),
    conversations: scoped('conversations'),

    tickets: Object.assign(scoped('tickets'), {
      /* admin platform: lintas tenant, eksplisit */
      listAll: function () { return rows('tickets').slice(); }
    }),
    waClicks: Object.assign(scoped('waClicks'), {
      /* indikator admin: lintas tenant, eksplisit */
      listAll: function () { return rows('waClicks').slice(); }
    }),

    transactions: Object.assign(scoped('transactions'), {
      /* Hanya untuk admin platform: lintas tenant, sengaja eksplisit. */
      listAll: function () { return rows('transactions').slice(); },
      nextId: function (tenantId) {
        requireTenant(tenantId);
        var max = 0;
        rows('transactions').forEach(function (t) {
          if (t.tenantId !== tenantId) return;
          var n = parseInt(String(t.id).replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n) && n > max) max = n;
        });
        return 'TRX-' + String(max + 1).padStart(5, '0');
      }
    }),

    settings: {
      get: function (tenantId) {
        requireTenant(tenantId);
        var s = rows('settings').filter(function (x) { return x.tenantId === tenantId; })[0];
        var merged = Object.assign({}, DEFAULT_SETTINGS, s || {});
        merged.tenantId = tenantId;
        return merged;
      },
      update: function (tenantId, patch) {
        requireTenant(tenantId);
        var s = rows('settings').filter(function (x) { return x.tenantId === tenantId; })[0];
        if (!s) {
          s = Object.assign({ tenantId: tenantId }, DEFAULT_SETTINGS);
          rows('settings').push(s);
        }
        Object.assign(s, patch, { tenantId: tenantId });
        save();
        return s;
      }
    },

    plans: {
      list: function () {
        var order = { free: 1, pro: 2, business: 3 };
        return rows('plans').slice().sort(function (a, b) { return order[a.id] - order[b.id]; });
      },
      get: function (id) { return rows('plans').filter(function (p) { return p.id === id; })[0] || null; },
      update: function (id, patch) {
        var p = db.plans.get(id);
        if (!p) throw new Error('Paket tidak ditemukan.');
        if (patch.batas) patch.batas = Object.assign({}, p.batas, patch.batas);
        Object.assign(p, patch, { id: p.id });
        save();
        return p;
      }
    },

    businessCategories: {
      list: function () { return rows('businessCategories').slice(); },
      get: function (id) { return rows('businessCategories').filter(function (c) { return c.id === id; })[0] || null; },
      create: function (data) {
        var nama = String(data.nama || '').trim();
        if (!nama) throw new Error('Nama kategori wajib diisi.');
        var dup = rows('businessCategories').some(function (c) { return c.nama.toLowerCase() === nama.toLowerCase(); });
        if (dup) throw new Error('Kategori sudah ada.');
        var rec = { id: data.id || uid('bc'), nama: nama, aktif: data.aktif !== false };
        rows('businessCategories').push(rec);
        save();
        return rec;
      },
      update: function (id, patch) {
        var c = db.businessCategories.get(id);
        if (!c) throw new Error('Kategori tidak ditemukan.');
        if (patch.nama != null) {
          var nama = String(patch.nama).trim();
          if (!nama) throw new Error('Nama kategori wajib diisi.');
          var dup = rows('businessCategories').some(function (x) {
            return x.id !== id && x.nama.toLowerCase() === nama.toLowerCase();
          });
          if (dup) throw new Error('Kategori sudah ada.');
          patch.nama = nama;
        }
        Object.assign(c, patch, { id: c.id });
        save();
        return c;
      },
      remove: function (id) {
        var arr = rows('businessCategories');
        var idx = arr.findIndex(function (c) { return c.id === id; });
        if (idx < 0) return false;
        arr.splice(idx, 1);
        save();
        return true;
      }
    },

    systemLogs: {
      list: function () { return rows('systemLogs').slice(); },
      add: function (level, pesan) {
        var rec = { id: uid('log'), level: level, pesan: pesan, waktu: new Date().toISOString() };
        rows('systemLogs').unshift(rec);
        if (rows('systemLogs').length > 200) rows('systemLogs').pop();
        save();
        return rec;
      }
    },

    adminSettings: {
      get: function () { return Object.assign({}, state.adminSettings || {}); },
      update: function (patch) {
        state.adminSettings = Object.assign({}, state.adminSettings, patch);
        save();
        return state.adminSettings;
      }
    },

    meta: function () { return Object.assign({}, state.meta || {}); }
  };

  window.db = db;
  db.init();
})();
