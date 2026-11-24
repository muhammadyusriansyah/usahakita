/* ============================================================
   app/js/pesan.js — Pesan pelanggan (Website & WhatsApp)
   ============================================================ */
(function () {
  'use strict';

  var S = { active: '', filter: 'semua', q: '' };
  var rootEl = null, ctxRef = null;

  function conversations(ctx) {
    return db.conversations.list({ tenantId: ctx.tenant.id })
      .slice()
      .sort(function (a, b) {
        var la = a.messages && a.messages.length ? a.messages[a.messages.length - 1].waktu : a.dibuatPada;
        var lb = b.messages && b.messages.length ? b.messages[b.messages.length - 1].waktu : b.dibuatPada;
        return new Date(lb || 0) - new Date(la || 0);
      });
  }

  function render(root, ctx) {
    rootEl = root; ctxRef = ctx;
    if (ctx.query && ctx.query.id) S.active = ctx.query.id;
    var all = conversations(ctx);
    if (!S.active && all.length) S.active = all[0].id;

    var unread = all.reduce(function (a, c) { return a + (c.unread || 0); }, 0);

    root.innerHTML =
      '<div class="page-head"><div><h1>Pesan Pelanggan</h1>' +
      '<div class="sub">' + all.length + ' percakapan · ' + unread + ' pesan belum dibaca</div></div></div>' +
      '<div class="chat-layout" id="chatLayout">' +
      '<div class="chat-list">' +
      '<div class="chat-list-head">' +
      '<div class="search-box"><span class="ico">🔍</span>' +
      '<input type="search" id="pesanCari" placeholder="Cari nama pelanggan…" value="' + UK.escapeHTML(S.q) + '" aria-label="Cari percakapan"></div>' +
      '<div class="chips">' +
      [['semua', 'Semua'], ['belum', 'Belum dibaca'], ['whatsapp', 'WhatsApp']].map(function (f) {
        return '<button class="chip' + (S.filter === f[0] ? ' active' : '') + '" type="button" data-filter="' + f[0] + '">' + f[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div id="convList" style="overflow-y:auto"></div>' +
      '</div>' +
      '<div class="chat-main" id="chatMain"></div>' +
      '<div class="chat-info" id="chatInfo"></div>' +
      '</div>';

    var cari = document.getElementById('pesanCari');
    cari.addEventListener('input', UK.debounce(function () { S.q = cari.value; renderList(); }, 180));
    root.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.filter = b.getAttribute('data-filter');
        root.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderList();
      });
    });

    renderList();
    renderChat();
  }

  function filtered(ctx) {
    return conversations(ctx).filter(function (c) {
      if (S.filter === 'belum' && !(c.unread > 0)) return false;
      if (S.filter === 'whatsapp' && c.kanal !== 'WhatsApp') return false;
      if (S.q && String(c.nama).toLowerCase().indexOf(S.q.toLowerCase()) < 0) return false;
      return true;
    });
  }

  function renderList() {
    var box = document.getElementById('convList');
    if (!box) return;
    var list = filtered(ctxRef);
    if (!list.length) {
      box.innerHTML = '<div class="empty-note"><span class="ico">💬</span><b>Belum ada percakapan</b><span class="tiny">Pesan dari katalog akan muncul di sini.</span></div>';
      return;
    }
    box.innerHTML = list.map(function (c) {
      var msgs = c.messages || [];
      var last = msgs.length ? msgs[msgs.length - 1] : null;
      return '<div class="conv' + (c.id === S.active ? ' active' : '') + '" data-conv="' + c.id + '" role="button" tabindex="0">' +
        '<div class="nm"><span class="ellipsis">' + UK.escapeHTML(c.nama) + '</span>' +
        (c.unread > 0 ? '<span class="status danger" style="padding:0 5px;font-size:9px">' + c.unread + '</span>' : '') + '</div>' +
        '<div class="pv">' + (last ? UK.escapeHTML(last.teks) : 'Belum ada pesan') + '</div>' +
        '<div class="tiny muted">' + UK.escapeHTML(c.kanal) + (last ? ' · ' + UK.jamIndo(last.waktu) : '') + '</div>' +
        '</div>';
    }).join('');
    box.querySelectorAll('[data-conv]').forEach(function (el) {
      function open() { bukaPercakapan(el.getAttribute('data-conv')); }
      el.addEventListener('click', open);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function bukaPercakapan(id) {
    var ctx = ctxRef;
    var conv = db.conversations.get(id, ctx.tenant.id);
    if (!conv) return;
    S.active = id;
    if (conv.unread) {
      db.conversations.update(id, { unread: 0 }, ctx.tenant.id);
      if (ctx.refreshShell) ctx.refreshShell();
    }
    document.getElementById('chatLayout').classList.add('mobile-open');
    renderList();
    renderChat();
  }

  function renderChat() {
    var main = document.getElementById('chatMain');
    var info = document.getElementById('chatInfo');
    var ctx = ctxRef;
    if (!main) return;
    var conv = S.active ? db.conversations.get(S.active, ctx.tenant.id) : null;

    if (!conv) {
      main.innerHTML = '<div class="empty-note" style="height:100%"><span class="ico">💬</span><b>Pilih percakapan</b><span class="tiny">Klik salah satu percakapan di kiri.</span></div>';
      if (info) info.innerHTML = '';
      return;
    }

    var msgs = conv.messages || [];
    var lastDate = '';
    var bubbles = msgs.map(function (m) {
      var d = UK.tanggalIndo(m.waktu);
      var head = d !== lastDate ? '<div class="chat-date">' + d + '</div>' : '';
      lastDate = d;
      return head + '<div class="bubble' + (m.dari === 'pemilik' ? ' owner' : '') + '">' +
        UK.escapeHTML(m.teks).replace(/\n/g, '<br>') +
        '<span class="t">' + UK.jamIndo(m.waktu) + (m.dari === 'pemilik' ? ' · Anda' : '') + '</span></div>';
    }).join('');

    main.innerHTML =
      '<div class="chat-head">' +
      '<button class="icon-btn menu-btn" type="button" id="chatBack" aria-label="Kembali ke daftar">←</button>' +
      '<div class="avatar">' + UK.escapeHTML(UK.inisial(conv.nama)) + '</div>' +
      '<div class="grow"><div style="font-size:12.5px;font-weight:700">' + UK.escapeHTML(conv.nama) + '</div>' +
      '<div class="tiny muted">Kanal ' + UK.escapeHTML(conv.kanal) + (conv.telepon ? ' · +' + UK.escapeHTML(conv.telepon) : '') + '</div></div>' +
      '<button class="btn btn-xs btn-light" type="button" id="chatWa">WhatsApp</button>' +
      '</div>' +
      '<div class="chat-body" id="chatBody">' + (bubbles || '<div class="empty-note tiny">Belum ada pesan.</div>') + '</div>' +
      '<div class="chat-input">' +
      '<div class="quick-replies">' +
      ['Produk masih tersedia', 'Cek pengiriman', 'Terima kasih'].map(function (q) {
        return '<button type="button" data-quick="' + UK.escapeHTML(q) + '">' + UK.escapeHTML(q) + '</button>';
      }).join('') + '</div>' +
      '<textarea id="chatText" rows="2" placeholder="Tulis balasan… (Enter untuk kirim, Shift+Enter baris baru)" aria-label="Tulis balasan"></textarea>' +
      '<div class="row between"><span class="tiny muted">Kanal: ' + UK.escapeHTML(conv.kanal) + '</span>' +
      '<button class="btn btn-primary btn-sm" type="button" id="chatSend">Kirim</button></div>' +
      '</div>';

    var body = document.getElementById('chatBody');
    if (body) body.scrollTop = body.scrollHeight;

    var ta = document.getElementById('chatText');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        kirim();
      }
    });
    document.getElementById('chatSend').addEventListener('click', kirim);
    main.querySelectorAll('[data-quick]').forEach(function (b) {
      b.addEventListener('click', function () {
        ta.value = b.getAttribute('data-quick');
        kirim();
      });
    });
    document.getElementById('chatBack').addEventListener('click', function () {
      document.getElementById('chatLayout').classList.remove('mobile-open');
    });
    document.getElementById('chatWa').addEventListener('click', function () { lanjutWA(conv); });

    function kirim() {
      var teks = ta.value.trim();
      if (!teks) { ta.focus(); return; }
      var messages = (conv.messages || []).concat([{
        dari: 'pemilik', teks: teks, waktu: new Date().toISOString()
      }]);
      db.conversations.update(conv.id, { messages: messages, unread: 0 }, ctx.tenant.id);
      ta.value = '';
      renderList();
      renderChat();
      if (ctx.refreshShell) ctx.refreshShell();
    }

    if (info) {
      var lastOwner = (conv.messages || []).filter(function (m) { return m.dari === 'pemilik'; }).pop();
      info.innerHTML =
        '<div style="text-align:center;margin-bottom:10px">' +
        '<div class="avatar" style="width:44px;height:44px;font-size:15px;margin:0 auto 6px">' + UK.escapeHTML(UK.inisial(conv.nama)) + '</div>' +
        '<b class="small">' + UK.escapeHTML(conv.nama) + '</b>' +
        '<div class="tiny muted">' + (conv.telepon ? '+' + UK.escapeHTML(conv.telepon) : 'Nomor belum diisi') + '</div></div>' +
        '<div class="card" style="padding:9px;margin-bottom:9px">' +
        '<div class="tiny muted">Sumber pesan</div><div class="small" style="font-weight:600">' + UK.escapeHTML(conv.kanal) + '</div>' +
        '<div class="tiny muted" style="margin-top:6px">Status</div><div class="small ' + (conv.unread ? 'amber' : 'green') + '">' + (conv.unread ? 'Belum dibaca' : 'Terbaca') + '</div>' +
        '<div class="tiny muted" style="margin-top:6px">Terakhir dihubungi</div>' +
        '<div class="small">' + (lastOwner ? UK.tanggalIndo(lastOwner.waktu, true) : '-') + '</div>' +
        '</div>' +
        '<div class="stack" style="gap:6px">' +
        '<button class="btn btn-light btn-sm btn-block" type="button" id="infoNote">＋ Catatan pelanggan</button>' +
        '<button class="btn btn-light btn-sm btn-block" type="button" id="infoWa">Lanjut WhatsApp</button>' +
        '</div>' +
        (conv.catatan ? '<div class="tiny" style="margin-top:9px;background:#fbf7ef;border:1px solid #f0e4cd;padding:7px;border-radius:8px"><b>Catatan:</b><br>' +
          UK.escapeHTML(conv.catatan) + '</div>' : '') +
        '<p class="tiny muted" style="margin-top:10px">Percakapan tersimpan lokal pada prototype ini.</p>';

      info.querySelector('#infoNote').addEventListener('click', function () { modalCatatan(conv, ctx); });
      info.querySelector('#infoWa').addEventListener('click', function () { lanjutWA(conv); });
    }
  }

  function modalCatatan(conv, ctx) {
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="ctTitle">' +
      '<div class="modal-head"><h3 id="ctTitle">Catatan pelanggan</h3>' +
      '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
      '<div class="modal-body"><div class="field">' +
      '<label for="ctTeks">Catatan internal</label>' +
      '<textarea id="ctTeks" rows="3" maxlength="300" placeholder="Contoh: Langganan setiap Jumat">' + UK.escapeHTML(conv.catatan || '') + '</textarea>' +
      '<span class="hint">Hanya terlihat oleh tim Anda.</span></div></div>' +
      '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
      '<button class="btn btn-primary" type="button" id="ctSave">Simpan catatan</button></div></div>';
    document.body.appendChild(wrap);
    UK.openModal(wrap);
    function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
    wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('#ctSave').addEventListener('click', function () {
      var teks = wrap.querySelector('#ctTeks').value.trim();
      db.conversations.update(conv.id, { catatan: teks }, ctx.tenant.id);
      close();
      UK.toast('Catatan disimpan.', 'ok');
      renderChat();
    });
  }

  function lanjutWA(conv) {
    var ctx = ctxRef;
    if (!conv.telepon) {
      var wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = '<div class="modal-box narrow" role="dialog" aria-modal="true" aria-labelledby="waTitle">' +
        '<div class="modal-head"><h3 id="waTitle">Nomor WhatsApp belum ada</h3>' +
        '<button class="modal-x" type="button" data-x aria-label="Tutup">✕</button></div>' +
        '<div class="modal-body"><p class="small muted">Isi nomor WhatsApp ' + UK.escapeHTML(conv.nama) + ' untuk melanjutkan percakapan.</p>' +
        '<div class="field"><label for="waNomor">Nomor WhatsApp</label>' +
        '<input type="tel" id="waNomor" inputmode="numeric" placeholder="0812…"></div></div>' +
        '<div class="modal-foot"><button class="btn btn-light" type="button" data-x>Batal</button>' +
        '<button class="btn btn-primary" type="button" id="waOk">Simpan &amp; lanjut</button></div></div>';
      document.body.appendChild(wrap);
      UK.openModal(wrap);
      function close() { UK.closeModal(wrap); setTimeout(function () { wrap.remove(); }, 150); }
      wrap.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', close); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      wrap.querySelector('#waOk').addEventListener('click', function () {
        var nomor = UK.normalisasiWA(wrap.querySelector('#waNomor').value);
        if (nomor.length < 9) { UK.toast('Nomor WhatsApp tidak valid.', 'err'); return; }
        db.conversations.update(conv.id, { telepon: nomor }, ctx.tenant.id);
        close();
        openWa(conv, nomor, ctx);
      });
      return;
    }
    openWa(conv, conv.telepon, ctx);
  }

  function openWa(conv, nomor, ctx) {
    var teks = 'Halo ' + conv.nama + ', terima kasih sudah menghubungi ' + ctx.tenant.nama + '.';
    var link = UK.buatLinkWA(nomor, teks);
    if (link) window.open(link, '_blank', 'noopener');
    else UK.toast('Nomor WhatsApp tidak valid.', 'err');
  }

  UK.registerModule('pesan', { render: render });
})();
