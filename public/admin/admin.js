(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var inr = function (n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); };
  var fmtDate = function (d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  var LABELS = {
    pending: 'Unpaid', paid: 'Paid', failed: 'Failed', refunded: 'Refunded',
    new: 'New', in_progress: 'In progress', delivered: 'Delivered', cancelled: 'Cancelled',
  };
  var TYPE_LABELS = { text: 'Short text', textarea: 'Long text', tel: 'Phone', email: 'Email', number: 'Number', date: 'Date', select: 'Dropdown', radio: 'Single choice (buttons)', chips: 'Choice chips' };
  var ROLE_LABELS = { '': 'None', customer_name: "Customer's name", customer_phone: 'Customer WhatsApp / phone', customer_email: 'Customer email', recipient_name: "Recipient's name (song is for)" };

  var state = { page: 1, settings: null, fields: [], timer: null };

  function toast(msg, isErr) {
    var t = $('#toast');
    t.textContent = msg; t.className = 'toast' + (isErr ? ' err' : ''); t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2800);
  }

  function api(url, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin' };
    if (opts.form) init.body = opts.form;
    else if (opts.body !== undefined) { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(opts.body); }
    return fetch(url, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && url.indexOf('/login') === -1) { showLogin(); throw new Error('Please log in again'); }
        if (!r.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  // ================= AUTH =================
  function setPayMode(mode, keyMode) {
    var modes = {
      razorpay: keyMode === 'test' ? '🧪 Razorpay: TEST keys (no real money)' : '💳 Razorpay: live',
      demo: '🧪 Demo payments (no Razorpay keys)',
      off: '⚠️ Payments OFF - add keys in Settings',
    };
    $('#payMode').textContent = modes[mode] || '';
  }
  function showLogin() { $('#appView').hidden = true; $('#loginView').hidden = false; clearInterval(state.timer); }
  function showApp(me) {
    $('#loginView').hidden = true; $('#appView').hidden = false;
    setPayMode(me.paymentMode, me.keyMode);
    $('#meName').textContent = me.username || '';
    api('/api/admin/settings').then(function (s) { state.brand = s.brandName || ''; }).catch(function () {});
    loadOrders(); loadStats();
    state.timer = setInterval(function () { if (!document.hidden && !$('[data-panel="orders"]').hidden) { loadOrders(true); loadStats(); } }, 30000);
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    $('#loginError').hidden = true;
    api('/api/admin/login', { method: 'POST', body: { username: f.username.value, password: f.password.value } })
      .then(function () { f.password.value = ''; return api('/api/admin/me'); })
      .then(showApp)
      .catch(function (err) { $('#loginError').textContent = err.message; $('#loginError').hidden = false; });
  });
  $('#pwToggle').addEventListener('click', function () {
    var inp = $('#loginForm').password;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    this.textContent = inp.type === 'password' ? 'Show' : 'Hide';
  });
  $('#logoutBtn').addEventListener('click', function () { api('/api/admin/logout', { method: 'POST' }).finally(showLogin); });

  // ================= ACCOUNT: reset password =================
  $('#pwShowAll').addEventListener('change', function () {
    var t = this.checked ? 'text' : 'password';
    $$('#pwForm input[name$="Password"]').forEach(function (i) { i.type = t; });
  });
  $('#pwForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, err = $('#pwError'), btn = f.querySelector('button[type="submit"]');
    err.hidden = true;
    var fail = function (m) { err.textContent = m; err.hidden = false; };
    if (f.newPassword.value.length < 8) return fail('New password must be at least 8 characters');
    if (f.newPassword.value !== f.confirmPassword.value) return fail('New passwords do not match');
    if (f.newPassword.value === f.currentPassword.value) return fail('New password must be different from the current one');
    btn.disabled = true;
    api('/api/admin/password', { method: 'PUT', body: { currentPassword: f.currentPassword.value, newPassword: f.newPassword.value } })
      .then(function () { f.reset(); $$('#pwForm input[name$="Password"]').forEach(function (i) { i.type = 'password'; }); toast('Password updated'); })
      .catch(function (e2) { fail(e2.message); })
      .finally(function () { btn.disabled = false; });
  });

  // ================= TABS =================
  $$('.sidebar nav button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.sidebar nav button').forEach(function (x) { x.classList.toggle('active', x === b); });
      var tab = b.getAttribute('data-tab');
      $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== tab; });
      if (tab === 'orders') { loadOrders(); loadStats(); }
      if (tab === 'fields') loadFields();
      if (tab === 'content' || tab === 'settings') loadSettings();
      if (tab === 'settings') loadPayment();
    });
  });

  // ================= PAYMENT GATEWAY KEYS =================
  function renderPayment(p) {
    var f = $('#payForm');
    var src = { dashboard: 'saved in this dashboard', env: 'from the .env file', none: '' }[p.source];
    var st = $('#payStatus');
    if (p.mode === 'razorpay') {
      st.className = 'pay-status ' + (p.keyMode === 'live' ? 'ok' : 'warn');
      st.textContent = (p.keyMode === 'live' ? '✅ Live payments ON' : '🧪 Test mode - payments are not real') + ' · Key ' + p.keyId + ' (' + src + ')' +
        (p.webhookSecretSet ? ' · Webhook ✓' : ' · Webhook not set');
    } else {
      st.className = 'pay-status ' + (p.mode === 'demo' ? 'warn' : 'bad');
      st.textContent = p.mode === 'demo' ? '🧪 No Razorpay keys - checkout shows a "simulate payment" button' : '⚠️ Payments are OFF - customers cannot pay until keys are added';
    }
    f.keyId.value = p.source === 'dashboard' ? p.keyId : '';
    f.keySecret.value = ''; f.webhookSecret.value = '';
    f.keySecret.placeholder = p.source === 'dashboard' ? 'Saved ' + p.keySecretHint + ' - leave blank to keep' : 'Paste Key Secret';
    $('#secretHint').textContent = '';
    f.webhookSecret.placeholder = p.webhookSecretSet ? 'Saved ' + p.webhookSecretHint + (p.webhookSource === 'env' ? ' (.env)' : '') + ' - leave blank to keep' : 'Paste webhook secret';
    $('#webhookUrl').textContent = location.origin + '/api/razorpay/webhook';
    $('#payRemove').hidden = p.source !== 'dashboard';
    $('#payError').hidden = true;
    setPayMode(p.mode, p.keyMode);
  }
  function loadPayment() {
    api('/api/admin/payment').then(renderPayment).catch(function (e) { toast(e.message, true); });
  }
  $('#payShow').addEventListener('change', function () {
    var t = this.checked ? 'text' : 'password';
    $('#payForm').keySecret.type = t; $('#payForm').webhookSecret.type = t;
  });
  $('#payForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = $('#paySave'), err = $('#payError');
    err.hidden = true;
    var keyId = f.keyId.value.trim();
    if (!/^rzp_(test|live)_[A-Za-z0-9]{8,32}$/.test(keyId)) { err.textContent = 'Key ID should look like rzp_test_XXXXXXXX or rzp_live_XXXXXXXX'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Checking with Razorpay…';
    api('/api/admin/payment', { method: 'PUT', body: { keyId: keyId, keySecret: f.keySecret.value.trim(), webhookSecret: f.webhookSecret.value.trim() } })
      .then(function (p) { renderPayment(p); toast('Payment keys saved ✓ - checkout uses them now'); })
      .catch(function (e2) { err.textContent = e2.message; err.hidden = false; })
      .finally(function () { btn.disabled = false; btn.textContent = '💾 Check & save payment keys'; });
  });
  $('#payRemove').addEventListener('click', function () {
    var b = this;
    if (b.getAttribute('data-confirm') !== '1') {
      b.setAttribute('data-confirm', '1'); b.textContent = 'Click again to remove keys';
      setTimeout(function () { b.removeAttribute('data-confirm'); b.textContent = 'Remove dashboard keys'; }, 4000);
      return;
    }
    b.removeAttribute('data-confirm'); b.textContent = 'Remove dashboard keys';
    api('/api/admin/payment', { method: 'DELETE' })
      .then(function (p) { renderPayment(p); toast('Dashboard payment keys removed'); })
      .catch(function (e2) { toast(e2.message, true); });
  });

  // ================= ORDERS =================
  function filters() {
    var p = new URLSearchParams();
    var q = $('#fQ').value.trim(); if (q) p.set('q', q);
    if ($('#fPayment').value) p.set('payment', $('#fPayment').value);
    if ($('#fDelivery').value) p.set('delivery', $('#fDelivery').value);
    if ($('#fFrom').value) p.set('from', $('#fFrom').value);
    if ($('#fTo').value) p.set('to', $('#fTo').value);
    return p;
  }

  function loadStats() {
    api('/api/admin/stats').then(function (s) {
      var items = [
        ['Revenue (paid)', inr(s.revenue)], ['Paid orders', s.paidOrders], ['Today', s.todayOrders + ' · ' + inr(s.todayRevenue)],
        ['To deliver', s.toDeliver], ['Unpaid / abandoned', s.unpaid], ['All orders', s.totalOrders],
      ];
      $('#stats').innerHTML = items.map(function (i) { return '<div class="stat"><div class="k">' + esc(i[0]) + '</div><div class="v">' + esc(i[1]) + '</div></div>'; }).join('');
    }).catch(function () {});
  }

  function deliverySelect(o) {
    return '<select data-delivery="' + o._id + '">' + ['new', 'in_progress', 'delivered', 'cancelled'].map(function (s) {
      return '<option value="' + s + '"' + (o.deliveryStatus === s ? ' selected' : '') + '>' + LABELS[s] + '</option>';
    }).join('') + '</select>';
  }

  function loadOrders(silent) {
    var p = filters(); p.set('page', state.page);
    if (!silent) $('#ordersBody').innerHTML = '<tr><td colspan="8" class="empty">Loading…</td></tr>';
    api('/api/admin/orders?' + p).then(function (res) {
      if (!res.items.length) {
        $('#ordersBody').innerHTML = '<tr><td colspan="8" class="empty">No orders yet. When someone fills the form, it shows up here.</td></tr>';
      } else {
        $('#ordersBody').innerHTML = res.items.map(function (o) {
          return '<tr data-id="' + o._id + '">' +
            '<td>' + esc(fmtDate(o.createdAt)) + '</td>' +
            '<td class="mono">' + esc(o.orderNo) + '</td>' +
            '<td>' + esc(o.customer.name) + '<div class="muted small">' + esc(o.customer.email) + '</div></td>' +
            '<td>' + esc(o.customer.phone) + '</td>' +
            '<td>' + esc(o.recipientName) + '</td>' +
            '<td>' + inr(o.amount) + '</td>' +
            '<td><span class="badge b-' + o.paymentStatus + '">' + LABELS[o.paymentStatus] + '</span>' + (o.paymentMode === 'demo' ? ' <span class="muted small">demo</span>' : '') + '</td>' +
            '<td>' + deliverySelect(o) + '</td></tr>';
        }).join('');
      }
      $('#pager').innerHTML = res.pages > 1
        ? '<button class="btn sm" data-page="' + (res.page - 1) + '"' + (res.page <= 1 ? ' disabled' : '') + '>← Prev</button>' +
          '<span class="muted">Page ' + res.page + ' of ' + res.pages + ' · ' + res.total + ' orders</span>' +
          '<button class="btn sm" data-page="' + (res.page + 1) + '"' + (res.page >= res.pages ? ' disabled' : '') + '>Next →</button>'
        : '<span class="muted">' + res.total + ' order' + (res.total === 1 ? '' : 's') + '</span>';
    }).catch(function (e) { if (!silent) toast(e.message, true); });
  }

  var searchT;
  $('#fQ').addEventListener('input', function () { clearTimeout(searchT); searchT = setTimeout(function () { state.page = 1; loadOrders(); }, 300); });
  ['#fPayment', '#fDelivery', '#fFrom', '#fTo'].forEach(function (s) { $(s).addEventListener('change', function () { state.page = 1; loadOrders(); }); });
  $('#refreshBtn').addEventListener('click', function () { loadOrders(); loadStats(); });
  $('#exportBtn').addEventListener('click', function () { window.location = '/api/admin/orders/export.csv?' + filters(); });
  $('#pager').addEventListener('click', function (e) { var b = e.target.closest('[data-page]'); if (b && !b.disabled) { state.page = +b.getAttribute('data-page'); loadOrders(); } });

  $('#ordersBody').addEventListener('change', function (e) {
    var sel = e.target.closest('[data-delivery]');
    if (!sel) return;
    api('/api/admin/orders/' + sel.getAttribute('data-delivery'), { method: 'PATCH', body: { deliveryStatus: sel.value } })
      .then(function () { toast('Delivery status updated'); loadStats(); })
      .catch(function (err) { toast(err.message, true); });
  });
  $('#ordersBody').addEventListener('click', function (e) {
    if (e.target.closest('select')) return;
    var tr = e.target.closest('tr[data-id]');
    if (tr) openOrder(tr.getAttribute('data-id'));
  });

  function openOrder(id) {
    api('/api/admin/orders/' + id).then(function (o) {
      var phone = String(o.customer.phone || '').replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;
      var waText = encodeURIComponent('Hi ' + (o.customer.name || '') + '! Your personalised song for ' + (o.recipientName || 'your loved one') + ' is ready 🎶 (Order ' + o.orderNo + ')');
      var answers = o.answers.map(function (a) {
        var v = Array.isArray(a.value) ? a.value.join(', ') : a.value;
        return '<dt>' + esc(a.label) + '</dt><dd>' + esc(v) + '</dd>';
      }).join('');
      var rz = o.razorpay || {};
      $('#orderDetail').innerHTML =
        '<button class="close" data-close-drawer>×</button>' +
        '<h2 class="mono">' + esc(o.orderNo) + '</h2>' +
        '<div class="row"><span class="badge b-' + o.paymentStatus + '">' + LABELS[o.paymentStatus] + '</span>' +
        '<span class="badge b-' + o.deliveryStatus + '">' + LABELS[o.deliveryStatus] + '</span><b>' + inr(o.amount) + '</b></div>' +
        '<div class="section-title">Customer</div>' +
        '<dl class="kv"><dt>Name</dt><dd>' + esc(o.customer.name) + '</dd><dt>WhatsApp</dt><dd>' + esc(o.customer.phone) +
        (phone ? ' &nbsp;<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + phone + '?text=' + waText + '">💬 Open WhatsApp</a>' : '') + '</dd>' +
        '<dt>Email</dt><dd>' + (o.customer.email ? '<a href="mailto:' + esc(o.customer.email) + '">' + esc(o.customer.email) + '</a>' : '') + '</dd></dl>' +
        '<div class="section-title">Song details (form answers)</div>' +
        '<div class="answers"><dl class="kv">' + answers + '</dl></div>' +
        '<div class="section-title">Payment</div>' +
        '<dl class="kv"><dt>Created</dt><dd>' + esc(new Date(o.createdAt).toLocaleString('en-IN')) + '</dd>' +
        '<dt>Paid at</dt><dd>' + esc(o.paidAt ? new Date(o.paidAt).toLocaleString('en-IN') : '—') + '</dd>' +
        '<dt>Mode</dt><dd>' + esc(o.paymentMode) + (rz.method ? ' · ' + esc(rz.method) : '') + '</dd>' +
        '<dt>Razorpay order</dt><dd class="mono">' + esc(rz.orderId || '—') + '</dd>' +
        '<dt>Payment ID</dt><dd class="mono">' + esc(rz.paymentId || '—') + '</dd></dl>' +
        '<div class="section-title">Fulfilment</div>' +
        '<label>Delivery status<select id="dStatus">' + ['new', 'in_progress', 'delivered', 'cancelled'].map(function (s) {
          return '<option value="' + s + '"' + (o.deliveryStatus === s ? ' selected' : '') + '>' + LABELS[s] + '</option>'; }).join('') + '</select></label>' +
        '<label>Payment status (manual override)<select id="pStatus">' + ['pending', 'paid', 'failed', 'refunded'].map(function (s) {
          return '<option value="' + s + '"' + (o.paymentStatus === s ? ' selected' : '') + '>' + LABELS[s] + '</option>'; }).join('') + '</select></label>' +
        '<label>Song link (Drive / uploaded file URL)<input id="dLink" value="' + esc(o.deliveryLink) + '" placeholder="https://…" /></label>' +
        '<label>Internal notes<textarea id="dNotes" rows="4">' + esc(o.notes) + '</textarea></label>' +
        '<div class="error" id="deliverErr" hidden></div>' +
        '<div class="row"><button class="btn primary" id="saveOrder">Save</button>' +
        (phone ? '<button class="btn wa" id="deliverWa" type="button" title="Saves the song link, marks the order Delivered and opens WhatsApp with the message ready to send">📲 Deliver on WhatsApp</button>' : '') +
        (o.paymentStatus !== 'paid' ? '<button class="btn danger" id="deleteOrder">Delete unpaid order</button>' : '') + '</div>';
      $('#orderDrawer').hidden = false;

      $('#saveOrder').addEventListener('click', function () {
        api('/api/admin/orders/' + o._id, { method: 'PATCH', body: { deliveryStatus: $('#dStatus').value, paymentStatus: $('#pStatus').value, deliveryLink: $('#dLink').value, notes: $('#dNotes').value } })
          .then(function () { toast('Order saved'); $('#orderDrawer').hidden = true; loadOrders(true); loadStats(); })
          .catch(function (err) { toast(err.message, true); });
      });
      // Deliver on WhatsApp: save link + mark Delivered, and open a chat with the customer with the song link pre-typed
      var dw = $('#deliverWa');
      if (dw) dw.addEventListener('click', function () {
        var err = $('#deliverErr'); err.hidden = true;
        var fail = function (m) { err.textContent = m; err.hidden = false; };
        var raw = $('#dLink').value.trim();
        if (!raw) return fail('Paste the song link (Google Drive / uploaded file URL) first.');
        var link;
        try { link = new URL(raw, location.origin).href; } catch (e) { return fail('The song link is not a valid URL.'); }
        if (!/^https?:\/\//i.test(link)) return fail('The song link must start with http:// or https://');
        if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/i.test(link)) return fail('This link points to your own computer (localhost), so the customer cannot open it. Use a Google Drive / public link, or deliver after the site is live.');
        if (o.paymentStatus !== 'paid' && !confirm('This order is not marked Paid. Deliver anyway?')) return;
        var brand = (state.settings && state.settings.brandName) || state.brand || '';
        var msg = 'Hi ' + (o.customer.name || '') + '! 🎶\n\n' +
          'Your personalised song for *' + (o.recipientName || 'your loved one') + '* is ready ❤️\n\n' +
          '🎧 Listen / download: ' + link + '\n\n' +
          'Order: ' + o.orderNo + '\n' +
          'Thank you' + (brand ? ' for choosing ' + brand : '') + '! Please share how they reacted 😊';
        // Open the chat right away (inside the click) so the browser doesn't block the new tab
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
        $('#dStatus').value = 'delivered';
        api('/api/admin/orders/' + o._id, { method: 'PATCH', body: { deliveryStatus: 'delivered', deliveryLink: raw, notes: $('#dNotes').value } })
          .then(function () { toast('Marked Delivered ✓ - press Send in WhatsApp'); loadOrders(true); loadStats(); })
          .catch(function (e2) { fail('WhatsApp opened, but saving failed: ' + e2.message); });
      });
      var del = $('#deleteOrder');
      if (del) del.addEventListener('click', function () {
        if (!confirm('Delete order ' + o.orderNo + '? This cannot be undone.')) return;
        api('/api/admin/orders/' + o._id, { method: 'DELETE' })
          .then(function () { toast('Order deleted'); $('#orderDrawer').hidden = true; loadOrders(); loadStats(); })
          .catch(function (err) { toast(err.message, true); });
      });
    }).catch(function (e) { toast(e.message, true); });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-close-drawer]')) $('#orderDrawer').hidden = true; });

  // ================= FORM BUILDER =================
  function loadFields() {
    api('/api/admin/fields').then(function (fields) { state.fields = fields; renderFields(); }).catch(function (e) { toast(e.message, true); });
  }

  function renderFields() {
    var groups = [], map = {};
    state.fields.forEach(function (f, i) {
      if (!map[f.step]) { map[f.step] = []; groups.push(f.step); }
      map[f.step].push({ f: f, i: i });
    });
    $('#fieldsList').innerHTML = groups.map(function (g, gi) {
      return '<div class="step-group"><h4>Section ' + (gi + 1) + ' · ' + esc(g) + '</h4>' + map[g].map(function (x) {
        var f = x.f;
        return '<div class="field-row' + (f.active ? '' : ' inactive') + '"><div><b>' + esc(f.label) + '</b>' +
          '<div class="meta"><span class="tag mono">' + esc(f.key) + '</span><span class="tag">' + esc(TYPE_LABELS[f.type]) + '</span>' +
          (f.required ? '<span class="tag req">required</span>' : '') + (f.role ? '<span class="tag role">' + esc(ROLE_LABELS[f.role]) + '</span>' : '') +
          (f.active ? '' : '<span class="tag">hidden</span>') +
          (f.options && f.options.length ? '<span class="tag">' + f.options.length + ' options</span>' : '') + '</div></div>' +
          '<div class="row"><button class="btn sm" data-move="' + x.i + '" data-dir="-1" title="Move up">↑</button>' +
          '<button class="btn sm" data-move="' + x.i + '" data-dir="1" title="Move down">↓</button>' +
          '<button class="btn sm" data-edit="' + f._id + '">Edit</button>' +
          (f.role === 'customer_phone' ? '' : '<button class="btn sm danger" data-del="' + f._id + '">Delete</button>') + '</div></div>';
      }).join('') + '</div>';
    }).join('') || '<p class="muted">No fields. Click "Add field".</p>';
  }

  $('#fieldsList').addEventListener('click', function (e) {
    var mv = e.target.closest('[data-move]'), ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (mv) {
      var i = +mv.getAttribute('data-move'), j = i + +mv.getAttribute('data-dir');
      if (j < 0 || j >= state.fields.length) return;
      var tmp = state.fields[i]; state.fields[i] = state.fields[j]; state.fields[j] = tmp;
      renderFields();
      api('/api/admin/fields/reorder', { method: 'PUT', body: { ids: state.fields.map(function (f) { return f._id; }) } })
        .catch(function (err) { toast(err.message, true); loadFields(); });
    }
    if (ed) openFieldEditor(state.fields.find(function (f) { return f._id === ed.getAttribute('data-edit'); }));
    if (del) {
      var f = state.fields.find(function (x) { return x._id === del.getAttribute('data-del'); });
      if (!confirm('Delete field "' + f.label + '"? Old orders keep their answers.')) return;
      api('/api/admin/fields/' + f._id, { method: 'DELETE' }).then(function () { toast('Field deleted'); loadFields(); }).catch(function (err) { toast(err.message, true); });
    }
  });
  $('#addFieldBtn').addEventListener('click', function () { openFieldEditor(null); });

  function openFieldEditor(f) {
    var isNew = !f;
    f = f || { key: '', label: '', type: 'text', step: (state.fields[state.fields.length - 1] || {}).step || 'Details', placeholder: '', help: '', options: [], multiple: false, required: false, active: true, role: '', maxLength: 0 };
    var steps = []; state.fields.forEach(function (x) { if (steps.indexOf(x.step) === -1) steps.push(x.step); });
    $('#fieldForm').innerHTML =
      '<button type="button" class="close" data-close-field>×</button>' +
      '<h2>' + (isNew ? 'Add field' : 'Edit field') + '</h2>' +
      '<label>Question / label<input name="label" required value="' + esc(f.label) + '" /></label>' +
      '<label>Key (internal name, a-z 0-9 _)<input name="key" ' + (isNew ? '' : 'disabled') + ' required pattern="[a-z][a-z0-9_]{1,39}" value="' + esc(f.key) + '" placeholder="e.g. favourite_song" /></label>' +
      '<label>Field type<select name="type">' + Object.keys(TYPE_LABELS).map(function (t) {
        return '<option value="' + t + '"' + (f.type === t ? ' selected' : '') + '>' + TYPE_LABELS[t] + '</option>'; }).join('') + '</select></label>' +
      '<label>Section (fields with the same section are grouped together)<input name="step" list="stepList" value="' + esc(f.step) + '" /></label>' +
      '<datalist id="stepList">' + steps.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' +
      '<label class="opts">Options (one per line)<textarea name="options" rows="6">' + esc((f.options || []).join('\n')) + '</textarea></label>' +
      '<label class="check multi"><input type="checkbox" name="multiple"' + (f.multiple ? ' checked' : '') + ' /> Allow selecting multiple chips</label>' +
      '<label>Placeholder<input name="placeholder" value="' + esc(f.placeholder) + '" /></label>' +
      '<label>Help text (small text under field)<input name="help" value="' + esc(f.help) + '" /></label>' +
      '<label>Max length (0 = default)<input name="maxLength" type="number" min="0" value="' + (f.maxLength || 0) + '" /></label>' +
      '<label>Special role<select name="role">' + Object.keys(ROLE_LABELS).map(function (r) {
        return '<option value="' + r + '"' + (f.role === r ? ' selected' : '') + '>' + ROLE_LABELS[r] + '</option>'; }).join('') + '</select></label>' +
      '<label class="check"><input type="checkbox" name="required"' + (f.required ? ' checked' : '') + ' /> Required</label>' +
      '<label class="check"><input type="checkbox" name="active"' + (f.active ? ' checked' : '') + ' /> Show on website</label>' +
      '<div class="error" id="fieldErr" hidden></div>' +
      '<div class="row"><button class="btn primary" type="submit">' + (isNew ? 'Add field' : 'Save field') + '</button></div>';
    var form = $('#fieldForm');
    var syncType = function () {
      var t = form.type.value;
      $('.opts', form).hidden = ['select', 'radio', 'chips'].indexOf(t) === -1;
      $('.multi', form).hidden = t !== 'chips';
    };
    form.type.addEventListener('change', syncType); syncType();
    form.onsubmit = function (e) {
      e.preventDefault();
      var body = {
        label: form.label.value, type: form.type.value, step: form.step.value, options: form.options.value,
        multiple: form.multiple.checked, placeholder: form.placeholder.value, help: form.help.value,
        maxLength: form.maxLength.value, role: form.role.value, required: form.required.checked, active: form.active.checked,
      };
      if (isNew) body.key = form.key.value.trim();
      api(isNew ? '/api/admin/fields' : '/api/admin/fields/' + f._id, { method: isNew ? 'POST' : 'PUT', body: body })
        .then(function () { $('#fieldModal').hidden = true; toast(isNew ? 'Field added' : 'Field saved'); loadFields(); })
        .catch(function (err) { $('#fieldErr').textContent = err.message; $('#fieldErr').hidden = false; });
    };
    $('#fieldModal').hidden = false;
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-close-field]')) $('#fieldModal').hidden = true; });

  // ================= SETTINGS & CONTENT =================
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function setPath(obj, path, v) {
    var ks = path.split('.'), last = ks.pop();
    ks.reduce(function (o, k) { return (o[k] = o[k] || {}); }, obj)[last] = v;
  }

  function mediaInput(kind, value, label, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'media';
    var accept = { image: 'image/jpeg,image/png,image/webp,image/gif,image/avif', audio: 'audio/*', video: 'video/mp4,video/webm,video/quicktime',
      media: 'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime' }[kind];
    wrap.innerHTML = '<span class="lbl">' + esc(label) + '</span><div class="row"><input type="text" placeholder="Upload or paste URL" />' +
      '<span class="btn upload-btn">⬆ Upload<input type="file" accept="' + accept + '" /></span>' +
      '<button type="button" class="btn sm clear">✕</button></div><div class="preview"></div>';
    var input = $('input[type=text]', wrap), file = $('input[type=file]', wrap), prev = $('.preview', wrap);
    var render = function () {
      var v = input.value.trim();
      var k = kind === 'media' ? (/\.(mp4|webm|mov)(\?|$)/i.test(v) ? 'video' : 'image') : kind;
      prev.innerHTML = !v ? '' : k === 'image' ? '<img src="' + esc(v) + '" alt="" />'
        : k === 'audio' ? '<audio controls preload="none" src="' + esc(v) + '"></audio>'
        : '<video src="' + esc(v) + '" muted controls preload="metadata"></video>';
    };
    input.value = value || ''; render();
    input.addEventListener('change', function () { onChange(input.value.trim()); render(); });
    $('.clear', wrap).addEventListener('click', function () { input.value = ''; onChange(''); render(); });
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      var fd = new FormData(); fd.append('file', file.files[0]);
      var btn = $('.upload-btn', wrap); btn.firstChild.textContent = '⏳ Uploading… ';
      api('/api/admin/upload', { method: 'POST', form: fd })
        .then(function (r) { input.value = r.url; onChange(r.url); render(); toast('Uploaded -remember to Save'); })
        .catch(function (err) { toast(err.message, true); })
        .finally(function () { btn.firstChild.textContent = '⬆ Upload'; file.value = ''; });
    });
    return wrap;
  }

  // Generic editor for arrays of objects (samples, reactions, reviews, FAQs)
  function listEditor(container, key, schema, addLabel) {
    var render = function () {
      var items = state.settings[key] = state.settings[key] || [];
      container.innerHTML = '';
      items.forEach(function (item, idx) {
        var box = document.createElement('div');
        box.className = 'list-item';
        box.innerHTML = '<div class="li-head"><b>#' + (idx + 1) + '</b><div class="row">' +
          '<button type="button" class="btn sm" data-a="up">↑</button><button type="button" class="btn sm" data-a="down">↓</button>' +
          '<button type="button" class="btn sm danger" data-a="del">Remove</button></div></div>';
        schema.forEach(function (s) {
          if (['image', 'audio', 'video', 'media'].indexOf(s.type) > -1) {
            box.appendChild(mediaInput(s.type, item[s.k], s.label, function (v) { item[s.k] = v; }));
          } else if (s.type === 'checkbox') {
            var cl = document.createElement('label');
            cl.className = 'check';
            var cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = !!item[s.k];
            cb.addEventListener('change', function () { item[s.k] = cb.checked; });
            cl.appendChild(cb); cl.appendChild(document.createTextNode(' ' + s.label));
            box.appendChild(cl);
          } else {
            var l = document.createElement('label');
            l.textContent = s.label;
            var el = document.createElement(s.type === 'textarea' ? 'textarea' : 'input');
            if (s.type === 'number') { el.type = 'number'; el.min = 1; el.max = 5; }
            if (s.type === 'textarea') el.rows = 3;
            el.value = item[s.k] == null ? '' : item[s.k];
            el.addEventListener('input', function () { item[s.k] = s.type === 'number' ? +el.value : el.value; });
            l.appendChild(el); box.appendChild(l);
          }
        });
        box.querySelector('.li-head').addEventListener('click', function (e) {
          var a = e.target.getAttribute('data-a');
          if (!a) return;
          if (a === 'del') items.splice(idx, 1);
          if (a === 'up' && idx > 0) items.splice(idx - 1, 0, items.splice(idx, 1)[0]);
          if (a === 'down' && idx < items.length - 1) items.splice(idx + 1, 0, items.splice(idx, 1)[0]);
          render();
        });
        container.appendChild(box);
      });
      var add = document.createElement('button');
      add.type = 'button'; add.className = 'btn'; add.textContent = '+ ' + addLabel;
      add.addEventListener('click', function () {
        var blank = {}; schema.forEach(function (s) { blank[s.k] = s.type === 'number' ? 5 : ''; });
        items.push(blank); render();
      });
      container.appendChild(add);
    };
    render();
  }

  function loadSettings() {
    api('/api/admin/settings').then(function (s) {
      state.settings = s;
      $$('[data-s]').forEach(function (el) {
        var v = getPath(s, el.getAttribute('data-s'));
        el.value = v == null ? '' : v;
      });
      $$('[data-media]').forEach(function (el) {
        var k = el.getAttribute('data-media');
        el.innerHTML = '';
        el.appendChild(mediaInput(el.getAttribute('data-kind'), s[k], el.getAttribute('data-label'), function (v) { state.settings[k] = v; }));
      });
      listEditor($('#occasionsEditor'), 'occasions', [
        { k: 'image', label: 'Photo (portrait works best)', type: 'image' },
        { k: 'title', label: 'Title (e.g. Birthday)' }, { k: 'text', label: 'Short text' },
        { k: 'cta', label: 'Link text (e.g. Surprise them)' },
        { k: 'prefill', label: 'Pre-select in checkout (optional, e.g. occasion=Birthday or recipient=Mummy)' },
      ], 'Add occasion card');
      listEditor($('#samplesEditor'), 'samples', [
        { k: 'title', label: 'Big name on the card (e.g. Riya)' }, { k: 'tag', label: 'Top pill (e.g. For wife)' }, { k: 'subtitle', label: 'Small line (e.g. Hindi romantic · for his wife)' },
        { k: 'audio', label: 'Song file (mp3)', type: 'audio' }, { k: 'image', label: 'Cover image', type: 'image' },
      ], 'Add sample song');
      listEditor($('#reactionsEditor'), 'reactions', [{ k: 'image', label: 'Photo', type: 'image' }, { k: 'caption', label: 'Caption (optional)' }], 'Add reaction photo');
      listEditor($('#heroSlidesEditor'), 'heroSlides', [
        { k: 'media', label: 'Photo or video (vertical 9:16 works best)', type: 'media' },
        { k: 'name', label: 'Name shown in "Now playing" (e.g. Riya)' },
        { k: 'forLabel', label: 'Top pill (e.g. For Wife)' },
        { k: 'lyric', label: 'Lyric line (the name gets highlighted)' },
      ], 'Add hero slide');
      listEditor($('#testimonialsEditor'), 'testimonials', [
        { k: 'name', label: 'Customer name' }, { k: 'date', label: 'Date (e.g. 7 Nov)' }, { k: 'source', label: 'Source pill (e.g. WhatsApp message)' },
        { k: 'rating', label: 'Rating (1-5)', type: 'number' }, { k: 'text', label: 'Review', type: 'textarea' },
        { k: 'verified', label: 'Show "Verified purchase" (only for real paying customers)', type: 'checkbox' },
      ], 'Add review');
      listEditor($('#deliveryShotsEditor'), 'deliveryShots', [{ k: 'image', label: 'Screenshot', type: 'image' }, { k: 'caption', label: 'Caption (optional)' }], 'Add screenshot');
      listEditor($('#faqsEditor'), 'faqs', [{ k: 'q', label: 'Question' }, { k: 'a', label: 'Answer', type: 'textarea' }], 'Add FAQ');
    }).catch(function (e) { toast(e.message, true); });
  }

  $$('.save-settings').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!state.settings) return;
      var body = {
        samples: state.settings.samples, occasions: state.settings.occasions, reactions: state.settings.reactions, testimonials: state.settings.testimonials, heroSlides: state.settings.heroSlides,
        deliveryShots: state.settings.deliveryShots, faqs: state.settings.faqs,
        logo: state.settings.logo, heroImage: state.settings.heroImage, heroVideo: state.settings.heroVideo, storyImage: state.settings.storyImage,
      };
      $$('[data-s]').forEach(function (el) { setPath(body, el.getAttribute('data-s'), el.value); });
      $$('.save-settings').forEach(function (b) { b.disabled = true; });
      api('/api/admin/settings', { method: 'PUT', body: body })
        .then(function () { toast('Saved ✓ -changes are live on the website'); loadSettings(); })
        .catch(function (err) { toast(err.message, true); })
        .finally(function () { $$('.save-settings').forEach(function (b) { b.disabled = false; }); });
    });
  });

  // ================= INIT =================
  api('/api/admin/me').then(showApp).catch(showLogin);
})();
