# KONTEKS PRODUK — UsahaKita

## Produk
Platform manajemen UMKM + website katalog berbahasa Indonesia, mata uang Rupiah (format `Rp 1.250.000`).
Tiga sisi:
- **(A) Dashboard pemilik/kasir** — `app/index.html`
- **(B) Website katalog publik per UMKM** — `toko/index.html?u=<slug>` dengan tombol pesan WhatsApp
- **(C) Admin platform** — `admin/index.html`

## Stack prototype
HTML + CSS + JavaScript murni. Tanpa framework, tanpa library eksternal (font Inter dengan fallback system-ui).
Semua data lewat `assets/js/db.js` (localStorage) sehingga perubahan di dashboard langsung tercermin di katalog.
Lapisan data berupa repository (`db.products.list()`, `.get()`, `.create()`, `.update()`, `.remove()`) agar mudah
diganti REST API (Laravel + PostgreSQL) tanpa mengubah modul UI.

## Multi-tenant
Setiap data bisnis punya `tenantId`. Setiap query WAJIB difilter dengan `tenantId` dari sesi; tidak ada fungsi
yang mengembalikan data tenant lain (repository melempar error bila `tenantId` tidak diberikan).
Katalog publik hanya membaca produk berstatus "dipublikasikan" milik bisnis dengan katalog aktif.

## Autentikasi demo
- Admin platform: `admin` / `admin`
- Pemilik demo: `demo@usahakita.id` / `demo1234`

Sesi di `sessionStorage` (dibungkus try/catch, fallback variabel JS). **Untuk produksi wajib backend,
password ter-hash, HTTPS, dan pembatasan percobaan login.**

## DESAIN

```css
:root{--orange:#f4772b;--orange-dark:#df641d;--navy:#20243a;--ink:#252936;--muted:#7c8291;--line:#e9ebf0;--bg:#f6f7fa;--white:#fff;--green:#15966b;--red:#d94d4d;--amber:#b67a20}
```

- Logo: kotak oranye bergradien berisi "U" + teks "usahakita".
- Tombol primer oranye radius 10px; kartu putih border `var(--line)` radius 12–15px.
- Sidebar navy dengan menu aktif berlatar `#383d58` + garis oranye di kiri.
- Badge status berbentuk pil; font kecil-rapi (9–13px isi, 20–24px judul).
- Komponen bersama di `base.css`: `.btn` (`.btn-primary`, `.btn-light`, `.btn-ghost`), `.card/.panel`,
  `.stat-card`, tabel + `.table-wrap` (scroll horizontal), `.status` (`.success`, `.pending`, `.danger`),
  `.field`, `.modal`, `.toast`, `.empty-note`, `.pagination`.
- Responsif: desktop, tablet, HP; sidebar menjadi drawer di lebar ≤ 720px; tidak ada scroll horizontal.

## MODEL DATA (seed otomatis saat pertama dijalankan)

```
tenants{id,slug,nama,jenis,pemilik,email,wa,alamat,deskripsi,logo,jamOperasional,katalogAktif,paket,status,dibuatPada}
users{id,tenantId,nama,email,passwordDemo,peran:'pemilik'|'kasir'}
categories{id,tenantId,nama}
products{id,tenantId,kode,barcode,nama,deskripsi,kategoriId,hargaBeli,hargaJual,stok,stokMin,foto(dataURL),emoji,status:'dipublikasikan'|'draf'|'diarsipkan',varian[]}
stockMovements{id,tenantId,productId,tipe:'masuk'|'keluar'|'penyesuaian'|'penjualan',jumlah,catatan,waktu}
customers{id,tenantId,nama,telepon,piutang,dibuatPada}
transactions{id:'TRX-00001',tenantId,waktu,pelangganId|null,items[{productId,nama,qty,harga}],subtotal,diskon,pajak,total,metode:'Tunai'|'QRIS'|'Transfer',dibayar,kembalian,status:'Selesai'|'Menunggu'|'Dibatalkan'}
conversations{id,tenantId,nama,kanal:'Website'|'WhatsApp',unread,messages[{dari:'pelanggan'|'pemilik',teks,waktu}]}
settings{tenantId,pajakPersen,footerStruk,...}
plans{id:'free'|'pro'|'business',nama,harga,batas{produk,pengguna,cabang},fitur[]}
tickets{id,tenantId,subjek,prioritas,status,pesan[]}
systemLogs{id,level,pesan,waktu}
```

Seed: 1 tenant demo "Bisnis Kita Store" (kuliner, Banda Aceh, slug `bisnis-kita-store`), ±12 produk,
4 kategori, ±30 transaksi dalam 30 hari terakhir, 6 pelanggan, 4 percakapan, plus ±15 tenant dummy lain
(beragam jenis usaha, paket, dan status) untuk menu admin.

## Struktur folder

```
usahakita/
├─ index.html                  (landing)
├─ masuk.html, daftar.html     (login & registrasi pemilik UMKM)
├─ app/index.html              (dashboard pemilik, routing hash)
├─ app/js/                     (dashboard.js, produk.js, pos.js, stok.js, transaksi.js, laporan.js, pelanggan.js, pesan.js, pengaturan.js)
├─ admin/index.html            (login + dashboard admin platform)
├─ admin/js/admin.js
├─ toko/index.html             (katalog publik, ?u=<slug-bisnis>)
├─ assets/css/base.css
├─ assets/js/db.js, auth.js, utils.js
└─ docs/CONTEXT.md, docs/PROGRESS.md
```

## Catatan teknis

- Data global (di luar tenant) yang dipakai lintas sisi: `tenants`, `users`, `plans`, `businessCategories`,
  `tickets`, `systemLogs`, `waClicks`, `adminSettings`.
- `waClicks` adalah koleksi terpisah: `{id, tenantId, productId, waktu}` — dipakai indikator admin & dashboard.
- Semua nominal disimpan sebagai angka (Rupiah utuh), diformat dengan `UK.rupiah()`.
- Tanggal disimpan ISO string; ditampilkan dengan `UK.tanggalIndo()`.
