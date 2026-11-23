/* Every Hand Up picker. Rosters live in this browser only. */
(function () {
  'use strict';
  var L = window.LST, $ = L.$;
  var stage = $('#stage'), nameEl = $('#name'), hint = $('#hint'), ring = $('#ring'), ringv = $('#ringv'), think = $('#think');
  var go = $('#go'), now = $('#now'), friend = $('#friend');
  var cls = $('#cls'), roster = $('#roster'), q = $('#q'), secs = $('#secs'), norepeat = $('#norepeat'), count = $('#count');
  var C = 276.46, busy = false, last = null, current = null, spinT = 0;

  var data = L.get('ehu', null);
  if (!data || !Array.isArray(data.classes) || !data.classes.length) data = { classes: [{ name: 'Class 1', names: '' }], at: 0, q: '', secs: 10, norepeat: false };
  function save() { L.set('ehu', data); }
  function cur() { return data.classes[Math.min(data.at, data.classes.length - 1)]; }
  function names() { return L.lines(cur().names); }

  function paintClasses() {
    cls.innerHTML = data.classes.map(function (c, i) { return '<option value="' + i + '">' + L.esc(c.name) + '</option>'; }).join('');
    cls.value = String(data.at);
    roster.value = cur().names;
    $('#delcls').disabled = data.classes.length < 2;
    paintCount();
  }
  function paintCount() {
    var n = names().length;
    count.textContent = n ? n + (n === 1 ? ' name' : ' names') + ' in ' + cur().name + '.' : 'No names yet.';
    $('#classname').textContent = data.classes.length > 1 ? cur().name : '';
    var none = n === 0;
    go.disabled = now.disabled = none || busy;
    if (none && !busy) { nameEl.textContent = 'Add names'; hint.textContent = 'Open Set up your classes below and paste your class list.'; }
    else if (!busy && !current) { nameEl.textContent = 'Ready?'; hint.textContent = 'Ask your question. No hands.'; }
  }
  function paintQ() { var t = q.value.trim(); $('#question').hidden = !t; $('#question').textContent = t; }

  cls.addEventListener('change', function () { halt(); last = null; data.at = +cls.value; save(); paintClasses(); friend.hidden = true; });
  roster.addEventListener('input', function () { cur().names = roster.value; save(); paintCount(); });
  q.addEventListener('input', function () { data.q = q.value; save(); paintQ(); });
  secs.addEventListener('input', function () { var v = Math.max(0, Math.min(120, parseInt(secs.value, 10) || 0)); data.secs = v; save(); go.textContent = v ? 'Think, then pick' : 'Pick'; });
  norepeat.addEventListener('change', function () { data.norepeat = norepeat.checked; save(); });
  $('#addcls').addEventListener('click', function () {
    var n = window.prompt('Name for the new class:', 'Class ' + (data.classes.length + 1));
    if (!n || !n.trim()) return;
    halt(); data.classes.push({ name: n.trim().slice(0, 40), names: '' }); data.at = data.classes.length - 1; save(); paintClasses(); roster.focus();
  });
  $('#rencls').addEventListener('click', function () {
    var n = window.prompt('Rename this class:', cur().name);
    if (!n || !n.trim()) return;
    cur().name = n.trim().slice(0, 40); save(); paintClasses();
  });
  $('#delcls').addEventListener('click', function () {
    if (data.classes.length < 2) return;
    if (!window.confirm('Delete ' + cur().name + ' and its names from this device?')) return;
    halt(); data.classes.splice(data.at, 1); data.at = 0; last = null; save(); paintClasses();
  });

  function halt() {
    clearTimeout(spinT); cd.pause(); ring.hidden = true; busy = false; current = null; friend.hidden = true;
  }
  function choose() {
    var list = names(); if (!list.length) return null;
    if (data.norepeat && list.length > 1 && last != null) {
      var pool = list.filter(function (n) { return n !== last; });
      return pool[L.rand(pool.length)];
    }
    return list[L.rand(list.length)];
  }
  function reveal(n) {
    current = last = n; busy = false;
    nameEl.textContent = n; hint.textContent = 'Stuck? Phone a friend, or hear the question again.';
    friend.hidden = false; L.chime(); L.say(n);
    stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');
    paintCount(); go.focus();
  }
  function pick() {
    var winner = choose(); if (!winner) return;
    var list = names();
    busy = true; friend.hidden = true; ring.hidden = true; paintCount();
    if (L.reduced() || list.length < 2) { reveal(winner); return; }
    var steps = 14, k = 0;
    hint.textContent = 'Picking…';
    (function spin() {
      nameEl.textContent = list[L.rand(list.length)]; L.tick(); k++;
      if (k >= steps) { reveal(winner); return; }
      spinT = setTimeout(spin, 45 + k * k * 1.6);
    })();
  }
  var cd = L.Countdown(function (left, total) {
    think.textContent = Math.ceil(left);
    ringv.setAttribute('stroke-dashoffset', String(C * (1 - (total ? left / total : 0))));
  }, function () { ring.hidden = true; pick(); });
  function thinkThenPick() {
    if (busy || !names().length) return;
    var s = data.secs;
    if (!s) { pick(); return; }
    busy = true; current = null; friend.hidden = true; paintCount();
    nameEl.textContent = 'Think…'; hint.textContent = 'Think. Write your answer down. Anyone could be next.';
    ring.hidden = false; cd.set(s); cd.start(); L.say('Think time, ' + s + ' seconds');
  }
  function phone() {
    if (!current) return;
    nameEl.textContent = current; hint.textContent = current + ', pick a classmate to help. They say it, then you say it in your own words.';
    friend.hidden = true; L.say(hint.textContent);
  }
  go.addEventListener('click', thinkThenPick);
  now.addEventListener('click', function () { if (cd.running()) { cd.pause(); ring.hidden = true; busy = false; } if (!busy) pick(); });
  friend.addEventListener('click', phone);
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); thinkThenPick(); }
    else if (e.key === 'p' || e.key === 'P') now.click();
    else if ((e.key === 'f' || e.key === 'F') && !friend.hidden) phone();
  });

  L.fullscreen($('#fs'), stage);
  q.value = data.q || ''; secs.value = data.secs; norepeat.checked = data.norepeat === true;
  go.textContent = data.secs ? 'Think, then pick' : 'Pick';
  paintClasses(); paintQ();
  if (!names().length) $('#setup').open = true;
})();
