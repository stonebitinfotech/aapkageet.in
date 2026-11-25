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
  var I = window.Icons;
  var stripEmoji = function (s) { return String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim(); };
  var STORE_KEY = 'song_order_draft_v1';

  var state = { cfg: null, fields: [], sections: [], answers: {}, errors: {}, order: null, done: false, busy: false };

  try { state.answers = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { state.answers = {}; }
  function saveDraft() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state.answers)); } catch (e) {} }

  function api(url, opts) {
    opts = opts || {};
    return fetch(url, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var err = new Error(data.error || 'Request failed'); err.data = data; throw err; }
        return data;
      });
    });
  }

  // ================= PAGE CONTENT =================
  function bind(name, value) {
    $$('[data-bind="' + name + '"]').forEach(function (el) { el.textContent = value; });
  }

  function renderPage() {
    var s = state.cfg.settings;
    var off = s.comparePrice > s.price ? Math.round((1 - s.price / s.comparePrice) * 100) : 0;

    document.documentElement.classList.toggle('theme-dark', s.theme === 'dark');
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.content = s.theme === 'dark' ? '#120a17' : '#fff5f8';
    if (s.storyImage) $('#storyMedia').innerHTML = '<img class="story-img" src="' + esc(s.storyImage) + '" alt="Personalised song" loading="lazy" />';

    bind('brandName', s.brandName);
    bind('tagline', s.tagline);
    bind('deliveryPromise', s.deliveryPromise || '30 min');
    bind('priceFmt', inr(s.price));
    bind('comparePriceFmt', off ? inr(s.comparePrice) : '');
    bind('saveText', off ? 'SAVE ' + off + '% TODAY' : '');
    bind('offText', off ? off + '% OFF' : '');
    bind('saveShort', off ? 'Save ' + off + '%' : '');
    $$('[data-bind="saveText"],[data-bind="offText"],[data-bind="saveShort"]').forEach(function (el) { el.hidden = !off; });
    document.title = (s.productName || 'Personalised Song') + ' | ' + s.brandName;

    if (s.announcement) { var a = $('#announce'); a.textContent = s.announcement; a.hidden = false; }

    if (s.logo) {
      ['#logo', '#footerLogo'].forEach(function (sel) {
        $(sel).innerHTML = '<img src="' + esc(s.logo) + '" alt="' + esc(s.brandName) + '" />';
      });
    }

    renderHero(s);

    if (s.statsText) {
      ['#statsTrust', '#statsDuo', '#statsLine'].forEach(function (sel) { var el = $(sel); if (el) { el.textContent = s.statsText; el.hidden = false; } });
    }
    if (s.instagramHandle) {
      var ig = $('#igTrust'), handle = s.instagramHandle.replace(/^@/, '');
      ig.innerHTML = '<span class="ig-ic">' + I.svg('heart') + '</span>' +
        (s.instagramFollowers ? '<b>' + esc(s.instagramFollowers) + '</b> followers ' : '') +
        '<span class="muted">@' + esc(handle) + '</span><span class="ig-ok">' + I.svg('check') + '</span>';
      ig.href = s.instagramUrl || 'https://www.instagram.com/' + encodeURIComponent(handle) + '/';
      ig.hidden = false;
    }

    // Sample songs -tall photo cards with play button
    if (s.samples && s.samples.length) {
      $('#samples').innerHTML = s.samples.map(function (x, i) {
        return '<div class="sample sm-card" data-i="' + i + '">' +
          (x.image ? '<img src="' + esc(x.image) + '" alt="" loading="lazy" />' : '<div class="sm-ph">' + I.svg('music', 'ico ico-xl') + '</div>') +
          (x.tag ? '<span class="sm-tag">' + I.svg(I.forOption(x.tag) || 'heart') + esc(x.tag) + '</span>' : '') +
          (x.audio ? '<button class="play-btn" aria-label="Play ' + esc(x.title) + '">' + playIcon(false) + '</button>' : '') +
          '<div class="sm-info"><small>A song we made for</small><b>' + esc(x.title) + '</b><span>' + esc(x.subtitle) + '</span></div>' +
          (x.audio ? '<div class="sample-prog"><span></span></div><audio preload="none" src="' + esc(x.audio) + '"></audio>' : '') +
          '</div>';
      }).join('');
      $('#samplesSection').hidden = false;
      setupPlayers();
    } else {
      $('#duoGrid').classList.add('solo');
    }

    // Occasion photo cards
    var occ = s.occasions || [];
    $('#occGrid').innerHTML = occ.map(function (o) {
      return '<article class="oc-card">' +
        (o.image ? '<div class="oc-img"><img src="' + esc(o.image) + '" alt="' + esc(o.title) + '" loading="lazy" /></div>'
                 : '<div class="oc-img oc-ph">' + I.svg(o.icon || I.forOption(o.title) || 'heart', 'ico') + '</div>') +
        '<div class="oc-body"><h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p>' +
        '<button type="button" class="oc-cta" data-open-form' + (o.prefill ? ' data-prefill="' + esc(o.prefill) + '"' : '') + '>' + esc(o.cta || 'Create their song') + ' <i>→</i></button></div></article>';
    }).join('');
    $('#occGrid').closest('.section').hidden = !occ.length;

    // Reaction photos -sliding row
    if (s.reactions && s.reactions.length) {
      marquee($('#reactions'), s.reactions.map(function (x) {
        return '<figure class="rx-card"><img src="' + esc(x.image) + '" alt="' + esc(x.caption || '') + '" loading="lazy" />' +
          (x.caption ? '<figcaption>' + esc(x.caption) + '</figcaption>' : '') + '</figure>';
      }), 40);
      $('#reactionsSection').hidden = false;
    }

    // Review cards -sliding row
    if (s.testimonials && s.testimonials.length) {
      marquee($('#reviewsRow'), s.testimonials.map(function (t) {
        return '<article class="rv-card"><span class="rv-src">' + I.svg('message') + esc(t.source || 'WhatsApp message') + '</span>' +
          '<p>“' + esc(t.text) + '”</p><div class="rv-meta"><b>' + esc(t.name) + '</b>' + (t.date ? ' · ' + esc(t.date) : '') + '</div>' +
          (t.verified ? '<div class="rv-ver">' + I.svg('check') + 'Verified purchase</div>' : '') + '</article>';
      }), 55);
      $('#reviewsSection').hidden = false;
    }

    // WhatsApp delivery phones -uploaded screenshots, else sample chat mockups
    if (s.deliveryShots && s.deliveryShots.length) {
      $('#waTitle').innerHTML = 'Actual WhatsApp chats <span class="grad-text">from our customers</span>';
      marquee($('#waRow'), s.deliveryShots.map(function (x) {
        return '<div class="wa-phone shot"><div class="wa-notch"></div><span class="wa-deliv">' + I.svg('check') + 'Delivered</span>' +
          '<img src="' + esc(x.image) + '" alt="' + esc(x.caption || 'WhatsApp delivery') + '" loading="lazy" /></div>';
      }), 45);
    } else {
      $('#waTitle').innerHTML = 'Straight to their WhatsApp. <span class="grad-text">Straight to their heart.</span>';
      $('#waSub').textContent = 'Aise aata hai aapka gaana -MP3 seedha WhatsApp pe';
      marquee($('#waRow'), SAMPLE_CHATS.map(chatPhone), 45);
    }

    if (s.faqs && s.faqs.length) {
      $('#faq').innerHTML = s.faqs.map(function (f) {
        return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>';
      }).join('');
    } else { $('#faqSection').hidden = true; }

    var contact = [];
    if (s.whatsappNumber) contact.push('<a href="https://wa.me/' + esc(s.whatsappNumber.replace(/\D/g, '')) + '" target="_blank" rel="noopener">WhatsApp: ' + esc(s.whatsappNumber) + '</a>');
    if (s.supportEmail) contact.push('<a href="mailto:' + esc(s.supportEmail) + '">' + esc(s.supportEmail) + '</a>');
    if (s.supportHours) contact.push('<span class="tiny">Support hours: ' + esc(s.supportHours) + '</span>');
    $('#footerContact').innerHTML = contact.join('');
    $('#copyright').textContent = '© ' + new Date().getFullYear() + ' ' + (s.businessName || s.brandName) + '. All rights reserved. All prices are inclusive of applicable taxes.';
  }

  // ---------- Infinite sliding row (duplicated track for a seamless loop) ----------
  function marquee(el, items, seconds) {
    if (!el || !items.length) return;
    var list = items.slice();
    while (list.length < 6) list = list.concat(items); // enough cards to fill wide screens
    var html = list.join('');
    el.innerHTML = '<div class="mq-track" style="--dur:' + Math.max(20, seconds * list.length / 6) + 's">' +
      '<div class="mq-set">' + html + '</div><div class="mq-set" aria-hidden="true">' + html + '</div></div>';
  }

  // ---------- Hero: two phones with sliding photos/videos ----------
  var hero = { slides: [], i: 0, timer: null, typed: '' };
  var isVideo = function (u) { return /\.(mp4|webm|mov)(\?|$)/i.test(u || ''); };

  function slideMedia(sl) {
    return isVideo(sl.media)
      ? '<video src="' + esc(sl.media) + '"' + (sl.poster ? ' poster="' + esc(sl.poster) + '"' : '') + ' muted loop playsinline preload="metadata"></video>'
      : '<img src="' + esc(sl.media) + '" alt="" />';
  }

  function renderHero(s) {
    var slides = (s.heroSlides || []).filter(function (x) { return x.media; });
    if (!slides.length && (s.heroVideo || s.heroImage)) slides = [{ media: s.heroVideo || s.heroImage, poster: s.heroImage, name: '', forLabel: 'For someone special', lyric: '' }];
    if (!slides.length) return; // keep the animated mockup
    hero.slides = slides;
    var layers = slides.map(function (sl, i) { return '<div class="hp-slide" data-i="' + i + '">' + slideMedia(sl) + '</div>'; }).join('');
    var hm = $('#heroMedia');
    hm.className = 'hero-media hero-phones';
    hm.innerHTML =
      '<div class="hp-tag"><small>Your song for</small><b>someone special</b></div>' +
      '<div class="hp-phone hp-back"><div class="hp-screen" id="hpBack">' + layers + '</div></div>' +
      '<div class="hp-phone hp-front"><div class="hp-screen" id="hpFront">' + layers + '</div>' +
        '<div class="hp-shade"></div>' +
        '<span class="hp-pill hp-for">' + I.svg('heart') + '<span id="hpFor"></span></span>' +
        '<button type="button" class="hp-pill hp-sound" id="hpSound" hidden>' + I.svg('headphones') + '<span>Sound</span></button>' +
        '<div class="hp-chip">' + I.svg('check') + 'Delivered on WhatsApp</div>' +
        '<div class="hp-bottom">' +
          '<div class="hp-player">' +
            '<div class="pl-top"><span class="pl-art">' + I.svg('music') + '</span>' +
              '<div class="pl-meta"><small>' + esc(s.brandName) + '</small><b>Sirf tumhare liye</b><span>A song for <em id="hpName"></em></span></div>' +
              '<span class="eq"><i></i><i></i><i></i><i></i></span></div>' +
            '<div class="pl-bar"><span></span></div>' +
            '<div class="pl-ctrl"><span>0:42</span><span class="pl-btns"><i>⏮</i><b>❚❚</b><i>⏭</i></span><span>3:15</span></div>' +
          '</div>' +
          '<p class="hp-lyric"><span class="eq"><i></i><i></i><i></i></span><span id="hpLyric"></span></p>' +
          '<div class="hp-prog"><span id="hpProg"></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="hp-glow"></div>' +
      '<div class="hp-review" id="hpReview" hidden></div>' +
      (slides.length > 1 ? '<div class="hp-dots" id="hpDots">' + slides.map(function (_, i) { return '<button type="button" data-go="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '');

    $('#hpSound').addEventListener('click', function () {
      var v = $('#hpFront .hp-slide.on video');
      if (!v) return;
      v.muted = !v.muted;
      this.classList.toggle('on', !v.muted);
      $('span', this).textContent = v.muted ? 'Sound' : 'Mute';
    });
    var dots = $('#hpDots');
    if (dots) dots.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) showSlide(+b.getAttribute('data-go')); });
    hm.addEventListener('mouseenter', function () { clearTimeout(hero.timer); });
    hm.addEventListener('mouseleave', function () { schedule(); });
    showSlide(0);
  }

  function lyricHtml(sl) {
    var name = hero.typed || sl.name || '';
    var text = sl.lyric || (name ? name + ', ye gaana sirf tere liye…' : 'Ye gaana sirf tere liye…');
    if (hero.typed && sl.name) text = text.split(sl.name).join(hero.typed);
    var safe = esc('“' + text + '”');
    return name ? safe.split(esc(name)).join('<mark>' + esc(name) + '</mark>') : safe;
  }

  function showSlide(i) {
    var n = hero.slides.length;
    hero.i = (i + n) % n;
    var sl = hero.slides[hero.i], next = (hero.i + 1) % n;
    var set = function (sel, idx) {
      $$(sel + ' .hp-slide').forEach(function (el) {
        var on = +el.getAttribute('data-i') === idx;
        el.classList.toggle('on', on);
        var v = $('video', el);
        if (v) { if (on && sel === '#hpFront') { v.currentTime = 0; v.play().catch(function () {}); } else { v.pause(); v.muted = true; } }
      });
    };
    set('#hpFront', hero.i);
    set('#hpBack', next);
    $('#hpFor').textContent = sl.forLabel || 'For someone special';
    $('#hpName').textContent = hero.typed || sl.name || 'Your song';
    $('#hpLyric').innerHTML = lyricHtml(sl);
    var snd = $('#hpSound'); snd.hidden = !isVideo(sl.media); snd.classList.remove('on'); $('span', snd).textContent = 'Sound';
    var prog = $('#hpProg'); prog.style.animation = 'none'; void prog.offsetWidth; prog.style.animation = '';
    prog.style.animationDuration = (isVideo(sl.media) ? 8 : 4.5) + 's';
    $$('#hpDots button').forEach(function (b, k) { b.classList.toggle('on', k === hero.i); });

    var t = state.cfg.settings.testimonials || [];
    var rv = $('#hpReview');
    if (t.length) {
      var r = t[hero.i % t.length];
      rv.innerHTML = '<span class="stars">★★★★★</span><p>“' + esc(r.text.length > 110 ? r.text.slice(0, 108) + '…' : r.text) + '”</p><b>-' + esc(r.name) + '</b>';
      rv.hidden = false;
      rv.classList.remove('pop'); void rv.offsetWidth; rv.classList.add('pop');
    }
    schedule();
  }

  function schedule() {
    clearTimeout(hero.timer);
    if (hero.slides.length < 2) return;
    hero.timer = setTimeout(function () { showSlide(hero.i + 1); }, isVideo(hero.slides[hero.i].media) ? 8000 : 4500);
  }

  // ---------- Sample WhatsApp delivery chats (preview content -replace with real screenshots) ----------
  var SAMPLE_CHATS = [
    { m: [['o', 'Namaste! 🙏 Aapka personalised song ready hai -Hindi romantic, female voice 🎶 Neeche attach hai, ek baar suniye 👇', '3:20 PM'], ['f', 'Order ID 1042.mp3', '3.5 MB', '3:21 PM'], ['i', 'Male version bhi ho sakta hai kya?', '3:25 PM'], ['o', 'Ji bilkul, abhi bhejte hain 😊', '3:25 PM'], ['f', 'Order ID 1042 male.mp3', '3.2 MB', '3:31 PM']] },
    { m: [['o', 'Aapki college wali love story aur saath bitaaye din -sab is gaane mein hai ❤️ Male voice, jaisa aapne chaaha tha 🎵', '6:29 PM'], ['f', 'Order ID 1057.mp3', '3.8 MB', '6:29 PM'], ['i', 'Thank you so much 😭❤️', '6:44 PM']] },
    { m: [['o', 'Updated song attach kiya hai 👇 Naam ki spelling theek kar di hai. Umeed hai ab bilkul perfect lagega 🎶', '10:27 AM'], ['f', 'Order ID 1063 final.mp3', '3.9 MB', '10:27 AM'], ['i', 'Okay thank you for making the changes', '10:37 AM'], ['i', 'Ab bahut accha lag raha hai 🤗', '10:37 AM']] },
    { m: [['o', 'Happy Birthday to Papa! 🎂 Hindi-Punjabi mix, male voice. Saari yaadein daal di hain -suniye 👇', '12:52 PM'], ['f', 'Order ID 1071.mp3', '4.1 MB', '12:52 PM'], ['i', 'Papa ro pade sunke 😭🙏', '1:12 PM'], ['i', 'Best gift ever', '1:12 PM']] },
    { m: [['o', 'Long distance ke liye ek pyaara sa gaana 💌 Taaki door hoke bhi wo aapko paas mehsoos kare.', '11:05 PM'], ['f', 'Order ID 1088.mp3', '3.6 MB', '11:06 PM'], ['i', 'Thankssss 🙏🙏🙏', '12:24 AM']] },
  ];

  function chatPhone(c) {
    var msgs = c.m.map(function (x) {
      if (x[0] === 'f') {
        return '<div class="wm out file"><span class="wm-fi">' + I.svg('music') + '</span><div><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + ' · mp3</small></div><span class="wm-t">' + esc(x[3]) + ' <i class="wm-tk">✓✓</i></span></div>';
      }
      return '<div class="wm ' + (x[0] === 'o' ? 'out' : 'in') + '">' + esc(x[1]) + '<span class="wm-t">' + esc(x[2]) + (x[0] === 'o' ? ' <i class="wm-tk">✓✓</i>' : '') + '</span></div>';
    }).join('');
    return '<div class="wa-phone"><div class="wa-notch"></div>' +
      '<div class="wa-hdr"><span class="wa-back">‹</span><span class="wa-avatar"></span><span class="wa-nm"></span><span class="wa-ics">' + I.svg('phone') + '</span></div>' +
      '<span class="wa-deliv">' + I.svg('check') + 'Delivered</span>' +
      '<div class="wa-chat">' + msgs + '</div>' +
      '<div class="wa-inp"><span>+</span><div></div>' + I.svg('mic') + '</div></div>';
  }

  function playIcon(playing) {
    return playing
      ? '<svg viewBox="0 0 24 24" class="ico" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" class="ico" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>';
  }

  function setupPlayers() {
    $$('.sample').forEach(function (card) {
      var audio = $('audio', card), btn = $('.play-btn', card), bar = $('.sample-prog span', card);
      if (!audio || !btn) return;
      btn.addEventListener('click', function () {
        if (audio.paused) {
          $$('.sample audio').forEach(function (a) { if (a !== audio) a.pause(); });
          audio.play().catch(function () {});
        } else audio.pause();
      });
      audio.addEventListener('play', function () { card.classList.add('playing'); btn.innerHTML = playIcon(true); });
      audio.addEventListener('pause', function () { card.classList.remove('playing'); btn.innerHTML = playIcon(false); });
      audio.addEventListener('timeupdate', function () { if (audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%'; });
    });
  }

  function recipientField() { return state.fields.find(function (f) { return f.role === 'recipient_name'; }); }

  // "Order now & get it by 3:16 AM" -now + delivery promise
  function updateEta() {
    var p = String(state.cfg.settings.deliveryPromise || '30 min').toLowerCase();
    var n = parseFloat(p) || 30;
    var mins = /hour|hr/.test(p) ? n * 60 : /day/.test(p) ? n * 1440 : n;
    var t = new Date(Date.now() + mins * 60000);
    var txt = t.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
    if (mins >= 1440) txt = t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + txt;
    $$('.js-eta').forEach(function (el) { el.textContent = txt; });
  }

  function setupHeroName() {
    var inputs = $$('.js-name-input');
    var input = inputs[0];
    var nameField = recipientField();
    if (nameField && state.answers[nameField.key]) inputs.forEach(function (i) { i.value = state.answers[nameField.key]; });
    var update = function (src) {
      if (src && src.target) { input = src.target; inputs.forEach(function (i) { if (i !== input) i.value = input.value; }); }
      var n = input.value.trim();
      $('#lyricLine').textContent = n ? '"' + n + ', ye gaana sirf tere liye…"' : '"ye gaana sirf tere liye…"';
      $('#mockName') && ($('#mockName').textContent = n || 'Unka naam');
      $('#mockLyric') && ($('#mockLyric').textContent = n || 'Unka naam');
      $$('.js-name').forEach(function (el) { el.textContent = n || 'Unka naam'; });
      if (hero.slides.length) {
        hero.typed = n;
        var sl = hero.slides[hero.i];
        $('#hpName').textContent = n || sl.name || 'Your song';
        $('#hpLyric').innerHTML = lyricHtml(sl);
      }
      if (nameField) { state.answers[nameField.key] = n; saveDraft(); }
    };
    inputs.forEach(function (i) {
      i.addEventListener('input', update);
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); openModal(); } });
    });
    update();
    updateEta();
    setInterval(updateEta, 30000);
  }

  // ================= ONE-PAGE CHECKOUT =================
  function buildSections() {
    var map = {}, order = [];
    state.fields.forEach(function (f) {
      var k = f.step || 'Details';
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(f);
    });
    state.sections = order.map(function (t) { return { title: t, fields: map[t] }; });
  }

  function openModal(prefill) {
    if (!state.cfg) return;
    if (state.done) { state.done = false; state.order = null; }
    if (prefill) {
      prefill.split('&').forEach(function (pair) {
        var kv = pair.split('='), f = state.fields.find(function (x) { return x.key === kv[0]; });
        if (f && f.options.indexOf(kv[1]) > -1) state.answers[f.key] = f.type === 'chips' && f.multiple ? [kv[1]] : kv[1];
      });
      saveDraft();
    }
    renderForm();
    $('#orderModal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#formBody').scrollTop = 0;
  }
  function closeModal() {
    if (state.busy) return;
    $('#orderModal').hidden = true;
    document.body.style.overflow = '';
  }

  function fieldHtml(f) {
    var v = state.answers[f.key];
    var err = state.errors[f.key];
    var id = 'f_' + f.key;
    var label = '<label class="f-label" for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="req">*</span>' : ' <span class="opt">(optional)</span>') + '</label>';
    var input;
    var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
    var max = f.maxLength ? ' maxlength="' + f.maxLength + '"' : '';
    var icon = I.forInput(f);

    switch (f.type) {
      case 'textarea':
        input = '<textarea id="' + id + '" data-key="' + esc(f.key) + '" rows="3"' + ph + max + '>' + esc(v || '') + '</textarea>'; break;
      case 'select':
        input = '<div class="input-wrap' + (icon ? ' has-ico' : '') + '">' + (icon ? I.svg(icon, 'ico in-ico') : '') +
          '<select id="' + id + '" data-key="' + esc(f.key) + '"><option value="">-Select —</option>' +
          f.options.map(function (o) { return '<option' + (o === v ? ' selected' : '') + ' value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select></div>'; break;
      case 'radio':
      case 'chips':
        var multi = f.type === 'chips' && f.multiple;
        var sel = multi ? (Array.isArray(v) ? v : []) : [v];
        input = '<div class="chips' + (f.type === 'radio' ? ' chips-radio' : '') + '" id="' + id + '" data-key="' + esc(f.key) + '" data-multi="' + (multi ? 1 : 0) + '" role="group">' +
          f.options.map(function (o) {
            var ic = I.forOption(o, f);
            return '<button type="button" class="chip' + (sel.indexOf(o) > -1 ? ' on' : '') + '" data-val="' + esc(o) + '">' +
              (ic ? I.svg(ic, 'ico chip-ico') : '') + '<span>' + esc(stripEmoji(o)) + '</span>' + I.svg('check', 'ico chip-check') + '</button>';
          }).join('') + '</div>'; break;
      default:
        var type = { tel: 'tel', email: 'email', number: 'number', date: 'date' }[f.type] || 'text';
        var extra = f.type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : f.type === 'email' ? ' autocomplete="email"' : f.role === 'customer_name' ? ' autocomplete="name"' : '';
        input = '<div class="input-wrap' + (icon ? ' has-ico' : '') + '">' + (icon ? I.svg(icon, 'ico in-ico') : '') +
          '<input id="' + id + '" type="' + type + '" data-key="' + esc(f.key) + '" value="' + esc(v || '') + '"' + ph + max + extra + ' /></div>';
    }
    return '<div class="field' + (err ? ' has-error' : '') + '" data-field="' + esc(f.key) + '">' + label + input +
      (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '') + '<div class="err">' + (err ? esc(err) : '') + '</div></div>';
  }

  function summaryHtml() {
    var s = state.cfg.settings;
    var off = s.comparePrice > s.price;
    var demo = state.cfg.payment.mode === 'demo'
      ? '<div class="demo-box">' + I.svg('sparkles') + ' <span><b>Demo mode</b> -Razorpay keys are not set, so no real payment will be taken.</span></div>' : '';
    return '<section class="co-section co-summary">' +
      '<div class="co-head"><span class="co-ic">' + I.svg('receipt') + '</span><div><h4>Order summary</h4></div></div>' +
      '<div class="sum-line"><span>' + esc(s.productName) + '</span><span>' + (off ? '<s>' + inr(s.comparePrice) + '</s> ' : '') + inr(s.price) + '</span></div>' +
      (off ? '<div class="sum-line save"><span>Discount</span><span>− ' + inr(s.comparePrice - s.price) + '</span></div>' : '') +
      '<div class="sum-line"><span>Delivery on WhatsApp &amp; Email</span><span class="free">FREE</span></div>' +
      '<div class="sum-total"><span>Total <small>(incl. taxes)</small></span><b>' + inr(s.price) + '</b></div>' +
      '<ul class="sum-perks">' +
        '<li>' + I.svg('zap') + 'Ready in ' + esc(s.deliveryPromise || '30 min') + '</li>' +
        '<li>' + I.svg('headphones') + 'MP3 yours forever</li>' +
        '<li>' + I.svg('shield') + 'Secure payment</li>' +
      '</ul>' + demo + '</section>';
  }

  function renderForm() {
    var s = state.cfg.settings;
    $('#modalTitle').textContent = 'Create their song';
    $('#modalSub').textContent = '1-minute form · phir secure payment';
    $('#modalFoot').hidden = false;
    $('#formError').hidden = true;
    $('#footPrice').textContent = inr(s.price);
    $('#footOld').textContent = s.comparePrice > s.price ? inr(s.comparePrice) : '';
    setPayLabel();

    $('#formBody').innerHTML = state.sections.map(function (sec, i) {
      return '<section class="co-section">' +
        '<div class="co-head"><span class="co-ic">' + I.svg(I.forSection(sec.title)) + '</span>' +
        '<div><small>Step ' + (i + 1) + '</small><h4>' + esc(stripEmoji(sec.title)) + '</h4></div></div>' +
        '<div class="co-fields">' + sec.fields.map(fieldHtml).join('') + '</div></section>';
    }).join('') + summaryHtml();
    updateProgress();
  }

  function setPayLabel() {
    $('#payBtn').innerHTML = I.svg('lock') + ' Pay ' + inr(state.cfg.settings.price) + ' securely';
  }

  function updateProgress() {
    var req = state.fields.filter(function (f) { return f.required; });
    var done = req.filter(function (f) { return !validateField(f); }).length;
    $('#progressBar').style.width = (req.length ? Math.round(done / req.length * 100) : 100) + '%';
  }

  function validateField(f) {
    var v = state.answers[f.key];
    var empty = Array.isArray(v) ? v.length === 0 : !v;
    if (empty) return f.required ? 'Ye field zaroori hai' : '';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Valid email daalo';
    if (f.type === 'tel' && !/^\d{10,13}$/.test(String(v).replace(/[^\d]/g, ''))) return 'Valid mobile number daalo (10 digits)';
    return '';
  }

  function setFieldError(key, msg) {
    var el = $('[data-field="' + key + '"]');
    if (!el) return;
    el.classList.toggle('has-error', !!msg);
    $('.err', el).textContent = msg || '';
    if (msg) state.errors[key] = msg; else delete state.errors[key];
  }

  function validateAll() {
    var first = null;
    state.fields.forEach(function (f) {
      var e = validateField(f);
      setFieldError(f.key, e);
      if (e && !first) first = f.key;
    });
    return first;
  }

  function scrollToField(key) {
    var el = $('[data-field="' + key + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var inp = $('input, textarea, select', el);
    if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, 350);
  }

  function setBusy(b, label) {
    state.busy = b;
    var btn = $('#payBtn');
    btn.disabled = b;
    if (b) btn.innerHTML = '<span class="spinner"></span> ' + (label || 'Please wait…');
    else setPayLabel();
  }

  function showError(msg) { var el = $('#formError'); el.textContent = msg; el.hidden = !msg; }

  function onSubmit(e) {
    e.preventDefault();
    if (state.busy) return;
    showError('');
    var bad = validateAll();
    if (bad) { showError('Kuch zaroori details reh gayi hain -highlighted fields check karo.'); scrollToField(bad); return; }

    setBusy(true, 'Creating your order…');
    var p = state.order ? Promise.resolve(state.order) : api('/api/orders', { method: 'POST', body: { answers: state.answers } })
      .then(function (order) { state.order = order; return order; });
    p.then(function (order) {
      if (order.payment.mode === 'razorpay') return openRazorpay(order);
      if (order.payment.mode === 'demo') return showDemoPay(order);
      throw new Error('Payments are not available right now.');
    }).catch(function (err) {
      setBusy(false);
      if (err.data && err.data.errors) {
        var first = null;
        Object.keys(err.data.errors).forEach(function (k) { setFieldError(k, err.data.errors[k]); first = first || k; });
        if (first) scrollToField(first);
      }
      showError(err.message || 'Something went wrong. Please try again.');
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) return resolve();
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Could not load payment window. Check your internet and try again.')); };
      document.head.appendChild(s);
    });
  }

  function customer() {
    var c = { name: '', email: '', contact: '' };
    state.fields.forEach(function (f) {
      var v = state.answers[f.key];
      if (f.role === 'customer_name') c.name = v || '';
      if (f.role === 'customer_email') c.email = v || '';
      if (f.role === 'customer_phone') c.contact = String(v || '').replace(/[^\d+]/g, '');
    });
    return c;
  }

  function openRazorpay(order) {
    setBusy(true, 'Opening secure payment…');
    return loadScript('https://checkout.razorpay.com/v1/checkout.js').then(function () {
      var s = state.cfg.settings;
      var rzp = new window.Razorpay({
        key: order.payment.keyId,
        amount: order.payment.amountPaise,
        currency: 'INR',
        name: s.brandName,
        description: s.productName,
        image: s.logo ? new URL(s.logo, location.href).href : undefined,
        order_id: order.payment.orderId,
        prefill: customer(),
        notes: { orderNo: order.orderNo },
        theme: { color: '#f0325f' },
        handler: function (resp) {
          setBusy(true, 'Confirming payment…');
          api('/api/orders/' + order.id + '/verify', { method: 'POST', body: Object.assign({ token: order.token }, resp) })
            .then(function () { showSuccess(order); })
            .catch(function (err) { setBusy(false); showError(err.message + ' (Order ' + order.orderNo + ')'); });
        },
        modal: {
          ondismiss: function () {
            setBusy(false);
            showError('Payment cancelled. Aapka order save hai -"Pay" dabake dobara try karo.');
          },
        },
      });
      rzp.on('payment.failed', function (resp) {
        console.warn('Payment failed:', resp && resp.error && resp.error.description);
      });
      rzp.open();
    });
  }

  function showDemoPay(order) {
    setBusy(false);
    $('#modalFoot').hidden = true;
    $('#modalTitle').textContent = 'Demo payment';
    $('#modalSub').textContent = 'Order ' + order.orderNo;
    $('#formBody').innerHTML =
      '<div class="pay-screen">' +
      '<div class="demo-box">' + I.svg('sparkles') + '<span><b>Demo mode.</b> Order <b>' + esc(order.orderNo) + '</b> is saved in the dashboard as <b>unpaid</b>. ' +
      'Click below to simulate a successful payment. Add Razorpay keys in <code>.env</code> to take real payments.</span></div>' +
      '<div class="sum-total"><span>Amount</span><b>' + inr(order.amount) + '</b></div>' +
      '<button type="button" class="btn btn-green btn-lg btn-block" id="demoPayBtn">' + I.svg('check') + ' Simulate successful payment</button>' +
      '<button type="button" class="btn btn-ghost btn-block" id="demoBack">← Edit details</button></div>';
    $('#demoPayBtn').addEventListener('click', function () {
      this.disabled = true; this.innerHTML = '<span class="spinner"></span> Processing…';
      api('/api/orders/' + order.id + '/demo-pay', { method: 'POST', body: { token: order.token } })
        .then(function () { showSuccess(order); })
        .catch(function (err) { renderForm(); showError(err.message); });
    });
    $('#demoBack').addEventListener('click', function () { renderForm(); });
  }

  function showSuccess(order) {
    var s = state.cfg.settings;
    var rf = recipientField();
    var name = rf ? state.answers[rf.key] : '';
    var hasEmail = !!customer().email;
    state.done = true;
    setBusy(false);
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    state.answers = {}; state.errors = {};
    $('#progressBar').style.width = '100%';
    $('#modalFoot').hidden = true;
    $('#modalTitle').textContent = 'Payment successful';
    $('#modalSub').textContent = 'Order ' + order.orderNo;
    $('#formBody').innerHTML =
      '<div class="done"><div class="done-ic">' + I.svg('check') + '</div><h3>Order confirmed!</h3>' +
      '<div class="order-no">' + esc(order.orderNo) + '</div>' +
      '<p class="muted">' + (name ? esc(name) + ' ka gaana ban raha hai.<br/>' : '') +
      'Aapka gaana <b>' + esc(s.deliveryPromise || '30 min') + '</b> mein WhatsApp' + (hasEmail ? ' &amp; email' : '') + ' pe aa jayega.</p>' +
      '<ul class="done-steps"><li>' + I.svg('check') + 'Payment received</li><li>' + I.svg('pen') + 'Lyrics being written</li><li>' + I.svg('message') + 'Delivery on WhatsApp</li></ul>' +
      (s.whatsappNumber ? '<a class="btn btn-green" target="_blank" rel="noopener" href="https://wa.me/' + esc(s.whatsappNumber.replace(/\D/g, '')) +
        '?text=' + encodeURIComponent('Hi! My order number is ' + order.orderNo) + '">' + I.svg('message') + ' Chat with us on WhatsApp</a>' : '') +
      '<p class="tiny">Please save your order number.</p></div>';
  }

  function setupModal() {
    $('#orderForm').addEventListener('submit', onSubmit);
    $$('[data-close]').forEach(function (el) { el.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#orderModal').hidden) closeModal(); });

    var body = $('#formBody');
    // Chips
    body.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var group = chip.parentElement, key = group.getAttribute('data-key'), val = chip.getAttribute('data-val');
      if (group.getAttribute('data-multi') === '1') {
        var arr = Array.isArray(state.answers[key]) ? state.answers[key].slice() : [];
        var i = arr.indexOf(val);
        if (i > -1) arr.splice(i, 1); else arr.push(val);
        state.answers[key] = arr;
        chip.classList.toggle('on');
      } else {
        state.answers[key] = val;
        $$('.chip', group).forEach(function (c) { c.classList.toggle('on', c === chip); });
      }
      onAnswerChanged(key);
    });
    // Text inputs / selects
    var onInput = function (e) {
      var el = e.target.closest('[data-key]');
      if (!el || el.classList.contains('chips')) return;
      var key = el.getAttribute('data-key');
      state.answers[key] = el.value;
      onAnswerChanged(key);
    };
    body.addEventListener('input', onInput);
    body.addEventListener('change', onInput);
    // Validate a field when leaving it
    body.addEventListener('focusout', function (e) {
      var el = e.target.closest('[data-key]');
      if (!el || el.classList.contains('chips') || !el.value) return;
      var f = state.fields.find(function (x) { return x.key === el.getAttribute('data-key'); });
      if (f) setFieldError(f.key, validateField(f));
    });

    $$('[data-open-form]').forEach(function (b) {
      b.addEventListener('click', function () { openModal(b.getAttribute('data-prefill')); });
    });
  }

  // Bottom "Create Their Song" bar: slides in once the hero (with its own button) is scrolled past, stays till the end
  function setupStickyCta() {
    var bar = $('#stickyCta');
    if (!bar || !('IntersectionObserver' in window)) { if (bar) bar.classList.add('show'); return; }
    new IntersectionObserver(function (es) { bar.classList.toggle('show', !es[0].isIntersecting); }).observe($('.hero'));
  }

  function onAnswerChanged(key) {
    state.order = null; // details changed → a fresh order is created on Pay
    if (state.errors[key]) {
      var f = state.fields.find(function (x) { return x.key === key; });
      setFieldError(key, f ? validateField(f) : '');
    }
    var rf = recipientField();
    if (rf && key === rf.key) $$('.js-name-input').forEach(function (h) { h.value = state.answers[key]; });
    saveDraft();
    updateProgress();
  }

  // ================= INIT =================
  api('/api/config').then(function (cfg) {
    state.cfg = cfg;
    state.fields = cfg.fields;
    renderPage();
    buildSections();
    setupHeroName();
    setupModal();
    setupStickyCta();
    I.hydrate();
  }).catch(function () {
    $$('[data-open-form]').forEach(function (b) {
      b.addEventListener('click', function () { alert('Site is loading, please refresh the page.'); });
    });
  });
})();
