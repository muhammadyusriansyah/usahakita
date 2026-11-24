/* ============================================================
   app/js/dashboard.js — Menu Dashboard pemilik
   Semua angka dihitung dari db (tanpa data hard-coded).
   ============================================================ */
(function () {
  'use strict';

  var state = { periode: 7 };

  function startOfDay(offset) {
    var d = new Date();
    d.setDate(d.getDate() - (offset || 0));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function sum(arr, fn) {
    return arr.reduce(function (a, x) { return a + (Number(fn(x)) || 0); }, 0);
  }

  function statusPill(status) {
    var map = {
      'Selesai': 'success', 'Menunggu': 'pending', 'Dibatalkan': 'danger'
    };
    return '<span class="status ' + (map[status] || '') + '">' + UK.escapeHTML(status) + '</span>';
  }

  function render(root, ctx) {
    var tenant = ctx.tenant;
    var products = db.products.list({ tenantId: tenant.id });
    var categories = db.categories.list({ tenantId: tenant.id });
    var allTrx = db.transactions.list({ tenantId: tenant.id })
      .slice().sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
    var selesai = allTrx.filter(function (t) { return t.status === 'Selesai'; });

    var todayStart = startOfDay(0).getTime();
    var yesterdayStart = startOfDay(1).getTime();

    var todayTrx = allTrx.filter(function (t) { return new Date(t.waktu).getTime() >= todayStart; });
    var todaySelesai = todayTrx.filter(function (t) { return t.status === 'Selesai'; });
    var penjualanHariIni = sum(todaySelesai, function (t) { return t.total; });
    var kemarin = sum(selesai.filter(function (t) {
      var w = new Date(t.waktu).getTime();
      return w >= yesterdayStart && w < todayStart;
    }), function (t) { return t.total; });

    var delta = 0;
    if (kemarin > 0) delta = Math.round(((penjualanHariIni - kemarin) / kemarin) * 1000) / 10;
    var deltaText = kemarin === 0
      ? (penjualanHariIni > 0 ? 'Baru hari ini' : 'Belum ada penjualan')
      : (delta >= 0 ? '+' : '') + delta + '% vs kemarin';
    var deltaClass = kemarin === 0 ? 'muted' : (delta >= 0 ? 'green' : 'red');

    var produkAktif = products.filter(function (p) { return p.status !== 'diarsipkan'; });
    var menipis = produkAktif.filter(function (p) { return p.stok <= p.stokMin; });

    var h = new Date().getHours();
    var salam = h < 11 ? 'Selamat pagi' : (h < 15 ? 'Selamat siang' : (h < 19 ? 'Selamat sore' : 'Selamat malam'));

    /* ----- data 30 hari untuk donut / terlaris / keuangan ----- */
    var dari30 = startOfDay(29).getTime();
    var trx30 = selesai.filter(function (t) { return new Date(t.waktu).getTime() >= dari30; });

    var prodById = {};
    products.forEach(function (p) { prodById[p.id] = p; });
    var catById = {};
    categories.forEach(function (c) { catById[c.id] = c; });

    var perKategori = {};
    var perProduk = {};
    var omzet30 = 0;
    var hpp30 = 0;

    trx30.forEach(function (t) {
      omzet30 += Number(t.total) || 0;
      (t.items || []).forEach(function (it) {
        var prod = prodById[it.productId];
        var rev = (Number(it.qty) || 0) * (Number(it.harga) || 0);
        var catName = prod && catById[prod.kategoriId] ? catById[prod.kategoriId].nama : 'Tanpa kategori';
        perKategori[catName] = (perKategori[catName] || 0) + rev;
        var key = it.productId || ('x-' + it.nama);
        if (!perProduk[key]) perProduk[key] = { nama: it.nama, qty: 0, omzet: 0, emoji: prod ? prod.emoji : '📦' };
        perProduk[key].qty += Number(it.qty) || 0;
        perProduk[key].omzet += rev;
        hpp30 += (Number(it.qty) || 0) * (prod ? Number(prod.hargaBeli) || 0 : 0);
      });
    });

    var kategoriItems = Object.keys(perKategori).map(function (k) {
      return { label: k, value: perKategori[k] };
    }).sort(function (a, b) { return b.value - a.value; });

    var terlaris = Object.keys(perProduk).map(function (k) { return perProduk[k]; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    var maxQty = terlaris.length ? terlaris[0].qty : 1;

    var laba = omzet30 - hpp30;
    var diskon30 = sum(trx30, function (t) { return t.diskon; });
    var pajak30 = sum(trx30, function (t) { return t.pajak; });

    /* ----- chart harian ----- */
    function dailySeries(days) {
      var arr = [];
      for (var i = days - 1; i >= 0; i--) {
        var d = startOfDay(i);
        arr.push({
          start: d.getTime(),
          label: days > 7 ? (d.getDate() + '/' + (d.getMonth() + 1)) : UK.HARI[d.getDay()].slice(0, 3),
          value: 0
        });
      }
      selesai.forEach(function (t) {
        var w = new Date(t.waktu).getTime();
        for (var i = 0; i < arr.length; i++) {
          var end = i === arr.length - 1 ? Infinity : arr[i + 1].start;
          if (w >= arr[i].start && w < end) { arr[i].value += Number(t.total) || 0; break; }
        }
      });
      return arr;
    }

    function grafikHTML() {
      var series = dailySeries(state.periode);
      return UK.svgLine(series, { height: 200 });
    }

    var html = '' +
      '<div class="page-head no-print">' +
      '<div><h1>' + salam + ', ' + UK.escapeHTML(ctx.session.nama.split(' ')[0]) + ' 👋</h1>' +
      '<div class="sub">Ringkasan <b>' + UK.escapeHTML(tenant.nama) + '</b> — ' + UK.tanggalPanjang(new Date()) + '</div></div>' +
      '<div class="page-actions">' +
      '<a class="btn btn-light" href="#/laporan">Lihat laporan</a>' +
      '<a class="btn btn-primary" href="#/pos">＋ Transaksi Baru</a>' +
      '</div></div>' +

      '<div class="kpi-grid">' +
      '<div class="stat-card"><div class="stat-label"><span class="stat-icon">💰</span> Penjualan hari ini</div>' +
      '<div class="stat-value">' + UK.rupiah(penjualanHariIni) + '</div>' +
      '<div class="stat-sub ' + deltaClass + '">' + UK.escapeHTML(deltaText) + '</div></div>' +
      '<div class="stat-card"><div class="stat-label"><span class="stat-icon">🧾</span> Jumlah transaksi</div>' +
      '<div class="stat-value">' + todayTrx.length + '</div>' +
      '<div class="stat-sub">' + todaySelesai.length + ' selesai · ' +
      (todayTrx.length - todaySelesai.length) + ' lain</div></div>' +
      '<div class="stat-card"><div class="stat-label"><span class="stat-icon">📦</span> Produk terdaftar</div>' +
      '<div class="stat-value">' + produkAktif.length + '</div>' +
      '<div class="stat-sub">' + products.filter(function (p) { return p.status === 'diarsipkan'; }).length + ' diarsipkan</div></div>' +
      '<div class="stat-card"><div class="stat-label"><span class="stat-icon">⚠️</span> Stok menipis</div>' +
      '<div class="stat-value">' + menipis.length + '</div>' +
      '<div class="stat-sub">' + (menipis.length ? '<a href="#/stok">Perlu restock →</a>' : 'Semua stok aman') + '</div></div>' +
      '</div>' +

      '<div class="grid-2" style="margin-top:14px">' +
      '<div class="panel"><div class="panel-head"><h3>Tren penjualan</h3>' +
      '<select id="dashPeriode" aria-label="Pilih periode grafik" style="width:auto">' +
      '<option value="7"' + (state.periode === 7 ? ' selected' : '') + '>7 hari</option>' +
      '<option value="30"' + (state.periode === 30 ? ' selected' : '') + '>30 hari</option>' +
      '</select></div><div class="panel-body" id="chartArea">' + grafikHTML() + '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3>Penjualan per kategori</h3><span class="tiny muted">30 hari</span></div>' +
      '<div class="panel-body"><div style="display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center">' +
      '<div>' + UK.svgDonut(kategoriItems, { size: 150, stroke: 18 }) + '</div>' +
      '<div class="legend" style="display:grid;gap:7px;margin:0">' +
      (kategoriItems.length ? kategoriItems.map(function (k, i) {
        return '<div class="li"><span class="sw" style="background:' + UK.PALET[i % UK.PALET.length] + '"></span>' +
          '<span class="grow ellipsis">' + UK.escapeHTML(k.label) + '</span>' +
          '<b>' + UK.rupiah(k.value) + '</b></div>';
      }).join('') : '<span class="tiny muted">Belum ada penjualan.</span>') +
      '</div></div></div></div>' +
      '</div>' +

      '<div class="grid-2" style="margin-top:14px">' +
      '<div class="panel"><div class="panel-head"><h3>Produk terlaris</h3><span class="tiny muted">30 hari</span></div>' +
      '<div class="panel-body">' +
      (terlaris.length ? terlaris.map(function (p) {
        return '<div class="bar-row"><span class="ellipsis">' + UK.escapeHTML(p.emoji || '📦') + ' ' + UK.escapeHTML(p.nama) + '</span>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(4, Math.round((p.qty / maxQty) * 100)) + '%"></div></div>' +
          '<b class="tiny">' + p.qty + ' pcs</b></div>';
      }).join('') : '<div class="empty-note"><span class="ico">📦</span><b>Belum ada penjualan</b><span>Transaksi selesai akan muncul di sini.</span></div>') +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3>Ringkasan keuangan</h3><span class="tiny muted">30 hari</span></div>' +
      '<div class="panel-body">' +
      '<div class="summary-line"><span class="muted">Pemasukan (omzet)</span><b class="green">' + UK.rupiah(omzet30) + '</b></div>' +
      '<div class="summary-line"><span class="muted">Pengeluaran (HPP)</span><b class="red">' + UK.rupiah(hpp30) + '</b></div>' +
      '<div class="summary-line"><span class="muted">Diskon diberikan</span><span>' + UK.rupiah(diskon30) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Pajak terkumpul</span><span>' + UK.rupiah(pajak30) + '</span></div>' +
      '<div class="summary-line total"><span>Estimasi laba kotor</span><span class="' + (laba >= 0 ? 'green' : 'red') + '">' + UK.rupiah(laba) + '</span></div>' +
      '<p class="tiny muted" style="margin:8px 0 0">Laba kotor = harga jual − harga beli, belum termasuk biaya operasional.</p>' +
      '</div></div>' +
      '</div>' +

      '<div class="panel" style="margin-top:14px">' +
      '<div class="panel-head"><h3>Transaksi terbaru</h3><a href="#/transaksi" class="btn btn-xs btn-light">Lihat semua</a></div>' +
      (allTrx.length ?
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>ID</th><th>Waktu</th><th>Pelanggan</th><th>Item</th><th>Metode</th><th class="num">Total</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        allTrx.slice(0, 5).map(function (t) {
          var cust = t.pelangganId ? db.customers.get(t.pelangganId, tenant.id) : null;
          var qty = (t.items || []).reduce(function (a, i) { return a + i.qty; }, 0);
          return '<tr><td class="mono">' + UK.escapeHTML(t.id) + '</td>' +
            '<td class="nowrap">' + UK.tanggalIndo(t.waktu, true) + '</td>' +
            '<td>' + UK.escapeHTML(cust ? cust.nama : 'Umum') + '</td>' +
            '<td>' + qty + ' item</td>' +
            '<td>' + UK.escapeHTML(t.metode) + '</td>' +
            '<td class="num">' + UK.rupiah(t.total) + '</td>' +
            '<td>' + statusPill(t.status) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>'
        : '<div class="empty-note"><span class="ico">🧾</span><b>Belum ada transaksi</b><span>Mulai dengan membuat transaksi baru di Kasir.</span><a class="btn btn-primary btn-sm" href="#/pos" style="margin-top:8px">Buka Kasir</a></div>') +
      '</div>';

    root.innerHTML = html;

    var sel = document.getElementById('dashPeriode');
    if (sel) {
      sel.addEventListener('change', function () {
        state.periode = Number(sel.value) === 30 ? 30 : 7;
        var area = document.getElementById('chartArea');
        if (area) area.innerHTML = grafikHTML();
      });
    }
  }

  UK.registerModule('dashboard', { render: render });
})();
