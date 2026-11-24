/* Ten-Po Shift block timer. The plan and the run state live in this browser only. */
(function () {
  'use strict';
  var L = window.LST, $ = L.$;
  var WAYS = [
    { id: 'lead', label: 'Teacher-led', say: 'Eyes up. Listen and take notes.' },
    { id: 'solo', label: 'Solo', say: 'Work on your own. Keep it quiet.' },
    { id: 'partner', label: 'Partner', say: 'Turn to your partner. Take turns.' },
    { id: 'group', label: 'Small group', say: 'Work with your group. Everyone has a job.' },
    { id: 'feet', label: 'On your feet', say: 'Stand up and move. Work on your feet.' },
    { id: 'check', label: 'Check', say: 'Show what you know. Answer for yourself.' }
  ];
  var RESETS = {
    partner: 'Find your new partner.',
    group: 'Move to your group.',
    feet: 'Stand up. Get ready to move.',
    lead: 'Turn your seat to face the front.',
    solo: 'Switch seats. Find a quiet spot.',
    check: 'Clear your desk. Keep a pencil.'
  };
  var DEFAULT = [
    { name: 'Learn it', mins: 10, way: 'lead' },
    { name: 'Talk it', mins: 10, way: 'partner' },
    { name: 'Practice it', mins: 10, way: 'solo' },
    { name: 'Check it', mins: 10, way: 'check' }
  ];
  var stage = $('#stage'), list = $('#tp-list'), bar = $('#tp-bar'), msg = $('#tp-msg'), planEl = $('#tp-planlist');
  var elCount = $('#tp-count'), elWay = $('#tp-way'), elName = $('#tp-name'), elDo = $('#tp-do'), elClock = $('#tp-clock'), elNext = $('#tp-next'), elAuto = $('#tp-auto');
  var go = $('#tp-go'), plus = $('#tp-plus'), minus = $('#tp-minus'), skip = $('#tp-skip'), restart = $('#tp-restart'), show = $('#tp-show'), autochk = $('#tp-autochk');

  function wayOf(id) { for (var i = 0; i < WAYS.length; i++) if (WAYS[i].id === id) return WAYS[i]; return WAYS[0]; }
  function clean(plan) {
    if (!Array.isArray(plan)) return null;
    var out = plan.slice(0, 20).map(function (b) {
      b = b || {};
      var m = Math.round(+b.mins); if (!(m >= 1)) m = 10; if (m > 90) m = 90;
      return { name: String(b.name == null ? '' : b.name).slice(0, 60), mins: m, way: wayOf(b.way).id };
    });
    return out.length ? out : null;
  }
  function copy(p) { return p.map(function (b) { return { name: b.name, mins: b.mins, way: b.way }; }); }

  var data = L.get('tps', null) || {};
  var linked = L.readLink(), linkedPlan = linked && clean(linked.plan), fromLink = false;
  if (linkedPlan) {
    var saved = clean(data.plan);
    if (!saved || JSON.stringify(saved) === JSON.stringify(linkedPlan) ||
        window.confirm('Open this setup link? It will replace the plan saved in this browser.')) {
      data = { plan: linkedPlan, auto: !!linked.auto }; L.set('tps', data); L.del('tpsr'); fromLink = true;
    }
  }
  var plan = clean(data.plan) || copy(DEFAULT);
  var auto = !!data.auto;
  function save() { L.set('tps', { plan: plan, auto: auto }); }

  /* lesson state. phase: block | shift | end. planView shows the overview on top of any phase. */
  var idx = 0, phase = 'block', started = false, planView = true, applied = 10;
  function nm(i) { return plan[i].name.trim() || 'Block ' + (i + 1); }
  function live() { return phase === 'shift' || (phase === 'block' && started); }

  var cd = L.Countdown(function (left, total, running) {
    elClock.textContent = L.fmt(left);
    paintFill(left, total);
    if (phase === 'block') go.textContent = running ? 'Pause' : (started ? 'Resume' : 'Start');
  }, function () { endBlock(); });
  var sd = L.Countdown(function (left) {
    if (phase === 'shift' && auto) elAuto.textContent = 'Next block starts in ' + Math.ceil(left) + ' seconds.';
  }, function () { if (phase === 'shift') startNext(); });

  function saveRun() {
    L.set('tpsr', { n: plan.length, phase: phase, idx: idx, started: started, running: cd.running(), endsAt: cd.endsAt(), left: cd.left(), total: cd.total(), shiftEnds: sd.endsAt() });
  }
  function paintFill(left, total) {
    var f = bar.children[idx] && bar.children[idx].firstChild;
    if (f && phase === 'block') f.style.width = (total ? Math.max(0, Math.min(100, 100 * (1 - left / total))) : 0) + '%';
  }
  function paintBar() {
    bar.innerHTML = plan.map(function (b, i) {
      var c = phase === 'end' || i < idx ? 'done' : (i === idx ? 'cur' : '');
      return '<li class="' + c + '" style="flex:' + b.mins + '"><i></i></li>';
    }).join('');
  }
  function paintPlan() {
    planEl.innerHTML = plan.map(function (b, i) {
      var c = phase === 'end' || (i < idx && (started || phase !== 'block')) ? 'done' : (i === idx && (started || phase === 'shift') ? 'cur' : '');
      var tag = c === 'cur' ? (phase === 'shift' ? ' (next)' : ' (now)') : (c === 'done' ? ' (done)' : '');
      return '<li class="' + c + '"><b>' + L.esc((b.name.trim() || 'Block ' + (i + 1)) + tag) + '</b><span>' + wayOf(b.way).label + ' · ' + b.mins + ' min</span></li>';
    }).join('');
  }
  function paintStage() {
    var last = idx >= plan.length - 1;
    paintBar();
    stage.classList.toggle('tp-shift', phase === 'shift' && !planView);
    elAuto.hidden = !(phase === 'shift' && auto);
    elDo.hidden = false; elWay.hidden = false; elClock.hidden = false; planEl.hidden = true;
    plus.disabled = minus.disabled = skip.disabled = phase !== 'block';
    show.textContent = planView ? 'Hide plan' : 'Show plan'; show.setAttribute('aria-pressed', planView ? 'true' : 'false');
    if (phase === 'block') {
      go.textContent = cd.running() ? 'Pause' : (started ? 'Resume' : 'Start');
      skip.textContent = last ? 'Finish lesson' : 'Skip to next';
    } else if (phase === 'shift') go.textContent = 'Start next block';
    else go.textContent = 'Restart lesson';
    if (planView) {
      paintPlan(); planEl.hidden = false;
      elCount.textContent = phase === 'end' ? 'All ' + plan.length + ' blocks done' : (started || phase === 'shift' ? (phase === 'shift' ? 'Shift in progress' : 'Block ' + (idx + 1) + ' of ' + plan.length + ' is running') : plan.length + (plan.length === 1 ? ' block' : ' blocks'));
      elWay.hidden = true; elName.textContent = 'Today’s game plan'; elDo.textContent = 'Watch the timer.';
      elNext.textContent = ''; elClock.hidden = !(phase === 'block' && started);
    } else if (phase === 'block') {
      var w = wayOf(plan[idx].way);
      elCount.textContent = 'Block ' + (idx + 1) + ' of ' + plan.length;
      elWay.textContent = w.label; elName.textContent = nm(idx); elDo.textContent = w.say;
      elNext.textContent = last ? 'Last block.' : 'Next: ' + nm(idx + 1);
    } else if (phase === 'shift') {
      var n = plan[idx], nw = wayOf(n.way);
      elCount.textContent = 'Next up: block ' + (idx + 1) + ' of ' + plan.length;
      elWay.textContent = 'Next: ' + nw.label; elName.textContent = 'Shift!';
      elDo.textContent = nm(idx) + '. ' + RESETS[n.way] + ' Stand, stretch, and move.';
      elNext.textContent = L.fmt(n.mins * 60) + ' on the timer.';
      elClock.hidden = true;
    } else {
      elCount.textContent = 'All ' + plan.length + ' blocks done';
      elWay.hidden = true; elName.textContent = 'Lesson done'; elDo.textContent = 'Which block helped you learn the most?';
      elNext.textContent = ''; elClock.hidden = true;
    }
    paintFill(cd.left(), cd.total());
    saveRun();
  }

  function loadBlock(i, showPlan) {
    idx = i; phase = 'block'; started = false; planView = !!showPlan; sd.pause(); applied = plan[i].mins;
    cd.set(plan[i].mins * 60);
    paintStage();
  }
  function beginRun() {
    if (!started) planView = false;
    started = true; cd.start(); paintStage();
    L.say(nm(idx) + ', ' + wayOf(plan[idx].way).label + ', ' + plan[idx].mins + ' minutes');
  }
  function shiftTo(i, chime) {
    cd.pause(); idx = i; phase = 'shift'; planView = false; started = false; applied = plan[i].mins;
    if (auto) { sd.set(30); sd.start(); } else sd.pause();
    if (chime) L.chime();
    paintStage();
    L.say('Shift! Next: ' + nm(i) + '. ' + RESETS[plan[i].way]);
    stage.classList.remove('flash'); void stage.offsetWidth; if (!L.reduced()) stage.classList.add('flash');
  }
  function finish(chime) {
    cd.pause(); sd.pause(); phase = 'end'; planView = false; idx = plan.length - 1;
    if (chime) L.done();
    paintStage(); L.say('Lesson done. All ' + plan.length + ' blocks complete.');
  }
  function endBlock() { if (idx >= plan.length - 1) finish(true); else shiftTo(idx + 1, true); }
  function startNext() { sd.pause(); loadBlock(idx, false); beginRun(); go.focus(); }
  function skipNext() {
    if (phase !== 'block') return;
    if (idx >= plan.length - 1) finish(false); else shiftTo(idx + 1, false);
  }
  function restartLesson(ask) {
    if (ask && (started || idx > 0 || phase !== 'block') && !window.confirm('Restart the lesson from block 1?')) return;
    loadBlock(0, true); L.say('Lesson restarted. Block 1 of ' + plan.length);
  }
  function toggle() {
    if (phase === 'shift') startNext();
    else if (phase === 'end') restartLesson(false);
    else if (cd.running()) { cd.pause(); paintStage(); L.say('Paused'); }
    else if (cd.left() > 0) beginRun();
  }
  function adjust(sec) {
    if (phase !== 'block') return;
    var left = cd.left();
    if (sec < 0 && left + sec < 1) sec = Math.min(0, 1 - left);
    cd.add(sec); saveRun();
    if (sec) L.say((sec > 0 ? 'Added' : 'Removed') + ' a minute. ' + L.fmt(cd.left()) + ' left.');
  }
  function togglePlan() { planView = !planView; paintStage(); L.say(planView ? 'Showing the plan' : 'Showing the current block'); }

  function restore() {
    var r = L.get('tpsr', null);
    if (!r || r.n !== plan.length || !(r.idx >= 0 && r.idx < plan.length)) return false;
    idx = r.idx; applied = plan[idx].mins;
    if (r.phase === 'end') { phase = 'end'; started = false; planView = false; paintStage(); return true; }
    if (r.phase === 'shift') {
      phase = 'shift'; started = false; planView = false;
      var rem = r.shiftEnds ? (r.shiftEnds - Date.now()) / 1000 : 30;
      if (auto) { sd.set(rem > 0 ? Math.min(rem, 30) : 30, 30); sd.start(); }
      paintStage(); return true;
    }
    if (!r.started) return false;
    var left = r.running ? (r.endsAt - Date.now()) / 1000 : r.left;
    if (r.running && left <= 0) {      /* the block ended while the page was closed */
      if (idx >= plan.length - 1) finish(false); else shiftTo(idx + 1, false);
      return true;
    }
    phase = 'block'; started = true; planView = false;
    cd.set(Math.max(1, left), r.total || left);
    if (r.running) cd.start();
    paintStage(); return true;
  }

  go.addEventListener('click', toggle);
  plus.addEventListener('click', function () { adjust(60); });
  minus.addEventListener('click', function () { adjust(-60); });
  skip.addEventListener('click', skipNext);
  restart.addEventListener('click', function () { restartLesson(true); });
  show.addEventListener('click', togglePlan);
  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === ' ' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); toggle(); }
    else if (k === 'n' || k === 'N') skipNext();
    else if (k === 'p' || k === 'P') togglePlan();
    else if (k === '+' || k === '=') adjust(60);
    else if (k === '-' || k === '_') adjust(-60);
    else if (k === 'r' || k === 'R') restartLesson(true);
  });

  /* setup panel */
  function paintList() {
    list.innerHTML = plan.map(function (b, i) {
      var n = i + 1;
      return '<li class="tp-item" data-i="' + i + '">' +
        '<div class="fld"><label for="tp-n' + i + '">Block ' + n + ' name (what students do)</label><input type="text" id="tp-n' + i + '" data-f="name" maxlength="60" value="' + L.esc(b.name) + '" placeholder="Block ' + n + '" autocomplete="off"></div>' +
        '<div class="fld"><label for="tp-m' + i + '">Block ' + n + ' minutes</label><input type="number" id="tp-m' + i + '" data-f="mins" min="1" max="90" step="1" value="' + b.mins + '"></div>' +
        '<div class="fld"><label for="tp-w' + i + '">Block ' + n + ' way of working</label><select id="tp-w' + i + '" data-f="way">' +
          WAYS.map(function (w) { return '<option value="' + w.id + '"' + (w.id === b.way ? ' selected' : '') + '>' + w.label + '</option>'; }).join('') + '</select></div>' +
        '<div class="tp-btns">' +
          '<button type="button" class="icon-btn" data-a="up" aria-label="Move block ' + n + ' up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="icon-btn" data-a="down" aria-label="Move block ' + n + ' down"' + (i === plan.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="icon-btn" data-a="del" aria-label="Remove block ' + n + '"' + (plan.length < 2 ? ' disabled' : '') + '>✕</button>' +
        '</div></li>';
    }).join('');
  }
  function isLive(b) { return phase === 'block' && started && plan[idx] === b; }
  list.addEventListener('input', function (e) {
    var li = e.target.closest('.tp-item'), f = e.target.getAttribute('data-f'); if (!li || !f) return;
    var i = +li.getAttribute('data-i'), b = plan[i];
    if (f === 'name') b.name = e.target.value;
    else if (f === 'way') b.way = e.target.value;
    else {
      var m = parseInt(e.target.value, 10); if (!(m >= 1)) return;
      b.mins = Math.min(90, m);
      if (!isLive(b) && i === idx && phase === 'block' && !started) { cd.set(b.mins * 60); applied = b.mins; }
    }
    save(); paintStage();
  });
  list.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-f') !== 'mins') return;
    var b = plan[+e.target.closest('.tp-item').getAttribute('data-i')];
    var m = Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 10)); e.target.value = m; b.mins = m; save();
    if (isLive(b) && m !== applied) {     /* adjust the running block by the difference */
      var diff = m - applied, run = cd.running();
      cd.set(Math.max(1, cd.left() + diff * 60), Math.max(1, cd.total() + diff * 60));
      if (run) cd.start();
      applied = m; L.say('Block time changed. ' + L.fmt(cd.left()) + ' left.');
    } else if (i0(b) === idx && phase === 'block' && !started) { cd.set(m * 60); applied = m; }
    paintStage();
  });
  function i0(b) { return plan.indexOf(b); }
  list.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-a]'); if (!btn) return;
    var i = +btn.closest('.tp-item').getAttribute('data-i'), a = btn.getAttribute('data-a'), focus;
    var curObj = phase === 'end' ? null : plan[idx], runNow = live(), removedCur = false;
    if (a === 'del') {
      if (plan.length < 2) return;
      if (plan[i] === curObj && runNow && !window.confirm('That block is running now. Remove it and move to the next one?')) return;
      removedCur = plan[i] === curObj;
      plan.splice(i, 1); focus = '[data-i="' + Math.min(i, plan.length - 1) + '"] [data-f="name"]';
    } else if (a === 'up' && i > 0) {
      plan.splice(i - 1, 0, plan.splice(i, 1)[0]); focus = '[data-i="' + (i - 1) + '"] [data-a="' + (i - 1 === 0 ? 'down' : 'up') + '"]';
    } else if (a === 'down' && i < plan.length - 1) {
      plan.splice(i + 1, 0, plan.splice(i, 1)[0]); focus = '[data-i="' + (i + 1) + '"] [data-a="' + (i + 1 === plan.length - 1 ? 'up' : 'down') + '"]';
    } else return;
    save(); paintList();
    if (phase === 'end') { idx = plan.length - 1; paintStage(); }
    else if (!runNow) loadBlock(0, planView);
    else if (removedCur) {
      if (i >= plan.length) finish(false);
      else if (phase === 'block') { loadBlock(i, false); }
      else { idx = i; applied = plan[idx].mins; paintStage(); }
    } else { idx = plan.indexOf(curObj); paintStage(); }
    var t = $(focus, list); if (t) t.focus();
    L.say(a === 'del' ? 'Block removed. ' + plan.length + ' blocks.' : 'Block moved.');
  });
  $('#tp-add').addEventListener('click', function () {
    if (plan.length >= 20) { msg.textContent = 'That is the most blocks you can add.'; return; }
    plan.push({ name: '', mins: 10, way: 'solo' }); save(); paintList(); paintStage();
    var t = $('#tp-n' + (plan.length - 1)); if (t) t.focus();
    L.say('Block ' + plan.length + ' added.');
  });
  $('#tp-reset').addEventListener('click', function () {
    if (!window.confirm('Go back to the default four blocks? Your current plan will be replaced and the lesson restarts.')) return;
    plan = copy(DEFAULT); save(); paintList(); loadBlock(0, true); L.say('Default plan restored.');
  });
  autochk.addEventListener('change', function () {
    auto = autochk.checked; save();
    if (phase === 'shift') { if (auto) { sd.set(30); sd.start(); } else sd.pause(); }
    paintStage();
  });
  L.copyLink($('#tp-link'), function () { return { plan: plan, auto: auto }; }, msg);
  L.fullscreen($('#fs'), stage);

  autochk.checked = auto;
  paintList();
  if (!restore()) loadBlock(0, true);
  if (fromLink) { $('#setup').open = true; msg.textContent = 'Plan loaded from the link.'; }
})();
