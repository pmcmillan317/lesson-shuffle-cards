/* Lesson Shuffle classroom tools: shared helpers. No dependencies.
   Everything a tool saves stays in this browser (localStorage). Nothing is sent anywhere. */
(function () {
  'use strict';
  var LST = {};

  /* offline support (tool pages don't load site.js) */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  /* ---------- storage (safe in private windows) ---------- */
  LST.get = function (k, fallback) {
    try { var v = window.localStorage.getItem('lst:' + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  };
  LST.set = function (k, v) { try { window.localStorage.setItem('lst:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  LST.del = function (k) { try { window.localStorage.removeItem('lst:' + k); } catch (e) {} };

  /* ---------- small DOM helpers ---------- */
  LST.$ = function (s, r) { return (r || document).querySelector(s); };
  LST.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  LST.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  LST.lines = function (text) { return String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); };
  LST.fmt = function (s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; };
  LST.reduced = function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  LST.rand = function (n) {
    try { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
  };

  /* ---------- screen-reader announcements ---------- */
  var live = null;
  LST.say = function (msg) {
    if (!live) { live = document.createElement('div'); live.className = 'sr'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30);
  };

  /* ---------- sound ---------- */
  var ctx = null;
  function tone(freqs, gap, len, vol) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      freqs.forEach(function (f, i) {
        var t = ctx.currentTime + i * gap, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + len + 0.05);
      });
    } catch (e) {}
  }
  LST.sound = function () { return LST.get('sound', true) !== false; };
  LST.chime = function () { if (LST.sound()) tone([880, 988, 1175], 0.28, 0.5, 0.25); };
  LST.tick = function () { if (LST.sound()) tone([660], 0, 0.08, 0.08); };
  LST.done = function () { if (LST.sound()) tone([1175, 988, 1175, 1568], 0.18, 0.4, 0.25); };

  /* ---------- countdown and count-up engines ---------- */
  /* Countdown keeps time against the wall clock, so it stays right when the tab is in the background.
     requestAnimationFrame draws it; a 250 ms interval keeps it ticking (and chiming) while hidden. */
  LST.Countdown = function (onTick, onDone) {
    var total = 0, left = 0, running = false, endAt = 0, raf = 0, iv = 0;
    function now() { return Date.now(); }
    function step() {
      if (!running) return;
      left = Math.max(0, (endAt - now()) / 1000);
      if (left <= 0) { stopLoops(); running = false; onTick(0, total, false); onDone(); return; }
      onTick(left, total, running);
    }
    function loop() { step(); if (running) raf = requestAnimationFrame(loop); }
    function stopLoops() { cancelAnimationFrame(raf); clearInterval(iv); }
    return {
      set: function (sec, keepTotal) { stopLoops(); running = false; left = sec; total = keepTotal ? Math.max(keepTotal, sec) : sec; onTick(left, total, running); },
      start: function () { if (left <= 0 || running) return; running = true; endAt = now() + left * 1000; stopLoops(); raf = requestAnimationFrame(loop); iv = setInterval(step, 250); onTick(left, total, running); },
      pause: function () { if (running) left = Math.max(0, (endAt - now()) / 1000); running = false; stopLoops(); onTick(left, total, running); },
      toggle: function () { if (running) this.pause(); else this.start(); },
      add: function (sec) { if (running) { endAt += sec * 1000; left = Math.max(0, (endAt - now()) / 1000); } else left = Math.max(0, left + sec); total = Math.max(total, left); onTick(left, total, running); },
      running: function () { return running; },
      left: function () { return running ? Math.max(0, (endAt - now()) / 1000) : left; },
      total: function () { return total; },
      endsAt: function () { return running ? endAt : 0; }
    };
  };
  LST.Stopwatch = function (onTick) {
    var t0 = 0, acc = 0, running = false, raf = 0;
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    function el() { return acc + (running ? (now() - t0) / 1000 : 0); }
    function loop() { if (!running) return; onTick(el(), running); raf = requestAnimationFrame(loop); }
    return {
      start: function () { if (running) return; running = true; t0 = now(); raf = requestAnimationFrame(loop); onTick(el(), running); },
      stop: function () { if (!running) return el(); acc = el(); running = false; cancelAnimationFrame(raf); onTick(acc, running); return acc; },
      reset: function () { running = false; acc = 0; cancelAnimationFrame(raf); onTick(0, running); },
      elapsed: el,
      running: function () { return running; }
    };
  };

  /* ---------- full screen ---------- */
  LST.fullscreen = function (btn, target) {
    if (!btn) return;
    if (!document.fullscreenEnabled) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen(); else target.requestFullscreen().catch(function () {});
    });
    document.addEventListener('fullscreenchange', function () {
      var on = document.fullscreenElement === target;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.lastChild.textContent = on ? 'Exit full screen' : 'Full screen';
    });
  };

  /* ---------- setup links (content travels in the URL hash, never to a server) ---------- */
  LST.encode = function (obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  LST.readLink = function () {
    var m = /#setup=([A-Za-z0-9_-]+)/.exec(location.hash || '');
    if (!m) return null;
    try {
      var b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      var got = JSON.parse(decodeURIComponent(escape(atob(b))));
      history.replaceState(null, '', location.pathname);
      return got;
    } catch (e) { return null; }
  };
  LST.copyLink = function (btn, getObj, msgEl) {
    btn.addEventListener('click', function () {
      var url = location.origin + location.pathname.replace(/\.html$/, '') + '#setup=' + LST.encode(getObj());
      var label = btn.textContent;
      var ok = function () {
        btn.textContent = 'Link copied';
        if (msgEl) msgEl.textContent = 'Paste it in an email, Classroom post or doc to open this setup on another device.';
        setTimeout(function () { btn.textContent = label; }, 2000);
      };
      try { navigator.clipboard.writeText(url).then(ok, function () { window.prompt('Copy this link:', url); }); } catch (e) { window.prompt('Copy this link:', url); }
    });
  };

  /* ---------- file export / import (for banks that grow all year) ---------- */
  LST.download = function (name, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  LST.upload = function (input, cb) {
    input.addEventListener('change', function () {
      var f = input.files && input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { try { cb(JSON.parse(r.result)); } catch (e) { cb(null); } input.value = ''; };
      r.readAsText(f);
    });
  };

  /* ---------- sound toggle shared by every tool ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    LST.$$('[data-sound]').forEach(function (b) {
      function paint() { var on = LST.sound(); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.lastChild.textContent = on ? 'Sound on' : 'Sound off'; }
      b.addEventListener('click', function () { LST.set('sound', !LST.sound()); paint(); });
      paint();
    });
  });

  window.LST = LST;
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
