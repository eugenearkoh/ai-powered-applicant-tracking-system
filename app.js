(function () {
  'use strict';
  var KEY = 'ats-tracker-v1';
  var STATUSES = ['Applied', 'Interview', 'Selected', 'Rejected'];
  var STOP = new Set(('a an the and or of to in for with on at by from is are was were be been as it this that these those we you your our will can i have has had not but if they their them than then into over under about using use used work working experience years year team ability strong skills skill etc').split(' '));

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function isoDate(offsetDays) {
    var d = new Date(); d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- storage ---------- */
  function seed() {
    var j1 = uid(), j2 = uid();
    return {
      jobs: [
        { id: j1, title: 'Frontend Developer', deadline: isoDate(5), description: 'Build responsive web interfaces with JavaScript, React, HTML and CSS. Collaborate with designers, write tests, optimize performance and accessibility.' },
        { id: j2, title: 'Data Analyst', deadline: isoDate(-1), description: 'Analyze datasets with SQL and Python, build dashboards, communicate insights, and support decisions with statistics and visualization.' }
      ],
      applicants: [
        { id: uid(), name: 'Maya Santos', email: 'maya@example.com', jobId: j1, status: 'Interview', created: Date.now() - 3e5, resume: 'Frontend engineer with JavaScript, React, HTML, CSS. Built accessible responsive interfaces and optimized performance. Wrote unit tests.' },
        { id: uid(), name: 'Liam Cruz', email: 'liam@example.com', jobId: j1, status: 'Applied', created: Date.now() - 2e5, resume: 'Backend developer using Java and PostgreSQL. Some HTML and CSS knowledge. Built REST APIs.' },
        { id: uid(), name: 'Ava Reyes', email: 'ava@example.com', jobId: j2, status: 'Applied', created: Date.now() - 1e5, resume: 'Analyst skilled in SQL, Python, statistics and dashboards. Presented insights and data visualization to leadership.' }
      ]
    };
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.jobs) && Array.isArray(d.applicants)) return d;
    } catch (e) { /* ignore */ }
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  var state = load();

  /* ---------- AI similarity (TF-IDF + cosine) ---------- */
  function tokens(t) {
    var m = String(t).toLowerCase().match(/[a-z][a-z0-9+#.]*[a-z0-9+#]|[a-z]/g) || [];
    return m.filter(function (w) { return w.length > 1 && !STOP.has(w); });
  }
  function computeScores() {
    var jobDocs = state.jobs.map(function (j) { return tokens(j.title + ' ' + j.description); });
    var appDocs = state.applicants.map(function (a) { return tokens(a.resume); });
    var all = jobDocs.concat(appDocs), df = {}, N = all.length || 1;
    all.forEach(function (d) { new Set(d).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
    function vec(d) {
      var tf = {}, v = {};
      d.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      Object.keys(tf).forEach(function (w) { v[w] = (1 + Math.log(tf[w])) * (Math.log((N + 1) / (df[w] + 1)) + 1); });
      return v;
    }
    function norm(v) { var s = 0; for (var w in v) s += v[w] * v[w]; return Math.sqrt(s); }
    function cos(a, b) {
      var na = norm(a), nb = norm(b), s = 0;
      if (!na || !nb) return 0;
      for (var w in a) if (b[w]) s += a[w] * b[w];
      return s / (na * nb);
    }
    var jv = {};
    state.jobs.forEach(function (j, i) { jv[j.id] = vec(jobDocs[i]); });
    var out = {};
    state.applicants.forEach(function (a, i) {
      out[a.id] = jv[a.jobId] ? Math.round(cos(vec(appDocs[i]), jv[a.jobId]) * 100) : 0;
    });
    return out;
  }
  function band(s) {
    if (s >= 30) return { label: 'Strong match', cls: 'ok' };
    if (s >= 15) return { label: 'Possible match', cls: 'warn' };
    return { label: 'Weak match', cls: 'bad' };
  }

  /* ---------- deadlines ---------- */
  function deadlineInfo(dateStr) {
    var end = new Date(dateStr + 'T23:59:59');
    var days = Math.ceil((end - new Date()) / 864e5);
    if (isNaN(days)) return { label: 'No deadline', cls: 'mute' };
    if (days < 0) return { label: 'Closed ' + Math.abs(days) + ' day(s) ago', cls: 'bad' };
    if (days === 0) return { label: 'Closes today', cls: 'warn' };
    if (days <= 3) return { label: 'Closes in ' + days + ' day(s)', cls: 'warn' };
    return { label: 'Closes in ' + days + ' days', cls: 'ok' };
  }
  function jobById(id) { return state.jobs.filter(function (j) { return j.id === id; })[0]; }

  /* ---------- render ---------- */
  function render() {
    var scores = computeScores();
    renderStats();
    renderJobSelects();
    renderJobs(scores);
    renderApplicants(scores);
  }
  function renderStats() {
    var c = {}; STATUSES.forEach(function (s) { c[s] = 0; });
    state.applicants.forEach(function (a) { if (c[a.status] != null) c[a.status]++; });
    var html = '<div class="stat"><b>' + state.applicants.length + '</b><span>Total applicants</span></div>';
    STATUSES.forEach(function (s) { html += '<div class="stat"><b>' + c[s] + '</b><span>' + s + '</span></div>'; });
    html += '<div class="stat"><b>' + state.jobs.length + '</b><span>Open jobs</span></div>';
    $('stats').innerHTML = html;
  }
  function renderJobSelects() {
    var opts = state.jobs.map(function (j) { return '<option value="' + esc(j.id) + '">' + esc(j.title) + '</option>'; }).join('');
    var cur = $('appJob').value;
    $('appJob').innerHTML = opts || '<option value="">Add a job first</option>';
    if (cur) $('appJob').value = cur;
    var fj = $('fJob').value || 'all';
    $('fJob').innerHTML = '<option value="all">All jobs</option>' + opts;
    $('fJob').value = state.jobs.some(function (j) { return j.id === fj; }) ? fj : 'all';
    var fs = $('fStatus').value || 'all';
    $('fStatus').innerHTML = '<option value="all">All statuses</option>' + STATUSES.map(function (s) { return '<option>' + s + '</option>'; }).join('');
    $('fStatus').value = fs;
  }
  function renderJobs(scores) {
    if (!state.jobs.length) { $('jobs').innerHTML = '<p class="empty">No jobs yet. Add a job opening above.</p>'; return; }
    $('jobs').innerHTML = state.jobs.map(function (j) {
      var d = deadlineInfo(j.deadline);
      var top = state.applicants
        .filter(function (a) { return a.jobId === j.id && a.status !== 'Rejected'; })
        .sort(function (a, b) { return scores[b.id] - scores[a.id]; }).slice(0, 3);
      var recs = top.length
        ? '<ol class="recs">' + top.map(function (a) { return '<li>' + esc(a.name) + ' (' + scores[a.id] + '%, ' + band(scores[a.id]).label.toLowerCase() + ')</li>'; }).join('') + '</ol>'
        : '<p>No active applicants yet.</p>';
      return '<article class="item"><div class="row"><h3>' + esc(j.title) + '</h3>' +
        '<span class="badge ' + d.cls + '">' + esc(d.label) + '</span></div>' +
        '<p>Deadline: ' + esc(j.deadline) + '</p><p>' + esc(j.description) + '</p>' +
        '<strong style="font-family:system-ui,sans-serif;font-size:.9rem">Recommended candidates</strong>' + recs +
        '<p><button class="btn ghost" data-del-job="' + esc(j.id) + '">Delete job</button></p></article>';
    }).join('');
  }
  function renderApplicants(scores) {
    var q = $('fSearch').value.trim().toLowerCase(), fj = $('fJob').value, fs = $('fStatus').value, sort = $('fSort').value;
    var list = state.applicants.filter(function (a) {
      if (fj !== 'all' && a.jobId !== fj) return false;
      if (fs !== 'all' && a.status !== fs) return false;
      if (q && (a.name + ' ' + a.email + ' ' + a.resume).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'newest') return b.created - a.created;
      return scores[b.id] - scores[a.id];
    });
    if (!list.length) { $('applicants').innerHTML = '<p class="empty">No applicants match. Add one above or adjust the filters.</p>'; return; }
    $('applicants').innerHTML = list.map(function (a) {
      var j = jobById(a.jobId), s = scores[a.id], b = band(s);
      var opts = STATUSES.map(function (st) { return '<option' + (st === a.status ? ' selected' : '') + '>' + st + '</option>'; }).join('');
      return '<article class="item"><div class="row"><div><h3>' + esc(a.name) + '</h3><p>' + esc(a.email) + ' · ' + esc(j ? j.title : 'Job removed') + '</p></div>' +
        '<div><span class="score">' + s + '%</span> <span class="badge ' + b.cls + '">' + b.label + '</span><div class="bar"><i style="width:' + Math.min(100, s) + '%"></i></div></div></div>' +
        '<p>' + esc(a.resume.length > 220 ? a.resume.slice(0, 220) + '…' : a.resume) + '</p>' +
        '<div class="row"><label>Status<select data-status="' + esc(a.id) + '">' + opts + '</select></label>' +
        '<button class="btn ghost" data-del-app="' + esc(a.id) + '">Remove</button></div></article>';
    }).join('');
  }

  /* ---------- events ---------- */
  $('jobForm').addEventListener('submit', function (e) {
    e.preventDefault();
    state.jobs.push({ id: uid(), title: $('jobTitle').value.trim(), deadline: $('jobDeadline').value, description: $('jobDesc').value.trim() });
    save(); e.target.reset(); render();
  });
  $('appForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!$('appJob').value) { alert('Add a job opening first.'); return; }
    state.applicants.push({ id: uid(), name: $('appName').value.trim(), email: $('appEmail').value.trim(), jobId: $('appJob').value, resume: $('appResume').value.trim(), status: 'Applied', created: Date.now() });
    save(); e.target.reset(); render();
  });
  $('appFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { $('appResume').value = String(r.result); };
    r.onerror = function () { alert('Could not read that file. Paste the resume text instead.'); };
    r.readAsText(f);
  });
  document.addEventListener('change', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-status');
    if (!id) return;
    state.applicants.forEach(function (a) { if (a.id === id) a.status = e.target.value; });
    save(); render();
  });
  document.addEventListener('click', function (e) {
    var dj = e.target.getAttribute && e.target.getAttribute('data-del-job');
    var da = e.target.getAttribute && e.target.getAttribute('data-del-app');
    if (dj && confirm('Delete this job and its applicants?')) {
      state.jobs = state.jobs.filter(function (j) { return j.id !== dj; });
      state.applicants = state.applicants.filter(function (a) { return a.jobId !== dj; });
      save(); render();
    }
    if (da && confirm('Remove this applicant?')) {
      state.applicants = state.applicants.filter(function (a) { return a.id !== da; });
      save(); render();
    }
  });
  ['fSearch', 'fJob', 'fStatus', 'fSort'].forEach(function (id) {
    $(id).addEventListener('input', function () { renderApplicants(computeScores()); });
  });

  render();
})();
