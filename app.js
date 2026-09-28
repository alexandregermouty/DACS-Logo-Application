/* DACS logo assessment tool - user interface. Vanilla JavaScript, no build step, no network calls. */
(function () {
  "use strict";
  const C = window.DACS_CONFIG, M = window.DACS_MODEL, IO = window.DACS_IO;
  const STORE_KEY = "dacs-logo-tool-v1";
  const app = document.getElementById("app");

  /* ------------------------------------------------------------------ state */
  const state = {
    role: "secretariat", wg: "WG1",
    workspace: { requests: [], settings: { userName: "", keepCopy: true }, source: "", savedFileAt: "", dirty: false },
    review: { pack: null, answers: {}, reviewer: "", exportedAt: "" },
    ui: { filters: { q: "", status: "", level: "", gate: "", rec: "", wg: "", decision: "" }, sort: { key: "formId", dir: 1 }, pendingImport: null }
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      Object.assign(state, { role: s.role || "secretariat", wg: s.wg || "WG1" });
      if (s.workspace) Object.assign(state.workspace, s.workspace);
      if (s.review) Object.assign(state.review, s.review);
    } catch (e) { /* storage unavailable: the tool still works for this session */ }
  }
  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        if (!state.workspace.settings.keepCopy) { localStorage.removeItem(STORE_KEY); return; }
        localStorage.setItem(STORE_KEY, JSON.stringify({ role: state.role, wg: state.wg, workspace: state.workspace, review: state.review }));
      } catch (e) { /* ignore */ }
    }, 250);
  }
  function touch(markDirty = true) { if (markDirty) state.workspace.dirty = true; persist(); renderSaveState(); }

  const isSec = () => state.role === "secretariat";
  const body = () => (state.role === "wg" ? state.wg : state.role === "smc" ? "SMC" : state.role === "esc" ? "ESC" : "Secretariat");
  const who = () => (isSec() ? (state.workspace.settings.userName || "Secretariat") : (state.review.reviewer || body()));
  const requests = () => (isSec() ? state.workspace.requests : (state.review.pack ? state.review.pack.requests : []));
  const find = (id) => requests().find((r) => String(r.formId) === String(id));
  const hasData = () => requests().length > 0;
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------------------------------------------------------------- helpers */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => { if (!d) return ""; const x = new Date(d + (d.length === 10 ? "T00:00:00" : "")); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
  const fmtScore = (s) => (s === null || s === undefined ? "–" : Number(s).toFixed(2));
  const toneOfDecision = (d) => ({ "Approved": "good", "Approved with conditions": "info", "Refused": "critical", "Withdrawn": "neutral" }[d] || "neutral");
  const toneOfGate = (g) => ({ PASS: "good", HOLD: "warning", BLOCK: "critical" }[g] || "neutral");
  const toneOfStatus = (s) => (/^[1-3]/.test(s) ? "info" : /^4/.test(s) ? "warning" : /^[56]/.test(s) ? "good" : "neutral");
  const badge = (text, tone, plain) => (text ? `<span class="badge tone-${tone}${plain ? " plain" : ""}">${esc(text)}</span>` : "");
  function toast(msg, err) {
    const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 3200);
  }
  function getPath(o, p) { return p.split(".").reduce((a, k) => (a == null ? a : a[k]), o); }
  function setPath(o, p, v) { const ks = p.split("."); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }
  const opt = (list, cur, blankLabel) => (blankLabel !== undefined ? `<option value="">${esc(blankLabel)}</option>` : "") + list.map((v) => `<option ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("");

  /* ------------------------------------------------------------- chrome */
  function renderChrome() {
    const role = C.roles[state.role];
    document.getElementById("rolePill").innerHTML = `<span class="role-dot"></span>${esc(role.short)}${state.role === "wg" ? " · " + esc(state.wg) : ""}`;
    const nav = document.getElementById("navLinks");
    const r = location.hash || "#/";
    const items = isSec()
      ? [["#/dashboard", "Dashboard"], ["#/requests", "Requests", state.workspace.requests.length], ["#/exchange", "Review packs & files"], ["#/method", "Methodology"]]
      : [["#/requests", "Requests for review", requests().length], ["#/exchange", "My response"], ["#/method", "Methodology"]];
    nav.innerHTML = (hasData() ? items : [["#/", "Start"], ["#/method", "Methodology"]])
      .map(([h, l, n]) => `<a href="${h}" class="${r.startsWith(h) && h !== "#/" || r === h ? "active" : ""}">${l}${n !== undefined ? `<span class="count">${n}</span>` : ""}</a>`).join("");
    renderSaveState();
  }
  function renderSaveState() {
    const el = document.getElementById("saveState"); if (!el) return;
    if (!hasData()) { el.innerHTML = ""; el.className = "save-state"; return; }
    if (isSec()) {
      const d = state.workspace.dirty;
      el.className = "save-state" + (d ? " dirty" : "");
      el.innerHTML = d ? `Unsaved changes <button class="btn small" data-action="save-workspace">Save workspace file</button>` : (state.workspace.savedFileAt ? "Workspace file saved " + fmtDate(state.workspace.savedFileAt.slice(0, 10)) : "");
    } else {
      const n = Object.values(state.review.answers).filter((a) => a.opinion).length;
      el.className = "save-state"; el.innerHTML = `${n} of ${requests().length} answered <a class="btn small" href="#/exchange">Send response</a>`;
    }
  }

  /* ---------------------------------------------------------------- router */
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [page, arg] = h.split("/");
    renderChrome();
    window.scrollTo(0, 0);
    if (page === "method") return renderMethod();
    if (!hasData()) return renderStart();
    switch (page) {
      case "dashboard": return isSec() ? renderDashboard() : renderRequests();
      case "requests": return renderRequests();
      case "request": return renderRequest(arg);
      case "exchange": return renderExchange();
      default: return isSec() ? renderDashboard() : renderRequests();
    }
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }

  /* ------------------------------------------------------ identity artwork */
  /* Collage of the identity: ice photography seen through white-edged wave bands, on the navy topographic field. */
  function heroArt() {
    const c1 = "M0,70 C110,80 170,150 270,168 S440,205 600,300";
    const c2 = "M0,150 C115,160 180,228 280,246 S450,282 600,372";
    const c3 = "M0,236 C120,246 190,312 292,330 S460,366 600,452";
    const below = (d) => d + " L600,460 L0,460 Z";
    return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <clipPath id="hA"><path d="${below(c1)}"/></clipPath>
        <clipPath id="hB"><path d="${below(c2)}"/></clipPath>
        <clipPath id="hC"><path d="${below(c3)}"/></clipPath>
      </defs>
      <g clip-path="url(#hA)"><image href="assets/img/ice-cave.jpg" x="-120" y="-40" width="820" height="546" preserveAspectRatio="xMidYMid slice"/></g>
      <g clip-path="url(#hB)"><image href="assets/img/ice-cave.jpg" x="-260" y="-10" width="900" height="600" preserveAspectRatio="xMidYMid slice"/><rect width="600" height="460" fill="#8ED2EE" opacity=".18"/></g>
      <g clip-path="url(#hC)"><rect width="600" height="460" fill="#EAEAEA"/></g>
      <path d="${c1}" fill="none" stroke="#fff" stroke-width="9"/>
      <path d="${c2}" fill="none" stroke="#fff" stroke-width="6"/>
      <path d="${c3}" fill="none" stroke="#fff" stroke-width="3"/>
    </svg>`;
  }
  /* Level illustrations: waves (Level 1), angular mountain (Level 2), the mountain of the emblem (Level 3). */
  function levelArt(i) {
    if (i === 0) return `<svg viewBox="0 0 400 92" preserveAspectRatio="none" aria-hidden="true"><rect width="400" height="92" fill="#8ED2EE"/>
      <path d="M0 30 C 90 26, 150 52, 230 60 S 350 62, 400 60 L400 92 L0 92 Z" fill="#EAEAEA"/><path d="M0 44 C 90 40, 160 66, 240 72 S 350 74, 400 74 L400 92 L0 92 Z" fill="#3570A8"/><path d="M0 64 C 100 60, 180 76, 260 82 S 360 86, 400 86 L400 92 L0 92 Z" fill="#23315F"/></svg>`;
    if (i === 1) return `<svg viewBox="0 0 400 92" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="skyL2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4F86BA"/><stop offset="1" stop-color="#8ACAE3"/></linearGradient></defs>
      <rect width="400" height="92" fill="url(#skyL2)"/><path d="M0 36 L118 14 L250 60 L0 72 Z" fill="#26335F"/><path d="M0 72 L400 54 L400 92 L0 92 Z" fill="#3570A8"/><path d="M0 82 L400 92 L0 92 Z" fill="#EAEAEA"/></svg>`;
    return `<svg viewBox="0 0 400 92" preserveAspectRatio="none" aria-hidden="true"><rect width="400" height="92" fill="#23315F"/>
      <path d="M40 92 L170 12 L212 40 L226 30 L360 92 Z" fill="#003760" stroke="#8ED2EE" stroke-width="1.5"/><path d="M140 31 L170 12 L186 30 L170 26 Z" fill="#EAEAEA"/>
      <path d="M0 70 C 120 64, 240 84, 400 76 L400 92 L0 92 Z" fill="#8ED2EE" opacity=".9"/></svg>`;
  }

  /* ----------------------------------------------------------------- start */
  function renderStart() {
    app.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <span class="eyebrow">Decade of Action for Cryospheric Sciences 2025–2034</span>
          <h1>Assessing requests to use the Decade logo</h1>
          <p>A shared workspace for the UNESCO Secretariat, the Working Group leadership, the Strategic Management Committee and the Executive Steering Committee. It applies the hard gates, the six weighted criteria and the decision bands of the internal methodology, and routes each request along the approval chain of its level.</p>
          <p><b>Your files stay on this computer.</b> The tool runs entirely in your browser and never uploads anything.</p>
        </div>
        <div class="hero-art" aria-hidden="true">${heroArt()}</div>
      </section>
      <div class="grid g3" style="margin-top:20px">
        <div class="card entry">
          <span class="who">UNESCO Secretariat</span>
          <h3>Open the request register</h3>
          <p>Load <i>DACS_Logo_Requests_Register_2026.xlsx</i>. Submissions, screening, scores and decisions already recorded are read from the "Requests" sheet.</p>
          <div class="drop" data-drop="register">Drop the .xlsx here or <button class="btn small primary" data-action="pick" data-kind="register">Choose file</button></div>
        </div>
        <div class="card entry e2">
          <span class="who">UNESCO Secretariat</span>
          <h3>Continue from a workspace file</h3>
          <p>Open the workspace file (.json) saved at the end of your last session, from SharePoint or your computer.</p>
          <div class="drop" data-drop="workspace">Drop the .json here or <button class="btn small primary" data-action="pick" data-kind="workspace">Choose file</button></div>
        </div>
        <div class="card entry e3">
          <span class="who">Working Groups · SMC · ESC</span>
          <h3>Open a review pack</h3>
          <p>Open the review pack (.json) sent to you by the Secretariat, give your opinion or decision on each request, then send the response file back.</p>
          <div class="drop" data-drop="pack">Drop the pack here or <button class="btn small primary" data-action="pick" data-kind="pack">Choose file</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-head"><div><h3>Try it with fictional examples</h3><p class="muted" style="margin:4px 0 0">Four invented requests (clearly marked as examples) show every stage: a pass, a hold, a Level 2 endorsement and a Level 3 flagship.</p></div>
        <div class="btn-row"><button class="btn" data-action="demo" data-as="secretariat">Explore as Secretariat</button><button class="btn" data-action="demo" data-as="wg">Explore as WG1 lead</button><button class="btn" data-action="demo" data-as="smc">Explore as SMC member</button></div></div>
      </div>`;
    bindDrops();
  }

  /* ------------------------------------------------------------- dashboard */
  function counts() {
    const rs = state.workspace.requests;
    const pending = rs.filter((r) => !r.decision.final || r.decision.final === "Pending").length;
    const approved = rs.filter((r) => /^Approved/.test(r.decision.final)).length;
    const hold = rs.filter((r) => M.gateOutcome(r) === "HOLD" || r.follow.status === "4 - Awaiting applicant").length;
    const noReviewer = rs.filter((r) => !r.screen.reviewer).length;
    const scores = rs.map(M.weightedScore).filter((s) => s !== null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { total: rs.length, pending, approved, hold, noReviewer, avg };
  }
  function barList(entries, title) {
    const max = Math.max(1, ...entries.map((e) => e[1]));
    return `<div class="bars" role="list" aria-label="${esc(title)}">${entries.map(([k, v]) => `
      <div class="bar-row" role="listitem" title="${esc(k)}: ${v} request${v === 1 ? "" : "s"}">
        <span class="name">${esc(k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(v / max) * 100}%"></span></span><span class="n">${v}</span>
      </div>`).join("")}</div>`;
  }
  function renderDashboard() {
    const rs = state.workspace.requests, k = counts();
    const by = (fn, order) => { const m = new Map((order || []).map((o) => [o, 0])); rs.forEach((r) => [].concat(fn(r)).forEach((x) => { if (x) m.set(x, (m.get(x) || 0) + 1); })); return [...m.entries()]; };
    const statusBars = by((r) => r.follow.status, C.statuses);
    const levelBars = by((r) => r.assess.level || "Not yet retained", ["Level 1", "Level 2", "Level 3", "Not yet retained"]);
    const wgBars = by((r) => (r.wg.groups.length ? r.wg.groups : r.wg.needed === "No" ? "None - Secretariat" : []), [...Object.keys(C.workingGroups), "None - Secretariat"]);
    const recBars = by((r) => { const x = M.recommendation(r); return x ? x.label : "Not yet scored"; }, [...C.bands.map((b) => b.label), C.holdLabel, C.blockedLabel, "Not yet scored"]);
    const attention = rs.map((r) => {
      const why = [];
      const tl = M.timeline(r);
      if (!r.screen.reviewer) why.push(["No reviewer assigned", "warning"]);
      if (M.gateOutcome(r) === "HOLD") why.push(["Hard gate on hold", "warning"]);
      if (M.gateOutcome(r) === "BLOCK") why.push(["Hard gate blocks", "critical"]);
      if (tl && tl.state === "overdue") why.push([`${tl.elapsed} working days (target ${tl.target})`, "critical"]);
      if (r.wg.sent) { const missing = r.wg.groups.filter((g) => !r.reviews.some((v) => v.body === g)); if (missing.length) why.push(["Awaiting " + missing.join(", ") + " opinion", "info"]); }
      if (r.screen.acknowledged !== "Yes") why.push(["Not acknowledged", "neutral"]);
      return { r, why };
    }).filter((x) => x.why.length && (!x.r.decision.final || x.r.decision.final === "Pending"));

    app.innerHTML = `
      <div class="page-head"><div><h1>Dashboard</h1><p>${esc(state.workspace.source || "")}</p></div>
        <div class="btn-row"><a class="btn" href="#/requests">All requests</a><a class="btn primary" href="#/exchange">Prepare a review pack</a></div></div>
      <div class="grid g6">
        <div class="kpi"><div class="l">Requests received</div><div class="v">${k.total}</div></div>
        <div class="kpi"><div class="l">Awaiting a decision</div><div class="v">${k.pending}</div></div>
        <div class="kpi good"><div class="l">Approved</div><div class="v">${k.approved}</div><div class="s">with or without conditions</div></div>
        <div class="kpi warn"><div class="l">On hold</div><div class="v">${k.hold}</div><div class="s">gate to verify or awaiting applicant</div></div>
        <div class="kpi warn"><div class="l">Awaiting a reviewer</div><div class="v">${k.noReviewer}</div></div>
        <div class="kpi"><div class="l">Average weighted score</div><div class="v">${fmtScore(k.avg)}</div><div class="s">out of 5, scored requests</div></div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Requests by status</h3></div>${barList(statusBars, "Requests by status")}</div>
        <div class="card"><div class="card-head"><h3>First screening result</h3></div>${barList(recBars, "First screening result")}</div>
        <div class="card"><div class="card-head"><h3>Level retained</h3></div>${barList(levelBars, "Level retained")}</div>
        <div class="card"><div class="card-head"><h3>Working Group consulted</h3><span class="muted" style="font-size:12.5px">a request may involve several</span></div>${barList(wgBars, "Working Group consulted")}</div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-head"><h3>Needs attention</h3><span class="muted">${attention.length} open request${attention.length === 1 ? "" : "s"}</span></div>
        ${attention.length ? `<div class="table-wrap" style="box-shadow:none"><table class="data"><thead><tr><th>Ref. no.</th><th>Activity</th><th>Why</th></tr></thead><tbody>
          ${attention.map(({ r, why }) => `<tr class="row" data-open="${r.formId}"><td class="ref">${esc(r.ref)}</td><td class="title-cell"><b>${esc(r.sub.title)}</b><span>${esc(r.sub.organisation)}</span></td><td><div class="chips">${why.map(([w, t]) => badge(w, t)).join("")}</div></td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty">Nothing is waiting.</p>`}
      </div>`;
  }

  /* -------------------------------------------------------------- requests */
  function rowData(r) {
    const tl = M.timeline(r);
    return { r, gate: M.gateOutcome(r), score: M.weightedScore(r), rec: M.recommendation(r), tl, stage: M.stage(r) };
  }
  function renderRequests() {
    const f = state.ui.filters;
    let rows = requests().map(rowData);
    const q = f.q.trim().toLowerCase();
    rows = rows.filter(({ r, gate, rec }) =>
      (!q || [r.ref, r.sub.title, r.sub.organisation, r.sub.country, r.sub.typeOfUse].join(" ").toLowerCase().includes(q)) &&
      (!f.status || r.follow.status === f.status) && (!f.level || (r.assess.level || "none") === f.level) &&
      (!f.gate || (gate || "none") === f.gate) && (!f.rec || (rec ? rec.label : "none") === f.rec) &&
      (!f.wg || r.wg.groups.includes(f.wg)) && (!f.decision || (r.decision.final || "Pending") === f.decision));
    const s = state.ui.sort;
    const keyOf = { formId: (x) => x.r.formId, title: (x) => x.r.sub.title.toLowerCase(), level: (x) => x.r.assess.level, score: (x) => x.score ?? -1, status: (x) => x.r.follow.status, days: (x) => (x.tl ? x.tl.elapsed : -1), decision: (x) => x.r.decision.final };
    rows.sort((a, b) => { const A = keyOf[s.key](a), B = keyOf[s.key](b); return (A > B ? 1 : A < B ? -1 : 0) * s.dir; });
    const th = (k, l) => `<th><button data-sort="${k}" aria-label="Sort by ${esc(l)}">${esc(l)}${s.key === k ? (s.dir > 0 ? " ▲" : " ▼") : ""}</button></th>`;
    const pack = state.review.pack;
    const answered = (r) => state.review.answers[r.formId] && state.review.answers[r.formId].opinion;
    app.innerHTML = `
      <div class="page-head"><div><h1>${isSec() ? "Requests" : "Requests for your review"}</h1>
        <p>${isSec() ? `${requests().length} requests in the workspace` : `Review pack from the Secretariat for the ${esc(C.roles[state.role].label)}${state.role === "wg" ? " (" + esc(state.wg) + " – " + esc(C.workingGroups[state.wg]) + ")" : ""}${pack && pack.due ? " · response requested by " + fmtDate(pack.due) : ""}`}</p></div>
        ${isSec() ? `<div class="btn-row"><button class="btn" data-action="export-summary">Export summary (.xlsx)</button></div>` : ""}</div>
      ${!isSec() && pack && pack.note ? `<div class="callout info" style="margin-bottom:14px"><b>Message from the Secretariat:</b> ${esc(pack.note)}</div>` : ""}
      <div class="toolbar">
        <input class="input search" type="search" placeholder="Search title, organisation, country, reference" value="${esc(f.q)}" data-filter="q" aria-label="Search">
        <select class="input" data-filter="status" aria-label="Status"><option value="">All statuses</option>${opt(C.statuses, f.status)}</select>
        <select class="input" data-filter="level" aria-label="Level"><option value="">All levels</option>${opt(["Level 1", "Level 2", "Level 3"], f.level)}<option value="none" ${f.level === "none" ? "selected" : ""}>Level not retained</option></select>
        <select class="input" data-filter="gate" aria-label="Gate outcome"><option value="">All gate outcomes</option>${opt(["PASS", "HOLD", "BLOCK"], f.gate)}</select>
        <select class="input" data-filter="wg" aria-label="Working Group"><option value="">All Working Groups</option>${opt(Object.keys(C.workingGroups), f.wg)}</select>
        <select class="input" data-filter="decision" aria-label="Decision"><option value="">All decisions</option>${opt(C.decisions, f.decision)}</select>
        ${Object.values(f).some(Boolean) ? `<button class="btn small" data-action="clear-filters">Clear</button>` : ""}
      </div>
      <div class="table-wrap"><table class="data">
        <thead><tr>${th("formId", "Ref. no.")}${th("title", "Activity")}${th("level", "Level")}<th>Gates</th>${th("score", "Score / 5")}<th>First screening result</th>${isSec() ? th("decision", "Decision") + th("status", "Status") + th("days", "Working days") : "<th>Your input</th>"}</tr></thead>
        <tbody>${rows.length ? rows.map(({ r, gate, score, rec, tl }) => `
          <tr class="row" data-open="${r.formId}">
            <td class="ref">${esc(r.ref)}</td>
            <td class="title-cell"><b>${esc(r.sub.title)}</b><span>${esc(r.sub.organisation)}${r.sub.country ? " · " + esc(r.sub.country) : ""}${r.sub.typeOfUse ? " · " + esc(r.sub.typeOfUse) : ""}</span></td>
            <td>${r.assess.level ? esc(r.assess.level) : '<span class="muted">–</span>'}</td>
            <td>${gate ? badge(gate, toneOfGate(gate)) : '<span class="muted">–</span>'}</td>
            <td class="num">${fmtScore(score)}</td>
            <td>${rec ? badge(rec.label, rec.tone) : '<span class="muted">Not yet scored</span>'}</td>
            ${isSec() ? `<td>${badge(r.decision.final || "Pending", toneOfDecision(r.decision.final))}</td><td>${badge(r.follow.status, toneOfStatus(r.follow.status), true)}</td>
            <td class="num">${tl ? `${tl.elapsed}${tl.target ? `<span class="muted" style="font-weight:400"> / ${tl.target}</span>` : ""}${tl.state === "overdue" ? " " + badge("late", "critical", true) : tl.state === "suspended" ? " " + badge("suspended", "warning", true) : ""}` : "–"}</td>`
              : `<td>${answered(r) ? badge(state.review.answers[r.formId].opinion, "good") : badge("To do", "warning")}</td>`}
          </tr>`).join("") : `<tr><td colspan="9" class="empty">No request matches these filters.</td></tr>`}
        </tbody></table></div>`;
  }

  /* --------------------------------------------------------- request detail */
  function field(r, path, label, type, opts = {}) {
    const v = getPath(r, path) ?? "";
    const dis = !isSec() || opts.readonly ? "disabled" : "";
    const hint = opts.hint ? `<span class="hint">${opts.hint}</span>` : "";
    if (type === "select") return `<label class="field">${esc(label)}<select data-bind="${path}" ${dis}>${opt(opts.list, v, opts.blank ?? "–")}</select>${hint}</label>`;
    if (type === "textarea") return `<label class="field">${esc(label)}<textarea data-bind="${path}" ${dis} rows="${opts.rows || 3}">${esc(v)}</textarea>${hint}</label>`;
    return `<label class="field">${esc(label)}<input type="${type}" data-bind="${path}" value="${esc(v)}" ${dis}>${hint}</label>`;
  }
  function chainHTML(r) {
    const lvl = r.assess.level; if (!lvl) return `<span class="muted">The approval chain appears once the level is retained.</span>`;
    const L = C.levels[lvl];
    const cur = { secretariat: 0, wg: 1, smc: 2, esc: 3, decision: 99 }[M.stage(r)];
    return `<div class="chain" aria-label="Approval chain">${L.chain.map((s, i) => `${i ? '<span class="arrow" aria-hidden="true">→</span>' : ""}<span class="step ${i < cur ? "done" : ""} ${i === cur ? "current" : ""} ${i === L.chain.length - 1 || (lvl === "Level 1" && i === 0) ? "decides" : ""}">${esc(s)}</span>`).join("")}${cur === 99 ? '<span class="arrow">→</span><span class="step done">Decided</span>' : ""}</div>
      <p class="hint" style="margin-top:8px">Decided by: <b>${esc(L.decidedBy)}</b>. ${esc(L.informed)}</p>`;
  }
  function headBadges(r) {
    const g = M.gateOutcome(r), rec = M.recommendation(r);
    return `${g ? badge("Gates " + g, toneOfGate(g)) : ""} ${rec ? badge(rec.label, rec.tone) : ""} ${badge(r.decision.final || "Pending", toneOfDecision(r.decision.final))} ${badge(r.follow.status, toneOfStatus(r.follow.status), true)}`;
  }
  function scoreCard(r) {
    const s = M.weightedScore(r), p = M.partialScore(r), rec = M.recommendation(r), g = M.gateOutcome(r);
    const pos = s === null ? null : (s / 5) * 100;
    return `<div class="card" id="scoreCard">
      <div class="card-head"><h3>Weighted score</h3><span class="muted" style="font-size:12.5px">${p.done}/${p.total} criteria scored</span></div>
      <div class="score-big">${g === "BLOCK" ? "–" : fmtScore(s)}<small> / 5</small></div>
      <div class="gauge" aria-hidden="true"><div class="gauge-marker">${pos !== null ? `<i style="left:${pos}%"></i>` : ""}</div>
        <div class="gauge-track"><span class="z1"></span><span class="z2"></span><span class="z3"></span><span class="z4"></span></div>
        <div class="gauge-scale"><span>0</span><span>2.00</span><span>3.00</span><span>4.00</span><span>5</span></div></div>
      <div style="margin-top:12px">${rec ? badge(rec.label, rec.tone) : '<span class="muted">Score all six criteria to obtain the recommendation.</span>'}</div>
      ${g === "HOLD" ? `<p class="hint" style="margin-top:8px">A hard gate is "To verify": the Secretariat reverts to the applicant before the score means anything.</p>` : ""}
      ${g === "BLOCK" ? `<p class="hint" style="margin-top:8px">A hard gate answered "Yes" means refusal, whatever the merits of the activity.</p>` : ""}
      ${rec && !/^Refuse|^Revert/.test(rec.label) && s !== null ? `<p class="hint" style="margin-top:8px">${esc((M.band(s) || {}).action || "")}</p>` : ""}
      <p class="hint" style="margin-top:8px">The score is a recommendation, not a decision. A reviewer may depart from the band, but must say why in the reviewer notes.</p>
    </div>`;
  }
  function timelineCard(r) {
    const tl = M.timeline(r);
    if (!tl) return `<div class="card"><h3>Indicative timeline</h3><p class="muted" style="margin-top:8px">No date of receipt recorded.</p></div>`;
    const t = today();
    const stateBadge = { "on-track": badge("On track", "good"), "due-soon": badge("Due soon", "warning"), overdue: badge("Beyond target", "critical"), suspended: badge("Suspended – awaiting applicant", "warning"), decided: badge("Decided", "neutral") }[tl.state];
    return `<div class="card">
      <div class="card-head"><h3>Indicative timeline</h3>${stateBadge}</div>
      <p style="font-size:14px"><b>${tl.elapsed}</b> working days since receipt${tl.target ? ` · target ${tl.target} for a complete Level 1 request` : " · Levels 2 and 3 follow the sessions of the governing bodies"}</p>
      <ol class="timeline">${tl.steps.map((s) => `<li class="${s.due <= t ? "past" : ""}"><i></i><span>${esc(s.step)}</span><span>${fmtDate(s.due)}</span></li>`).join("")}</ol>
      <p class="hint" style="margin-top:6px">Working days, counted from ${fmtDate(r.sub.received)}. The count is suspended while the Secretariat waits for the applicant.</p>
    </div>`;
  }
  function reviewerPanel(r) {
    if (isSec()) return "";
    const a = state.review.answers[r.formId] || {};
    const lvl = r.assess.level;
    const list = state.role === "wg" ? C.opinionOptions.wg : state.role === "smc" ? (lvl === "Level 3" ? C.opinionOptions.smcLevel3 : C.opinionOptions.smcLevel2) : C.opinionOptions.esc;
    const title = state.role === "wg" ? `${state.wg} opinion` : state.role === "smc" ? (lvl === "Level 3" ? "SMC recommendation to the ESC" : "SMC decision") : "ESC decision on the flagship designation";
    const guide = state.role === "wg"
      ? (lvl === "Level 1" ? "Level 1: the Secretariat decides, with the concurrence of your Working Group." : "A substantive written opinion on the claimed contribution to the main goals is required.")
      : state.role === "smc" ? "The SMC relies on the assessment of the Secretariat and the opinion of the Working Group, without repeating the assessment." : "The ESC decides on the recommendation of the SMC. Use of the UNESCO name and logo then requires clearance under 34 C/Resolution 86.";
    return `<div class="card" style="border:2px solid var(--accent)">
      <div class="card-head"><h3>${esc(title)}</h3>${a.opinion ? badge("Recorded", "good") : badge("To do", "warning")}</div>
      <p class="hint">${esc(guide)}</p>
      <div class="grid" style="gap:10px;margin-top:8px">
        <label class="field">Your ${state.role === "wg" ? "opinion" : state.role === "smc" && lvl === "Level 3" ? "recommendation" : "decision"}<select data-answer="opinion"><option value="">Choose…</option>${opt(list, a.opinion)}</select></label>
        <label class="field">Written opinion<textarea data-answer="text" rows="5" placeholder="Reasons, in particular on the contribution to the main goals retained">${esc(a.text || "")}</textarea></label>
        <label class="field">Conditions proposed <span class="hint">optional</span><textarea data-answer="conditions" rows="2">${esc(a.conditions || "")}</textarea></label>
      </div>
      <p class="hint" style="margin-top:8px">Saved in this browser as you type. Send everything at once from <a href="#/exchange">My response</a>.</p>
    </div>`;
  }
  function renderRequest(id) {
    const r = find(id);
    if (!r) { app.innerHTML = `<p class="empty">This request is not in the ${isSec() ? "workspace" : "review pack"}. <a href="#/requests">Back to the list</a></p>`; return; }
    const lvl = r.assess.level, L = lvl ? C.levels[lvl] : null, gate = M.gateOutcome(r);
    const declared = M.parseMGs(r.sub.mgsDeclared);
    const sug = M.suggestedWGs(r.assess.mgs);
    const list = requests(); const idx = list.indexOf(r);
    const prev = list[idx - 1], next = list[idx + 1];
    const rec = M.recommendation(r);
    const departs = rec && r.decision.final && r.decision.final !== "Pending" && !(
      (r.decision.final === "Approved" && rec.label === "Approve") || (r.decision.final === "Approved with conditions" && rec.label === "Approve with conditions") ||
      (r.decision.final === "Refused" && /^Refuse/.test(rec.label)) || r.decision.final === "Withdrawn");
    const sub = r.sub;

    app.innerHTML = `
      <div class="btn-row" style="justify-content:space-between;margin-bottom:6px">
        <a href="#/requests" class="btn small">← All requests</a>
        <div class="btn-row">${prev ? `<a class="btn small" href="#/request/${prev.formId}">← ${esc(prev.ref.slice(-3))}</a>` : ""}${next ? `<a class="btn small" href="#/request/${next.formId}">${esc(next.ref.slice(-3))} →</a>` : ""}<button class="btn small" data-action="print">Print assessment sheet</button></div>
      </div>
      <div class="card">
        <div class="detail-head">
          <div><span class="ref">${esc(r.ref)} · Form ID ${r.formId}</span>
            <h1>${esc(sub.title)}</h1>
            <div class="muted">${esc(sub.organisation)}${sub.country ? " · " + esc(sub.country) : ""}${sub.typeOfUse ? " · " + esc(sub.typeOfUse) : ""}${sub.received ? " · received " + fmtDate(sub.received) : ""}</div>
          </div>
          <div class="chips" id="headBadges" style="justify-content:flex-end">${headBadges(r)}</div>
        </div>
        <div style="margin-top:14px" id="chain">${chainHTML(r)}</div>
      </div>

      <div class="detail-layout">
        <div>
          <div class="card">
            <div class="card-head"><div class="card-title"><span class="section-num">1</span><h2>Submission</h2></div><span class="muted" style="font-size:12.5px">as submitted – the applicant's statement of record</span></div>
            <dl class="facts">
              ${isSec() || sub.applicant ? `<dt>Applicant</dt><dd>${esc(sub.applicant)}${sub.email ? ` · <a href="mailto:${esc(sub.email)}">${esc(sub.email)}</a>` : ""}</dd>` : ""}
              <dt>Level requested</dt><dd>${esc(sub.levelRequested || "Not stated")}</dd>
              <dt>Main goals declared</dt><dd>${esc(sub.mgsDeclared)}</dd>
              <dt>Where the logo will appear</dt><dd>${esc(sub.placements)}</dd>
              <dt>Intended start of use</dt><dd>${fmtDate(sub.startOfUse)}</dd>
              <dt>Link</dt><dd>${/^https?:\/\//.test(sub.url) ? `<a href="${esc(sub.url.split(/\s/)[0])}" target="_blank" rel="noopener noreferrer">${esc(sub.url)}</a>` : esc(sub.url)}</dd>
              <dt>Non-commercial declared</dt><dd>${esc(sub.nonCommercial)}</dd>
              <dt>Reuse limitation</dt><dd>${esc(sub.reuseLimitation) || '<span class="muted">None stated</span>'}</dd>
              <dt>Standards accepted</dt><dd>${esc(sub.standards)}</dd>
              <dt>Accuracy declaration</dt><dd>${esc(sub.accuracy)}</dd>
            </dl>
            <h4 style="margin:14px 0 6px">Description</h4><div class="quote">${esc(sub.description)}</div>
            <h4 style="margin:14px 0 6px">Stated link to the Decade</h4><div class="quote">${esc(sub.link)}</div>
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title"><span class="section-num">2</span><h2>Screening</h2></div>${gate ? badge("Gate outcome: " + gate, toneOfGate(gate)) : badge("Gates not complete", "neutral")}</div>
            <div class="grid g3">
              ${field(r, "screen.reviewer", "Assigned reviewer", "text")}
              ${field(r, "screen.acknowledged", "Acknowledged", "select", { list: ["Yes", "No"] })}
              ${field(r, "screen.completeness", "Submission complete?", "select", { list: C.completeness, hint: "Including the signed commitment letter" })}
            </div>
            <h3 style="margin:18px 0 4px">Hard gates</h3>
            <p class="hint">Examined before any merit is considered. One "Yes" means refusal, whatever the merits; one "To verify" suspends the assessment and the Secretariat reverts to the applicant.</p>
            ${C.gates.map((g) => `<div class="gate"><div><b>${esc(g.title)}</b><p>${esc(g.readsOn)}</p><p><i>${esc(g.effect)}</i></p></div>
              <div class="seg" role="group" aria-label="${esc(g.title)}">${C.gateAnswers.map((a) => `<button data-gate="${g.key}" data-v="${a}" class="${r.screen.gates[g.key] === a ? "on" : ""}" ${isSec() ? "" : "disabled"} aria-pressed="${r.screen.gates[g.key] === a}">${a}</button>`).join("")}</div></div>`).join("")}
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title"><span class="section-num">3</span><h2>Assessment</h2></div></div>
            <div class="grid g2">
              ${field(r, "assess.level", "Level retained", "select", { list: ["Level 1", "Level 2", "Level 3"], hint: "The level declared by the applicant is not binding; the Secretariat may reclassify and informs the applicant." })}
              ${field(r, "assess.primaryOC", "Primary overarching challenge", "select", { list: Object.keys(C.overarchingChallenges) })}
            </div>
            ${L ? `<div class="callout info" style="margin-top:12px"><b>${esc(lvl)} – ${esc(L.name)}.</b> ${esc(L.marks)}. ${esc(L.nature)}<br><b>Authorisation period:</b> ${esc(L.period)}${L.clearance ? `<br><b>Institutional clearance:</b> ${esc(L.clearance)}` : ""}</div>` : ""}
            <h3 style="margin:18px 0 4px">Main goals retained by the Secretariat</h3>
            <p class="hint">Declared by the applicant: ${declared.length ? declared.join(", ") : "none"}. Retain only the main goals the activity actually serves.</p>
            <div class="chips" style="margin-top:8px">${Object.entries(C.mainGoals).map(([k, n]) => `<span class="chip ${r.assess.mgs.includes(k) ? "on" : ""} ${isSec() ? "" : "static"}" ${isSec() ? `data-mg="${k}" role="button" tabindex="0" aria-pressed="${r.assess.mgs.includes(k)}"` : ""} title="${esc(n)}">${k}${declared.includes(k) ? " ✓" : ""}</span>`).join("")}</div>
            <p class="hint" style="margin-top:4px">✓ = declared by the applicant.</p>
            <h3 style="margin:18px 0 4px">Six weighted criteria</h3>
            <p class="scale-hint">${C.scale.map((s) => `<b>${s.v}</b> ${esc(s.label.toLowerCase())}`).join(" · ")}</p>
            ${C.criteria.map((c) => `<div class="crit"><div><span class="t">${esc(c.title)}</span><span class="w">${Math.round(c.weight * 100)}%</span><p>${esc(c.measures)}</p></div>
              <div class="seg score" role="group" aria-label="${esc(c.title)}">${[0, 1, 2, 3, 4, 5].map((v) => `<button data-score="${c.key}" data-v="${v}" class="${r.assess.scores[c.key] === v ? "on" : ""}" ${isSec() ? "" : "disabled"} title="${esc(C.scale.find((x) => x.v === v).label)}: ${esc(C.scale.find((x) => x.v === v).text)}" aria-pressed="${r.assess.scores[c.key] === v}">${v}</button>`).join("")}</div></div>`).join("")}
            <div style="margin-top:12px">${field(r, "assess.notes", "Reviewer notes", "textarea", { rows: 5, hint: "Reasoning, and the reason for any departure from the band." })}</div>
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title"><span class="section-num">4</span><h2>Working Group consultation</h2></div></div>
            <div class="grid g3">
              ${field(r, "wg.needed", "WG consultation needed?", "select", { list: ["Yes", "No"] })}
              ${field(r, "wg.sent", "Sent to WG", "date")}
              ${field(r, "wg.received", "WG opinion received", "date")}
            </div>
            <h4 style="margin:14px 0 6px">Working Groups consulted</h4>
            <div class="chips">${Object.keys(C.workingGroups).map((k) => `<span class="chip ${r.wg.groups.includes(k) ? "on" : ""} ${isSec() ? "" : "static"}" ${isSec() ? `data-wg="${k}" role="button" tabindex="0" aria-pressed="${r.wg.groups.includes(k)}"` : ""} title="${esc(C.workingGroups[k])}">${k}</span>`).join("")}</div>
            ${sug.groups.length ? `<p class="hint" style="margin-top:8px">Suggested from the main goals retained: <b>${sug.groups.join(", ")}</b>.${sug.outreachOnly ? " " + esc(C.consultationRule["MG5.2/5.3"]) : ""} Where a request claims main goals under more than one overarching challenge, a lead Working Group is designated to coordinate the opinion.</p>` : ""}
            <div style="margin-top:12px">${field(r, "wg.summary", "WG opinion – summary (for the register)", "textarea", { rows: 3 })}</div>
            <h3 style="margin:18px 0 8px">Opinions and decisions received</h3>
            ${r.reviews.length ? r.reviews.map((v) => `<div class="opinion"><div class="opinion-head"><b>${esc(v.body)}</b>${badge(v.opinion, /not|Do not/i.test(v.opinion) ? "critical" : /conditions/i.test(v.opinion) ? "info" : /Defer|Not for/i.test(v.opinion) ? "neutral" : "good")}<span class="muted" style="font-size:12.5px">${esc(v.reviewer || "")}${v.date ? " · " + fmtDate(v.date.slice(0, 10)) : ""}</span></div>
              ${v.text ? `<div style="white-space:pre-wrap;font-size:14px">${esc(v.text)}</div>` : ""}${v.conditions ? `<p class="hint" style="margin-top:6px"><b>Conditions proposed:</b> ${esc(v.conditions)}</p>` : ""}</div>`).join("") : `<p class="muted">None yet. ${isSec() ? 'Send a review pack from <a href="#/exchange">Review packs & files</a>.' : ""}</p>`}
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title"><span class="section-num">5</span><h2>Decision</h2></div>${L ? `<span class="muted" style="font-size:12.5px">decided by ${esc(L.decidedBy)}</span>` : ""}</div>
            <div class="grid g3">
              ${field(r, "decision.final", "Final decision", "select", { list: C.decisions, blank: undefined })}
              ${field(r, "decision.date", "Decision date", "date")}
              ${field(r, "decision.notified", "Applicant notified", "select", { list: ["Yes", "No"] })}
              ${field(r, "decision.from", "Authorised from", "date")}
              ${field(r, "decision.until", "Authorised until", "date", { hint: "No authorisation is open-ended." })}
            </div>
            <div id="decisionWarn">${decisionWarnings(r, departs)}</div>
            <div style="margin-top:12px">${field(r, "decision.conditions", "Conditions attached", "textarea", { rows: 4, hint: sub.reuseLimitation ? "The applicant stated a reuse limitation: it binds the Secretariat and must be copied here." : "" })}</div>
            <details style="margin-top:10px"><summary class="hint" style="cursor:pointer">Conditions attached to every authorisation</summary>
              <ul style="font-size:13.5px;color:var(--ink-2)"><li>No authorisation is open-ended. Each notice states a start date and an expiry date, and the applicant undertakes to cease use on expiry.</li><li>The authorisation covers the placements listed in the application. A new placement requires a written variation recorded in the register, or a new request.</li><li>The logo is used in its official form, with the requirements on clear space and minimum size.</li><li>The mark of the Decade is never combined with the mark of a sponsor.</li><li>Where the logo appears in audiovisual, audio or photographic materials, UNESCO and the Secretariat may reproduce and disseminate them through the channels of the Decade, subject to any limitation the applicant asked for in writing.</li></ul></details>
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title"><span class="section-num">6</span><h2>Follow-up</h2></div></div>
            <div class="grid g3">
              ${field(r, "follow.status", "Status", "select", { list: C.statuses, blank: undefined })}
              ${field(r, "follow.owner", "Owner", "text")}
              ${field(r, "follow.nextReview", "Next review date", "date")}
            </div>
            <div style="margin-top:12px">${field(r, "follow.action", "Follow-up action", "textarea", { rows: 3 })}</div>
            ${isSec() && r.log.length ? `<h4 style="margin:14px 0 6px">History</h4><ul class="log">${[...r.log].reverse().map((l) => `<li><time>${esc(l.at.slice(0, 16).replace("T", " "))}</time><b>${esc(l.by)}</b> – ${esc(l.what)}</li>`).join("")}</ul>` : ""}
          </div>
        </div>

        <aside class="side">
          ${reviewerPanel(r)}
          <div id="scoreSlot">${scoreCard(r)}</div>
          ${timelineCard(r)}
        </aside>
      </div>`;
  }
  function decisionWarnings(r, departs) {
    const w = [];
    if (r.decision.from && r.decision.until && r.decision.until < r.decision.from) w.push(["critical", "The authorisation ends before it starts."]);
    if (/^Approved/.test(r.decision.final) && !r.decision.until) w.push(["warning", "Set an expiry date: no authorisation is open-ended."]);
    if (/^Approved/.test(r.decision.final) && M.gateOutcome(r) !== "PASS") w.push(["critical", "The hard gates have not all been cleared."]);
    if (departs) w.push(["warning", "This decision departs from the band of the weighted score: record the reason in the reviewer notes."]);
    if (r.assess.level && r.assess.level !== "Level 1" && /^Approved|Refused/.test(r.decision.final) && !r.reviews.some((v) => v.body === (r.assess.level === "Level 2" ? "SMC" : "ESC")))
      w.push(["info", `At ${r.assess.level} the decision belongs to the ${r.assess.level === "Level 2" ? "Strategic Management Committee" : "Executive Steering Committee"}: record it once its decision has been received.`]);
    return w.map(([t, m]) => `<div class="callout ${t}" style="margin-top:10px">${esc(m)}</div>`).join("");
  }

  /* -------------------------------------------------------------- exchange */
  function eligible(bodyName) {
    const rs = state.workspace.requests;
    if (/^WG/.test(bodyName)) return rs.filter((r) => r.wg.groups.includes(bodyName));
    if (bodyName === "SMC") return rs.filter((r) => r.assess.level === "Level 2" || r.assess.level === "Level 3");
    if (bodyName === "ESC") return rs.filter((r) => r.assess.level === "Level 3");
    return [];
  }
  function renderExchange() { return isSec() ? renderExchangeSec() : renderExchangeReviewer(); }
  function renderExchangeSec() {
    const sel = state.ui.packBody || "WG1";
    const el = eligible(sel);
    const chosen = state.ui.packChosen || new Set(el.filter((r) => !r.reviews.some((v) => v.body === sel) && (!r.decision.final || r.decision.final === "Pending")).map((r) => r.formId));
    state.ui.packChosen = chosen;
    const pi = state.ui.pendingImport;
    app.innerHTML = `
      <div class="page-head"><div><h1>Review packs & files</h1><p>Exchange with the governing bodies, and keep the workspace safe.</p></div></div>
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><div class="card-title"><span class="section-num">A</span><h2>Send a review pack</h2></div></div>
          <p class="hint">A review pack is a file containing only the requests a body must examine, with the assessment of the Secretariat. Send it by email or share it on SharePoint; the reviewer opens it in this tool and returns a response file.</p>
          <div class="grid g2" style="margin-top:10px">
            <label class="field">Recipient<select id="packBody">${[...Object.keys(C.workingGroups).map((k) => [k, k + " – " + C.workingGroups[k]]), ["SMC", "Strategic Management Committee"], ["ESC", "Executive Steering Committee"]].map(([k, l]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
            <label class="field">Response requested by<input type="date" id="packDue" value="${esc(state.ui.packDue || M.iso(M.addWorkingDays(new Date(), 10)))}"><span class="hint">Methodology: 10 working days for a Working Group opinion.</span></label>
          </div>
          <label class="field" style="margin-top:10px">Message to the reviewers<textarea id="packNote" rows="2">${esc(state.ui.packNote || "")}</textarea></label>
          <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" id="packPersonal" ${state.ui.packPersonal ? "checked" : ""}> Include the applicant's name and email <span class="hint">(off by default: reviewers need the organisation, not the person's contact details)</span></label>
          <h4 style="margin:14px 0 6px">Requests in the pack (${chosen.size} of ${el.length} eligible)</h4>
          ${el.length ? `<div style="max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:8px">${el.map((r) => `<label style="display:flex;gap:10px;padding:8px 10px;border-top:1px solid var(--line);font-size:14px;align-items:flex-start"><input type="checkbox" data-pick="${r.formId}" ${chosen.has(r.formId) ? "checked" : ""}><span><span class="ref">${esc(r.ref)}</span> ${esc(r.sub.title)} ${r.assess.level ? badge(r.assess.level, "neutral", true) : ""} ${r.reviews.some((v) => v.body === sel) ? badge("already answered", "good") : ""}</span></label>`).join("")}</div>`
            : `<p class="muted">No request is currently referred to this body. ${/^WG/.test(sel) ? "Select the Working Groups consulted in section 4 of a request." : sel === "SMC" ? "The SMC examines requests retained at Level 2 or Level 3." : "The ESC examines requests retained at Level 3."}</p>`}
          <div class="btn-row" style="margin-top:12px"><button class="btn primary" data-action="make-pack" ${chosen.size ? "" : "disabled"}>Download review pack</button></div>
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title"><span class="section-num">B</span><h2>Import responses</h2></div></div>
          <p class="hint">Open one or several response files returned by the Working Groups, the SMC or the ESC. You will see what changes before anything is applied.</p>
          <div class="drop" data-drop="response" style="margin-top:10px">Drop response files here or <button class="btn small primary" data-action="pick" data-kind="response">Choose files</button></div>
          ${pi ? `<div style="margin-top:14px"><h4>${pi.items.length} input${pi.items.length === 1 ? "" : "s"} ready to import</h4>
            <table class="plain" style="margin-top:6px"><thead><tr><th>Request</th><th>From</th><th>Input</th><th>Effect</th></tr></thead><tbody>
            ${pi.items.map((it) => `<tr><td class="ref">${esc(it.ref)}</td><td>${esc(it.body)}<br><span class="hint">${esc(it.reviewer)}</span></td><td>${badge(it.opinion, "info")}</td><td style="font-size:13px">${esc(it.effect)}</td></tr>`).join("")}</tbody></table>
            ${pi.skipped.length ? `<p class="hint">${pi.skipped.length} input(s) skipped: ${esc(pi.skipped.join("; "))}</p>` : ""}
            <div class="btn-row" style="margin-top:10px"><button class="btn primary" data-action="apply-import">Apply</button><button class="btn" data-action="cancel-import">Cancel</button></div></div>` : ""}
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title"><span class="section-num">C</span><h2>Workspace</h2></div></div>
          <p class="hint">The workspace file holds everything recorded in this tool. Save it at the end of each session, on the Secretariat's SharePoint, next to the register. Never commit it to GitHub: it contains personal data.</p>
          <div class="btn-row" style="margin-top:10px"><button class="btn primary" data-action="save-workspace">Save workspace file (.json)</button><button class="btn" data-action="pick" data-kind="workspace">Open another workspace</button></div>
          <h4 style="margin:16px 0 6px">Refresh from the register</h4>
          <p class="hint">Reads new Form responses from the register. Submission data are refreshed; what you recorded here is kept.</p>
          <div class="btn-row"><button class="btn" data-action="pick" data-kind="register">Open register (.xlsx)</button></div>
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title"><span class="section-num">D</span><h2>Back to Excel</h2></div></div>
          <p class="hint"><b>Register update</b>: the reviewer columns at the same cell addresses as the "Requests" sheet, with the paste instructions. The register's formulas (gate outcome, deciding body, weighted score, first screening result) recalculate themselves.</p>
          <div class="btn-row" style="margin-top:8px"><button class="btn" data-action="export-register">Download register update (.xlsx)</button></div>
          <p class="hint" style="margin-top:14px"><b>Summary</b>: one readable row per request, for meetings and reporting to the SMC.</p>
          <div class="btn-row" style="margin-top:8px"><button class="btn" data-action="export-summary">Download summary (.xlsx)</button></div>
        </div>
      </div>`;
    bindDrops();
  }
  function renderExchangeReviewer() {
    const p = state.review.pack, rs = requests();
    const done = rs.filter((r) => state.review.answers[r.formId] && state.review.answers[r.formId].opinion);
    app.innerHTML = `
      <div class="page-head"><div><h1>My response</h1><p>Pack ${esc(p.packId)} · prepared by ${esc(p.from || "the Secretariat")} on ${fmtDate(p.createdAt.slice(0, 10))}${p.due ? " · response requested by " + fmtDate(p.due) : ""}</p></div></div>
      <div class="grid g2">
        <div class="card">
          <h3>Progress</h3>
          <p style="margin-top:8px"><b>${done.length}</b> of ${rs.length} requests answered.</p>
          <ul style="font-size:14px">${rs.map((r) => { const a = state.review.answers[r.formId]; return `<li><a href="#/request/${r.formId}">${esc(r.ref)}</a> ${esc(r.sub.title)} – ${a && a.opinion ? badge(a.opinion, "good") : badge("To do", "warning")}</li>`; }).join("")}</ul>
        </div>
        <div class="card">
          <h3>Send your response</h3>
          <label class="field" style="margin-top:10px">Your name and function<input type="text" id="reviewerName" value="${esc(state.review.reviewer)}" placeholder="e.g. Lead, ${esc(body())}"></label>
          <p class="hint" style="margin-top:8px">The response file contains only your inputs. Send it back to the Secretariat by email or through SharePoint; it can be sent in several instalments.</p>
          <div class="btn-row" style="margin-top:10px"><button class="btn primary" data-action="export-response" ${done.length ? "" : "disabled"}>Download response file</button><button class="btn" data-action="pick" data-kind="pack">Open another pack</button></div>
          ${state.review.exportedAt ? `<p class="hint" style="margin-top:8px">Last response file downloaded on ${fmtDate(state.review.exportedAt.slice(0, 10))}.</p>` : ""}
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------- methodology */
  function renderMethod() {
    app.innerHTML = `
      <div class="page-head"><div><h1>Methodology</h1><p>${esc(C.methodologyVersion)}. The tool applies these rules; change them in <code>assets/js/config.js</code>.</p></div></div>
      <div class="levels">${Object.entries(C.levels).map(([k, L], i) => `<div class="card level-card l${i + 1}"><span class="level-art">${levelArt(i)}</span><span class="tag">${esc(k)} · ${esc(L.name)}</span><h3 style="margin:6px 0">${esc(L.marks)}</h3><p style="font-size:14px">${esc(L.nature)}</p>
        <div class="chain" style="margin:10px 0">${L.chain.map((s, j) => `${j ? '<span class="arrow">→</span>' : ""}<span class="step ${j === L.chain.length - 1 || (i === 0 && j === 0) ? "decides" : ""}">${esc(s)}</span>`).join("")}</div>
        <p class="hint"><b>Decision:</b> ${esc(L.decidedBy)}. ${esc(L.informed)}</p><p class="hint"><b>Period:</b> ${esc(L.period)}</p></div>`).join("")}</div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-head"><div class="card-title"><span class="section-num">1</span><h2>Hard gates</h2></div></div>
          <table class="plain"><thead><tr><th>Gate</th><th>Reads on</th><th>Effect</th></tr></thead><tbody>${C.gates.map((g) => `<tr><td><b>${esc(g.title)}</b></td><td style="font-size:13px">${esc(g.readsOn)}</td><td style="font-size:13px">${esc(g.effect)}</td></tr>`).join("")}</tbody></table></div>
        <div class="card"><div class="card-head"><div class="card-title"><span class="section-num">2</span><h2>Six weighted criteria</h2></div></div>
          <div class="bars">${C.criteria.map((c) => `<div class="bar-row" style="grid-template-columns:minmax(0,1fr) 110px 40px" title="${esc(c.measures)}"><span class="name" style="white-space:normal">${esc(c.title)}</span><span class="bar-track"><span class="bar-fill" style="width:${c.weight * 400}%"></span></span><span class="n">${Math.round(c.weight * 100)}%</span></div>`).join("")}</div>
          <p class="hint" style="margin-top:10px">Each criterion is scored from 0 to 5: ${C.scale.map((s) => `${s.v} ${s.label.toLowerCase()}`).join(" · ")}. The weighted score is expressed out of five.</p></div>
        <div class="card"><div class="card-head"><div class="card-title"><span class="section-num">3</span><h2>Decision bands</h2></div></div>
          <table class="plain"><thead><tr><th>Weighted score</th><th>Recommendation</th><th>Action</th></tr></thead><tbody>${C.bands.map((b, i) => `<tr><td style="white-space:nowrap"><b>${i === 0 ? "4.00 and above" : i === C.bands.length - 1 ? "Below 2.00" : b.min.toFixed(2) + " to " + (C.bands[i - 1].min - 0.01).toFixed(2)}</b></td><td>${badge(b.label, b.tone)}</td><td style="font-size:13px">${esc(b.action)}</td></tr>`).join("")}</tbody></table></div>
        <div class="card"><div class="card-head"><div class="card-title"><span class="section-num">4</span><h2>Indicative timelines</h2></div></div>
          <table class="plain"><thead><tr><th>Step</th><th>Working days</th></tr></thead><tbody>${C.timeline.map((t) => `<tr><td>${esc(t.step)}${t.note ? `<br><span class="hint">${esc(t.note)}</span>` : ""}</td><td>${t.days}</td></tr>`).join("")}</tbody></table>
          <p class="hint" style="margin-top:8px">A complete Level 1 request is expected to be decided and notified within approximately ${C.level1TargetDays} working days of registration. Timelines are suspended while the Secretariat waits for the applicant.</p></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="card-head"><div class="card-title"><span class="section-num">5</span><h2>Referral to the Working Groups</h2></div></div>
        <table class="plain"><thead><tr><th>Main goals</th><th>Overarching challenge</th><th>Working Group</th><th>Consult the WG lead?</th></tr></thead><tbody>
        ${Object.keys(C.workingGroups).map((w, i) => `<tr><td>${Object.keys(C.mainGoals).filter((m) => m[2] === String(i + 1)).join(", ")}</td><td>OC${i + 1} ${esc(C.overarchingChallenges["OC" + (i + 1)])}</td><td><b>${w}</b></td><td style="font-size:13px">${esc(C.consultationRule[w] || (C.consultationRule["MG5.1"] + " MG5.2 and MG5.3: " + C.consultationRule["MG5.2/5.3"]))}</td></tr>`).join("")}</tbody></table>
        <p class="hint" style="margin-top:8px">Where a request claims main goals under more than one overarching challenge, it is referred to each Working Group concerned; a lead Working Group coordinates the opinion.</p></div>`;
  }

  /* ---------------------------------------------------------- file actions */
  const picker = document.getElementById("filePicker");
  function pick(kind) {
    picker.value = ""; picker.dataset.kind = kind;
    picker.accept = kind === "register" ? ".xlsx" : ".json,application/json";
    picker.multiple = kind === "response";
    picker.click();
  }
  picker.addEventListener("change", () => handleFiles(picker.dataset.kind, [...picker.files]));
  function bindDrops() {
    document.querySelectorAll("[data-drop]").forEach((d) => {
      d.addEventListener("dragover", (e) => { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", () => d.classList.remove("over"));
      d.addEventListener("drop", (e) => { e.preventDefault(); d.classList.remove("over"); handleFiles(d.dataset.drop, [...e.dataTransfer.files]); });
    });
  }
  async function handleFiles(kind, files) {
    if (!files.length) return;
    try {
      if (kind === "register") {
        const incoming = await IO.readRegister(files[0]);
        const res = IO.mergeRegister(state.workspace.requests, incoming, who());
        switchRole("secretariat");
        state.workspace.requests = res.requests;
        state.workspace.source = `Register ${files[0].name}, read ${fmtDate(today())}`;
        touch();
        toast(`${res.added} request(s) added, ${res.refreshed} refreshed from the register.`);
        go("#/dashboard");
      } else if (kind === "workspace") {
        const o = await IO.readJSON(files[0]);
        if (o.type !== "dacs-logo-workspace") throw new Error("This is not a workspace file" + (o.type === "dacs-logo-review-pack" ? " – it is a review pack: open it as a reviewer." : "."));
        switchRole("secretariat");
        state.workspace.requests = o.requests; state.workspace.settings = Object.assign(state.workspace.settings, o.settings || {});
        state.workspace.source = `Workspace ${files[0].name}, saved ${fmtDate((o.savedAt || "").slice(0, 10))}`;
        state.workspace.dirty = false; state.workspace.savedFileAt = o.savedAt || "";
        touch(false); toast(`${o.requests.length} requests loaded.`); go("#/dashboard");
      } else if (kind === "pack") {
        const o = await IO.readJSON(files[0]);
        if (o.type !== "dacs-logo-review-pack") throw new Error("This is not a review pack.");
        const role = /^WG/.test(o.body) ? "wg" : o.body === "SMC" ? "smc" : "esc";
        const samePack = state.review.pack && state.review.pack.packId === o.packId;
        state.review.pack = o; if (!samePack) { state.review.answers = {}; state.review.exportedAt = ""; }
        state.role = role; if (role === "wg") state.wg = o.body;
        touch(false); toast(`Review pack for ${o.body}: ${o.requests.length} request(s).`); go("#/requests");
      } else if (kind === "response") {
        const items = [], skipped = [];
        for (const f of files) {
          const o = await IO.readJSON(f);
          if (o.type !== "dacs-logo-review-response") { skipped.push(f.name + " is not a response file"); continue; }
          o.reviews.forEach((v) => {
            const r = state.workspace.requests.find((x) => x.formId === v.formId && x.ref === v.ref);
            if (!r) { skipped.push(v.ref + " not in workspace"); return; }
            items.push({ ...v, body: o.body, reviewer: o.reviewer, packId: o.packId, effect: effectOf(r, o.body, v.opinion) });
          });
        }
        state.ui.pendingImport = { items, skipped };
        renderExchange();
      }
    } catch (e) { console.error(e); toast(e.message || String(e), true); }
  }
  const DECISION_MAP = {
    "Endorse": "Approved", "Endorse with conditions": "Approved with conditions", "Do not endorse": "Refused",
    "Designate as flagship": "Approved", "Designate with conditions": "Approved with conditions", "Do not designate": "Refused"
  };
  function effectOf(r, b, opinion) {
    if (/^WG/.test(b)) return "Opinion added; WG opinion received date set when all Working Groups consulted have answered.";
    if (b === "SMC" && r.assess.level === "Level 2" && DECISION_MAP[opinion]) return `SMC decision: final decision set to "${DECISION_MAP[opinion]}".`;
    if (b === "SMC") return "SMC recommendation recorded" + (r.assess.level === "Level 3" ? "; the request can be sent to the ESC." : ".");
    if (b === "ESC" && DECISION_MAP[opinion]) return `ESC decision: final decision set to "${DECISION_MAP[opinion]}".`;
    return "Recorded.";
  }
  function applyImport() {
    const pi = state.ui.pendingImport; if (!pi) return;
    pi.items.forEach((it) => {
      const r = state.workspace.requests.find((x) => x.formId === it.formId);
      r.reviews = r.reviews.filter((v) => !(v.body === it.body && v.packId === it.packId));
      r.reviews.push({ body: it.body, opinion: it.opinion, text: it.text, conditions: it.conditions, reviewer: it.reviewer, date: it.date, packId: it.packId, importedAt: new Date().toISOString() });
      M.log(r, who(), `Imported ${it.body} input: ${it.opinion}`);
      if (/^WG/.test(it.body)) {
        const lines = r.reviews.filter((v) => /^WG/.test(v.body)).map((v) => `${v.body}: ${v.opinion}${v.text ? " – " + v.text.replace(/\s+/g, " ").slice(0, 220) : ""}`);
        r.wg.summary = lines.join(" | ");
        if (r.wg.groups.every((g) => r.reviews.some((v) => v.body === g))) r.wg.received = r.wg.received || today();
      }
      const final = DECISION_MAP[it.opinion];
      if (final && ((it.body === "SMC" && r.assess.level === "Level 2") || (it.body === "ESC" && r.assess.level === "Level 3"))) {
        r.decision.final = final; r.decision.date = (it.date || today()).slice(0, 10);
        if (it.conditions) r.decision.conditions = [r.decision.conditions, it.conditions].filter(Boolean).join("\n");
        if (/^[1-4]/.test(r.follow.status)) r.follow.status = "5 - Decided";
        M.log(r, who(), `Final decision recorded from ${it.body}: ${final}`);
      }
    });
    toast(`${pi.items.length} input(s) applied.`);
    state.ui.pendingImport = null; touch(); renderExchange();
  }
  function makePack() {
    const b = document.getElementById("packBody").value;
    const chosen = [...state.ui.packChosen];
    const rs = state.workspace.requests.filter((r) => chosen.includes(r.formId));
    const pack = IO.reviewPack({ body: b, requests: rs, includePersonal: document.getElementById("packPersonal").checked, due: document.getElementById("packDue").value, note: document.getElementById("packNote").value, from: who() });
    rs.forEach((r) => {
      M.log(r, who(), `Sent to ${b} in review pack ${pack.packId}`);
      if (/^WG/.test(b)) { if (!r.wg.sent) r.wg.sent = today(); r.wg.needed = "Yes"; if (/^[12]/.test(r.follow.status)) r.follow.status = "3 - With WG"; }
    });
    IO.download(`DACS-logo-review-pack_${b}_${IO.stamp()}.json`, IO.json(pack));
    touch(); toast(`Review pack for ${b} downloaded (${rs.length} request(s)).`); renderExchange();
  }
  function saveWorkspace() {
    IO.download(`DACS-logo-workspace_${IO.stamp()}.json`, IO.json(IO.workspaceFile(state.workspace)));
    state.workspace.dirty = false; state.workspace.savedFileAt = new Date().toISOString(); touch(false);
  }
  function exportResponse() {
    const n = document.getElementById("reviewerName"); if (n) state.review.reviewer = n.value.trim();
    if (!state.review.reviewer) { toast("Enter your name and function first.", true); n && n.focus(); return; }
    const p = state.review.pack;
    const reviews = p.requests.filter((r) => state.review.answers[r.formId] && state.review.answers[r.formId].opinion)
      .map((r) => ({ formId: r.formId, ref: r.ref, ...state.review.answers[r.formId], date: new Date().toISOString() }));
    IO.download(`DACS-logo-response_${p.body}_${IO.stamp()}.json`, IO.json(IO.responseFile(p, state.review.reviewer, reviews)));
    state.review.exportedAt = new Date().toISOString(); touch(false); renderExchange();
  }
  function switchRole(role, wg) {
    state.role = role; if (wg) state.wg = wg;
    if (role !== "secretariat" && state.review.pack && state.review.pack.body !== (role === "wg" ? state.wg : role.toUpperCase())) {
      /* keep the pack but it belongs to another body: the reviewer must open their own pack */
      state.review.pack = null; state.review.answers = {};
    }
  }

  async function loadDemo(as) {
    const d = window.DACS_DEMO;
    state.workspace.requests = JSON.parse(JSON.stringify(d.workspace.requests));
    state.workspace.source = "Fictional example data – not real requests";
    state.workspace.dirty = false;
    if (as === "secretariat") { state.role = "secretariat"; touch(false); go("#/dashboard"); return; }
    const b = as === "wg" ? "WG1" : "SMC";
    state.review.pack = IO.reviewPack({ body: b, requests: eligible(b), includePersonal: false, due: M.iso(M.addWorkingDays(new Date(), 10)), note: "Fictional example pack, to try the tool.", from: "DACS Secretariat (example)" });
    state.review.answers = {}; state.role = as; if (as === "wg") state.wg = "WG1";
    touch(false); go("#/requests");
  }

  /* ------------------------------------------------------------- events */
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-action],[data-open],[data-gate],[data-score],[data-mg],[data-wg],[data-sort],[data-pick]");
    if (!t) return;
    if (t.dataset.open) { go("#/request/" + t.dataset.open); return; }
    if (t.dataset.sort) { const s = state.ui.sort; s.dir = s.key === t.dataset.sort ? -s.dir : 1; s.key = t.dataset.sort; renderRequests(); return; }
    if (t.dataset.pick) { const id = Number(t.dataset.pick); const set = state.ui.packChosen; set.has(id) ? set.delete(id) : set.add(id); rememberPackForm(); renderExchange(); return; }
    const id = (location.hash.match(/request\/(\d+)/) || [])[1];
    const r = id ? find(id) : null;
    if (isSec() && r && t.dataset.gate) { const cur = r.screen.gates[t.dataset.gate]; r.screen.gates[t.dataset.gate] = cur === t.dataset.v ? "" : t.dataset.v; M.log(r, who(), `Gate ${t.dataset.gate.slice(1)}: ${r.screen.gates[t.dataset.gate] || "cleared"}`); touch(); rerenderKeepScroll(id); return; }
    if (isSec() && r && t.dataset.score) { const k = t.dataset.score, v = Number(t.dataset.v); r.assess.scores[k] = r.assess.scores[k] === v ? null : v; M.log(r, who(), `Criterion ${k.slice(1)} scored ${r.assess.scores[k] ?? "–"}`); touch(); rerenderKeepScroll(id); return; }
    if (isSec() && r && t.dataset.mg) { const k = t.dataset.mg; r.assess.mgs = r.assess.mgs.includes(k) ? r.assess.mgs.filter((x) => x !== k) : [...r.assess.mgs, k].sort(); touch(); rerenderKeepScroll(id); return; }
    if (isSec() && r && t.dataset.wg) { const k = t.dataset.wg; r.wg.groups = r.wg.groups.includes(k) ? r.wg.groups.filter((x) => x !== k) : [...r.wg.groups, k].sort(); if (r.wg.groups.length) r.wg.needed = "Yes"; touch(); rerenderKeepScroll(id); return; }
    switch (t.dataset.action) {
      case "pick": return pick(t.dataset.kind);
      case "demo": return loadDemo(t.dataset.as);
      case "save-workspace": return saveWorkspace();
      case "make-pack": return makePack();
      case "apply-import": return applyImport();
      case "cancel-import": state.ui.pendingImport = null; return renderExchange();
      case "export-response": return exportResponse();
      case "clear-filters": Object.keys(state.ui.filters).forEach((k) => (state.ui.filters[k] = "")); return renderRequests();
      case "print": return window.print();
      case "export-register": IO.download(`DACS-logo-register-update_${IO.stamp()}.xlsx`, await IO.registerUpdate(state.workspace)); return toast("Register update downloaded. Paste it as described on its first sheet.");
      case "export-summary": IO.download(`DACS-logo-assessment-summary_${IO.stamp()}.xlsx`, await IO.summaryWorkbook(state.workspace)); return;
    }
  });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".chip[role=button]")) { e.preventDefault(); e.target.click(); } });
  function rememberPackForm() {
    const n = document.getElementById("packNote"), d = document.getElementById("packDue"), p = document.getElementById("packPersonal");
    if (n) state.ui.packNote = n.value; if (d) state.ui.packDue = d.value; if (p) state.ui.packPersonal = p.checked;
  }
  function rerenderKeepScroll(id) { const y = window.scrollY; renderRequest(id); renderChrome(); window.scrollTo(0, y); }

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.filter) { state.ui.filters[t.dataset.filter] = t.value; if (t.dataset.filter === "q") { clearTimeout(t._d); t._d = setTimeout(() => { renderRequests(); const s = app.querySelector('[data-filter="q"]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 200); } else renderRequests(); return; }
    const id = (location.hash.match(/request\/(\d+)/) || [])[1];
    const r = id ? find(id) : null;
    if (t.dataset.answer && r) {
      const a = state.review.answers[r.formId] || (state.review.answers[r.formId] = { opinion: "", text: "", conditions: "" });
      a[t.dataset.answer] = t.value; touch(false);
      if (t.dataset.answer === "opinion") { const y = window.scrollY; renderRequest(id); window.scrollTo(0, y); }
      return;
    }
    if (t.dataset.bind && r && isSec()) {
      setPath(r, t.dataset.bind, t.value);
      touch();
      if (t.tagName === "SELECT" || t.type === "date") {
        M.log(r, who(), `${t.closest("label").firstChild.textContent.trim()}: ${t.value || "cleared"}`);
        const y = window.scrollY; renderRequest(id); renderChrome(); window.scrollTo(0, y);
      }
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "packBody") { rememberPackForm(); state.ui.packBody = t.value; state.ui.packChosen = null; renderExchange(); }
    if (t.id === "reviewerName") { state.review.reviewer = t.value.trim(); touch(false); }
    if (t.id === "packNote" || t.id === "packDue" || t.id === "packPersonal") rememberPackForm();
    if (t.dataset.bind && t.tagName === "TEXTAREA") { const id = (location.hash.match(/request\/(\d+)/) || [])[1]; const r = id && find(id); if (r && isSec()) M.log(r, who(), `${t.closest("label").firstChild.textContent.trim()} edited`); }
  });

  /* role dialog */
  const dlg = document.getElementById("roleDialog");
  document.getElementById("rolePill").addEventListener("click", () => {
    dlg.querySelectorAll('input[name="role"]').forEach((i) => (i.checked = i.value === state.role));
    dlg.querySelector("#roleWG").value = state.wg;
    dlg.querySelector("#userName").value = state.workspace.settings.userName || "";
    dlg.querySelector("#keepCopy").checked = state.workspace.settings.keepCopy !== false;
    dlg.showModal();
  });
  dlg.addEventListener("close", () => {
    if (dlg.returnValue !== "ok") return;
    const role = dlg.querySelector('input[name="role"]:checked').value;
    state.workspace.settings.userName = dlg.querySelector("#userName").value.trim();
    state.workspace.settings.keepCopy = dlg.querySelector("#keepCopy").checked;
    switchRole(role, dlg.querySelector("#roleWG").value);
    touch(false); go(isSec() ? "#/dashboard" : "#/requests");
  });
  document.getElementById("clearBrowser").addEventListener("click", () => {
    if (!confirm("Remove every request and answer kept in this browser? Files you downloaded are not affected.")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    location.hash = "#/"; location.reload();
  });
  document.getElementById("themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
    try { localStorage.setItem("dacs-theme", document.documentElement.dataset.theme); } catch (e) { /* ignore */ }
  });
  try { const th = localStorage.getItem("dacs-theme"); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }

  window.addEventListener("beforeunload", (e) => { if (isSec() && state.workspace.dirty && !state.workspace.settings.keepCopy) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", route);
  load();
  route();
})();
