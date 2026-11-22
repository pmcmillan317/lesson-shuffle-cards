/* Lesson Shuffle card site: shared interactions. No dependencies. */
(function () {
  'use strict';
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };
  /* ---------- offline support ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fmt(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }

  /* ---------- chime ---------- */
  var audioCtx = null;
  function chime() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.28, 0.56].forEach(function (t, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = [880, 988, 1175][i];
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.5);
        o.connect(g); g.connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.55);
      });
    } catch (e) {}
  }

  /* ---------- countdown engine ---------- */
  function Countdown(onTick, onDone) {
    var total = 0, left = 0, running = false, last = 0, raf = 0;
    function loop(ts) {
      if (!running) return;
      if (last) left -= (ts - last) / 1000;
      last = ts;
      if (left <= 0) { left = 0; running = false; onTick(left, total, running); onDone(); return; }
      onTick(left, total, running);
      raf = requestAnimationFrame(loop);
    }
    return {
      set: function (sec) { total = left = sec; running = false; cancelAnimationFrame(raf); onTick(left, total, running); },
      add: function (sec) { left += sec; total = Math.max(total, left); onTick(left, total, running); },
      toggle: function () {
        if (left <= 0) return;
        running = !running; last = 0;
        if (running) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf);
        onTick(left, total, running);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      reset: function () { this.set(total); },
      get running() { return running; }
    };
  }

  /* ---------- overlay helper ---------- */
  var lastFocus = null;
  function openOverlay(ov) {
    lastFocus = document.activeElement;
    ov.hidden = false; document.documentElement.classList.add('no-scroll');
    var f = ov.querySelector('[data-autofocus]') || ov.querySelector('button'); if (f) f.focus();
  }
  function closeOverlay(ov) {
    ov.hidden = true; document.documentElement.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }

  var data = null;
  var dn = $('#card-data');
  if (dn) { try { data = JSON.parse(dn.textContent); } catch (e) { data = null; } }

  /* ---------- timer overlay ---------- */
  var timerOv = $('#timer');
  if (timerOv) {
    var tDisplay = $('.t-display', timerOv), tRing = $('.t-ring-fg', timerOv), tGo = $('.t-go', timerOv);
    var C = 2 * Math.PI * 54;
    var cd = Countdown(function (left, total, running) {
      tDisplay.textContent = fmt(left);
      tRing.style.strokeDasharray = C; tRing.style.strokeDashoffset = total ? C * (1 - left / total) : 0;
      tGo.textContent = running ? 'Pause' : (left > 0 && left < total ? 'Resume' : 'Start');
      timerOv.classList.toggle('done', left <= 0 && total > 0);
    }, function () { chime(); });
    $$('[data-preset]', timerOv).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-preset]', timerOv).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true'); cd.set(+b.dataset.preset);
      });
    });
    tGo.addEventListener('click', function () { cd.toggle(); });
    $('.t-plus', timerOv).addEventListener('click', function () { cd.add(60); });
    $('.t-reset', timerOv).addEventListener('click', function () { cd.reset(); });
    $$('[data-open-timer]').forEach(function (b) {
      b.addEventListener('click', function () {
        var first = $('[data-preset]', timerOv); if (first && !timerOv.dataset.init) { first.click(); timerOv.dataset.init = '1'; }
        openOverlay(timerOv);
      });
    });
    $('.ov-close', timerOv).addEventListener('click', function () { cd.stop(); closeOverlay(timerOv); });
    timerOv.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { cd.stop(); closeOverlay(timerOv); }
      if (e.key === ' ' && e.target === timerOv) { e.preventDefault(); cd.toggle(); }
    });
  }

  /* ---------- class slides (student-facing) ---------- */
  var runOv = $('#runit');
  if (runOv && data && data.slides && data.slides.length) {
    var i = 0, deck = [], fields = data.fields || [], fkey = 'ls-f-' + data.slug + '-';
    var rTitle = $('.r-title', runOv), rWhen = $('.r-when', runOv), rBody = $('.r-body', runOv), rCount = $('.r-count', runOv);
    var rDots = $('.r-dots', runOv), rTimer = $('.r-timer', runOv), rTime = $('.r-time', runOv), rGo = $('.r-go', runOv);
    var rPrev = $('.r-prev', runOv), rNext = $('.r-next', runOv), rFoot = $('.r-foot', runOv);
    var editBtn = null, setupOn = false;
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function val(f) {
      var v = store.get(fkey + f.key);
      if (v == null) v = f.kind === 'table' ? '[]' : (f.default || '');
      if (f.kind === 'table') { try { return JSON.parse(v) || []; } catch (e) { return []; } }
      return v;
    }
    function fieldOf(k) { return fields.filter(function (f) { return f.key === k; })[0]; }
    function lines(t) { return String(t || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
    function fill(t, vars) {
      var miss = false;
      var out = t.replace(/\{([\w]+)(?:\|([^}]*))?\}/g, function (_, k, fb) {
        var v = vars[k];
        if (v == null) { var f = fieldOf(k); v = f ? val(f) : ''; }
        v = typeof v === 'string' ? v.trim() : v;
        if (!v) { if (fb != null) return esc(fb); miss = true; return ''; }
        return esc(v);
      });
      return miss ? null : out;
    }
    function showField(k, vars, col) {
      if (k === '_item') return vars._item ? '<p class="r-show">' + esc(vars._item) + '</p>' : '';
      var f = fieldOf(k); if (!f) return '';
      var v = val(f);
      if (f.kind === 'table') {
        var rows = v.filter(function (r) { return r && r[0]; });
        if (!rows.length) return '';
        var ci = col ? f.cols.map(function (c) { return c[0]; }).indexOf(col) : 0;
        return '<ul class="r-chips">' + rows.map(function (r) { return '<li>' + esc(r[ci] || '') + '</li>'; }).join('') + '</ul>';
      }
      var ls = lines(v); if (!ls.length) return '';
      if (f.kind === 'lines' && ls.length > 1) return '<ol class="r-list">' + ls.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
      return '<p class="r-show">' + ls.map(esc).join('<br>') + '</p>';
    }
    function render(item, vars) {
      if (typeof item === 'string') {
        if (item.charAt(0) === '@') return showField(item.slice(1), vars);
        if (item.charAt(0) === '!') { var b = fill(item.slice(1), vars); return b ? '<p class="r-show">' + b + '</p>' : ''; }
        var t = fill(item, vars); return t ? '<p>' + t + '</p>' : '';
      }
      if (item.list) {
        var li = item.list.map(function (x) { return fill(x, vars); }).filter(function (x) { return x && !/^[A-Z]\.\s*$/.test(x); });
        return li.length ? '<ul class="r-ul">' + li.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '';
      }
      if (item.show) {
        var h = showField(item.show, vars, item.col);
        return h ? (item.label ? '<p class="r-lab">' + esc(item.label) + '</p>' : '') + h : '';
      }
      return '';
    }
    function build() {
      deck = [];
      var groups = [];
      data.slides.forEach(function (s) {
        var g = groups[groups.length - 1];
        if (s.each && g && g.each === s.each) g.items.push(s); else groups.push({ each: s.each, items: [s] });
      });
      groups.forEach(function (g) {
        var sets = [{}];
        if (g.each) {
          var f = fieldOf(g.each), v = val(f);
          if (f.kind === 'table') {
            sets = v.filter(function (r) { return r && r[0]; }).map(function (r, n) {
              var o = { n: String(n + 1) }; f.cols.forEach(function (c, ci) { o[c[0]] = r[ci] || ''; }); return o;
            });
          } else sets = lines(v).map(function (x, n) { return { _item: x, n: String(n + 1) }; });
        }
        sets.forEach(function (vars) { g.items.forEach(function (s) {
          if (s.need) { var nv = vars[s.need] != null ? vars[s.need] : (fieldOf(s.need) ? val(fieldOf(s.need)) : ''); if (!String(nv).trim()) return; }
          var body = s.body.map(function (b) { return render(b, vars); }).join('');
          deck.push({ h: fill(s.h, vars) || '', body: body, secs: s.secs, jump: s.jump });
        }); });
      });
      rDots.innerHTML = '';
      deck.forEach(function (_, k) {
        var d = el('button', { type: 'button', 'aria-label': 'Go to slide ' + (k + 1) });
        d.addEventListener('click', function () { show(k); });
        rDots.appendChild(d);
      });
    }
    var rcd = Countdown(function (left, total, running) {
      rTime.textContent = fmt(left); rGo.textContent = running ? 'Pause' : 'Start ' + fmt(total);
      runOv.classList.toggle('done', left <= 0 && total > 0);
    }, function () { chime(); });
    function show(k) {
      setupOn = false; runOv.classList.remove('setup'); rFoot.hidden = false;
      i = Math.max(0, Math.min(deck.length - 1, k));
      var s = deck[i];
      rCount.textContent = (i + 1) + ' / ' + deck.length;
      rWhen.textContent = '';
      rTitle.innerHTML = s.h; rBody.innerHTML = s.body;
      $$('button', rDots).forEach(function (d, k2) { d.className = k2 === i ? 'on' : (k2 < i ? 'past' : ''); });
      rcd.stop();
      if (s.secs) { rTimer.hidden = false; rcd.set(s.secs); } else { rTimer.hidden = true; }
      rPrev.disabled = i === 0;
      rNext.textContent = i === deck.length - 1 ? 'Finish' : 'Next';
    }
    function setup() {
      setupOn = true; rcd.stop(); runOv.classList.add('setup'); rFoot.hidden = true; rTimer.hidden = true;
      rCount.textContent = 'Set up';
      rWhen.textContent = 'Only you see this screen';
      rTitle.textContent = 'Add your content';
      var h = '<p class="r-note">Type what students should see. It saves on this device, so it will be here when you come back.</p>';
      fields.forEach(function (f) {
        var id = 'rf-' + f.key;
        if (f.kind === 'table') {
          var v = val(f), rows = [];
          for (var r = 0; r < (f.rows || 5); r++) {
            rows.push('<tr>' + f.cols.map(function (c, ci) {
              return '<td><input data-t="' + f.key + '" data-r="' + r + '" data-c="' + ci + '" aria-label="' + esc(c[1]) + ' ' + (r + 1) + '" value="' + esc((v[r] || [])[ci] || '') + '"></td>';
            }).join('') + '</tr>');
          }
          h += '<fieldset class="r-f"><legend>' + esc(f.label) + '</legend><div class="r-tw"><table class="r-tab"><thead><tr>' +
            f.cols.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div></fieldset>';
        } else {
          var tag = f.kind === 'lines' ? '<textarea rows="3"' : '<input';
          h += '<label class="r-f" for="' + id + '"><span>' + esc(f.label) + '</span>' + tag + ' id="' + id + '" data-k="' + f.key + '" placeholder="' + esc(f.ph || '') + '"' +
            (f.kind === 'lines' ? '>' + esc(val(f)) + '</textarea>' : ' value="' + esc(val(f)) + '">') + '</label>';
        }
      });
      h += '<div class="r-share"><button type="button" class="btn-ghost" data-share-setup>Copy setup link</button><span class="r-share-msg muted" aria-live="polite">Opens these slides with your content on any device.</span></div>';
      h += '<div class="r-starts"><button type="button" class="btn-main" data-go="0">Start slides</button>';
      build();
      deck.forEach(function (s, k) { if (s.jump) h += '<button type="button" class="btn-ghost" data-go="' + k + '">Jump to: ' + esc(s.jump) + '</button>'; });
      h += '</div>';
      rBody.innerHTML = h;
      $$('[data-k]', rBody).forEach(function (inp) { inp.addEventListener('input', function () { store.set(fkey + inp.dataset.k, inp.value); }); });
      $$('[data-t]', rBody).forEach(function (inp) {
        inp.addEventListener('input', function () {
          var f = fieldOf(inp.dataset.t), v = val(f);
          var r = +inp.dataset.r, c = +inp.dataset.c;
          while (v.length <= r) v.push([]);
          v[r][c] = inp.value; store.set(fkey + f.key, JSON.stringify(v));
        });
      });
      $$('[data-go]', rBody).forEach(function (b) { b.addEventListener('click', function () { build(); show(+b.dataset.go); }); });
      var sh = $('[data-share-setup]', rBody);
      if (sh) sh.addEventListener('click', function () {
        var o = {};
        fields.forEach(function (f) { var v = store.get(fkey + f.key); if (v != null && v !== '' && v !== '[]') o[f.key] = v; });
        var enc = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        var url = location.origin + location.pathname.replace(/\.html$/, '') + '#setup=' + enc;
        var msg = $('.r-share-msg', rBody);
        var ok = function () { sh.textContent = 'Link copied'; msg.textContent = 'Paste it in an email, Classroom post or doc to open these slides anywhere.'; setTimeout(function () { sh.textContent = 'Copy setup link'; }, 2000); };
        try { navigator.clipboard.writeText(url).then(ok, function () { window.prompt('Copy this link:', url); }); } catch (e) { window.prompt('Copy this link:', url); }
      });
      var first = $('input,textarea', rBody); if (first) first.focus();
    }
    var hm = /#setup=([A-Za-z0-9_-]+)/.exec(location.hash || '');
    if (hm && fields.length) {
      try {
        var b64 = hm[1].replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
        var got = JSON.parse(decodeURIComponent(escape(atob(b64))));
        fields.forEach(function (f) { if (typeof got[f.key] === 'string') store.set(fkey + f.key, got[f.key]); });
        history.replaceState(null, '', location.pathname);
        setTimeout(function () { build(); openOverlay(runOv); setup(); var m = $('.r-note', rBody); if (m) m.textContent = 'Content loaded from your setup link and saved on this device. Check it, then start.'; }, 0);
      } catch (e) {}
    }
    if (fields.length) {
      editBtn = el('button', { type: 'button', 'class': 'r-fs r-edit' }, 'Edit content');
      editBtn.addEventListener('click', setup);
      $('.r-sp', runOv).after(editBtn);
    }
    rGo.addEventListener('click', function () { rcd.toggle(); });
    rPrev.addEventListener('click', function () { show(i - 1); });
    rNext.addEventListener('click', function () { if (i === deck.length - 1) { rcd.stop(); closeOverlay(runOv); } else show(i + 1); });
    $$('[data-open-run]').forEach(function (b) {
      b.addEventListener('click', function () { build(); openOverlay(runOv); if (fields.length) setup(); else show(0); });
    });
    $('.ov-close', runOv).addEventListener('click', function () { rcd.stop(); closeOverlay(runOv); });
    runOv.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { rcd.stop(); closeOverlay(runOv); return; }
      if (setupOn || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') show(i + 1);
      else if (e.key === 'ArrowLeft') show(i - 1);
    });
    var fsBtn = $('.r-fs:not(.r-edit)', runOv);
    if (fsBtn) {
      if (!document.fullscreenEnabled) fsBtn.hidden = true;
      fsBtn.addEventListener('click', function () {
        try { if (document.fullscreenElement) document.exitFullscreen(); else runOv.requestFullscreen(); } catch (e) {}
      });
    }
  }

  /* ---------- grade tabs ---------- */
  $$('.tabs').forEach(function (box) {
    var btns = $$('[role=tab]', box), panels = $$('[role=tabpanel]', box);
    function pick(b) {
      btns.forEach(function (x) { var on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) { p.hidden = p.id !== b.getAttribute('aria-controls'); });
      store.set('ls-band', b.dataset.band || '');
    }
    btns.forEach(function (b, k) {
      b.addEventListener('click', function () { pick(b); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); var n = btns[(k + d + btns.length) % btns.length]; n.focus(); pick(n); }
      });
    });
    var saved = store.get('ls-band'); var pre = btns.filter(function (b) { return b.dataset.band === saved; })[0];
    pick(pre || btns[0]);
  });

  /* ---------- tried + notes ---------- */
  var tried = $('#tried');
  if (tried && data) {
    var key = 'ls-tried-' + data.slug, nkey = 'ls-note-' + data.slug;
    var box = $('input', tried), stamp = $('.tried-date', tried), note = $('#note'), saved = $('.note-saved');
    function paint() { var v = store.get(key); box.checked = !!v; stamp.textContent = v ? 'Tried ' + new Date(v).toLocaleDateString() : ''; }
    box.addEventListener('change', function () { if (box.checked) store.set(key, new Date().toISOString()); else store.del(key); paint(); });
    paint();
    if (note) {
      note.value = store.get(nkey) || '';
      var tmr = 0;
      note.addEventListener('input', function () {
        clearTimeout(tmr); tmr = setTimeout(function () { store.set(nkey, note.value); if (saved) { saved.textContent = 'Saved on this device'; } }, 400);
      });
    }
  }


  /* ---------- copy prompt buttons ---------- */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = $('.prompt-t', b.closest('.prompt'));
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); };
      try { navigator.clipboard.writeText(t.textContent).then(done, function () {}); } catch (e) {}
    });
  });
  /* ---------- print + copy link ---------- */
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = location.origin + location.pathname.replace(/\.html$/, '');
      if (navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(url).then(function () { b.textContent = 'Link copied'; setTimeout(function () { b.textContent = 'Share'; }, 1600); }); } catch (e) {}
    });
  });

  /* ---------- index: search, filters, card browser (fan or grid) and the shuffle table ---------- */
  var deck = $('#deck-data');
  if (deck) {
    var cards = []; try { cards = JSON.parse(deck.textContent); } catch (e) {}
    var bySlug = {}; cards.forEach(function (c) { bySlug[c.slug] = c; });
    var q = $('#q'), count = $('#count'), list = $('#cards'), none = $('#none');
    var items = $$('li[data-slug]', list), dividers = $$('li.divider', list);
    var state = { suit: '', quick: false, noprep: false, strong: false, tried: false };
    var reduced = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
    items.forEach(function (li) { if (store.get('ls-tried-' + li.dataset.slug)) li.classList.add('is-tried'); });

    /* The fanned hand: cards overlap, the one in the middle comes forward, the rest tilt away from it like cards held in a hand. */
    var fan = (function () {
      var rail = $('#rail'), knob = $('.rail-knob', rail), pos = $('#pos'), cap = $('#hand-cap');
      var prev = $('#prev'), next = $('#next');
      var active = null, hoverLi = null, raf = 0, dragging = false, down = false, railDown = false, dx0 = 0, sl0 = 0;
      var touchy = window.matchMedia('(hover: none)');
      /* Browsers that can tie an animation to scrolling (Chrome, Edge, Safari 26) tilt and raise the cards from CSS, on the compositor,
         so dragging stays smooth. Other browsers (and people who ask for reduced motion) get the same look from this script. */
      var native = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) && !reduced();
      var fanOn = false, lis = [], centers = [], pitch = 1, vw = 0, maxScroll = 0, lastKnob = -1, lastPos = '', lastPrev = null, lastNext = null;
      if (!native) list.classList.add('jsfan');
      function isFan() { return getComputedStyle(list).display === 'flex'; }
      function shown() { return $$('li:not([hidden])', list); }
      function isDiv(li) { return li.classList.contains('divider'); }
      /* Read every card's position once (not on every scroll frame), so scrolling never forces a layout. */
      function measure() {
        fanOn = isFan(); lis = shown(); centers = [];
        if (!fanOn || !lis.length) return;
        centers = lis.map(function (li) { return li.offsetLeft + li.offsetWidth / 2; });
        pitch = lis.length > 1 ? Math.abs(centers[1] - centers[0]) : lis[0].offsetWidth;
        vw = list.clientWidth; maxScroll = Math.max(0, list.scrollWidth - vw);
      }
      function goTo(li, instant) {
        if (!li) return;
        var max = list.scrollWidth - list.clientWidth;
        var left = Math.max(0, Math.min(max, li.offsetLeft + li.offsetWidth / 2 - list.clientWidth / 2));
        list.scrollTo({ left: left, behavior: instant || reduced() ? 'auto' : 'smooth' });
      }
      function showCap(li) {
        if (!li || !fanOn) return;
        cap.style.setProperty('--suit', li.style.getPropertyValue('--suit'));
        cap.style.setProperty('--title', li.style.getPropertyValue('--title'));
        cap.classList.remove('sB', 'sG', 'sY', 'sR'); if (li.dataset.suit) cap.classList.add('s' + li.dataset.suit);
        var s = $('.hc-suit', cap), n = $('.hc-nm', cap), t = $('.hc-tg', cap), m = $('.hc-meta', cap);
        if (isDiv(li)) {
          var k = li.dataset.suit, c = cards.filter(function (x) { return x.suit === k; })[0];
          var have = items.filter(function (x) { return x.dataset.suit === k && !x.hidden; }).length;
          s.textContent = 'Suit'; n.textContent = c ? c.suitName : ''; t.textContent = have + (have === 1 ? ' card' : ' cards') + ' in this suit.'; m.textContent = 'Flip on to meet them.';
        } else {
          var cd = bySlug[li.dataset.slug];
          s.textContent = cd ? cd.suitName : ''; n.textContent = cd ? cd.card : ''; t.textContent = cd ? cd.tagline : '';
          m.textContent = [li.dataset.time, li.dataset.noprep === '1' ? 'No prep' : '', li.dataset.ev, li.classList.contains('is-tried') ? 'Tried' : ''].filter(Boolean).join(' · ');
        }
      }
      /* Script fallback: tilt, enlarge and stack one card from its distance d (in card slots) from the middle. Cards nearer the middle sit on top, on both sides. */
      function place(li, d) {
        var fx = li.firstElementChild; if (!fx) return;
        if (d > 7.5) d = 7.5; else if (d < -7.5) d = -7.5;
        var ad = d < 0 ? -d : d, r = (d > 6 ? 6 : d < -6 ? -6 : d) * 4.2, s = 1 + (ad < 1 ? 1 - ad : 0) * 0.12;
        var key = r.toFixed(2) + '|' + s.toFixed(3);
        if (li._k === key) return;
        li._k = key;
        fx.style.transform = 'rotate(' + r.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
        fx.style.zIndex = 1000 - Math.round(ad * 20);
      }
      /* Load the cards next to the front one ahead of time, so flicking through never shows empty faces. */
      function warm(idx) {
        for (var k = Math.max(0, idx - 8); k < Math.min(lis.length, idx + 9); k++) { var im = lis[k].querySelector('img'); if (im && im.loading === 'lazy') im.loading = 'eager'; }
      }
      function update() {
        raf = 0;
        if (!fanOn || !lis.length) return;
        var sl = list.scrollLeft, mid = sl + vw / 2, best = 0, bd = 1e9, i, d, ad;
        for (i = 0; i < lis.length; i++) {
          d = (centers[i] - mid) / pitch; ad = d < 0 ? -d : d;
          if (ad < bd) { bd = ad; best = i; }
          if (!native) place(lis[i], d);
        }
        var cur = lis[best];
        if (cur !== active) {
          if (active) active.classList.remove('is-active');
          active = cur; active.classList.add('is-active');
          list.style.setProperty('--glow', active.style.getPropertyValue('--suit'));
          if (!hoverLi) showCap(active);
          warm(best);
          var total = 0, through = 0;
          for (i = 0; i < lis.length; i++) { if (!isDiv(lis[i])) { total++; if (i <= best) through++; } }
          if (isDiv(active)) through++;
          lastPos = Math.min(through, total) + ' / ' + total; pos.textContent = lastPos;
        }
        var k = maxScroll > 0 ? Math.round(sl / maxScroll * 1000) / 10 : 0;
        if (k !== lastKnob) { lastKnob = k; knob.style.left = k + '%'; }
        var pd = sl <= 1, nd = sl >= maxScroll - 1;
        if (pd !== lastPrev) { lastPrev = pd; prev.disabled = pd; }
        if (nd !== lastNext) { lastNext = nd; next.disabled = nd; }
      }
      function schedule() { if (!raf) raf = requestAnimationFrame(update); }
      function step(dir) {
        var i = Math.max(0, lis.indexOf(active));
        goTo(lis[Math.max(0, Math.min(lis.length - 1, i + dir))]);
      }
      function refresh(reset) {
        $$('.is-active', list).forEach(function (li) { li.classList.remove('is-active'); });
        active = null; hoverLi = null; lastPos = ''; lastKnob = -1; lastPrev = lastNext = null;
        measure();
        if (!lis.length) pos.textContent = '';
        if (!fanOn) {
          $$('li', list).forEach(function (li) { var fx = li.firstElementChild; if (fx) { fx.style.transform = ''; fx.style.zIndex = ''; } li._k = null; });
          return;
        }
        if (reset) {
          var first = lis.filter(function (li) { return !isDiv(li); })[0];
          if (first) {
            /* snapping off while the hand is re-centred, or the browser snaps back to a card that is now hidden */
            list.classList.add('nosnap'); goTo(first, true);
            requestAnimationFrame(function () { requestAnimationFrame(function () { list.classList.remove('nosnap'); measure(); update(); }); });
          }
        }
        update();
      }
      list.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', function () { measure(); schedule(); });
      prev.addEventListener('click', function () { step(-1); });
      next.addEventListener('click', function () { step(1); });
      list.addEventListener('keydown', function (e) {
        if (!fanOn || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        var li = e.target.closest && e.target.closest('li'); if (!li) return;
        var links = lis.filter(function (x) { return !isDiv(x); }), i = links.indexOf(li);
        var n = links[i + (e.key === 'ArrowRight' ? 1 : -1)];
        if (i >= 0 && n) { e.preventDefault(); $('a', n).focus(); }
      });
      list.addEventListener('focusin', function (e) { if (!fanOn) return; var li = e.target.closest && e.target.closest('li'); if (li) goTo(li); });
      list.addEventListener('pointerover', function (e) {
        if (e.pointerType !== 'mouse' || down || !fanOn) return;
        var li = e.target.closest && e.target.closest('li');
        if (li && li !== hoverLi) { hoverLi = li; showCap(li); }
      });
      list.addEventListener('pointerleave', function () { hoverLi = null; showCap(active); });
      /* On a touch screen the first tap brings a card to the front; tapping the front card opens it. */
      list.addEventListener('click', function (e) {
        if (dragging) { e.preventDefault(); e.stopPropagation(); return; }
        var a = e.target.closest && e.target.closest('a'); if (!a || !fanOn) return;
        var li = a.parentNode;
        if (li !== active && touchy.matches) { e.preventDefault(); goTo(li); }
      }, true);
      cap.addEventListener('click', function () { var li = hoverLi || active, a = li && $('a', li); if (a) location.href = a.href; });
      /* Drag with a mouse to flip through, like a trackpad swipe. */
      list.addEventListener('pointerdown', function (e) {
        if (!fanOn || e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; dragging = false; dx0 = e.clientX; sl0 = list.scrollLeft;
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - dx0;
        if (!dragging && Math.abs(dx) > 5) { dragging = true; list.classList.add('dragging'); }
        if (dragging) list.scrollLeft = sl0 - dx;
      });
      function dragEnd() {
        if (!down) return; down = false;
        if (dragging) { list.classList.remove('dragging'); update(); goTo(active); setTimeout(function () { dragging = false; }, 0); }
      }
      window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', dragEnd);
      /* Drag the dot along the bar to scrub through the whole deck. */
      function railTo(e) {
        var r = rail.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        list.scrollLeft = f * (list.scrollWidth - list.clientWidth);
      }
      rail.addEventListener('pointerdown', function (e) { railDown = true; rail.setPointerCapture(e.pointerId); list.classList.add('dragging'); railTo(e); });
      rail.addEventListener('pointermove', function (e) { if (railDown) railTo(e); });
      function railEnd() { if (!railDown) return; railDown = false; list.classList.remove('dragging'); update(); goTo(active); }
      rail.addEventListener('pointerup', railEnd); rail.addEventListener('pointercancel', railEnd);
      return { refresh: refresh, isFan: isFan };
    })();

    function apply() {
      var term = (q.value || '').trim().toLowerCase(), shown = 0, perSuit = {};
      items.forEach(function (li) {
        var d = li.dataset, ok = true;
        if (state.suit && d.suit !== state.suit) ok = false;
        if (state.quick && !(+d.mins > 0 && +d.mins <= 5)) ok = false;
        if (state.noprep && d.noprep !== '1') ok = false;
        if (state.strong && d.ev !== 'Strong') ok = false;
        if (state.tried && !li.classList.contains('is-tried')) ok = false;
        if (term && d.search.indexOf(term) < 0) ok = false;
        li.hidden = !ok; if (ok) { shown++; perSuit[d.suit] = (perSuit[d.suit] || 0) + 1; }
      });
      dividers.forEach(function (dv) { var n = perSuit[dv.dataset.suit] || 0; dv.hidden = !n; $('.dv-n', dv).textContent = n + (n === 1 ? ' card' : ' cards'); });
      $$('.rail-seg').forEach(function (seg) { var n = perSuit[seg.dataset.suit] || 0; seg.hidden = !n; seg.style.flexGrow = n + 1; });
      count.textContent = shown + (shown === 1 ? ' card' : ' cards');
      none.hidden = shown > 0;
      fan.refresh(true);
    }
    q.addEventListener('input', apply);
    $$('[data-suit]', $('.filters')).forEach(function (b) {
      b.addEventListener('click', function () {
        state.suit = state.suit === b.dataset.suit ? '' : b.dataset.suit;
        $$('.chip[data-suit]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.suit === state.suit); });
        apply();
      });
    });
    $$('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.dataset.toggle; state[k] = !state[k]; b.setAttribute('aria-pressed', state[k]); apply(); });
    });

    /* Fan or grid */
    function setView(v) {
      document.body.dataset.view = v;
      $$('.viewsw [data-view]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === v); });
      store.set('ls-view', v);
      fan.refresh(true);
    }
    $$('.viewsw [data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
    if (store.get('ls-view') === 'grid') setView('grid');
    else if (!fan.isFan()) $('.viewsw').hidden = true;   /* an old browser that cannot show the fan keeps the grid */

    /* The shuffle table: a deck of card backs is cut, riffled twice, squared up, and the top card is turned over. */
    var table = $('#table'), stage = $('#stage'), dealtBox = $('#dealt'), shuffleBtn = $('#shuffle');
    var againBtn = $('#again'), awayBtn = $('#put-away');
    var N = 14, H = N / 2, STEP = 1.5, order = [], z = [], els = [], busy = false, skipping = false, running = [], wakeups = [], lastSlug = '';
    for (var oi = 0; oi < H; oi++) order.push(oi, H + oi);    /* the order the cards drop in a riffle: one from each half in turn */
    order.forEach(function (id, k) { z[id] = k; });
    var TOP = order[N - 1];
    function tf(x, y, r, s) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(1) + 'deg) scale(' + s + ')'; }
    function pose(p, s) { return tf(p[0], p[1], p[2], s || 1); }
    function stackAt(id) { return [0, -z[id] * STEP, 0]; }
    function pileAt(id, w) { var left = id < H, rank = left ? id : id - H; return [(left ? -1 : 1) * w * 0.62, -rank * STEP * 1.2, left ? -5 : 5]; }
    function dims() { return { w: els[0].offsetWidth, h: els[0].offsetHeight }; }
    function finalScale() { var d = dims(); return Math.max(1, Math.min(stage.clientHeight * 0.92 / d.h, stage.clientWidth * 0.86 / d.w, 2.4)); }
    function wait(ms) { return new Promise(function (res) { var t = setTimeout(res, ms); wakeups.push(function () { clearTimeout(t); res(); }); }); }
    function anim(node, frames, opts) {
      var a = node.animate(frames, opts); running.push(a);
      if (skipping) a.finish();
      return a.finished.catch(function () {});
    }
    function skipNow() { skipping = true; wakeups.splice(0).forEach(function (f) { f(); }); running.forEach(function (a) { try { a.finish(); } catch (e) {} }); }
    function build(c) {
      stage.innerHTML = ''; els = [];
      for (var i = 0; i < N; i++) {
        var sc = el('div', { 'class': 'sc' + (i === TOP ? ' top' : '') });
        sc.style.zIndex = z[i];
        sc.innerHTML = i === TOP
          ? '<div class="flip"><div class="back"></div><div class="front"><img alt="" width="682" height="1170" src="/cards/' + c.slug + '.webp"></div></div>'
          : '<div class="back"></div>';
        sc.style.transform = pose(stackAt(i));
        stage.appendChild(sc); els.push(sc);
      }
      stage.classList.remove('is-dealt');
    }
    /* One card's whole shuffle: split into two piles, riffle together, split again, riffle again. All times in ms. */
    function shuffleFrames(id, w, h) {
      var k = z[id], side = id < H ? -1 : 1, S = stackAt(id), P = pileAt(id, w), jit = ((id * 37) % 7 - 3) * 0.5;
      var M = [side * w * 0.3, P[1] - h * 0.1 - 6, side * 2.5 + jit];
      var out = 'cubic-bezier(.2,.7,.3,1)', inn = 'cubic-bezier(.5,0,.9,.6)', TT = 1800;
      var s1 = 360 + k * 30, s2 = 1330 + k * 20;
      return [
        [0, S, out], [300, P, 'linear'],
        [s1, P, out], [s1 + 120, M, inn], [s1 + 240, S, 'linear'],
        [1040, S, out], [1280, P, 'linear'],
        [s2, P, out], [s2 + 100, M, inn], [s2 + 200, S, 'linear'],
        [TT, S, 'linear']
      ].map(function (f) { return { offset: f[0] / TT, transform: pose(f[1]), easing: f[2] }; });
    }
    function dealTo() {
      var topEl = els[TOP], flip = $('.flip', topEl), d = dims(), S = stackAt(TOP), sc = finalScale();
      var jobs = [
        anim(topEl, [{ transform: pose(S) }, { transform: tf(0, S[1] - d.h * 0.16, -3, 1.1), offset: 0.38 }, { transform: tf(0, 0, 0, sc) }], { duration: 820, easing: 'cubic-bezier(.3,.7,.25,1)', fill: 'forwards' }),
        anim(flip, [{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(180deg)' }], { duration: 640, delay: 140, easing: 'cubic-bezier(.3,.5,.3,1)', fill: 'forwards' })
      ];
      els.forEach(function (e, i) { if (i !== TOP) jobs.push(anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 300, fill: 'forwards' })); });
      return Promise.all(jobs);
    }
    function settle() {    /* freeze the dealt look in plain styles */
      if (!els.length) return;
      running.forEach(function (a) { try { a.cancel(); } catch (e) {} }); running = [];
      var topEl = els[TOP];
      topEl.style.transform = tf(0, 0, 0, finalScale());
      $('.flip', topEl).style.transform = 'perspective(900px) rotateY(180deg)';
      els.forEach(function (e, i) { if (i !== TOP) e.style.opacity = 0; });
      stage.classList.add('is-dealt');
    }
    function putBack() {   /* turn the dealt card face down and slide it back into the deck */
      if (!stage.classList.contains('is-dealt') || !els.length || reduced()) return Promise.resolve();
      stage.classList.remove('is-dealt');
      var topEl = els[TOP], flip = $('.flip', topEl), jobs = [
        anim(topEl, [{ transform: tf(0, 0, 0, finalScale()) }, { transform: pose(stackAt(TOP)) }], { duration: 480, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }),
        anim(flip, [{ transform: 'perspective(900px) rotateY(180deg)' }, { transform: 'perspective(900px) rotateY(0deg)' }], { duration: 440, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })
      ];
      els.forEach(function (e, i) { if (i !== TOP) jobs.push(anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'forwards' })); });
      return Promise.all(jobs);
    }
    function pickCard() {
      var pool = items.filter(function (li) { return !li.hidden; });
      if (!pool.length) pool = items;
      if (pool.length > 1) pool = pool.filter(function (li) { return li.dataset.slug !== lastSlug; });
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function fillInfo(c) {
      dealtBox.style.setProperty('--suit', c.color);
      $('.d-idx', dealtBox).textContent = c.suitName;
      $('.d-name', dealtBox).textContent = c.card;
      $('.d-tag', dealtBox).textContent = c.tagline;
      $('.d-move', dealtBox).textContent = c.move;
      $('.d-go', dealtBox).href = '/' + c.slug;
      var meta = $('.d-meta', dealtBox); meta.innerHTML = '';
      [c.time, c.noprep ? 'No prep' : '', c.ev].filter(Boolean).forEach(function (m) { var s = el('span'); s.textContent = m; meta.appendChild(s); });
    }
    function shuffle() {
      if (busy) { skipNow(); return; }
      var li = pickCard(), c = bySlug[li.dataset.slug];
      if (!c) { location.href = '/' + li.dataset.slug; return; }
      busy = true; skipping = false; lastSlug = c.slug;
      var wasOpen = !table.hidden;
      table.hidden = false;
      dealtBox.classList.remove('is-ready');
      fillInfo(c);
      var r = table.getBoundingClientRect();
      if (!wasOpen || r.top < 40 || r.top > innerHeight * 0.5) table.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      var img = new Image(); img.src = '/cards/' + c.slug + '.webp';
      putBack().then(function () {
        build(c);
        if (reduced()) { settle(); return; }
        return wait(wasOpen ? 80 : 420).then(function () {
          var d = dims();
          return Promise.all(els.map(function (e, id) { return anim(e, shuffleFrames(id, d.w, d.h), { duration: 1800, fill: 'forwards' }); }));
        }).then(function () { return dealTo(); }).then(settle);
      }).catch(function () { try { settle(); } catch (e) {} }).then(function () {
        dealtBox.classList.add('is-ready');
        busy = false; running = [];
        if (document.activeElement === shuffleBtn) $('.d-go', dealtBox).focus({ preventScroll: true });
      });
    }
    function putAway() {
      if (busy) skipNow();
      table.hidden = true; stage.innerHTML = ''; els = []; stage.classList.remove('is-dealt'); dealtBox.classList.remove('is-ready');
      shuffleBtn.focus();
    }
    shuffleBtn.addEventListener('click', shuffle);
    againBtn.addEventListener('click', shuffle);
    awayBtn.addEventListener('click', putAway);
    table.addEventListener('keydown', function (e) { if (e.key === 'Escape') putAway(); });
    stage.addEventListener('click', function () {
      if (busy) skipNow();
      else if (stage.classList.contains('is-dealt') && lastSlug) location.href = '/' + lastSlug;
    });
    window.addEventListener('resize', function () {
      if (stage.classList.contains('is-dealt') && els.length) els[TOP].style.transform = tf(0, 0, 0, finalScale());
    });
    apply();
  }
})();

// Open a collapsed reference section when it is linked to, and before printing
(function () {
  function openFor(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el && el.tagName === 'DETAILS') el.open = true;
    else if (el && el.closest) { var d = el.closest('details'); if (d) d.open = true; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) openFor(a.getAttribute('href'));
  });
  window.addEventListener('hashchange', function () { openFor(location.hash); });
  openFor(location.hash);
  window.addEventListener('beforeprint', function () {
    Array.prototype.forEach.call(document.querySelectorAll('details.more'), function (d) { d.dataset.wasOpen = d.open ? '1' : ''; d.open = true; });
  });
  window.addEventListener('afterprint', function () {
    Array.prototype.forEach.call(document.querySelectorAll('details.more'), function (d) { d.open = d.dataset.wasOpen === '1'; });
  });
})();

// Printed card image: tap to view large (Oct 21)
(function () {
  var a = document.querySelector('[data-cardimg]');
  if (!a || typeof HTMLDialogElement !== 'function') return;
  var d = document.createElement('dialog');
  d.className = 'cardview';
  d.setAttribute('aria-label', a.querySelector('img').alt);
  d.innerHTML = '<button type="button" aria-label="Close">×</button><img alt="">';
  var big = d.querySelector('img');
  big.alt = a.querySelector('img').alt;
  document.body.appendChild(d);
  a.addEventListener('click', function (e) { e.preventDefault(); big.src = a.getAttribute('href'); d.showModal(); });
  d.addEventListener('click', function () { d.close(); });
})();
/* Phone menu (the <details class="hmenu"> works without JavaScript): close it on Escape, on a tap outside, and when focus leaves it, like lessonshuffle.com. */
(function () {
  var menu = document.querySelector('details.hmenu');
  if (!menu) return;
  var button = menu.querySelector('summary');
  menu.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('a'); if (a) menu.removeAttribute('open'); });
  document.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && menu.open) { menu.removeAttribute('open'); if (button) button.focus(); } });
  document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.removeAttribute('open'); });
  menu.addEventListener('focusout', function (e) { if (menu.open && e.relatedTarget && !menu.contains(e.relatedTarget)) menu.removeAttribute('open'); });
})();
