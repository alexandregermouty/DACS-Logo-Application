/* DACS logo assessment tool - data model and the calculations of the register, reproduced exactly. */
(function () {
  const C = window.DACS_CONFIG;

  const blank = (formId) => ({
    formId: Number(formId),
    ref: C.refPrefix + String(formId).padStart(3, "0"),
    sub: {
      received: "", applicant: "", email: "", organisation: "", country: "", levelRequested: "",
      typeOfUse: "", title: "", description: "", link: "", mgsDeclared: "", placements: "",
      startOfUse: "", url: "", nonCommercial: "", reuseLimitation: "", standards: "", accuracy: ""
    },
    screen: { reviewer: "", acknowledged: "", completeness: "", gates: { g1: "", g2: "", g3: "", g4: "" } },
    assess: { level: "", primaryOC: "", mgs: [], scores: { c1: null, c2: null, c3: null, c4: null, c5: null, c6: null }, notes: "" },
    wg: { needed: "", groups: [], several: false, sent: "", received: "", summary: "" },
    reviews: [],
    decision: { final: "Pending", date: "", conditions: "", from: "", until: "", notified: "" },
    follow: { status: "1 - Received", action: "", owner: "", nextReview: "" },
    log: []
  });

  /* Register column AG. */
  function gateOutcome(r) {
    const g = Object.values(r.screen.gates);
    if (g.some((v) => !v)) return "";
    if (g.includes("Yes")) return "BLOCK";
    if (g.includes("To verify")) return "HOLD";
    return "PASS";
  }

  /* Register column AR: sum(score x weight) / sum(weights), blank until all six are scored. */
  function weightedScore(r) {
    if (gateOutcome(r) === "BLOCK") return null;
    const vals = C.criteria.map((c) => r.assess.scores[c.key]);
    if (vals.some((v) => v === null || v === undefined || v === "")) return null;
    const totalW = C.criteria.reduce((s, c) => s + c.weight, 0);
    const sum = C.criteria.reduce((s, c) => s + Number(r.assess.scores[c.key]) * c.weight, 0);
    return Math.round((sum / totalW) * 100) / 100;
  }

  function band(score) {
    if (score === null) return null;
    return C.bands.find((b) => score >= b.min) || C.bands[C.bands.length - 1];
  }

  /* Register column AS. */
  function recommendation(r) {
    const g = gateOutcome(r);
    if (g === "BLOCK") return { label: C.blockedLabel, tone: "critical" };
    const s = weightedScore(r);
    if (s === null) return null;
    if (g === "HOLD") return { label: C.holdLabel, tone: "warning" };
    const b = band(s);
    return { label: b.label, tone: b.tone };
  }

  function partialScore(r) {
    const done = C.criteria.filter((c) => r.assess.scores[c.key] !== null && r.assess.scores[c.key] !== "" && r.assess.scores[c.key] !== undefined);
    return { done: done.length, total: C.criteria.length };
  }

  /* Suggest Working Groups from the main goals retained (register, "Reference", MG -> WG). */
  function suggestedWGs(mgs) {
    const set = new Set();
    let outreachOnly = true;
    (mgs || []).forEach((m) => {
      const oc = m.slice(2, 3);
      set.add("WG" + oc);
      if (!(m === "MG5.2" || m === "MG5.3")) outreachOnly = false;
    });
    return { groups: [...set].sort(), outreachOnly: mgs && mgs.length > 0 && outreachOnly };
  }

  function wgRegisterValue(r) {
    if (!r.wg.groups.length) return r.wg.several ? "Several (see notes)" : (r.wg.needed === "No" ? "None - Secretariat" : "");
    const v = [...r.wg.groups].sort().join("+");
    return C.wgRegisterValues.includes(v) ? v : "Several (see notes)";
  }

  function parseWGs(v) {
    if (!v) return { groups: [], several: false };
    if (/several/i.test(v)) return { groups: [], several: true };
    if (/none/i.test(v)) return { groups: [], several: false };
    return { groups: (v.match(/WG[1-5]/g) || []).filter((x, i, a) => a.indexOf(x) === i), several: false };
  }

  function parseMGs(v) {
    if (!v) return [];
    return (String(v).match(/MG[1-5]\.[1-3]/g) || []).filter((x, i, a) => a.indexOf(x) === i);
  }

  /* ---- working days ---- */
  function toDate(iso) { if (!iso) return null; const d = new Date(iso + "T00:00:00"); return isNaN(d) ? null : d; }
  function iso(d) { return d ? d.toISOString().slice(0, 10) : ""; }
  function addWorkingDays(start, n) {
    const d = new Date(start);
    let added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) added++; }
    return d;
  }
  function workingDaysBetween(a, b) {
    if (!a || !b) return null;
    let n = 0; const d = new Date(a);
    if (b < a) return 0;
    while (d < b) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }

  /* Indicative due dates per step (methodology, "Procedure and indicative timelines").
     The count is not suspended automatically while the Secretariat waits for the applicant:
     status "4 - Awaiting applicant" is shown as suspended instead of overdue. */
  function timeline(r, today) {
    const start = toDate(r.sub.received);
    if (!start) return null;
    let cum = 0;
    const steps = C.timeline.map((s) => { cum += s.days; return { ...s, due: iso(addWorkingDays(start, cum)), cumulative: cum }; });
    const decided = ["5 - Decided", "6 - Notified", "7 - Closed", "8 - Expired"].includes(r.follow.status) || (r.decision.final && r.decision.final !== "Pending");
    const end = decided && r.decision.date ? toDate(r.decision.date) : (today || new Date());
    const elapsed = workingDaysBetween(start, end);
    const suspended = r.follow.status === "4 - Awaiting applicant";
    const level = r.assess.level || "Level 1";
    const target = level === "Level 1" ? C.level1TargetDays : null;
    let state = "on-track";
    if (decided) state = "decided";
    else if (suspended) state = "suspended";
    else if (target && elapsed > target) state = "overdue";
    else if (target && elapsed > target - 10) state = "due-soon";
    return { steps, elapsed, target, state, suspended };
  }

  function stage(r) {
    const s = r.follow.status || "";
    if (/^[5-8]/.test(s) || (r.decision.final && r.decision.final !== "Pending")) return "decision";
    const lvl = r.assess.level;
    const hasSMC = r.reviews.some((v) => v.body === "SMC");
    if (lvl === "Level 3" && hasSMC) return "esc";
    if ((lvl === "Level 2" || lvl === "Level 3") && (r.wg.received || r.reviews.some((v) => /^WG/.test(v.body)))) return "smc";
    if (s === "3 - With WG" || r.wg.sent) return "wg";
    return "secretariat";
  }

  function awaiting(r) {
    const out = [];
    if (!r.screen.reviewer) out.push("reviewer");
    if (gateOutcome(r) === "HOLD") out.push("hold");
    if (r.wg.sent && r.wg.groups.some((g) => !r.reviews.some((v) => v.body === g))) out.push("wg-opinion");
    return out;
  }

  function log(r, by, what) { r.log.push({ at: new Date().toISOString(), by, what }); }

  window.DACS_MODEL = {
    blank, gateOutcome, weightedScore, band, recommendation, partialScore, suggestedWGs, wgRegisterValue,
    parseWGs, parseMGs, timeline, stage, awaiting, log, toDate, iso, addWorkingDays, workingDaysBetween
  };
})();
