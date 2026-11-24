/* ============================================================
   UsahaKita — utils.js
   Helper bersama: format Rupiah/tanggal, escape, toast, modal,
   konfirmasi, ekspor CSV, slug, debounce, WhatsApp, komponen struk.
   ============================================================ */
(function () {
  'use strict';

  var UK = window.UK = window.UK || {};

  /* ---------------- format ---------------- */
  function rupiah(n) {
    var num = Number(n);
    if (!isFinite(num)) num = 0;
    num = Math.round(num);
    var neg = num < 0;
    var s = String(Math.abs(num)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-Rp ' : 'Rp ') + s;
  }

  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function toDate(d) {
    if (d instanceof Date) return d;
    var x = new Date(d);
    return isNaN(x.getTime()) ? null : x;
  }

  function tanggalIndo(d, withTime) {
    var x = toDate(d);
    if (!x) return '-';
    var s = x.getDate() + ' ' + BULAN[x.getMonth()] + ' ' + x.getFullYear();
    if (withTime) s += ' · ' + pad(x.getHours()) + ':' + pad(x.getMinutes());
    return s;
  }

  function tanggalPanjang(d) {
    var x = toDate(d);
    if (!x) return '-';
    return HARI[x.getDay()] + ', ' + x.getDate() + ' ' + BULAN_PANJANG[x.getMonth()] + ' ' + x.getFullYear();
  }

  function jamIndo(d) {
    var x = toDate(d);
    if (!x) return '-';
    return pad(x.getHours()) + ':' + pad(x.getMinutes());
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function tanggalInput(d) {
    var x = toDate(d) || new Date();
    return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  }

  function mulaiHari(d) {
    var x = toDate(d) || new Date();
    x = new Date(x);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait == null ? 250 : wait);
    };
  }

  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function normalisasiWA(nomor) {
    var n = String(nomor || '').replace(/[^0-9]/g, '');
    if (!n) return '';
    if (n.indexOf('62') === 0) return n;
    if (n.indexOf('0') === 0) return '62' + n.slice(1);
    if (n.indexOf('8') === 0) return '62' + n;
    return n;
  }

  function buatLinkWA(nomor, teks) {
    var n = normalisasiWA(nomor);
    if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(teks || '');
  }

  /* ---------------- toast ---------------- */
  function toast(msg, type) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.setAttribute('role', 'status');
    el.textContent = String(msg);
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s';
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  }

  /* ---------------- modal ---------------- */
  var openStack = [];

  function openModal(target) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return null;
    el.classList.add('open');
    if (openStack.indexOf(el) < 0) openStack.push(el);
    var focusable = el.querySelector('input, select, textarea, button');
    if (focusable) setTimeout(function () { try { focusable.focus(); } catch (e) {} }, 30);
    el.dispatchEvent(new CustomEvent('uk:modalopen'));
    return el;
  }

  function closeModal(target) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    el.classList.remove('open');
    var i = openStack.indexOf(el);
    if (i >= 0) openStack.splice(i, 1);
    el.dispatchEvent(new CustomEvent('uk:modalclose'));
  }

  function closeTopModal() {
    if (!openStack.length) return false;
    closeModal(openStack[openStack.length - 1]);
    return true;
  }

  function confirmDialog(msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal open';
      wrap.innerHTML =
        '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-label="Konfirmasi">' +
        '<div class="modal-head"><h3>' + escapeHTML(opts.title || 'Konfirmasi') + '</h3>' +
        '<button class="modal-x" type="button" aria-label="Tutup">✕</button></div>' +
        '<div class="modal-body"><p style="margin:0;font-size:12.5px">' + msg + '</p></div>' +
        '<div class="modal-foot">' +
        '<button type="button" class="btn btn-light" data-act="no">' + escapeHTML(opts.cancelText || 'Batal') + '</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="yes">' +
        escapeHTML(opts.okText || 'Ya, lanjutkan') + '</button>' +
        '</div></div>';
      document.body.appendChild(wrap);
      function done(val) {
        wrap.remove();
        resolve(val);
      }
      wrap.querySelector('[data-act="yes"]').addEventListener('click', function () { done(true); });
      wrap.querySelector('[data-act="no"]').addEventListener('click', function () { done(false); });
      wrap.querySelector('.modal-x').addEventListener('click', function () { done(false); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
      wrap._ukEsc = function () { done(false); };
      wrap.querySelector('[data-act="yes"]').focus();
    });
  }

  /* Escape global: tutup konfirmasi teratas dulu, lalu modal terbuka */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modals = document.querySelectorAll('.modal.open');
    if (modals.length) {
      var last = modals[modals.length - 1];
      if (last._ukEsc) { last._ukEsc(); return; }
      closeModal(last);
      return;
    }
    var drawer = document.querySelector('.drawer-wrap.open');
    if (drawer) drawer.classList.remove('open');
  });

  function closeOnBackdrop(selector) {
    document.querySelectorAll(selector || '.modal').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m) closeModal(m);
      });
    });
  }

  /* ---------------- CSV ---------------- */
  function downloadCSV(namaFile, rowsData) {
    var lines = (rowsData || []).map(function (row) {
      return row.map(function (cell) {
        var s = cell == null ? '' : String(cell);
        if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(';');
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = /\.csv$/i.test(namaFile) ? namaFile : namaFile + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
  }

  /* ---------------- struk ---------------- */
  function renderStruk(trx, tenant, settings) {
    if (!trx) return '';
    var t = tenant || {};
    var s = settings || {};
    var lines = (trx.items || []).map(function (it) {
      return '<tr><td colspan="2">' + escapeHTML(it.nama) + '</td></tr>' +
        '<tr><td>' + it.qty + ' x ' + rupiah(it.harga) + '</td>' +
        '<td style="text-align:right">' + rupiah(it.qty * it.harga) + '</td></tr>';
    }).join('');

    return '<div class="receipt">' +
      '<h4>' + escapeHTML(t.nama || 'UsahaKita') + '</h4>' +
      (t.alamat ? '<div class="c small">' + escapeHTML(t.alamat) + '</div>' : '') +
      (t.wa ? '<div class="c small">WA ' + escapeHTML(t.wa) + '</div>' : '') +
      '<div class="line"></div>' +
      '<table>' +
      '<tr><td>No</td><td style="text-align:right">' + escapeHTML(trx.id) + '</td></tr>' +
      '<tr><td>Tanggal</td><td style="text-align:right">' + escapeHTML(tanggalIndo(trx.waktu, true)) + '</td></tr>' +
      '<tr><td>Kasir</td><td style="text-align:right">' + escapeHTML(trx.kasir || '-') + '</td></tr>' +
      '</table>' +
      '<div class="line"></div>' +
      '<table>' + lines + '</table>' +
      '<div class="line"></div>' +
      '<table>' +
      '<tr><td>Subtotal</td><td style="text-align:right">' + rupiah(trx.subtotal) + '</td></tr>' +
      (trx.diskon ? '<tr><td>Diskon</td><td style="text-align:right">-' + rupiah(trx.diskon) + '</td></tr>' : '') +
      (trx.pajak ? '<tr><td>Pajak</td><td style="text-align:right">' + rupiah(trx.pajak) + '</td></tr>' : '') +
      '<tr class="tot"><td>TOTAL</td><td style="text-align:right">' + rupiah(trx.total) + '</td></tr>' +
      '<tr><td>' + escapeHTML(trx.metode || 'Tunai') + '</td><td style="text-align:right">' + rupiah(trx.dibayar) + '</td></tr>' +
      '<tr><td>Kembali</td><td style="text-align:right">' + rupiah(trx.kembalian) + '</td></tr>' +
      '</table>' +
      '<div class="line"></div>' +
      '<div class="c small">' + escapeHTML(s.footerStruk || 'Terima kasih 🙏') + '</div>' +
      '<div class="c small" style="margin-top:4px">Dibuat dengan UsahaKita</div>' +
      '</div>';
  }

  function cetakStruk(html) {
    var holder = document.getElementById('uk-print');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'uk-print';
      document.body.appendChild(holder);
    }
    holder.innerHTML = html;
    var restore = document.body.classList.contains('printing-report');
    if (restore) document.body.classList.remove('printing-report');
    window.print();
    if (restore) document.body.classList.add('printing-report');
  }

  function cetakHalaman() {
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(function () { document.body.classList.remove('printing-report'); }, 500);
  }

  /* ---------------- misc ---------------- */
  function angka(val) {
    if (typeof val === 'number') return val;
    var n = String(val == null ? '' : val).replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.');
    var f = parseFloat(n);
    return isNaN(f) ? 0 : f;
  }

  function parseRupiahInput(str) {
    var n = String(str == null ? '' : str).replace(/[^0-9]/g, '');
    return n ? parseInt(n, 10) : 0;
  }

  function inisial(nama) {
    var parts = String(nama || '?').trim().split(/\s+/);
    return (parts[0] || '?').charAt(0).toUpperCase() + (parts[1] ? parts[1].charAt(0).toUpperCase() : '');
  }

  function formatAngka(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function persen(a, b) {
    if (!b) return 0;
    return Math.round((a / b) * 1000) / 10;
  }

  function pager(total, page, perPage, label) {
    var pages = Math.max(1, Math.ceil(total / perPage));
    var cur = Math.min(Math.max(1, page), pages);
    var from = total ? (cur - 1) * perPage + 1 : 0;
    var to = Math.min(total, cur * perPage);
    var nums = [];
    var i;
    if (pages <= 7) {
      for (i = 1; i <= pages; i++) nums.push(i);
    } else {
      nums = [1];
      if (cur > 3) nums.push('…');
      for (i = Math.max(2, cur - 1); i <= Math.min(pages - 1, cur + 1); i++) nums.push(i);
      if (cur < pages - 2) nums.push('…');
      nums.push(pages);
    }
    var btns = nums.map(function (n) {
      if (n === '…') return '<span style="padding:0 3px">…</span>';
      return '<button type="button" data-page="' + n + '"' + (n === cur ? ' class="active" aria-current="page"' : '') + '>' + n + '</button>';
    }).join('');
    return '<div class="pagination"><span>' + (label || 'Menampilkan') + ' ' + from + '–' + to + ' dari ' + total + '</span>' +
      '<div class="pages">' +
      '<button type="button" data-page="' + (cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + ' aria-label="Halaman sebelumnya">‹</button>' +
      btns +
      '<button type="button" data-page="' + (cur + 1) + '"' + (cur === pages ? ' disabled' : '') + ' aria-label="Halaman berikutnya">›</button>' +
      '</div></div>';
  }

  function bindPager(root, onChange) {
    root.querySelectorAll('[data-page]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = parseInt(b.getAttribute('data-page'), 10);
        if (!isNaN(n) && !b.disabled) onChange(n);
      });
    });
  }

  /* Simpan preferensi kecil (mis. tampilan tabel/kartu) */
  function prefGet(key, def) {
    try {
      var v = localStorage.getItem('uk_pref_' + key);
      return v == null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function prefSet(key, val) {
    try { localStorage.setItem('uk_pref_' + key, JSON.stringify(val)); } catch (e) {}
  }

  function ikon(nama) {
    var map = {
      dashboard: '▦', pos: '🧾', produk: '📦', stok: '📊', transaksi: '💳',
      laporan: '📈', pesan: '💬', pelanggan: '👥', pengaturan: '⚙️',
      logout: '⏏', cari: '🔍', notif: '🔔', tambah: '+', edit: '✎', hapus: '🗑',
      wa: '💬', cetak: '🖨', unduh: '⬇', filter: '⚙', kembali: '←', tutup: '✕'
    };
    return map[nama] || '•';
  }

  /* ---------------- chart helpers (SVG murni) ---------------- */
  var PALET = ['#f4772b', '#20243a', '#15966b', '#b67a20', '#7c8291', '#d94d4d', '#5b7cfa', '#a06cd5'];

  function ringkas(n) {
    n = Number(n) || 0;
    var abs = Math.abs(n);
    if (abs >= 1000000000) return (n / 1000000000).toFixed(1).replace('.', ',') + ' M';
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' jt';
    if (abs >= 1000) return Math.round(n / 1000) + ' rb';
    return String(Math.round(n));
  }

  function svgLine(data, opts) {
    opts = opts || {};
    var w = opts.width || 640;
    var h = opts.height || 190;
    var pad = { l: 46, r: 10, t: 12, b: 26 };
    var list = (data || []).map(function (d) {
      return { label: String(d.label), value: Number(d.value) || 0 };
    });
    if (!list.length) list = [{ label: '-', value: 0 }];
    var max = Math.max.apply(null, list.map(function (d) { return d.value; }).concat([1]));
    var plotW = w - pad.l - pad.r;
    var plotH = h - pad.t - pad.b;
    var stepX = list.length > 1 ? plotW / (list.length - 1) : 0;

    function yOf(v) { return pad.t + plotH - (v / max) * plotH; }

    var grid = '';
    for (var g = 0; g <= 3; g++) {
      var gy = pad.t + (plotH / 3) * g;
      var val = max - (max / 3) * g;
      grid += '<line x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (w - pad.r) + '" y2="' + gy.toFixed(1) + '" stroke="#eef0f5" stroke-width="1"/>';
      grid += '<text x="' + (pad.l - 6) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="8" fill="#9aa0ae">' + escapeHTML(ringkas(val)) + '</text>';
    }

    var pts = list.map(function (d, i) {
      return { x: pad.l + stepX * i, y: yOf(d.value), d: d };
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    var areaPath = line + ' L' + (pts[pts.length - 1].x).toFixed(1) + ' ' + (pad.t + plotH) + ' L' + (pts[0].x).toFixed(1) + ' ' + (pad.t + plotH) + ' Z';

    var dots = pts.map(function (p) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.6" fill="#fff" stroke="#f4772b" stroke-width="1.8"><title>' + escapeHTML(p.d.label + ': ' + rupiah(p.d.value)) + '</title></circle>';
    }).join('');

    var every = list.length > 14 ? Math.ceil(list.length / 7) : (list.length > 8 ? 2 : 1);
    var labels = pts.map(function (p, i) {
      if (i % every !== 0 && i !== pts.length - 1) return '';
      return '<text x="' + p.x.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="8" fill="#9aa0ae">' + escapeHTML(p.d.label) + '</text>';
    }).join('');

    var gid = 'lg' + Math.random().toString(36).slice(2, 7);
    return '<svg class="chart-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Grafik penjualan">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f4772b" stop-opacity=".28"/><stop offset="1" stop-color="#f4772b" stop-opacity="0"/>' +
      '</linearGradient></defs>' + grid +
      '<path d="' + areaPath + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="#f4772b" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';
  }

  function svgDonut(items, opts) {
    opts = opts || {};
    var list = (items || []).filter(function (i) { return i.value > 0; });
    var size = opts.size || 168;
    var stroke = opts.stroke || 20;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var total = list.reduce(function (a, i) { return a + i.value; }, 0);
    if (!total) {
      return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px" role="img" aria-label="Belum ada data">' +
        '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="#eef0f5" stroke-width="' + stroke + '"/>' +
        '<text x="50%" y="52%" text-anchor="middle" font-size="9" fill="#9aa0ae">Belum ada data</text></svg>';
    }
    var offset = 0;
    var segs = list.map(function (it, i) {
      var frac = it.value / total;
      var len = frac * c;
      var color = it.color || PALET[i % PALET.length];
      var seg = '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="' + color + '" ' +
        'stroke-width="' + stroke + '" stroke-dasharray="' + (len - 1.5).toFixed(2) + ' ' + (c - len + 1.5).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')">' +
        '<title>' + escapeHTML(it.label + ': ' + Math.round(frac * 100) + '%') + '</title></circle>';
      offset += len;
      return seg;
    }).join('');
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px" role="img" aria-label="Diagram donut">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="#f3f5f9" stroke-width="' + stroke + '"/>' +
      segs +
      '<text x="50%" y="48%" text-anchor="middle" font-size="8" fill="#9aa0ae">Total</text>' +
      '<text x="50%" y="59%" text-anchor="middle" font-size="11" font-weight="700" fill="#252936">' + escapeHTML(ringkas(total)) + '</text></svg>';
  }

  Object.assign(UK, {
    rupiah: rupiah,
    tanggalIndo: tanggalIndo,
    tanggalPanjang: tanggalPanjang,
    jamIndo: jamIndo,
    tanggalInput: tanggalInput,
    mulaiHari: mulaiHari,
    escapeHTML: escapeHTML,
    debounce: debounce,
    slugify: slugify,
    normalisasiWA: normalisasiWA,
    buatLinkWA: buatLinkWA,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    closeTopModal: closeTopModal,
    confirmDialog: confirmDialog,
    closeOnBackdrop: closeOnBackdrop,
    downloadCSV: downloadCSV,
    renderStruk: renderStruk,
    cetakStruk: cetakStruk,
    cetakHalaman: cetakHalaman,
    angka: angka,
    parseRupiahInput: parseRupiahInput,
    inisial: inisial,
    formatAngka: formatAngka,
    persen: persen,
    prefGet: prefGet,
    prefSet: prefSet,
    ikon: ikon,
    pager: pager,
    bindPager: bindPager,
    ringkas: ringkas,
    PALET: PALET,
    svgLine: svgLine,
    svgDonut: svgDonut,
    BULAN: BULAN,
    HARI: HARI
  });

  /* registry modul dashboard (diisi app/js/*.js) */
  UK.modules = UK.modules || {};
  UK.registerModule = UK.registerModule || function (name, mod) { UK.modules[name] = mod; };
})();
