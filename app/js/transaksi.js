/* ============================================================
   app/js/transaksi.js — Riwayat transaksi, detail, pembatalan
   ============================================================ */
(function () {
  'use strict';

  var S = { q: '', status: '', metode: '', dari: '', sampai: '', sort: 'baru', page: 1 };
  var PER_PAGE = 10;
  var rootEl = null, ctxRef = null;

  function pill(status) {
    if (status === 'Selesai') return '<span class="status success">Selesai</span>';
    if (status === 'Menunggu') return '<span class="status pending">Menunggu</span>';
    return '<span class="status danger">Dibatalkan</span>';
  }

  function daftar(ctx) {
    var custMap = {};
    db.customers.list({ tenantId: ctx.tenant.id }).forEach(function (c) { custMap[c.id] = c; });
    var list = db.transactions.list({ tenantId: ctx.tenant.id }).filter(function (t) {
      if (S.status && t.status !== S.status) return false;
      if (S.metode && t.metode !== S.metode) return false;
      var w = new Date(t.waktu).getTime();
      if (S.dari && w < new Date(S.dari + 'T00:00:00').getTime()) return false;
      if (S.sampai && w > new Date(S.sampai + 'T23:59:59').getTime()) return false;
      if (S.q) {
        var q = S.q.toLowerCase();
        var nama = t.pelangganId && custMap[t.pelangganId] ? custMap[t.pelangganId].nama : 'umum';
        if (String(t.id).toLowerCase().indexOf(q) < 0 && nama.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (S.sort === 'lama') return new Date(a.waktu) - new Date(b.waktu);
      if (S.sort === 'total-desc') return b.total - a.total;
      if (S.sort === 'total-asc') return a.total - b.total;
      return new Date(b.waktu) - new Date(a.waktu);
    });
    return { list: list, custMap: custMap };
  }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    var res = daftar(ctx);
    var pages = Math.max(1, Math.ceil(res.list.length / PER_PAGE));
    if (S.page > pages) S.page = pages;
    var slice = res.list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
    var totalFiltered = res.list.filter(function (t) { return t.status === 'Selesai'; })
      .reduce(function (a, t) { return a + t.total; }, 0);

    root.innerHTML =
      '<div class="page-head"><div><h1>Transaksi</h1>' +
      '<div class="sub">' + res.list.length + ' transaksi pada filter ini · total selesai ' + UK.rupiah(totalFiltered) + '</div></div>' +
      '<div class="page-actions">' +
      '<a class="btn btn-primary btn-sm" href="#/pos">＋ Transaksi baru</a>' +
      '<button class="btn btn-light btn-sm" type="button" id="btnEkspor">Ekspor CSV</button>' +
      '</div></div>' +

      '<div class="panel">' +
      '<div class="panel-head"><div class="toolbar grow">' +
      '<div class="search-box"><span class="ico">🔍</span>' +
      '<input type="search" id="trxCari" placeholder="Cari ID atau pelanggan…" value="' + UK.escapeHTML(S.q) + '" aria-label="Cari transaksi"></div>' +
      '<select id="trxStatus" aria-label="Filter status"><option value="">Semua status</option>' +
      ['Selesai', 'Menunggu', 'Dibatalkan'].map(function (s) {
        return '<option' + (S.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select>' +
      '<select id="trxMetode" aria-label="Filter metode"><option value="">Semua metode</option>' +
      ['Tunai', 'QRIS', 'Transfer'].map(function (m) {
        return '<option' + (S.metode === m ? ' selected' : '') + '>' + m + '</option>';
      }).join('') + '</select>' +
      '<select id="trxSort" aria-label="Urutkan">' +
      ['baru|Terbaru', 'lama|Terlama', 'total-desc|Total tertinggi', 'total-asc|Total terendah'].map(function (o) {
        var v = o.split('|');
        return '<option value="' + v[0] + '"' + (S.sort === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
      }).join('') + '</select>' +
      '<input type="date" id="trxDari" value="' + S.dari + '" aria-label="Dari tanggal" style="width:auto">' +
      '<input type="date" id="trxSampai" value="' + S.sampai + '" aria-label="Sampai tanggal" style="width:auto">' +
      '<button class="btn btn-xs btn-light" type="button" id="trxReset">Reset</button>' +
      '</div></div>' +
      '<div id="trxBody"></div>' +
      '</div>';

    document.getElementById('btnEkspor').addEventListener('click', function () {
      var r = daftar(ctx);
      var rows = [['ID', 'Tanggal', 'Pelanggan', 'Item', 'Metode', 'Subtotal', 'Diskon', 'Pajak', 'Total', 'Status']];
      r.list.forEach(function (t) {
        var c = t.pelangganId && r.custMap[t.pelangganId] ? r.custMap[t.pelangganId].nama : 'Umum';
        var qty = (t.items || []).reduce(function (a, i) { return a + i.qty; }, 0);
        rows.push([t.id, UK.tanggalIndo(t.waktu, true), c, qty, t.metode, t.subtotal, t.diskon, t.pajak, t.total, t.status]);
      });
      UK.downloadCSV('transaksi-' + UK.tanggalInput(new Date()), rows);
      UK.toast('Transaksi diekspor ke CSV.', 'ok');
    });

    function bindFilter(id, key, num) {
      document.getElementById(id).addEventListener('change', function () {
        S[key] = this.value; S.page = 1; render(root, ctx);
      });
    }
    var cari = document.getElementById('trxCari');
    cari.addEventListener('input', UK.debounce(function () { S.q = cari.value; S.page = 1; render(root, ctx); }, 220));
    bindFilter('trxStatus', 'status');
    bindFilter('trxMetode', 'metode');
    bindFilter('trxSort', 'sort');
    bindFilter('trxDari', 'dari');
    bindFilter('trxSampai', 'sampai');
    document.getElementById('trxReset').addEventListener('click', function () {
      S.q = ''; S.status = ''; S.metode = ''; S.dari = ''; S.sampai = ''; S.sort = 'baru'; S.page = 1;
      render(root, ctx);
    });

    document.getElementById('trxBody').innerHTML = tableHTML(slice, res, ctx);
    bindTable(ctx);
  }

  function tableHTML(slice, res, ctx) {
    if (!slice.length) {
      return '<div class="empty-note"><span class="ico">🧾</span><b>Tidak ada transaksi</b>' +
        '<span>Coba ubah filter atau buat transaksi baru di Kasir.</span></div>';
    }
    var totalPage = slice.reduce(function (a, t) { return a + (t.status === 'Selesai' ? t.total : 0); }, 0);
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>ID</th><th>Tanggal</th><th>Pelanggan</th><th class="num">Item</th><th>Metode</th>' +
      '<th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>' +
      slice.map(function (t) {
        var c = t.pelangganId && res.custMap[t.pelangganId] ? res.custMap[t.pelangganId].nama : 'Umum';
        var qty = (t.items || []).reduce(function (a, i) { return a + i.qty; }, 0);
        return '<tr class="clickable" data-trx="' + UK.escapeHTML(t.id) + '">' +
          '<td class="mono">' + UK.escapeHTML(t.id) + '</td>' +
          '<td class="nowrap">' + UK.tanggalIndo(t.waktu, true) + '</td>' +
          '<td>' + UK.escapeHTML(c) + '</td>' +
          '<td class="num">' + qty + '</td>' +
          '<td>' + UK.escapeHTML(t.metode) + '</td>' +
          '<td class="num"><b>' + UK.rupiah(t.total) + '</b></td>' +
          '<td>' + pill(t.status) + '</td>' +
          '<td class="num"><button class="btn btn-xs btn-light" type="button" data-detail="' + UK.escapeHTML(t.id) + '">Detail</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="5">Total halaman ini (Selesai)</td>' +
      '<td class="num">' + UK.rupiah(totalPage) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
      UK.pager(res.list.length, S.page, PER_PAGE);
  }

  function bindTable(ctx) {
    var box = document.getElementById('trxBody');
    UK.bindPager(box, function (n) { S.page = n; render(rootEl, ctx); });
    box.querySelectorAll('[data-trx]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        bukaDetail(tr.getAttribute('data-trx'), ctx);
      });
    });
    box.querySelectorAll('[data-detail]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        bukaDetail(b.getAttribute('data-detail'), ctx);
      });
    });
  }

  /* ---------------- drawer detail ---------------- */
  function bukaDetail(trxId, ctx) {
    var trx = db.transactions.get(trxId, ctx.tenant.id);
    if (!trx) return;
    var tenant = ctx.tenant;
    var settings = db.settings.get(tenant.id);
    var cust = trx.pelangganId ? db.customers.get(trx.pelangganId, tenant.id) : null;

    var wrap = document.createElement('div');
    wrap.className = 'drawer-wrap open';
    wrap.innerHTML = '<div class="drawer" role="dialog" aria-modal="true" aria-labelledby="dwTitle">' +
      '<div class="drawer-head"><div><h3 id="dwTitle" class="mono">' + UK.escapeHTML(trx.id) + '</h3>' +
      '<div class="tiny muted">' + UK.tanggalIndo(trx.waktu, true) + '</div></div>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="drawer-body">' +
      '<div class="row between" style="margin-bottom:12px">' + pill(trx.status) +
      '<span class="tiny muted">Kasir: ' + UK.escapeHTML(trx.kasir || '-') + '</span></div>' +
      '<div class="card" style="padding:11px;margin-bottom:12px">' +
      '<div class="row between small"><span class="muted">Pelanggan</span><b>' + UK.escapeHTML(cust ? cust.nama : 'Umum') + '</b></div>' +
      '<div class="row between small" style="margin-top:4px"><span class="muted">Metode</span><b>' + UK.escapeHTML(trx.metode) + '</b></div>' +
      '</div>' +
      '<div class="table-wrap"><table class="data" style="min-width:0"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Subtotal</th></tr></thead><tbody>' +
      (trx.items || []).map(function (it) {
        return '<tr><td>' + UK.escapeHTML(it.nama) + '</td><td class="num">' + it.qty + '</td>' +
          '<td class="num">' + UK.rupiah(it.harga) + '</td><td class="num">' + UK.rupiah(it.qty * it.harga) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div style="margin-top:12px">' +
      '<div class="summary-line"><span class="muted">Subtotal</span><span>' + UK.rupiah(trx.subtotal) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Diskon</span><span>-' + UK.rupiah(trx.diskon) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Pajak</span><span>' + UK.rupiah(trx.pajak) + '</span></div>' +
      '<div class="summary-line total"><span>Total</span><span>' + UK.rupiah(trx.total) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Dibayar</span><span>' + UK.rupiah(trx.dibayar) + '</span></div>' +
      '<div class="summary-line"><span class="muted">Kembalian</span><span>' + UK.rupiah(trx.kembalian) + '</span></div>' +
      '</div>' +
      '<div class="stack" style="gap:7px;margin-top:14px">' +
      '<button class="btn btn-light btn-block" type="button" id="dwCetak">🖨 Cetak ulang struk</button>' +
      (trx.status === 'Menunggu' ? '<button class="btn btn-success btn-block" type="button" id="dwSelesai">Tandai Selesai</button>' : '') +
      (trx.status !== 'Dibatalkan' ? '<button class="btn btn-danger btn-block" type="button" id="dwBatal">Batalkan transaksi</button>' : '') +
      '</div>' +
      (trx.status === 'Dibatalkan' && trx.alasanBatal ? '<p class="tiny muted" style="margin-top:10px">Alasan batal: ' + UK.escapeHTML(trx.alasanBatal) + '</p>' : '') +
      '</div></div>';
    document.body.appendChild(wrap);

    function close() { wrap.remove(); }
    wrap.querySelector('[data-x]').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap._ukEsc = close;

    wrap.querySelector('#dwCetak').addEventListener('click', function () {
      UK.cetakStruk(UK.renderStruk(trx, tenant, settings));
    });

    var btnSelesai = wrap.querySelector('#dwSelesai');
    if (btnSelesai) {
      btnSelesai.addEventListener('click', function () {
        db.transactions.update(trx.id, { status: 'Selesai' }, tenant.id);
        UK.toast('Transaksi ' + trx.id + ' ditandai Selesai.', 'ok');
        close();
        render(rootEl, ctx);
        ctx.refreshShell && ctx.refreshShell();
      });
    }

    var btnBatal = wrap.querySelector('#dwBatal');
    if (btnBatal) {
      btnBatal.addEventListener('click', function () { modalBatal(trx, ctx, close); });
    }
  }

  function modalBatal(trx, ctx, closeDrawer) {
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="bTitle">' +
      '<div class="modal-head"><h3 id="bTitle">Batalkan transaksi</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body">' +
      '<p class="small">Batalkan <b class="mono">' + UK.escapeHTML(trx.id) + '</b> senilai <b>' + UK.rupiah(trx.total) +
      '</b>? Stok produk akan dikembalikan otomatis dan transaksi tidak dihitung di laporan.</p>' +
      '<div class="field"><label for="bAlasan">Alasan pembatalan *</label>' +
      '<textarea id="bAlasan" rows="2" maxlength="160" placeholder="Contoh: Pelanggan membatalkan pesanan"></textarea></div>' +
      '</div><div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-danger" type="button" id="bOk">Batalkan transaksi</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    wrap.querySelector('#bOk').addEventListener('click', function () {
      var alasan = wrap.querySelector('#bAlasan').value.trim();
      if (alasan.length < 3) { UK.toast('Alasan pembatalan wajib diisi.', 'err'); return; }
      try {
        var tgl = new Date().toISOString();
        (trx.items || []).forEach(function (it) {
          var prod = db.products.get(it.productId, ctx.tenant.id);
          if (!prod) return;
          var baru = prod.stok + it.qty;
          db.products.update(prod.id, { stok: baru }, ctx.tenant.id);
          db.stockMovements.create({
            tenantId: ctx.tenant.id, productId: prod.id, tipe: 'masuk', jumlah: it.qty,
            saldo: baru, catatan: 'Pembatalan ' + trx.id, waktu: tgl
          });
        });
        db.transactions.update(trx.id, {
          status: 'Dibatalkan', alasanBatal: alasan, dibatalkanPada: tgl
        }, ctx.tenant.id);
        close();
        if (closeDrawer) closeDrawer();
        UK.toast('Transaksi dibatalkan dan stok dikembalikan.', 'ok');
        render(rootEl, ctx);
        ctx.refreshShell && ctx.refreshShell();
      } catch (e) {
        UK.toast(e.message, 'err');
      }
    });
  }

  UK.registerModule('transaksi', { render: render });
})();
