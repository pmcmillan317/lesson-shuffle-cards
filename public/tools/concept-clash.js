/* Concept Clash spinner. Concept and list live in this browser only. */
(function () {
  'use strict';
  var L = window.LST, $ = L.$;
  var stage = $('#stage'), q = $('#q'), hint = $('#hint'), ring = $('#ring'), ringv = $('#ringv'), clock = $('#clock'), lines = $('#lines');
  var closeB = $('#close'), go = $('#go'), skip = $('#skip'), ptimer = $('#ptimer');
  var concept = $('#concept'), objs = $('#objs'), count = $('#count'), thinkS = $('#think-s'), ptime = $('#ptime');
  var ptStarted = false, C = 276.46, phase = 'idle', lastObj = null, curConcept = '', curObj = '';

  var DEFAULT = ['a paperclip', 'an umbrella', 'a sandwich', 'a ladder', 'a backpack', 'a toothbrush', 'a key', 'a clock', 'a bicycle', 'a window', 'a pencil', 'a bridge', 'a mirror', 'a sponge', 'a zipper', 'a kettle', 'a broom', 'a compass', 'a staircase', 'a light switch', 'a bookmark', 'a bucket', 'a candle', 'a sock', 'a door', 'a rubber band', 'a flashlight', 'a seatbelt', 'a recipe card', 'a water bottle'].join('\n');

  var data = L.get('cc', null) || {};
  if (typeof data.objs !== 'string') data.objs = DEFAULT;
  if (typeof data.concept !== 'string') data.concept = '';
  if (!Array.isArray(data.used)) data.used = [];
  data.think = clampN(data.think, 5, 300, 30); data.partner = clampN(data.partner, 15, 600, 90);
  var link = L.readLink();
  if (link && typeof link === 'object') {
    var nc = typeof link.c === 'string' ? link.c.slice(0, 500) : data.concept;
    var no = Array.isArray(link.o) && link.o.length ? link.o.map(String).slice(0, 200).join('\n') : data.objs;
    var differs = nc.trim() !== data.concept.trim() || L.lines(no).join('\n') !== L.lines(data.objs).join('\n');
    var hadSaved = L.get('cc', null) !== null;
    if (differs && (!hadSaved || window.confirm('Replace your saved concept and objects with the ones in this link?'))) {
      data.concept = nc; data.objs = no; data.used = []; L.set('cc', data);
    } else link = null;
  }
  function clampN(v, lo, hi, d) { v = parseInt(v, 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); }
  function save() { L.set('cc', data); }
  function objList() { return L.lines(data.objs); }
  function words() { return String(data.concept || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }

  function paint() {
    var n = objList().length, w = words();
    count.textContent = n ? n + (n === 1 ? ' object.' : ' objects.') : 'No objects yet.';
    go.disabled = !n || phase === 'spin';
    if (phase === 'idle') {
      $('#concept-label').textContent = w.length > 1 ? w.length + ' words in the pool' : '';
      q.textContent = 'Ready?';
      hint.textContent = !n ? 'Add a few objects under Set up.' : w.length ? 'Press Spin. A object comes up, then you think.'.replace('A object', 'An object') : "Type today's concept under Set up, or just spin.";
    }
  }

  function pickObj() {
    var list = objList(), pool;
    var used = data.used = data.used.filter(function (u) { return list.indexOf(u) > -1; });
    var fresh = list.filter(function (o) { return used.indexOf(o) < 0; });
    var cycled = false;
    if (!fresh.length) { used = data.used = []; fresh = list; cycled = true; }
    pool = fresh.length > 1 && lastObj != null ? fresh.filter(function (o) { return o !== lastObj; }) : fresh;
    var o = pool[L.rand(pool.length)];
    used.push(o); lastObj = o; save();
    return { obj: o, cycled: cycled };
  }
  function pickConcept() { var w = words(); return w.length ? w[L.rand(w.length)] : ''; }

  function question() {
    var c = curConcept || 'today’s idea';
    return 'How is <b>' + L.esc(c) + '</b> like <b>' + L.esc(curObj) + '</b>?';
  }
  function plainQ() { return 'How is ' + (curConcept || 'today’s idea') + ' like ' + curObj + '?'; }

  function showRing(on) { ring.hidden = !on; }
  var cd = L.Countdown(function (left, total) {
    clock.textContent = Math.ceil(left);
    ringv.setAttribute('stroke-dashoffset', String(C * (1 - (total ? left / total : 0))));
  }, function () { L.done(); if (phase === 'think') partnerPhase(true); else donePartner(); });

  function setPhase(p) {
    phase = p;
    skip.hidden = p !== 'think';
    ptimer.hidden = p !== 'partner';
    closeB.hidden = p !== 'partner';
    if (p === 'closed') { skip.hidden = true; }
    go.textContent = p === 'idle' ? 'Spin' : 'Spin again';
    go.disabled = p === 'spin' || !objList().length;
  }

  function reveal(res) {
    curObj = res.obj;
    q.innerHTML = question(); lines.hidden = true;
    stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');
    var said = plainQ();
    if (res.cycled) said += ' The list started over.';
    L.chime();
    var s = data.think;
    setPhase('think');
    hint.textContent = 'Think on your own first. Jot a few words.';
    showRing(true); cd.set(s); cd.start();
    L.say(said + ' Think time, ' + s + ' seconds.');
  }

  function spin() {
    ptStarted = false;
    if (phase === 'spin' || !objList().length) return;
    cd.pause(); showRing(false); lines.hidden = true;
    curConcept = pickConcept();
    var res = pickObj(), list = objList();
    setPhase('spin'); hint.textContent = 'Spinning…';
    if (L.reduced() || list.length < 2) { reveal(res); return; }
    var steps = 16, k = 0;
    $('#concept-label').textContent = curConcept;
    (function tick() {
      q.textContent = list[L.rand(list.length)]; L.tick(); k++;
      if (k >= steps) { reveal(res); return; }
      setTimeout(tick, 45 + k * k * 1.5);
    })();
  }

  function partnerPhase(auto) {
    if (phase !== 'think') return;
    cd.pause(); showRing(false);
    setPhase('partner');
    q.innerHTML = question();
    lines.hidden = false;
    lines.innerHTML = ['Tell your partner one way they are alike.', 'Then say where the comparison stops working.', 'Partner: agree or push back.'].map(function (t) { return '<li>' + t + '</li>'; }).join('');
    hint.textContent = 'Each partner takes a turn.';
    L.say(auto ? 'Think time is over. Tell your partner one way they are alike, then where the comparison stops working.' : 'Tell your partner one way they are alike, then where the comparison stops working.');
  }
  function startPartnerTimer() {
    if (phase !== 'partner') return;
    ptStarted = true;
    ptimer.hidden = true; showRing(true); cd.set(data.partner); cd.start();
    hint.textContent = 'Partners, you have ' + (data.partner >= 60 && data.partner % 60 === 0 ? data.partner / 60 + ' min' : data.partner + ' seconds') + '.';
    L.say('Partner time, ' + data.partner + ' seconds');
  }
  function donePartner() {
    showRing(false); ptimer.hidden = false; ptimer.textContent = 'Restart partner timer';
    hint.textContent = 'Time. Take three answers: does it hold up? Where does it stop working?';
    L.say('Partner time is over.');
  }

  function closeIt() {
    if (phase !== 'partner') return;
    cd.pause(); showRing(false); setPhase('closed');
    var c = curConcept || 'today\u2019s idea';
    q.innerHTML = 'So <b>' + L.esc(c) + '</b> is like <b>' + L.esc(curObj) + '</b> because ___.';
    lines.hidden = false;
    lines.innerHTML = '<li>It stops working when ___.</li><li>Keep that in mind today.</li>';
    hint.textContent = 'Finish the sentence in your head or on paper.';
    L.say('Close. So ' + c + ' is like ' + curObj + ' because blank. It stops working when blank. Keep that in mind today.');
  }
  closeB.addEventListener('click', closeIt);
  go.addEventListener('click', function () { ptimer.textContent = 'Start partner timer'; spin(); });
  skip.addEventListener('click', function () { partnerPhase(false); });
  ptimer.addEventListener('click', startPartnerTimer);
  function next() { if (phase === 'think') partnerPhase(false); else if (phase === 'partner') { if (ptStarted) closeIt(); else startPartnerTimer(); } }
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (e.key === ' ' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); go.click(); }
    else if (k === 's') go.click();
    else if (k === 'n') next();
    else if (k === 't' && phase === 'partner') startPartnerTimer();
  });

  concept.addEventListener('input', function () { data.concept = concept.value; save(); paint(); });
  objs.addEventListener('input', function () { data.objs = objs.value; data.used = []; save(); paint(); });
  thinkS.addEventListener('input', function () { data.think = clampN(thinkS.value, 5, 300, 30); save(); });
  ptime.addEventListener('input', function () { data.partner = clampN(ptime.value, 15, 600, 90); save(); });
  $('#reset').addEventListener('click', function () {
    if (!window.confirm('Replace your object list with the default list?')) return;
    data.objs = DEFAULT; objs.value = DEFAULT; data.used = []; save(); paint(); L.say('Default list restored');
  });
  L.copyLink($('#link'), function () { return { c: data.concept, o: objList() }; }, $('#linkmsg'));

  L.fullscreen($('#fs'), stage);
  concept.value = data.concept; objs.value = data.objs; thinkS.value = data.think; ptime.value = data.partner;
  setPhase('idle'); paint();
  if (link && link.c != null) L.say('Setup loaded from link');
})();
