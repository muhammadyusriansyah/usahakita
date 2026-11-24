/* ============================================================
   app/js/laporan.js — Laporan penjualan
   Hanya transaksi berstatus "Selesai" yang dihitung.
   ============================================================ */
(function () {
  'use strict';

  var S = { periode: '30', dari: '', sampai: '', tab: 'ringkasan', granularitas: 'harian' };
  var rootEl = null, ctxRef = null;

  function startOfDay(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function rentang() {
    var now = new Date();
    var to = now;
    var from;
    var label;
    if (S.periode === 'hari') {
      from = startOfDay(now);
      label = 'Hari ini · ' + UK.tanggalIndo(now);
    } else if (S.periode === '7') {
      from = startOfDay(now); from.setDate(from.getDate() - 6);
      label = '7 hari terakhir';
    } else if (S.periode === '30') {
      from = startOfDay(now); from.setDate(from.getDate() - 29);
      label = '30 hari terakhir';
    } else if (S.periode === 'bulan') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      label = 'Bulan ' + UK.BULAN[now.getMonth()] + ' ' + now.getFullYear();
    } else if (S.periode === 'tahun') {
      from = new Date(now.getFullYear(), 0, 1);
      label = 'Tahun ' + now.getFullYear();
    } else {
      from = S.dari ? new Date(S.dari + 'T00:00:00') : startOfDay(now);
      to = S.sampai ? new Date(S.sampai + 'T23:59:59') : now;
      label = UK.tanggalIndo(from) + ' – ' + UK.tanggalIndo(to);
    }
    if (S.periode !== 'kustom') {
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
    }
    return { from: from.getTime(), to: to.getTime(), label: label, fromDate: new Date(from), toDate: new Date(to) };
  }

  function transaksi(ctx, range) {
    return db.transactions.list({ tenantId: ctx.tenant.id }).filter(function (t) {
      if (t.status !== 'Selesai') return false;
      var w = new Date(t.waktu).getTime();
      return w >= range.from && w <= range.to;
    }).sort(function (a, b) { return new Date(a.waktu) - new Date(b.waktu); });
  }

  function ringkas(trx, products) {
    var prodMap = {};
    products.forEach(function (p) { prodMap[p.id] = p; });
    var omzet = 0, diskon = 0, pajak = 0, hpp = 0, items = 0;
    trx.forEach(function (t) {
      omzet += t.total; diskon += t.diskon; pajak += t.pajak;
      (t.items || []).forEach(function (it) {
        items += it.qty;
        var p = prodMap[it.productId];
        hpp += it.qty * (p ? Number(p.hargaBeli) || 0 : 0);
      });
    });
    return {
      omzet: omzet, diskon: diskon, pajak: pajak, hpp: hpp, items: items,
      jumlah: trx.length, rata: trx.length ? omzet / trx.length : 0, laba: omzet - hpp
    };
  }

  function perProduk(trx, products) {
    var map = {};
    trx.forEach(function (t) {
      (t.items || []).forEach(function (it) {
        var key = it.productId || ('x-' + it.nama);
        if (!map[key]) map[key] = { nama: it.nama, qty: 0, omzet: 0, laba: 0 };
        map[key].qty += it.qty;
        map[key].omzet += it.qty * it.harga;
        var p = products.filter(function (x) { return x.id === it.productId; })[0];
        map[key].laba += it.qty * (it.harga - (p ? Number(p.hargaBeli) || 0 : 0));
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.omzet - a.omzet; });
  }

  function perKategori(trx, products, categories) {
    var catMap = {};
    categories.forEach(function (c) { catMap[c.id] = c.nama; });
    var prodCat = {};
    products.forEach(function (p) { prodCat[p.id] = catMap[p.kategoriId] || 'Tanpa kategori'; });
    var map = {};
    trx.forEach(function (t) {
      (t.items || []).forEach(function (it) {
        var nama = prodCat[it.productId] || 'Tanpa kategori';
        map[nama] = (map[nama] || 0) + it.qty * it.harga;
      });
    });
    var total = Object.keys(map).reduce(function (a, k) { return a + map[k]; }, 0);
    return Object.keys(map).map(function (k) {
      return { label: k, value: map[k], persen: total ? Math.round((map[k] / total) * 1000) / 10 : 0 };
    }).sort(function (a, b) { return b.value - a.value; });
  }

  function kelompok(trx, granularitas) {
    var map = {};
    trx.forEach(function (t) {
      var d = new Date(t.waktu);
      var key;
      if (granularitas === 'harian') {
        key = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      } else if (granularitas === 'mingguan') {
        var monday = new Date(d);
        var day = (d.getDay() + 6) % 7;
        monday.setDate(d.getDate() - day);
        monday.setHours(0, 0, 0, 0);
        key = 'W ' + pad(monday.getDate()) + '/' + pad(monday.getMonth() + 1) + '/' + monday.getFullYear();
      } else if (granularitas === 'bulanan') {
        key = UK.BULAN[d.getMonth()] + ' ' + d.getFullYear();
      } else {
        key = String(d.getFullYear());
      }
      if (!map[key]) map[key] = { label: key, jumlah: 0, omzet: 0, urut: d.getTime() };
      map[key].jumlah += 1;
      map[key].omzet += t.total;
      if (d.getTime() < map[key].urut) map[key].urut = d.getTime();
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.urut - b.urut; });
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    var range = rentang();
    var products = db.products.list({ tenantId: ctx.tenant.id });
    var categories = db.categories.list({ tenantId: ctx.tenant.id });
    var trx = transaksi(ctx, range);
    var r = ringkas(trx, products);

    /* periode sebelumnya untuk perbandingan */
    var durasi = range.to - range.from;
    var prev = transaksi(ctx, { from: range.from - durasi - 1, to: range.from - 1 });
    var prevR = ringkas(prev, products);

    function perbandingan(now, before) {
      if (!before) return '<span class="muted">tanpa pembanding</span>';
      var d = Math.round(((now - before) / before) * 1000) / 10;
      return '<span class="' + (d >= 0 ? 'green' : 'red') + '">' + (d >= 0 ? '▲' : '▼') + ' ' + Math.abs(d) + '%</span> <span class="muted">vs periode sebelumnya</span>';
    }

    root.innerHTML =
      '<div class="page-head"><div><h1>Laporan</h1>' +
      '<div class="sub">Periode: <b>' + UK.escapeHTML(range.label) + '</b></div></div>' +
      '<div class="page-actions no-print">' +
      '<button class="btn btn-light btn-sm" type="button" id="btnCetak">🖨 Cetak / PDF</button>' +
      '<button class="btn btn-light btn-sm" type="button" id="btnCsv">Ekspor CSV</button>' +
      '</div></div>' +

      '<div class="panel no-print" style="padding:11px 13px;margin-bottom:14px">' +
      '<div class="toolbar">' +
      '<select id="lapPeriode" aria-label="Pilih periode">' +
      [['hari', 'Hari ini'], ['7', '7 hari terakhir'], ['30', '30 hari terakhir'], ['bulan', 'Bulan ini'], ['tahun', 'Tahun ini'], ['kustom', 'Rentang kustom']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.periode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select>' +
      '<input type="date" id="lapDari" value="' + (S.dari || UK.tanggalInput(range.fromDate)) + '" aria-label="Dari tanggal"' + (S.periode === 'kustom' ? '' : ' disabled') + '>' +
      '<span class="tiny muted">s/d</span>' +
      '<input type="date" id="lapSampai" value="' + (S.sampai || UK.tanggalInput(new Date())) + '" aria-label="Sampai tanggal"' + (S.periode === 'kustom' ? '' : ' disabled') + '>' +
      '<button class="btn btn-xs btn-light" type="button" id="lapTerapkan"' + (S.periode === 'kustom' ? '' : ' disabled') + '>Terapkan</button>' +
      '</div></div>' +

      '<div class="chips no-print" style="margin-bottom:12px">' +
      [['ringkasan', 'Ringkasan'], ['produk', 'Per Produk'], ['kategori', 'Per Kategori'], ['periode', 'Per Periode'], ['labarugi', 'Laba Rugi']].map(function (t) {
        return '<button class="chip' + (S.tab === t[0] ? ' active' : '') + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +

      '<div id="lapBody"></div>';

    document.getElementById('lapPeriode').addEventListener('change', function () {
      S.periode = this.value;
      render(root, ctx);
    });
    ['lapDari', 'lapSampai'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        if (id === 'lapDari') S.dari = this.value; else S.sampai = this.value;
      });
    });
    document.getElementById('lapTerapkan').addEventListener('click', function () {
      var a = document.getElementById('lapDari').value;
      var b = document.getElementById('lapSampai').value;
      if (!a || !b) { UK.toast('Lengkapi rentang tanggal.', 'err'); return; }
      if (new Date(a) > new Date(b)) { UK.toast('Tanggal awal harus sebelum tanggal akhir.', 'err'); return; }
      S.dari = a; S.sampai = b; render(root, ctx);
    });
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.tab = b.getAttribute('data-tab');
        render(root, ctx);
      });
    });
    document.getElementById('btnCetak').addEventListener('click', function () { UK.cetakHalaman(); });
    document.getElementById('btnCsv').addEventListener('click', function () {
      eksporCSV(ctx, range, trx, products, categories);
    });

    var body = document.getElementById('lapBody');

    if (!trx.length && S.tab !== 'ringkasan') {
      body.innerHTML = '<div class="card empty-note"><span class="ico">📭</span><b>Tidak ada data pada periode ini</b>' +
        '<span>Coba pilih periode lain atau catat transaksi baru.</span><a class="btn btn-primary btn-sm" href="#/pos" style="margin-top:8px">Buka Kasir</a></div>';
      return;
    }

    if (S.tab === 'ringkasan') {
      var series = kelompok(trx, 'harian');
      var chartLabel = series.map(function (s) {
        var d = new Date(s.urut);
        return { label: d.getDate() + '/' + (d.getMonth() + 1), value: s.omzet };
      });
      body.innerHTML =
        '<div class="kpi-grid">' +
        '<div class="stat-card"><div class="stat-label">Omzet</div><div class="stat-value">' + UK.rupiah(r.omzet) + '</div>' +
        '<div class="stat-sub">' + perbandingan(r.omzet, prevR.omzet) + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Jumlah transaksi</div><div class="stat-value">' + r.jumlah + '</div>' +
        '<div class="stat-sub">' + perbandingan(r.jumlah, prevR.jumlah) + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Rata-rata transaksi</div><div class="stat-value">' + UK.rupiah(r.rata) + '</div>' +
        '<div class="stat-sub">' + r.items + ' item terjual</div></div>' +
        '<div class="stat-card"><div class="stat-label">Laba kotor</div><div class="stat-value ' + (r.laba >= 0 ? 'green' : 'red') + '">' + UK.rupiah(r.laba) + '</div>' +
        '<div class="stat-sub">margin ' + (r.omzet ? Math.round((r.laba / r.omzet) * 100) : 0) + '%</div></div>' +
        '</div>' +
        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h3>Omzet harian</h3><span class="tiny muted">' + UK.escapeHTML(range.label) + '</span></div>' +
        '<div class="panel-body">' + (trx.length ? UK.svgLine(chartLabel, { height: 200 }) : '<div class="empty-note">Belum ada penjualan.</div>') + '</div></div>' +
        '<div class="panel"><div class="panel-head"><h3>Rincian</h3></div><div class="panel-body">' +
        '<div class="summary-line"><span class="muted">Subtotal penjualan</span><span>' + UK.rupiah(r.omzet - r.pajak + r.diskon) + '</span></div>' +
        '<div class="summary-line"><span class="muted">Total diskon</span><span class="red">-' + UK.rupiah(r.diskon) + '</span></div>' +
        '<div class="summary-line"><span class="muted">Total pajak</span><span>' + UK.rupiah(r.pajak) + '</span></div>' +
        '<div class="summary-line"><span class="muted">HPP (harga beli)</span><span class="red">' + UK.rupiah(r.hpp) + '</span></div>' +
        '<div class="summary-line total"><span>Omzet</span><span>' + UK.rupiah(r.omzet) + '</span></div>' +
        '<p class="tiny muted" style="margin:8px 0 0">Hanya transaksi berstatus Selesai yang dihitung.</p>' +
        '</div></div></div>';
    }

    if (S.tab === 'produk') {
      var pp = perProduk(trx, products);
      body.innerHTML = '<div class="panel"><div class="panel-head"><h3>Penjualan per produk</h3>' +
        '<span class="tiny muted">' + pp.length + ' produk terjual</span></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Produk</th><th class="num">Terjual</th>' +
        '<th class="num">Omzet</th><th class="num">Laba</th><th class="num">Kontribusi</th></tr></thead><tbody>' +
        pp.map(function (p, i) {
          return '<tr><td class="muted">' + (i + 1) + '</td><td>' + UK.escapeHTML(p.nama) + '</td>' +
            '<td class="num">' + p.qty + '</td><td class="num">' + UK.rupiah(p.omzet) + '</td>' +
            '<td class="num ' + (p.laba >= 0 ? 'green' : 'red') + '">' + UK.rupiah(p.laba) + '</td>' +
            '<td class="num">' + (r.omzet ? Math.round((p.omzet / r.omzet) * 100) : 0) + '%</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    if (S.tab === 'kategori') {
      var pk = perKategori(trx, products, categories);
      body.innerHTML = '<div class="panel"><div class="panel-head"><h3>Kontribusi per kategori</h3></div>' +
        '<div class="panel-body" style="display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:center">' +
        '<div>' + UK.svgDonut(pk, { size: 190, stroke: 24 }) + '</div>' +
        '<div><table class="data" style="min-width:0"><thead><tr><th>Kategori</th><th class="num">Omzet</th><th class="num">Kontribusi</th></tr></thead><tbody>' +
        pk.map(function (k, i) {
          return '<tr><td><span class="legend"><span class="sw" style="background:' + UK.PALET[i % UK.PALET.length] + '"></span></span> ' +
            UK.escapeHTML(k.label) + '</td><td class="num">' + UK.rupiah(k.value) + '</td><td class="num"><b>' + k.persen + '%</b></td></tr>';
        }).join('') + '</tbody></table></div></div></div>';
    }

    if (S.tab === 'periode') {
      var gr = kelompok(trx, S.granularitas);
      body.innerHTML = '<div class="panel"><div class="panel-head"><h3>Rekap per periode</h3>' +
        '<select id="lapGran" aria-label="Kelompokkan per" style="width:auto">' +
        [['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan'], ['tahunan', 'Tahunan']].map(function (g) {
          return '<option value="' + g[0] + '"' + (S.granularitas === g[0] ? ' selected' : '') + '>' + g[1] + '</option>';
        }).join('') + '</select></div>' +
        '<div class="panel-body">' + UK.svgLine(gr.map(function (g) { return { label: g.label, value: g.omzet }; }), { height: 200 }) + '</div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>Periode</th><th class="num">Transaksi</th><th class="num">Omzet</th><th class="num">Rata-rata</th></tr></thead><tbody>' +
        gr.map(function (g) {
          return '<tr><td>' + UK.escapeHTML(g.label) + '</td><td class="num">' + g.jumlah + '</td>' +
            '<td class="num"><b>' + UK.rupiah(g.omzet) + '</b></td><td class="num">' + UK.rupiah(g.jumlah ? g.omzet / g.jumlah : 0) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      var gsel = document.getElementById('lapGran');
      gsel.addEventListener('change', function () { S.granularitas = this.value; render(root, ctx); });
    }

    if (S.tab === 'labarugi') {
      body.innerHTML = '<div class="panel"><div class="panel-head"><h3>Laba rugi sederhana</h3>' +
        '<span class="tiny muted">' + UK.escapeHTML(range.label) + '</span></div>' +
        '<div class="panel-body">' +
        '<div class="summary-line"><span>Pendapatan penjualan (omzet)</span><b>' + UK.rupiah(r.omzet) + '</b></div>' +
        '<div class="summary-line"><span class="muted">— Harga pokok penjualan (HPP)</span><span class="red">' + UK.rupiah(r.hpp) + '</span></div>' +
        '<div class="summary-line total"><span>Laba kotor</span><span class="' + (r.laba >= 0 ? 'green' : 'red') + '">' + UK.rupiah(r.laba) + '</span></div>' +
        '<div class="summary-line" style="margin-top:10px"><span class="muted">Diskon yang diberikan (informasi)</span><span>' + UK.rupiah(r.diskon) + '</span></div>' +
        '<div class="summary-line"><span class="muted">Pajak yang dipungut (informasi)</span><span>' + UK.rupiah(r.pajak) + '</span></div>' +
        '<div class="summary-line"><span class="muted">Margin kotor</span><b>' + (r.omzet ? Math.round((r.laba / r.omzet) * 1000) / 10 : 0) + '%</b></div>' +
        '<p class="tiny muted" style="margin-top:12px">Laporan ini belum memasukkan biaya operasional (sewa, gaji, listrik). ' +
        'Gunakan sebagai gambaran kasar kesehatan usaha.</p></div></div>';
    }

    if (!trx.length) {
      var empty = document.createElement('div');
      empty.className = 'banner info';
      empty.innerHTML = '<span>ℹ️</span><div>Belum ada transaksi Selesai pada periode ini. Angka ditampilkan 0.</div>';
      body.insertBefore(empty, body.firstChild);
    }
  }

  function eksporCSV(ctx, range, trx, products, categories) {
    var r = ringkas(trx, products);
    var rows = [];
    if (S.tab === 'produk') {
      rows.push(['Produk', 'Terjual', 'Omzet', 'Laba']);
      perProduk(trx, products).forEach(function (p) { rows.push([p.nama, p.qty, p.omzet, p.laba]); });
    } else if (S.tab === 'kategori') {
      rows.push(['Kategori', 'Omzet', 'Kontribusi (%)']);
      perKategori(trx, products, categories).forEach(function (k) { rows.push([k.label, k.value, k.persen]); });
    } else if (S.tab === 'periode') {
      rows.push(['Periode', 'Transaksi', 'Omzet', 'Rata-rata']);
      kelompok(trx, S.granularitas).forEach(function (g) { rows.push([g.label, g.jumlah, g.omzet, g.jumlah ? Math.round(g.omzet / g.jumlah) : 0]); });
    } else {
      rows.push(['Laporan', 'Nilai']);
      rows.push(['Periode', range.label]);
      rows.push(['Omzet', r.omzet]);
      rows.push(['Jumlah transaksi', r.jumlah]);
      rows.push(['Rata-rata transaksi', Math.round(r.rata)]);
      rows.push(['Total diskon', r.diskon]);
      rows.push(['Total pajak', r.pajak]);
      rows.push(['HPP', r.hpp]);
      rows.push(['Laba kotor', r.laba]);
    }
    UK.downloadCSV('laporan-' + S.tab + '-' + UK.tanggalInput(new Date()), rows);
    UK.toast('Laporan diekspor ke CSV.', 'ok');
  }

  UK.registerModule('laporan', { render: render });
})();
