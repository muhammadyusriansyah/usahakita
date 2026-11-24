# UsahaKita

Prototype platform penjualan & manajemen UMKM terintegrasi: dashboard pemilik/kasir, katalog online per usaha
dengan pesan WhatsApp, dan admin platform. Dibangun dengan **HTML + CSS + JavaScript murni** (tanpa framework,
tanpa library eksternal), data disimpan di **localStorage**.

## Cara menjalankan

Semua halaman bisa dibuka langsung dari file system (`index.html`), tetapi cara paling aman adalah memakai
server statis sederhana agar tautan relatif dan `?u=slug` bekerja konsisten:

```bash
# dari folder proyek
python3 -m http.server 3000
# lalu buka http://localhost:3000/index.html
```

Alternatif: `npx serve .` atau ekstensi Live Server.

Tidak ada proses build, tidak ada dependensi Node yang perlu diinstal.

## Akun demo

| Peran | Akses | Kredensial |
|---|---|---|
| Pemilik UMKM (demo) | `masuk.html` → dashboard | `demo@usahakita.id` / `demo1234` |
| Admin platform | `admin/index.html` | `admin` / `admin` |

Akun pemilik baru bisa dibuat lewat `daftar.html`. Akun kasir dibuat dari **Pengaturan Usaha → Pengguna**
(paket Free hanya mengizinkan 1 pengguna; ubah paket untuk menambah kasir).

Katalog demo: `toko/index.html?u=bisnis-kita-store`.

Data tersimpan di localStorage dengan prefix `uk_`. Reset ke data contoh lewat
**Pengaturan Usaha → Zona Berbahaya** atau `db.reset()` di console.

## Struktur folder

```
usahakita/
├─ index.html                  # landing page
├─ masuk.html                  # login pemilik/kasir
├─ daftar.html                 # registrasi pemilik (wizard 2 langkah)
├─ app/
│  ├─ index.html               # shell dashboard + router hash
│  └─ js/
│     ├─ dashboard.js          # ringkasan, grafik, produk terlaris
│     ├─ produk.js             # produk, kategori, foto, varian, limit paket
│     ├─ pos.js                # kasir, keranjang, diskon, pajak, struk
│     ├─ stok.js               # stok masuk/keluar/opname + riwayat
│     ├─ transaksi.js          # riwayat, detail, pembatalan, ekspor
│     ├─ laporan.js            # ringkasan, per produk/kategori/periode, laba rugi
│     ├─ pelanggan.js          # pelanggan, piutang, pembayaran
│     ├─ pesan.js              # inbox Website & WhatsApp
│     └─ pengaturan.js         # profil, katalog, struk, pengguna, paket, reset
├─ admin/
│  ├─ index.html               # login admin + shell
│  └─ js/
│     ├─ admin.js              # login/shell, ringkasan, akun UMKM, paket, kategori
│     └─ pemantauan.js         # sistem, laporan platform, dukungan, setelan admin
├─ toko/index.html             # katalog publik (?u=<slug>)
├─ assets/
│  ├─ css/base.css             # token desain + komponen bersama + print
│  └─ js/
│     ├─ db.js                 # lapisan data localStorage + isolasi tenant
│     ├─ auth.js               # sesi demo (sessionStorage)
│     └─ utils.js              # Rupiah, tanggal, modal, toast, CSV, struk, chart SVG
└─ docs/
   ├─ CONTEXT.md               # konteks produk, desain, model data
   └─ PROGRESS.md              # checklist fase + catatan implementasi
```

## Fitur utama

- **Dashboard**: penjualan hari ini vs kemarin, transaksi, produk, stok menipis, grafik 7/30 hari,
  donut kategori, produk terlaris, ringkasan laba kotor.
- **Kasir/POS**: pencarian nama/kode/barcode (F2), keranjang dengan batas stok, diskon Rp/%, pajak otomatis,
  Tunai/QRIS/Transfer, uang pas, kembalian, tahan/lanjutkan transaksi, struk 58mm + cetak/PDF (F9 bayar).
- **Produk**: tabel/kartu, pencarian, filter, urut, paginasi, foto dipotong 1:1, varian, kategori,
  arsip/pulihkan, batas jumlah produk per paket.
- **Stok**: barang masuk/keluar, stok opname dengan catatan wajib, riwayat perubahan + ekspor CSV.
- **Transaksi**: filter kombinasi, detail, cetak ulang struk, pembatalan dengan pengembalian stok otomatis.
- **Laporan**: 5 tab, perbandingan periode sebelumnya, ekspor CSV, cetak/PDF.
- **Pelanggan**: riwayat belanja, piutang dari POS, catat pembayaran piutang, WhatsApp.
- **Pesan**: percakapan Website/WhatsApp, badge belum dibaca, catatan pelanggan, balasan cepat.
- **Pengaturan**: profil + jam operasional, katalog + slug + template WhatsApp, pajak/metode/footer struk,
  pengguna kasir, perbandingan paket, reset data.
- **Katalog publik**: hanya produk "dipublikasikan" milik tenant dengan katalog aktif, pencarian, kategori,
  urutan, detail + varian + jumlah, tombol WhatsApp sesuai template, form "Tanya penjual" yang masuk ke inbox.
- **Admin platform**: ringkasan seluruh ekosistem, akun UMKM (tangguhkan/aktifkan/ubah paket/CSV),
  paket yang tersinkron dengan landing, kategori bisnis, pemantauan sistem, laporan platform,
  tiket dukungan, pengaturan admin.

## Menuju produksi

Prototype ini sengaja seluruhnya berjalan di browser. Sebelum dipakai nyata:

1. **Data**: ganti implementasi `assets/js/db.js` dengan REST API (Laravel + PostgreSQL). Pertahankan bentuk
   repository (`list/get/create/update/remove`) agar modul UI tidak perlu diubah. Filter `tenantId` wajib
   ditegakkan di server, bukan hanya di klien.
2. **Autentikasi**: pindahkan login ke backend, simpan password dengan hash (bcrypt/argon2), gunakan HTTPS,
   cookie sesi `httpOnly`/`secure`, rate limit + CAPTCHA pada percobaan login, verifikasi email sungguhan.
3. **Upload gambar**: simpan foto/logo ke object storage (S3/R2), bukan dataURL di localStorage.
4. **Laporan PDF/Excel**: hasilkan di server (bukan `window.print`) untuk laporan besar dan penomoran resmi.
5. **Pembayaran langganan**: integrasikan payment gateway; tombol upgrade saat ini hanya menampilkan toast demo.
6. **Validasi & audit**: validasi ulang semua input di server, catat audit trail perubahan stok/transaksi.
7. **Harga & batas paket**: masih draf; tentukan setelah validasi pasar.

## Catatan demo

- Login demo divalidasi di klien saja (bukan keamanan produksi).
- Angka pemantauan sistem dan waktu respons adalah data dummy yang diacak saat tombol "Segarkan" ditekan.
- Cetak struk memakai `window.print` dengan CSS `@media print` (lebar 58mm); pilih "Simpan sebagai PDF"
  pada dialog cetak untuk mengunduh PDF.
