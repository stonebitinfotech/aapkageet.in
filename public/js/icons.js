// Inline SVG icon set (24×24, stroke = currentColor) + keyword matching for form options.
(function () {
  'use strict';
  var P = {
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/><path d="M7 4h.01M12 4h.01M17 4h.01"/>',
    gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
    rings: '<circle cx="9" cy="14" r="6"/><circle cx="15" cy="14" r="6"/><path d="m10 3 2 3 2-3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 19s-2.5-1.5-2.5-3a1.3 1.3 0 0 1 2.5-.5 1.3 1.3 0 0 1 2.5.5c0 1.5-2.5 3-2.5 3Z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M19 3v4M21 5h-4"/>',
    flower: '<circle cx="12" cy="7.5" r="3"/><circle cx="16.5" cy="12" r="3"/><circle cx="12" cy="16.5" r="3"/><circle cx="7.5" cy="12" r="3"/><circle cx="12" cy="12" r="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V21H3Z"/><path d="M12 18s-3-1.8-3-3.6A1.6 1.6 0 0 1 12 14a1.6 1.6 0 0 1 3 .4c0 1.8-3 3.6-3 3.6Z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1Z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    bank: '<path d="M3 21h18"/><path d="M5 21V11M9.5 21V11M14.5 21V11M19 21V11"/><path d="M2 10 12 3l10 7Z"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2Z"/><path d="M8 9h8M8 13h6"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    party: '<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="m22 2-2.2.8a2.8 2.8 0 0 0-1.9 3.2c.1.9-.6 1.8-1.6 1.8H16"/><path d="m22 13-.8-.3a2.8 2.8 0 0 0-3.3 1.3c-.5.8-1.4 1.1-2.2.8"/><path d="m11 2 .3.8a2.8 2.8 0 0 1-1.3 3.3c-.8.5-1.1 1.4-.8 2.2"/><path d="M11 13c1.9 1.9 2.8 4.2 2 5-.8.8-3.1-.1-5-2s-2.8-4.2-2-5c.8-.8 3.1.1 5 2Z"/>',
    rain: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  };

  function svg(name, cls) {
    var p = P[name];
    if (!p) return '';
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  // Option text → icon (works for options added later in the dashboard too)
  var RULES = [
    [/wife|husband|girl ?friend|boy ?friend|partner|valentine|romantic|love|pyaar/i, 'heart'],
    [/mumm|maa\b|mom|mother|papa|dad|father|parent/i, 'home'],
    [/friend|dost|bhai|behen|sibling|brother|sister/i, 'users'],
    [/someone|other|koi aur/i, 'userPlus'],
    [/birthday|b'?day|janamdin/i, 'cake'],
    [/anniversary/i, 'calendar'],
    [/propos/i, 'gem'],
    [/wedding|shaadi|sangeet|marriage/i, 'rings'],
    [/karwa|chauth|moon|eid/i, 'moon'],
    [/rakhi|raksha|diwali|festival|gift/i, 'gift'],
    [/sorry|manana|apolog/i, 'flower'],
    [/just because|surprise|aise hi/i, 'sparkles'],
    [/female voice|male voice|voice|awaaz/i, 'mic'],
    [/sad|emotional/i, 'rain'],
    [/rap|hip/i, 'mic'],
    [/lo-?fi|chill/i, 'headphones'],
    [/party|dance/i, 'party'],
    [/sufi|devotional|bhajan/i, 'sun'],
    [/long distance/i, 'plane'],
  ];
  function forOption(text, field) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(text)) return RULES[i][1];
    if (field && /style|genre|music/i.test(field.key + ' ' + field.label)) return 'music';
    return '';
  }

  function forSection(title) {
    if (/kiske|who|for whom|recipient/i.test(title)) return 'gift';
    if (/kahani|story|memor/i.test(title)) return 'book';
    if (/vibe|music|style|song|gaan/i.test(title)) return 'music';
    if (/deliver|contact|whatsapp|details/i.test(title)) return 'phone';
    return 'sparkles';
  }

  function forInput(field) {
    if (field.type === 'tel') return 'message';
    if (field.type === 'email') return 'mail';
    if (field.type === 'date') return 'calendar';
    if (field.role === 'recipient_name') return 'heart';
    if (field.role === 'customer_name') return 'user';
    if (field.type === 'select' && /lang|bhasha/i.test(field.key + field.label)) return 'globe';
    return '';
  }

  // Replace <span data-icon="name"> placeholders in the page
  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      if (!el.firstElementChild) el.innerHTML = svg(el.getAttribute('data-icon'));
    });
  }

  window.Icons = { svg: svg, forOption: forOption, forSection: forSection, forInput: forInput, hydrate: hydrate };
  if (document.readyState !== 'loading') hydrate(); else document.addEventListener('DOMContentLoaded', function () { hydrate(); });
})();
