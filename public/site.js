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

  /* ---------- index: search, filters, shuffle, tried marks ---------- */
  var deck = $('#deck-data');
  if (deck) {
    var cards = []; try { cards = JSON.parse(deck.textContent); } catch (e) {}
    var q = $('#q'), count = $('#count'), items = $$('.cards li');
    var state = { suit: '', quick: false, noprep: false, strong: false, tried: false };
    items.forEach(function (li) { if (store.get('ls-tried-' + li.dataset.slug)) li.classList.add('is-tried'); });
    function apply() {
      var term = (q.value || '').trim().toLowerCase(), shown = 0;
      items.forEach(function (li) {
        var d = li.dataset, ok = true;
        if (state.suit && d.suit !== state.suit) ok = false;
        if (state.quick && !(+d.mins > 0 && +d.mins <= 5)) ok = false;
        if (state.noprep && d.noprep !== '1') ok = false;
        if (state.strong && d.ev !== 'Strong') ok = false;
        if (state.tried && !li.classList.contains('is-tried')) ok = false;
        if (term && d.search.indexOf(term) < 0) ok = false;
        li.hidden = !ok; if (ok) shown++;
      });
      $$('.suitblock').forEach(function (s) { s.hidden = !$$('li', s).some(function (li) { return !li.hidden; }); });
      count.textContent = shown + (shown === 1 ? ' card' : ' cards');
    }
    q.addEventListener('input', apply);
    $$('[data-suit]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.suit = state.suit === b.dataset.suit ? '' : b.dataset.suit;
        $$('[data-suit]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.suit === state.suit); });
        apply();
      });
    });
    $$('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.dataset.toggle; state[k] = !state[k]; b.setAttribute('aria-pressed', state[k]); apply(); });
    });
    $('#shuffle').addEventListener('click', function () {
      var pool = items.filter(function (li) { return !li.hidden; });
      if (!pool.length) pool = items;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      var dealt = $('#dealt'), c = cards.filter(function (x) { return x.slug === pick.dataset.slug; })[0];
      if (!c) { location.href = '/' + pick.dataset.slug; return; }
      dealt.hidden = false;
      dealt.style.setProperty('--suit', c.color);
      $('.d-idx', dealt).textContent = c.suitName;
      $('.d-name', dealt).textContent = c.card;
      $('.d-tag', dealt).textContent = c.tagline;
      $('.d-move', dealt).textContent = c.move;
      $('.d-go', dealt).href = '/' + c.slug;
      dealt.classList.remove('flip'); void dealt.offsetWidth; dealt.classList.add('flip');
      $('.d-go', dealt).focus({ preventScroll: true });
      dealt.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
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
