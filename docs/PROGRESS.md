# PROGRESS — Pembangunan Web UsahaKita

> Prototype HTML + CSS + JS murni. Data lewat `assets/js/db.js` (localStorage, prefix `uk_`).
> Jika pekerjaan terhenti: baca `docs/CONTEXT.md` + file ini, lanjut dari fase pertama yang belum dicentang.

- [x] **Fase 0** — Struktur proyek dan file konteks
- [x] **Fase 1** — Fondasi (`base.css`, `db.js`, `auth.js`, `utils.js`)
- [x] **Fase 2** — Landing page (`index.html`)
- [x] **Fase 3** — Registrasi dan login pemilik (`daftar.html`, `masuk.html`)
- [x] **Fase 4** — Shell dashboard pemilik + menu Dashboard (`app/index.html`, `app/js/dashboard.js`)
- [x] **Fase 5** — Produk dan kategori (`app/js/produk.js`)
- [x] **Fase 6** — Kasir / POS (`app/js/pos.js`)
- [x] **Fase 7** — Persediaan stok (`app/js/stok.js`)
- [x] **Fase 8** — Transaksi (`app/js/transaksi.js`)
- [x] **Fase 9** — Laporan (`app/js/laporan.js`)
- [x] **Fase 10** — Pelanggan dan piutang (`app/js/pelanggan.js`)
- [x] **Fase 11** — Pesan pelanggan (`app/js/pesan.js`)
- [x] **Fase 12** — Pengaturan usaha (`app/js/pengaturan.js`)
- [x] **Fase 13** — Website katalog publik (`toko/index.html`)
- [x] **Fase 14** — Admin platform (`admin/index.html`, `admin/js/`)
- [x] **Fase 15** — Integrasi, QA, dan perapian akhir

---

## Catatan per fase

### Fase 0
Dibuat seluruh struktur folder, `docs/CONTEXT.md` (konteks produk, desain, model data) dan file ini.
README ditulis pada Fase 15.

### Fase 1
- `assets/css/base.css`: token warna, komponen (btn/card/stat/table/status/field/modal/toast/empty/pagination),
  layout sidebar+topbar, halaman publik, POS, chat, print 58mm, responsif ≤720px.
- `assets/js/db.js`: repositori localStorage `uk_data`; seed 1 tenant demo + 15 tenant dummy, 13 produk,
  4 kategori, ±40 transaksi 30 hari, 6 pelanggan, 4 percakapan, tiket, log, paket, kategori bisnis.
  Setiap koleksi bisnis mewajibkan `tenantId` dan menolak akses lintas tenant. `db.reset()` mengembalikan demo.
- `assets/js/auth.js`: login admin & pemilik/kasir, sesi `sessionStorage` + fallback memori, tenant
  "Ditangguhkan" ditolak, `register()` untuk akun baru, `patchSession()`.
- `assets/js/utils.js`: `rupiah`, `tanggalIndo`, `escapeHTML`, `toast`, `openModal/closeModal/confirmDialog`,
  `downloadCSV` (BOM), `slugify`, `debounce`, `buatLinkWA`, `normalisasiWA`, `renderStruk/cetakStruk`,
  pager, chart SVG (`svgLine`, `svgDonut`), registry modul.
- Uji: `rupiah(1250000)` = `Rp 1.250.000`; `db.products.list({})` melempar error; list per tenant terisolasi.
- Catatan: halaman uji sementara `assets/test.html` tidak disimpan (fungsi diuji langsung di console browser
  dan lewat skenario QA), sesuai instruksi agar file uji dihapus setelah lolos.

### Fase 2
`index.html`: announcement bar, navbar + hamburger, hero + mock dashboard CSS, strip jenis usaha, 6 fitur,
3 langkah, paket dari `db.plans`, CTA, footer (admin + katalog demo). Animasi IntersectionObserver,
smooth scroll, responsif.

### Fase 3
`daftar.html`: wizard 2 langkah, indikator kekuatan sandi, normalisasi WA, validasi email duplikat,
slug unik, pembuatan tenant + user + kategori "Umum" + settings, auto-login, banner verifikasi email.
`masuk.html`: tampil/sembunyi sandi, ingat saya, lupa sandi (modal simulasi), tombol demo, pesan akun
ditangguhkan, redirect bila sudah login.

### Fase 4
`app/index.html`: `requireAuth`, sidebar navy + drawer mobile, badge pesan, kartu paket, topbar
(breadcrumb, pencarian global ke Produk, notifikasi stok/pesan, avatar), router hash 9 menu,
pembatasan menu kasir, banner status tenant.
`app/js/dashboard.js`: 4 KPI dari db, grafik 7/30 hari, donut kategori, produk terlaris,
ringkasan keuangan 30 hari, 5 transaksi terbaru.

### Fase 5
`app/js/produk.js`: tabel/kartu, cari/filter/urut/paginasi 10, modal produk (foto ≤500KB dipotong 1:1,
emoji, varian, kategori inline, hitung karakter, peringatan harga jual < beli), arsip/pulihkan,
manajemen kategori (duplikat & kategori terpakai ditolak), progres limit paket + blokir tambah,
salin tautan & lihat katalog. Stok awal/penyesuaian tercatat di `stockMovements`.

### Fase 6
`app/js/pos.js`: grid produk + chip kategori, pencarian (Enter menambah, F2 fokus), keranjang dengan
batas stok, diskon Rp/%, pajak dari settings, metode aktif, uang pas/cepat, kembalian, tahan/lanjutkan,
ID transaksi berurutan, pengurangan stok + movement `penjualan`, piutang bila kurang bayar,
struk cetak/PDF, F9 bayar.

### Fase 7
`app/js/stok.js`: 5 kartu ringkasan, tabel stok + status, edit stok minimum inline, modal masuk/keluar/opname
(catatan wajib untuk penyesuaian, stok tidak boleh negatif), riwayat dengan filter tipe/tanggal + CSV,
banner stok menipis, sinkron badge notifikasi.

### Fase 8
`app/js/transaksi.js`: filter cari/status/metode/tanggal + urut + paginasi, total halaman, drawer detail,
cetak ulang struk, Menunggu → Selesai, pembatalan dengan alasan + pengembalian stok + movement,
ekspor CSV hasil filter.

### Fase 9
`app/js/laporan.js`: periode hari/7/30/bulan/tahun/kustom, tab Ringkasan (dengan perbandingan periode
sebelumnya), Per Produk, Per Kategori (donut), Per Periode (harian/mingguan/bulanan/tahunan), Laba Rugi.
Hanya transaksi Selesai. CSV + cetak/PDF. Angka 30 hari diverifikasi sama dengan data transaksi.

### Fase 10
`app/js/pelanggan.js`: statistik, tabel dengan agregat transaksi Selesai, filter piutang, modal tambah/ubah
(normalisasi WA, tolak duplikat), hapus, drawer detail + riwayat transaksi + riwayat piutang,
catat pembayaran (tidak melebihi sisa), WhatsApp.

### Fase 11
`app/js/pesan.js`: 3 panel, pencarian + filter, bubble + label tanggal, Enter kirim/Shift+Enter baris baru,
balasan cepat, tandai terbaca + badge, catatan pelanggan tersimpan, lanjut WhatsApp (minta nomor bila kosong),
mode mobile daftar/chat dengan tombol kembali.

### Fase 12
`app/js/pengaturan.js`: 6 tab — profil + logo ≤300KB + jam operasional, katalog (toggle, slug unik, tautan,
template WA + pratinjau), transaksi/struk (pajak, metode, footer, pratinjau), pengguna (kasir + batas paket),
paket, zona berbahaya (ketik RESET).

### Fase 13
`toko/index.html`: katalog publik tanpa login, validasi slug/katalog aktif, badge Buka/Tutup dari jam
operasional, pencarian debounce, chip kategori, urutan, grid produk dipublikasikan, modal detail + varian +
jumlah, tombol WhatsApp dari template + pencatatan `waClicks`, form "Tanya penjual" → percakapan Website,
skeleton loading, meta dinamis, mobile-first.

### Fase 14
`admin/index.html` + `admin/js/admin.js` + `admin/js/pemantauan.js`: login dua kolom (validasi, shake,
loading 700ms), shell dengan pencarian & notifikasi, 8 menu: Ringkasan (metrik + indikator PRD),
Akun UMKM (filter/urut/paginasi 8, detail, tangguhkan/aktifkan, ubah paket, CSV), Paket (edit harga/batas,
sinkron ke landing & pengaturan), Kategori Bisnis (CRUD + aktif/nonaktif + cegah hapus terpakai),
Pemantauan Sistem (status layanan, uptime, grafik 24 jam, log, segarkan dummy), Laporan Platform,
Dukungan Pengguna (tiket + balasan + status), Pengaturan Admin (profil, ubah sandi demo, notifikasi).

### Fase 15 — QA
Skenario yang dijalankan di browser cloud (tanpa error console):
- Landing & katalog: 11 produk tampil, draf & arsip tidak tampil; pencarian + kategori; tombol WhatsApp
  memakai nomor baru dan mencatat klik; pesan template berisi {produk}/{harga}/{jumlah}/{tautan}.
- Registrasi akun baru → dashboard kosong + banner verifikasi → tambah 1 produk publikasi + 1 draf →
  katalog hanya menampilkan yang publikasi → "Tanya penjual" masuk ke inbox tenant baru.
- POS: uji 3 item dengan diskon 10% dan pajak 11% — subtotal 30.000, diskon 3.000, pajak 2.970,
  total 29.970 (benar); stok berkurang tepat,
  transaksi muncul di Transaksi/Dashboard, pembatalan mengembalikan stok dan tercatat di riwayat.
- Stok: barang masuk +5 menghasilkan tepat 1 baris riwayat; opname menolak tanpa catatan.
- Piutang: pembayaran 5.000 menurunkan piutang 45.000 → 40.000 dan tercatat di riwayat.
- Pesan: balasan tersimpan setelah refresh, badge belum dibaca akurat.
- Katalog: toggle nonaktif menampilkan "Katalog tidak tersedia"; nomor WhatsApp baru dan slug baru
  langsung dipakai katalog, slug lama menjadi tidak tersedia.
- Admin: 8 menu render, edit harga paket Pro langsung tampil di landing, penangguhan menolak login pemilik
  dan mematikan katalog, aktivasi kembali memulihkan.
- Isolasi tenant: `db.products.list({})` melempar error; tenant baru hanya melihat datanya sendiri.
- Kasir: hanya menu Kasir/Produk/Transaksi, akses #/laporan dialihkan ke #/pos, Produk read-only
  (tanpa tambah/ubah), POS + tahan/lanjutkan berfungsi.
- Responsif: 39 kombinasi halaman app/publik × 360/768/1440 px dan 24 kombinasi admin × 3 lebar —
  tidak ada scroll horizontal.

**Bug yang ditemukan & diperbaiki saat QA:**
1. Seed transaksi "hari ini" bisa bertanggal setelah waktu sekarang → transaksi baru tidak berada di urutan
   teratas. Seed sekarang dibatasi ke masa lalu.
2. Seed percakapan punya jam di masa depan → balasan baru tidak naik ke atas daftar. Waktu pesan seed digeser
   ke masa lalu dengan urutan tetap.
3. Shell dashboard kasir crash karena badge pesan dihapus dari sidebar, tetapi updater badge menulis ke
   elemen null → render halaman kosong. Updater sekarang defensif (guard null).
4. Pencarian global topbar mengarah ke `#/produk?q=…`, tetapi modul Produk mengabaikan query → filter kosong.
   Modul sekarang membaca `ctx.query.q`.
5. CSS print `body > *:not(#uk-print)` menyembunyikan seluruh laporan saat mencetak laporan → dibatasi dengan
   `body:not(.printing-report)`.
6. Logo emoji hilang setiap kali menyimpan profil (diganti inisial) → logo lama dipertahankan bila tidak diubah.

**Belum bisa dikerjakan / keterbatasan:**
- Pembayaran langganan dan upgrade paket hanya simulasi (toast), sesuai batasan prototype.
- PDF memakai dialog cetak browser, bukan generator PDF sisi server.
- Pemantauan sistem memakai nilai dummy acak (tidak ada backend untuk health check).
- Verifikasi email & lupa kata sandi hanya simulasi (tidak ada pengiriman email).
- Sesi & data sepenuhnya di browser; membuka di perangkat/browser lain tidak membawa data.
