/* Lesson Shuffle card site: shared interactions. No dependencies. */
(function () {
  'use strict';
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };
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

  /* ---------- run-it mode ---------- */
  var runOv = $('#runit');
  if (runOv && data && data.steps && data.steps.length) {
    var i = 0, steps = data.steps;
    var rTitle = $('.r-title', runOv), rWhen = $('.r-when', runOv), rBody = $('.r-body', runOv), rCount = $('.r-count', runOv);
    var rDots = $('.r-dots', runOv), rTimer = $('.r-timer', runOv), rTime = $('.r-time', runOv), rGo = $('.r-go', runOv);
    steps.forEach(function (_, k) { rDots.appendChild(el('span', { 'aria-hidden': 'true' })); });
    var rcd = Countdown(function (left, total, running) {
      rTime.textContent = fmt(left); rGo.textContent = running ? 'Pause' : 'Start ' + fmt(total);
      runOv.classList.toggle('done', left <= 0 && total > 0);
    }, function () { chime(); });
    function show(k) {
      i = Math.max(0, Math.min(steps.length - 1, k));
      var s = steps[i];
      rCount.textContent = (s.phase ? s.phase + ' · ' : '') + 'Step ' + (i + 1) + ' of ' + steps.length;
      rTitle.innerHTML = s.title; rWhen.textContent = s.when || '';
      rBody.innerHTML = (s.text ? '<p>' + s.text + '</p>' : '') + (s.says || []).map(function (q) { return '<p class="r-say">' + q + '</p>'; }).join('') + (s.sub ? s.sub : '');
      $$('span', rDots).forEach(function (d, k2) { d.className = k2 === i ? 'on' : (k2 < i ? 'past' : ''); });
      rcd.stop();
      if (s.secs) { rTimer.hidden = false; rcd.set(s.secs); } else { rTimer.hidden = true; }
      $('.r-prev', runOv).disabled = i === 0;
      $('.r-next', runOv).textContent = i === steps.length - 1 ? 'Finish' : 'Next';
    }
    rGo.addEventListener('click', function () { rcd.toggle(); });
    $('.r-prev', runOv).addEventListener('click', function () { show(i - 1); });
    $('.r-next', runOv).addEventListener('click', function () { if (i === steps.length - 1) { rcd.stop(); closeOverlay(runOv); } else show(i + 1); });
    $$('[data-open-run]').forEach(function (b) { b.addEventListener('click', function () { show(0); openOverlay(runOv); }); });
    $('.ov-close', runOv).addEventListener('click', function () { rcd.stop(); closeOverlay(runOv); });
    runOv.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { rcd.stop(); closeOverlay(runOv); }
      else if (e.key === 'ArrowRight') show(i + 1);
      else if (e.key === 'ArrowLeft') show(i - 1);
    });
    var fsBtn = $('.r-fs', runOv);
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
      $('.d-idx', dealt).textContent = c.suitName + ' · ' + c.idx;
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
