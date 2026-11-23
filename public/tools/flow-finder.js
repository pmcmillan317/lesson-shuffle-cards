/* Flow Finder transition timer. Times live in this browser only. */
(function () {
  'use strict';
  var L = window.LST, $ = L.$;
  var stage = $('#stage'), clock = $('#clock'), go = $('#go'), goal = $('#goal'), stats = $('#stats'), times = $('#times');
  var cls = $('#cls'), cueIn = $('#cue-in'), nextIn = $('#next-in'), msg = $('#msg');
  var DEFAULT_CUE = 'Finish. Stand. Shift.';
  var CALM = 'That one took over a minute. Calmly practice that switch once more.';

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  var data = L.get('ff', null);
  if (!data || !Array.isArray(data.classes) || !data.classes.length) data = { classes: [{ name: 'Class 1', rec: null, day: today(), times: [] }], at: 0, cue: DEFAULT_CUE, next: '' };
  function save() { L.set('ff', data); }
  function cur() { var c = data.classes[Math.min(data.at, data.classes.length - 1)]; if (c.day !== today()) { c.day = today(); c.times = []; } return c; }
  function best(c) { return c.times.length ? Math.min.apply(null, c.times) : null; }

  var sw = L.Stopwatch(function (s) { clock.textContent = L.fmt(s); });

  function paintClasses() {
    cls.innerHTML = data.classes.map(function (c, i) { return '<option value="' + i + '">' + L.esc(c.name) + '</option>'; }).join('');
    cls.value = String(data.at);
    $('#delcls').disabled = data.classes.length < 2;
    paintStats();
  }
  function paintStats() {
    var c = cur(), b = best(c);
    $('#classname').textContent = data.classes.length > 1 ? c.name : '';
    var h = '';
    if (b != null) h += '<span>Today\'s best: <b>' + L.fmt(b) + '</b></span>';
    if (c.rec != null) h += '<span>Record: <b>' + L.fmt(c.rec) + '</b></span>';
    stats.innerHTML = h; stats.hidden = !h;
    var bi = c.times.indexOf(b);
    times.innerHTML = c.times.map(function (t, i) { return '<li' + (i === bi ? ' class="best"' : '') + '>' + L.fmt(t) + '</li>'; }).join('');
    times.hidden = !c.times.length;
  }
  function paintText() {
    $('#cue').textContent = data.cue || DEFAULT_CUE;
    var n = $('#next'); n.textContent = data.next ? 'Next: ' + data.next : ''; n.hidden = !data.next;
  }
  function setGoal(t, calm) { goal.textContent = t; goal.classList.toggle('calm', !!calm); }

  function start() {
    L.chime(); sw.reset(); sw.start();
    go.textContent = 'Everyone\'s ready: stop'; setGoal('Goal: under one minute.');
    stage.classList.remove('flash'); L.say('Timer started');
  }
  function secs(t) { return t + (t === 1 ? ' second' : ' seconds'); }
  function stop() {
    var t = Math.max(1, Math.round(sw.stop()));
    clock.textContent = L.fmt(t);
    go.textContent = 'Chime and start';
    var c = cur(), had = c.rec != null, isNew = had && t < c.rec, tied = had && t === c.rec;
    c.times.push(t);
    if (!had || t < c.rec) c.rec = t;
    save(); paintStats();
    var say;
    if (isNew) {
      say = secs(t) + '. New class record.'; setGoal('New class record! ' + secs(t) + '.');
      stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash'); L.done();
    } else if (tied && t < 60) {
      say = 'Tied the class record. ' + secs(t) + '.'; setGoal('Tied the class record! ' + secs(t) + '.');
      stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');
    } else if (!had && t < 60) {
      say = secs(t) + '. That is your first record to beat.'; setGoal(secs(t) + '. That is your first record to beat.');
    } else if (t >= 60) {
      say = L.fmt(t) + '. ' + CALM; setGoal(CALM, true);
    } else {
      say = secs(t) + '. Under a minute. Goal met.'; setGoal(secs(t) + '. Under a minute. Goal met.');
    }
    L.say(say);
  }
  function discard() {
    if (!sw.running()) return;
    sw.reset(); go.textContent = 'Chime and start';
    setGoal('Run discarded. Start again when you are ready.'); L.say('Timer stopped. That run was discarded.');
  }
  function toggle() { if (sw.running()) stop(); else start(); }
  go.addEventListener('click', toggle);
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); toggle(); }
  });

  cueIn.addEventListener('input', function () { data.cue = cueIn.value.trim() || DEFAULT_CUE; save(); paintText(); });
  nextIn.addEventListener('input', function () { data.next = nextIn.value.trim(); save(); paintText(); });
  cls.addEventListener('change', function () { discard(); data.at = +cls.value; save(); clock.textContent = '0:00'; paintClasses(); });
  $('#addcls').addEventListener('click', function () {
    var n = window.prompt('Name for the new class:', 'Period ' + (data.classes.length + 1));
    if (!n || !n.trim()) return;
    discard();
    data.classes.push({ name: n.trim().slice(0, 40), rec: null, day: today(), times: [] }); data.at = data.classes.length - 1; save(); clock.textContent = '0:00'; paintClasses();
  });
  $('#rencls').addEventListener('click', function () {
    var n = window.prompt('Rename this class:', cur().name);
    if (!n || !n.trim()) return;
    cur().name = n.trim().slice(0, 40); save(); paintClasses();
  });
  $('#delcls').addEventListener('click', function () {
    if (data.classes.length < 2) return;
    if (!window.confirm('Delete ' + cur().name + ' and its times from this device?')) return;
    discard();
    data.classes.splice(data.at, 1); data.at = 0; save(); paintClasses();
  });
  $('#clrday').addEventListener('click', function () {
    cur().times = []; save(); paintStats(); msg.textContent = 'Today\'s times cleared. The record stays.';
  });
  $('#clrrec').addEventListener('click', function () {
    if (!window.confirm('Reset the record for ' + cur().name + '?')) return;
    cur().rec = null; save(); paintStats(); msg.textContent = 'Record reset.';
  });

  L.fullscreen($('#fs'), stage);
  cueIn.value = data.cue || DEFAULT_CUE; nextIn.value = data.next || '';
  paintText(); paintClasses();
})();
