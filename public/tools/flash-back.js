/* Flash Back warm-up. The question bank lives in this browser only. */
(function () {
  'use strict';
  var L = window.LST, $ = L.$;
  var stage = $('#stage'), slotsEl = $('#slots'), hint = $('#hint'), reveal = $('#reveal'), empty = $('#empty');
  var LABELS = ['Last week', 'Last month', 'Last unit'];
  var DAY = 86400000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function validDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function dayNum(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY); }
  function age(s) { return Math.max(0, dayNum(todayStr()) - dayNum(s)); }
  function uid() { return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  var data = L.get('fb', null);
  if (!data || !Array.isArray(data.bank)) data = { bank: [], today: null };
  if (!data.today || data.today.date !== todayStr()) data.today = { date: todayStr(), slots: [null, null, null], shown: false };
  function save() { L.set('fb', data); }
  function byId(id) { for (var i = 0; i < data.bank.length; i++) if (data.bank[i].id === id) return data.bank[i]; return null; }
  function slotQ(i) { var s = data.today.slots[i]; return s ? byId(s.id) : null; }

  /* ---------- choosing ---------- */
  var GAPS = ['No questions from about a week ago yet.', 'No questions from about a month ago yet.', 'No questions from a previous unit yet.'];
  function slotFor(id) { for (var i = 0; i < 3; i++) { var s = data.today.slots[i]; if (s && s.id === id) return s; } return null; }
  function effLast(q) { var s = slotFor(q.id); return s ? s.prev : q.last; } /* what it was before today's slot used it */
  function recent(q) { var l = effLast(q); return l && age(l) < 7; }
  function pickFrom(list) { return list[L.rand(list.length)]; }
  function nearestList(list, target) {
    var best = Infinity, out = [];
    list.forEach(function (q) { var d = Math.abs(age(q.d) - target); if (d < best) { best = d; out = [q]; } else if (d === best) out.push(q); });
    return out;
  }
  function rangeList(list, lo, hi, fLo, fHi, target) {
    var inr = list.filter(function (q) { var a = age(q.d); return a >= lo && a <= hi; });
    if (inr.length) return inr;
    return nearestList(list.filter(function (q) { var a = age(q.d); return a >= fLo && a <= fHi; }), target);
  }
  function prevUnit() {
    var latest = {}, order = [];
    data.bank.forEach(function (q) { if (!q.u) return; if (!(q.u in latest)) { latest[q.u] = q.d; order.push(q.u); } else if (q.d > latest[q.u]) latest[q.u] = q.d; });
    order.sort(function (a, b) { return latest[a] < latest[b] ? 1 : latest[a] > latest[b] ? -1 : 0; });
    return order.length > 1 ? order[1] : null;
  }
  function unitList(list) {
    var pu = prevUnit();
    if (pu) { var inU = list.filter(function (q) { return q.u === pu; }); if (inU.length) return inU; }
    var old = list.filter(function (q) { return age(q.d) >= 42; });
    var min = null, out = [];
    old.forEach(function (q) { var l = effLast(q) || ''; if (min === null || l < min) { min = l; out = [q]; } else if (l === min) out.push(q); });
    return out;
  }
  /* every question that best fits slot i, leaving out the ids in exclude. Nothing taught in the last 4 days is ever eligible. */
  function bestList(i, exclude) {
    var base = data.bank.filter(function (q) { return exclude.indexOf(q.id) < 0 && age(q.d) >= 5; });
    var pools = [base.filter(function (q) { return !recent(q); }), base];
    for (var p = 0; p < pools.length; p++) {
      var list = pools[p]; if (!list.length) continue;
      var got = i === 0 ? rangeList(list, 5, 10, 5, 21, 7) : i === 1 ? rangeList(list, 21, 40, 14, 90, 30) : unitList(list);
      if (got.length) return got;
    }
    return [];
  }
  function others(i) { return data.today.slots.filter(function (s, j) { return s && j !== i; }).map(function (s) { return s.id; }); }
  function release(i) { var s = data.today.slots[i], q = s && byId(s.id); if (q && data.today.shown) q.last = s.prev || ''; data.today.slots[i] = null; }
  function setSlot(i, q, sw) {
    data.today.slots[i] = { id: q.id, prev: q.last || '', sw: !!sw };
    if (data.today.shown) q.last = todayStr();
  }
  function valid(i) {
    var s = data.today.slots[i], q = s && byId(s.id);
    if (!q || age(q.d) < 5) return false;
    if (s.sw) return true;
    return bestList(i, others(i)).indexOf(q) >= 0;
  }
  /* keep today's set steady, but rebuild any slot whose question no longer fits its label */
  function build() {
    for (var i = 0; i < 3; i++) if (data.today.slots[i] && !valid(i)) release(i);
    for (i = 0; i < 3; i++) {
      if (data.today.slots[i]) continue;
      var list = bestList(i, used());
      if (list.length) setSlot(i, pickFrom(list), false);
    }
    save();
  }
  function used() { return data.today.slots.filter(Boolean).map(function (s) { return s.id; }); }
  function swap(i) {
    var q0 = slotQ(i); if (!q0) return;
    var list = bestList(i, used());
    if (!list.length) { hint.textContent = 'No other question fits this slot yet. Add more to your bank.'; L.say(hint.textContent); return; }
    var q = pickFrom(list);
    release(i); setSlot(i, q, true); save();
    paint(); L.say(LABELS[i] + ' swapped. ' + q.q);
    var b = slotsEl.querySelector('[data-swap="' + i + '"]'); if (b) b.focus();
  }

  /* ---------- stage ---------- */
  function paint() {
    var n = data.bank.length, any = false;
    empty.hidden = n > 0;
    slotsEl.innerHTML = '';
    var html = '';
    for (var i = 0; i < 3; i++) {
      var q = slotQ(i);
      if (!q) { if (n) html += '<article class="fb-slot" aria-label="' + LABELS[i] + '"><p class="fb-lab">' + LABELS[i] + '</p><p class="fb-gap">' + GAPS[i] + '</p></article>'; continue; }
      any = true;
      html += '<article class="fb-slot" aria-label="' + LABELS[i] + '"><p class="fb-lab">' + LABELS[i] + '</p>' +
        '<p class="fb-q">' + L.esc(q.q) + '</p>' +
        (data.today.shown ? '<p class="fb-a"><small>Answer</small>' + L.esc(q.a) + '</p>' : '') +
        '<p class="fb-meta">Taught ' + ageText(q.d) + (q.u ? ' \u00b7 ' + L.esc(q.u) : '') + '</p>' +
        '<div class="fb-tools"><button type="button" class="btn-ghost" data-swap="' + i + '">Swap<span class="sr"> ' + LABELS[i] + ' question</span></button>' +
        '<button type="button" class="btn-ghost" data-flag="' + i + '" aria-pressed="' + (q.flag ? 'true' : 'false') + '">Class forgot this<span class="sr"> (' + LABELS[i] + ')</span></button></div></article>';
    }
    slotsEl.innerHTML = html;
    var few = n > 0 && !any;
    reveal.hidden = !any;
    reveal.textContent = data.today.shown ? 'Hide answers' : 'Reveal answers';
    if (!n) hint.textContent = '';
    else if (few) hint.textContent = 'Questions need to be taught at least 5 days ago. Add older questions, or give them earlier dates.';
    else if (timeUp) hint.textContent = 'Time. Pens down.';
    else hint.textContent = data.today.shown ? 'Fix yours in another color. Don’t erase.' : 'Notes closed. Answer from memory, on paper.';
    $('#bcount').textContent = n;
  }
  function ageText(d) {
    var a = age(d);
    if (a === 0) return 'today';
    if (a === 1) return 'yesterday';
    if (a < 14) return a + ' days ago';
    if (a < 60) return Math.round(a / 7) + ' weeks ago';
    return Math.round(a / 30) + ' months ago';
  }
  function toggleReveal() {
    if (!slotQ(0) && !slotQ(1) && !slotQ(2)) return;
    data.today.shown = !data.today.shown;
    if (data.today.shown) for (var i = 0; i < 3; i++) { var q = slotQ(i); if (q) q.last = todayStr(); }
    save(); paint();
    L.say(data.today.shown ? 'Answers shown. Fix yours in another color. Don’t erase.' : 'Answers hidden.');
    if (data.today.shown) L.chime();
    reveal.focus();
  }
  reveal.addEventListener('click', toggleReveal);
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-swap')) swap(+b.getAttribute('data-swap'));
    else if (b.hasAttribute('data-flag')) {
      var i = +b.getAttribute('data-flag'), q = slotQ(i); if (!q) return;
      q.flag = !q.flag; save(); paint(); paintBank();
      L.say(q.flag ? 'Flagged to reteach: ' + q.q : 'Flag removed');
      var nb = slotsEl.querySelector('[data-flag="' + i + '"]'); if (nb) nb.focus();
    }
  });

  /* ---------- answer timer ---------- */
  var tstart = $('#tstart'), treset = $('#treset'), ring = $('#ring'), ringv = $('#ringv'), tclock = $('#tclock'), timeUp = false;
  var tsecs = $('#tsecs'), C = 276.46;
  if (!(data.tsecs >= 15)) data.tsecs = 120;
  tsecs.value = data.tsecs;
  function startLabel() { var s = data.tsecs; return s === 120 ? 'Start 2-minute timer' : 'Start timer (' + L.fmt(s) + ')'; }
  var cd = L.Countdown(function (left, total) {
    tclock.textContent = L.fmt(Math.ceil(left));
    ringv.setAttribute('stroke-dashoffset', String(C * (1 - (total ? left / total : 0))));
  }, function () {
    timeUp = true; tstart.textContent = startLabel(); L.done(); L.say('Time. Pens down.'); paint();
  });
  function resetTimer() { cd.set(data.tsecs); ring.hidden = true; treset.hidden = true; timeUp = false; tstart.textContent = startLabel(); }
  tstart.addEventListener('click', function () {
    if (cd.running()) { cd.pause(); tstart.textContent = 'Resume timer'; L.say('Timer paused'); return; }
    if (cd.left() <= 0 || timeUp || ring.hidden) { cd.set(data.tsecs); timeUp = false; paint(); }
    ring.hidden = false; treset.hidden = false; tstart.textContent = 'Pause timer';
    cd.start(); L.say('Timer started, ' + L.fmt(cd.left()));
  });
  treset.addEventListener('click', function () { resetTimer(); paint(); L.say('Timer reset'); });
  tsecs.addEventListener('input', function () {
    var v = Math.max(15, Math.min(900, parseInt(tsecs.value, 10) || 120)); data.tsecs = v; save();
    if (!cd.running()) resetTimer();
  });
  tstart.textContent = startLabel();

  /* ---------- bank ---------- */
  var form = $('#form'), fq = $('#fq'), fa = $('#fa'), fd = $('#fd'), fu = $('#fu'), msg = $('#msg'), editing = null;
  fd.value = todayStr();
  function say(t) { msg.textContent = t; }
  function paintUnits() {
    var seen = {}, out = '';
    data.bank.forEach(function (q) { if (q.u && !seen[q.u]) { seen[q.u] = 1; out += '<option value="' + L.esc(q.u) + '">'; } });
    $('#units').innerHTML = out;
  }
  function paintBank() {
    var rows = data.bank.slice().sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
    $('#bank').innerHTML = rows.length ? rows.map(function (q) {
      return '<tr><td class="fb-cell">' + L.esc(q.q) + '</td><td class="fb-cell">' + L.esc(q.a) + '</td><td>' + L.esc(q.d) + '</td><td>' + L.esc(q.u || '') + '</td>' +
        '<td>' + (q.flag ? '<span class="fb-flag">Reteach</span> ' : '') + (q.sample ? 'Sample' : '') + '</td>' +
        '<td><div class="fb-acts"><button type="button" class="btn-ghost" data-edit="' + q.id + '">Edit<span class="sr"> ' + L.esc(q.q) + '</span></button>' +
        '<button type="button" class="btn-ghost" data-del="' + q.id + '">Delete<span class="sr"> ' + L.esc(q.q) + '</span></button></div></td></tr>';
    }).join('') : '<tr><td colspan="6">No questions yet.</td></tr>';
    paintUnits();
    $('#bcount').textContent = data.bank.length;
    $('#rmsample').hidden = !data.bank.some(function (q) { return q.sample; });
  }
  function refresh() { build(); paint(); paintBank(); }
  function resetForm() {
    editing = null; fq.value = fa.value = fu.value = ''; fd.value = todayStr();
    $('#fsave').textContent = 'Add question'; $('#fcancel').hidden = true;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = fq.value.trim(), a = fa.value.trim(); if (!q || !a) { say('Add both a question and an answer.'); return; }
    var d = validDate(fd.value) ? fd.value : todayStr(), u = fu.value.trim().slice(0, 60);
    if (editing) {
      var it = byId(editing);
      if (it) { it.q = q; it.a = a; it.d = d; it.u = u; }
      say('Saved changes.');
    } else {
      data.bank.push({ id: uid(), q: q, a: a, d: d, u: u, last: '', flag: false });
      say('Added. ' + data.bank.length + ' in the bank.');
    }
    resetForm(); save(); refresh(); fq.focus();
  });
  $('#fcancel').addEventListener('click', function () { resetForm(); say('Edit cancelled.'); });
  $('#bank').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var id = b.getAttribute('data-edit') || b.getAttribute('data-del'), q = byId(id); if (!q) return;
    if (b.hasAttribute('data-edit')) {
      editing = id; fq.value = q.q; fa.value = q.a; fd.value = q.d; fu.value = q.u || '';
      $('#fsave').textContent = 'Save changes'; $('#fcancel').hidden = false; fq.focus();
      form.scrollIntoView({ block: 'nearest', behavior: L.reduced() ? 'auto' : 'smooth' });
      say('Editing. Change the fields and press Save changes.');
    } else {
      if (!window.confirm('Delete this question from the bank?\n\n' + q.q)) return;
      data.bank = data.bank.filter(function (x) { return x.id !== id; });
      data.today.slots = data.today.slots.map(function (s) { return s && s.id === id ? null : s; });
      if (editing === id) resetForm();
      save(); refresh(); say('Deleted.'); L.say('Question deleted');
    }
  });
  $('#bulkadd').addEventListener('click', function () {
    var lines = L.lines($('#bulk').value), added = 0, skipped = 0;
    lines.forEach(function (ln) {
      var p = ln.split('|').map(function (s) { return s.trim(); });
      if (p.length < 2 || !p[0] || !p[1]) { skipped++; return; }
      var d = todayStr(), u = '';
      if (p[2]) { if (validDate(p[2])) d = p[2]; else { skipped++; return; } }
      if (p[3]) u = p[3];
      data.bank.push({ id: uid(), q: p[0], a: p[1], d: d, u: u.slice(0, 60), last: '', flag: false }); added++;
    });
    if (added) { $('#bulk').value = ''; save(); refresh(); }
    say(added ? 'Added ' + added + (added === 1 ? ' question.' : ' questions.') + (skipped ? ' Skipped ' + skipped + ' with a missing answer or a date that is not YYYY-MM-DD.' : '') : (lines.length ? 'Nothing added. Each line needs a question | answer, and dates look like 2026-09-14.' : 'Paste some lines first.'));
  });
  $('#sample').addEventListener('click', function () {
    [
      ['What do plants need for photosynthesis?', 'Light, water and carbon dioxide', 80, 'Unit 1: Plants'],
      ['What is the boiling point of water in Celsius?', '100 degrees', 50, 'Unit 2: Matter'],
      ['What do we call water vapor turning back into a liquid?', 'Condensation', 46, 'Unit 2: Matter'],
      ['What unit do we use to measure force?', 'Newtons', 31, 'Unit 3: Forces'],
      ['Which force pulls objects toward Earth?', 'Gravity', 8, 'Unit 3: Forces'],
      ['What do we call a push or a pull on an object?', 'A force', 6, 'Unit 3: Forces']
    ].forEach(function (r) { data.bank.push({ id: uid(), q: r[0], a: r[1], d: addDays(r[2]), u: r[3], last: '', flag: false, sample: true }); });
    save(); refresh(); L.say('Loaded 6 sample questions'); reveal.focus();
  });
  $('#rmsample').addEventListener('click', function () {
    data.bank = data.bank.filter(function (q) { return !q.sample; });
    data.today.slots = data.today.slots.map(function (s) { return s && byId(s.id) ? s : null; });
    save(); refresh(); say('Sample questions removed.'); L.say('Sample questions removed');
  });
  $('#clear').addEventListener('click', function () {
    if (!data.bank.length) return;
    if (!window.confirm('Delete all ' + data.bank.length + ' questions from this device? Export a backup first if you want to keep them.')) return;
    data.bank = []; data.today = { date: todayStr(), slots: [null, null, null], shown: false };
    resetForm(); save(); refresh(); say('Bank cleared.');
  });
  $('#export').addEventListener('click', function () {
    L.download('flash-back-bank-' + todayStr() + '.json', { app: 'flash-back', version: 1, bank: data.bank });
    say('Backup downloaded. Keep the file somewhere safe.');
  });
  $('#importbtn').addEventListener('click', function () { $('#import').click(); });
  L.upload($('#import'), function (obj) {
    var list = obj && (Array.isArray(obj) ? obj : obj.bank);
    if (!Array.isArray(list)) { say('That file is not a Flash Back backup.'); return; }
    var have = {}; data.bank.forEach(function (q) { have[q.q + '\u0001' + q.a] = 1; });
    var added = 0;
    list.forEach(function (r) {
      if (!r || typeof r.q !== 'string' || typeof r.a !== 'string' || !r.q.trim() || !r.a.trim() || have[r.q + '\u0001' + r.a]) return;
      have[r.q + '\u0001' + r.a] = 1;
      data.bank.push({ id: uid(), q: r.q.trim(), a: r.a.trim(), d: validDate(r.d) ? r.d : todayStr(), u: typeof r.u === 'string' ? r.u.slice(0, 60) : '', last: validDate(r.last) ? r.last : '', flag: !!r.flag });
      added++;
    });
    if (added) { save(); refresh(); }
    say(added ? 'Imported ' + added + (added === 1 ? ' question.' : ' questions.') + ' Duplicates were skipped.' : 'Nothing new to import.');
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t !== document.body && t !== document.documentElement) return;
    if (t.closest && t.closest('.tsetup')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); toggleReveal(); }
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); tstart.click(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') swap(+e.key - 1);
  });

  L.fullscreen($('#fs'), stage);
  refresh();
  if (!data.bank.length) $('#setup').open = true;
})();
