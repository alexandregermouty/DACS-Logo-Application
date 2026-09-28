/* DACS logo assessment tool - files in and out. Everything happens in the browser: no file is uploaded anywhere. */
(function () {
  const C = window.DACS_CONFIG, M = window.DACS_MODEL;

  /* Register "Requests" header -> record path. Grey (submission) columns and blue (reviewer) columns. */
  const MAP = {
    "Form ID": ["formId"],
    "Date received": ["sub", "received", "date"],
    "Applicant": ["sub", "applicant"],
    "Email": ["sub", "email"],
    "Organisation": ["sub", "organisation"],
    "Country": ["sub", "country"],
    "Level requested": ["sub", "levelRequested"],
    "Type of use": ["sub", "typeOfUse"],
    "Activity title": ["sub", "title"],
    "Description (as submitted)": ["sub", "description"],
    "Stated link to the Decade": ["sub", "link"],
    "MGs declared by applicant": ["sub", "mgsDeclared"],
    "Where the logo will appear": ["sub", "placements"],
    "Intended start of use": ["sub", "startOfUse", "date"],
    "Link to activity / content": ["sub", "url"],
    "Non-commercial declared": ["sub", "nonCommercial"],
    "Reuse limitation": ["sub", "reuseLimitation"],
    "Standards accepted": ["sub", "standards"],
    "Geoeng. / misinfo declared": ["sub", "accuracy"],
    "Assigned reviewer": ["screen", "reviewer"],
    "Acknowledged": ["screen", "acknowledged"],
    "Submission complete?": ["screen", "completeness"],
    "Level retained": ["assess", "level"],
    "Primary OC": ["assess", "primaryOC"],
    "Reviewer notes": ["assess", "notes"],
    "WG consultation needed?": ["wg", "needed"],
    "Sent to WG": ["wg", "sent", "date"],
    "WG opinion received": ["wg", "received", "date"],
    "WG opinion - summary": ["wg", "summary"],
    "FINAL DECISION": ["decision", "final"],
    "Decision date": ["decision", "date", "date"],
    "Conditions attached": ["decision", "conditions"],
    "Authorised from": ["decision", "from", "date"],
    "Authorised until": ["decision", "until", "date"],
    "Applicant notified": ["decision", "notified"],
    "Follow-up action": ["follow", "action"],
    "Owner": ["follow", "owner"],
    "Next review date": ["follow", "nextReview", "date"]
  };
  const SUBMISSION_KEYS = Object.keys(MAP).filter((k) => MAP[k][0] === "sub");

  function cellValue(cell) {
    let v = cell.value;
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
      if (v instanceof Date) return v;
      if ("result" in v) v = v.result;
      else if (v.richText) v = v.richText.map((t) => t.text).join("");
      else if (v.text !== undefined) v = typeof v.text === "object" && v.text.richText ? v.text.richText.map((t) => t.text).join("") : v.text;
      else if (v.error) v = "";
      if (v && typeof v === "object" && !(v instanceof Date)) v = "";
    }
    return v === null || v === undefined ? "" : v;
  }
  function asDate(v) {
    if (!v) return "";
    if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())).toISOString().slice(0, 10);
    if (typeof v === "number") { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
    const s = String(v).trim(); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    const d = new Date(s); return isNaN(d) ? "" : d.toISOString().slice(0, 10);
  }

  async function readRegister(file) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.getWorksheet("Requests");
    if (!ws) throw new Error('This workbook has no "Requests" sheet. Open the DACS logo request register (DACS_Logo_Requests_Register_2026.xlsx).');
    let headerRow = null;
    for (let i = 1; i <= 10 && !headerRow; i++) {
      const row = ws.getRow(i);
      row.eachCell((c) => { if (String(cellValue(c)).trim() === "Ref. no.") headerRow = i; });
    }
    if (!headerRow) throw new Error('Could not find the header row ("Ref. no.") on the "Requests" sheet.');
    const cols = {};
    ws.getRow(headerRow).eachCell((c, n) => { cols[String(cellValue(c)).trim()] = n; });
    const out = [];
    for (let i = headerRow + 1; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      const ref = String(cellValue(row.getCell(cols["Ref. no."] || 1))).trim();
      const fid = cellValue(row.getCell(cols["Form ID"] || 2));
      if (!ref || !fid) continue;
      const r = M.blank(fid);
      for (const [h, path] of Object.entries(MAP)) {
        if (!cols[h]) continue;
        let v = cellValue(row.getCell(cols[h]));
        if (path[2] === "date") v = asDate(v);
        else if (v instanceof Date) v = asDate(v);
        else v = String(v).trim();
        if (path.length === 1) continue;
        r[path[0]][path[1]] = v;
      }
      if (/^level\s*[123]/i.test(r.sub.levelRequested)) r.sub.levelRequested = r.sub.levelRequested.slice(0, 7);
      C.gates.forEach((g) => { if (cols[g.col]) r.screen.gates[g.key] = String(cellValue(row.getCell(cols[g.col]))).trim(); });
      C.criteria.forEach((c) => {
        if (!cols[c.col]) return;
        const v = cellValue(row.getCell(cols[c.col]));
        r.assess.scores[c.key] = v === "" || isNaN(Number(v)) ? null : Number(v);
      });
      if (cols["MGs retained by Secretariat"]) r.assess.mgs = M.parseMGs(cellValue(row.getCell(cols["MGs retained by Secretariat"])));
      if (cols["WG to be consulted"]) Object.assign(r.wg, M.parseWGs(String(cellValue(row.getCell(cols["WG to be consulted"])))));
      /* "Status" appears twice (column E mirrors BE): read the last one, the reviewer entry. */
      let statusCol = null; ws.getRow(headerRow).eachCell((c, n) => { if (String(cellValue(c)).trim() === "Status") statusCol = n; });
      if (statusCol) { const s = String(cellValue(row.getCell(statusCol))).trim(); if (s) r.follow.status = s; }
      if (!r.decision.final) r.decision.final = "Pending";
      out.push(r);
    }
    if (!out.length) throw new Error('No request rows found on the "Requests" sheet (rows need a Ref. no.).');
    return out;
  }

  /* Merge a freshly read register into the workspace. Submission data always come from the register (it is the
     applicant's statement of record); reviewer entries already in the workspace are kept; new Form IDs are added. */
  function mergeRegister(existing, incoming, who) {
    const byId = new Map(existing.map((r) => [r.formId, r]));
    let added = 0, refreshed = 0;
    incoming.forEach((n) => {
      const cur = byId.get(n.formId);
      if (!cur) { M.log(n, who, "Imported from the register"); byId.set(n.formId, n); added++; }
      else { cur.sub = n.sub; refreshed++; }
    });
    return { requests: [...byId.values()].sort((a, b) => a.formId - b.formId), added, refreshed };
  }

  /* ---- downloads ---- */
  function download(name, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2");
  const json = (o) => new Blob([JSON.stringify(o, null, 2)], { type: "application/json" });

  function workspaceFile(state) {
    return { type: "dacs-logo-workspace", toolVersion: C.version, savedAt: new Date().toISOString(), settings: state.settings, requests: state.requests };
  }

  function strip(r, includePersonal) {
    const c = JSON.parse(JSON.stringify(r));
    if (!includePersonal) { c.sub.applicant = ""; c.sub.email = ""; }
    c.log = [];
    return c;
  }

  function reviewPack({ body, requests, includePersonal, due, note, from }) {
    return {
      type: "dacs-logo-review-pack", toolVersion: C.version,
      packId: body + "-" + stamp() + "-" + Math.random().toString(36).slice(2, 6),
      body, createdAt: new Date().toISOString(), from, due, note,
      personalDataIncluded: !!includePersonal,
      requests: requests.map((r) => strip(r, includePersonal))
    };
  }

  function responseFile(pack, reviewer, reviews) {
    return {
      type: "dacs-logo-review-response", toolVersion: C.version, packId: pack.packId, body: pack.body,
      reviewer, createdAt: new Date().toISOString(), reviews
    };
  }

  async function readJSON(file) {
    const o = JSON.parse(await file.text());
    if (!o || !o.type || !/^dacs-logo-/.test(o.type)) throw new Error(file.name + " is not a file produced by this tool.");
    return o;
  }

  /* ---- Excel exports ---- */
  const REVIEWER_BLOCKS = [
    { from: "Z", cols: ["Assigned reviewer", "Acknowledged", "Submission complete?", "GATE 1 Sponsor / profit-seeking use?", "GATE 2 Geoengineering?", "GATE 3 Misinformation?", "GATE 4 Partisan / unrelated / approvals?"] },
    { from: "AH", cols: ["Level retained"] },
    { from: "AJ", cols: ["Primary OC", "MGs retained by Secretariat", "1. Relevance (25%)", "2. Merit (25%)", "3. Inclusiveness (20%)", "4. Reputation (15%)", "5. Placement quality (10%)", "6. Terminology (5%)"] },
    { from: "AT", cols: ["WG consultation needed?", "WG to be consulted", "Sent to WG", "WG opinion received", "WG opinion - summary", "FINAL DECISION", "Decision date", "Conditions attached", "Authorised from", "Authorised until", "Applicant notified", "Status", "Follow-up action", "Owner", "Next review date", "Reviewer notes"] }
  ];
  function registerValue(r, h) {
    const d = (s) => (s ? new Date(s + "T00:00:00Z") : null);
    const g = C.gates.find((x) => x.col === h); if (g) return r.screen.gates[g.key] || null;
    const c = C.criteria.find((x) => x.col === h); if (c) return r.assess.scores[c.key] ?? null;
    switch (h) {
      case "Assigned reviewer": return r.screen.reviewer || null;
      case "Acknowledged": return r.screen.acknowledged || null;
      case "Submission complete?": return r.screen.completeness || null;
      case "Level retained": return r.assess.level || null;
      case "Primary OC": return r.assess.primaryOC || null;
      case "MGs retained by Secretariat": return r.assess.mgs.join("; ") || null;
      case "WG consultation needed?": return r.wg.needed || null;
      case "WG to be consulted": return M.wgRegisterValue(r) || null;
      case "Sent to WG": return d(r.wg.sent);
      case "WG opinion received": return d(r.wg.received);
      case "WG opinion - summary": return r.wg.summary || null;
      case "FINAL DECISION": return r.decision.final || null;
      case "Decision date": return d(r.decision.date);
      case "Conditions attached": return r.decision.conditions || null;
      case "Authorised from": return d(r.decision.from);
      case "Authorised until": return d(r.decision.until);
      case "Applicant notified": return r.decision.notified || null;
      case "Status": return r.follow.status || null;
      case "Follow-up action": return r.follow.action || null;
      case "Owner": return r.follow.owner || null;
      case "Next review date": return d(r.follow.nextReview);
      case "Reviewer notes": return r.assess.notes || null;
    }
    return null;
  }
  const colNum = (L) => L.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

  async function registerUpdate(state) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "DACS logo assessment tool";
    const info = wb.addWorksheet("How to paste");
    const last = 4 + Math.max(...state.requests.map((r) => r.formId));
    const lines = [
      ["DACS logo register - reviewer columns, generated " + new Date().toISOString().slice(0, 16).replace("T", " ")],
      [""],
      ["The sheet \"Requests (reviewer columns)\" has the same cell addresses as the \"Requests\" sheet of the register: Form ID n is on row 4 + n."],
      ["Copy each block below and paste it into the register with Paste Special > Values, at the same address. Do not paste over the formula columns AG, AI, AR and AS."],
      [""],
      ["Block", "Copy range", "Paste into register at"],
      ...REVIEWER_BLOCKS.map((b, i) => {
        const endCol = colNumToL(colNum(b.from) + b.cols.length - 1);
        return ["Block " + (i + 1), b.from + "5:" + endCol + last, "Requests!" + b.from + "5"];
      }),
      [""],
      ["Keep a copy of the register before pasting. The SharePoint version history also allows a restore."]
    ];
    lines.forEach((l) => info.addRow(l));
    info.getColumn(1).width = 26; info.getColumn(2).width = 22; info.getColumn(3).width = 30;
    info.getRow(1).font = { bold: true, size: 13, color: { argb: "FF1F3864" } };
    info.getRow(6).font = { bold: true };

    const ws = wb.addWorksheet("Requests (reviewer columns)");
    ws.getCell("A4").value = "Ref. no."; ws.getCell("B4").value = "Form ID"; ws.getCell("C4").value = "Activity title";
    REVIEWER_BLOCKS.forEach((b) => b.cols.forEach((h, i) => { ws.getCell(4, colNum(b.from) + i).value = h; }));
    ws.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    ws.getCell("A1").value = "Values only - paste into the register as described on \"How to paste\".";
    state.requests.forEach((r) => {
      const row = 4 + r.formId;
      ws.getCell(row, 1).value = r.ref; ws.getCell(row, 2).value = r.formId; ws.getCell(row, 3).value = r.sub.title;
      REVIEWER_BLOCKS.forEach((b) => b.cols.forEach((h, i) => {
        const v = registerValue(r, h); const cell = ws.getCell(row, colNum(b.from) + i);
        cell.value = v; if (v instanceof Date) cell.numFmt = "dd mmm yyyy";
      }));
    });
    return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function colNumToL(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  async function summaryWorkbook(state) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Assessment summary");
    const head = ["Ref. no.", "Activity title", "Organisation", "Country", "Type of use", "Level retained", "Deciding body", "MGs retained", "Gate outcome",
      ...C.criteria.map((c) => c.col), "Weighted score", "Recommendation", "WG consulted", "Opinions received", "Final decision", "Decision date", "Authorised until", "Status"];
    ws.addRow(head);
    state.requests.forEach((r) => {
      const rec = M.recommendation(r);
      ws.addRow([r.ref, r.sub.title, r.sub.organisation, r.sub.country, r.sub.typeOfUse, r.assess.level, r.assess.level ? C.levels[r.assess.level].registerBody : "",
        r.assess.mgs.join("; "), M.gateOutcome(r), ...C.criteria.map((c) => r.assess.scores[c.key]), M.weightedScore(r), rec ? rec.label : "",
        M.wgRegisterValue(r), r.reviews.map((v) => v.body + ": " + v.opinion).join(" | "), r.decision.final, r.decision.date, r.decision.until, r.follow.status]);
    });
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    ws.columns.forEach((c, i) => { c.width = i === 1 ? 48 : i === 2 ? 34 : 16; });
    ws.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];
    return new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  window.DACS_IO = { readRegister, mergeRegister, download, stamp, json, workspaceFile, reviewPack, responseFile, readJSON, registerUpdate, summaryWorkbook, SUBMISSION_KEYS };
})();
