/*
 * DACS logo assessment tool - reference configuration.
 *
 * Every value in this file is taken from two sources and must be kept in step with them:
 *   - "Authorisation of use of the logo of the Decade for activities contributing to it"
 *     (Internal governing methodology, draft of September 2026) - the "methodology";
 *   - "DACS_Logo_Requests_Register_2026.xlsx", sheet "Reference" (revised 24 September 2026) - the "register".
 * Change a weight, a band or a list here and the whole tool follows. Nothing else needs editing.
 */
window.DACS_CONFIG = {
  version: "1.0.0",
  methodologyVersion: "Draft methodology, September 2026 (revised after the 4th ad hoc SMC meeting, 25 September 2026)",
  refPrefix: "DACS-LOGO-2026-",

  roles: {
    secretariat: { label: "UNESCO Secretariat", short: "Secretariat", admin: true },
    wg: { label: "Working Group leadership", short: "Working Group" },
    smc: { label: "Strategic Management Committee", short: "SMC" },
    esc: { label: "Executive Steering Committee", short: "ESC" }
  },

  workingGroups: {
    WG1: "Global Cryosphere Monitoring",
    WG2: "Actionable Cryosphere Projections",
    WG3: "Cryospheric Risk Management Solutions",
    WG4: "Adaptation to Cryosphere Loss",
    WG5: "Amplify the Impact of Cryospheric Science"
  },

  overarchingChallenges: {
    OC1: "Global Cryosphere Monitoring",
    OC2: "Actionable Cryosphere Projections",
    OC3: "Cryospheric Risk Management Solutions",
    OC4: "Adaptation to Cryosphere Loss",
    OC5: "Amplify the Impact of Cryospheric Science"
  },

  /* Main goal names as they appear in the application Form. MG3.1 and MG3.2 have not yet
     been received through the Form: add their titles here once confirmed. */
  mainGoals: {
    "MG1.1": "Build a Global Cryosphere Monitoring Inventory",
    "MG1.2": "Enhance Monitoring Capabilities",
    "MG1.3": "Make Observations Actionable",
    "MG2.1": "Cryosphere Modelling for Decision Making",
    "MG2.2": "Inclusive Cryosphere Prediction",
    "MG2.3": "Creation of a Decision and Outreach Toolkit",
    "MG3.1": "",
    "MG3.2": "",
    "MG3.3": "Operationalise Cryosphere Risk Management Solutions",
    "MG4.1": "Incorporating Cryosphere Loss into Adaptation Strategies",
    "MG4.2": "Co-Develop Adaptation Strategies for those Living in and With the Cryosphere",
    "MG4.3": "Establish the Global Cryosphere Adaptation Knowledge Hub",
    "MG5.1": "Policy Integration and Engagement - Cryosphere Loss Prevention",
    "MG5.2": "Global Cryosphere Outreach and Communication",
    "MG5.3": "Education and Capacity Building"
  },

  /* Register, sheet "Reference": main goal -> overarching challenge -> Working Group, and when to consult. */
  consultationRule: {
    WG1: "Yes - any claim on monitoring, inventories or data.",
    WG2: "Yes - any claim on modelling or projections.",
    WG3: "Yes - any claim on hazard or risk.",
    WG4: "Yes - any claim on adaptation or community co-development.",
    "MG5.1": "Yes - policy engagement claims.",
    "MG5.2/5.3": "Only if borderline, high-profile, or a hard gate is on HOLD. Routine outreach and education requests are decided by the Secretariat."
  },

  /* Methodology, "The three levels of authorisation". */
  levels: {
    "Level 1": {
      name: "Association",
      marks: "Decade logo alone",
      nature: "Simple mention of a contribution to the Decade by an activity, event, publication or communication product.",
      chain: ["Secretariat", "Working Group"],
      decidedBy: "Secretariat, with the concurrence of the Working Group concerned",
      registerBody: "Secretariat, with WG concurrence",
      informed: "The Strategic Management Committee is informed of the decision through the register.",
      period: "The duration of the project, capped at the end of the current triennium, renewable by decision of the Secretariat."
    },
    "Level 2": {
      name: "Endorsement",
      marks: "Decade logo + UNESCO-IHP logo",
      nature: "Endorsed project of the Decade: a defined project delivering against one or more main goals and reporting on that delivery.",
      chain: ["Secretariat", "Working Group", "Strategic Management Committee"],
      decidedBy: "Strategic Management Committee",
      registerBody: "Strategic Management Committee",
      informed: "The Executive Steering Committee is informed of the decision.",
      period: "The duration of the project, capped at the end of the current triennium, renewable by decision of the Strategic Management Committee.",
      clearance: "UNESCO-IHP logo: clearance under 34 C/Resolution 86, obtained by the Secretariat through the Director of the Division of Water Sciences and the competent services before the notice is issued."
    },
    "Level 3": {
      name: "Flagship",
      marks: "Decade logo + UNESCO logo",
      nature: "Flagship project or initiative of the Decade, of global or multi-regional significance, showcased at the Triennial Cryosphere Summit.",
      chain: ["Secretariat", "Working Group", "Strategic Management Committee", "Executive Steering Committee"],
      decidedBy: "Executive Steering Committee, on the recommendation of the Strategic Management Committee",
      registerBody: "Executive Steering Committee, on SMC recommendation",
      informed: "",
      period: "Aligned with the triennium, reviewed at each Triennial Cryosphere Summit and renewable by the same procedure.",
      clearance: "UNESCO name and logo: authorisation under 34 C/Resolution 86, obtained by the Secretariat through the competent services before any use begins."
    }
  },

  /* Methodology, "Hard gates"; register, "Reference". */
  gates: [
    { key: "g1", col: "GATE 1 Sponsor / profit-seeking use?", title: "Commercial or promotional use",
      readsOn: "Association of the mark with a sponsor, including sponsor visibility on the same placement, lock-ups and co-branded material; use of the mark in advertising, on merchandise or on material promoting a sale; any use of the mark whose purpose is to attract revenue or sponsorship. The commercial dimension of an activity does not by itself engage this gate: a publication offered for sale, a broadcast or cinema release, a ticketed event or cost-recovery fees remain eligible where the mark is not associated with a sponsor and is not used to promote the sale.",
      effect: "Yes: refusal. To verify: suspension pending correction.", allowsVerify: true },
    { key: "g2", col: "GATE 2 Geoengineering?", title: "Geoengineering",
      readsOn: "The Decade explicitly excludes scientifically uncertain and potentially extremely harmful geoengineering research and deployment.",
      effect: "Yes: refusal.", allowsVerify: true },
    { key: "g3", col: "GATE 3 Misinformation?", title: "Misinformation or misrepresentation",
      readsOn: "Factual claims about the cryosphere that the science does not support, including over-stated timelines and thresholds.",
      effect: "Yes: refusal. To verify: suspension pending correction.", allowsVerify: true },
    { key: "g4", col: "GATE 4 Partisan / unrelated / approvals?", title: "Partisan, sectarian or religious purpose",
      readsOn: "Also entertainment unrelated to the Decade, and any activity lacking required approvals, due diligence or compliance documentation.",
      effect: "Yes: refusal.", allowsVerify: true }
  ],
  gateAnswers: ["No", "To verify", "Yes"],

  /* Methodology, "Assessment criteria". Weights must sum to 1; the score is divided by the total anyway. */
  criteria: [
    { key: "c1", col: "1. Relevance (25%)", title: "Direct relevance to the framework of the Decade", weight: 0.25,
      measures: "Whether the activity advances an overarching challenge and a declared main goal, or feeds the Cryosphere Intelligence Platform, the policy interface or a Summit product." },
    { key: "c2", col: "2. Merit (25%)", title: "Scientific, educational, policy or public-interest value", weight: 0.25,
      measures: "The merit of the activity itself, not the standing of the applicant." },
    { key: "c3", col: "3. Inclusiveness (20%)", title: "Inclusiveness and co-production of knowledge", weight: 0.20,
      measures: "Whether the activity involves or reaches Indigenous peoples and local communities, the Global South, youth, early-career researchers and under-represented groups, and whether knowledge is co-produced with those concerned rather than extracted from them, in line with the inclusive vision of the Synthesis document." },
    { key: "c4", col: "4. Reputation (15%)", title: "Respect for the reputation and institutional requirements of UNESCO", weight: 0.15,
      measures: "Partners and sponsors, political exposure, accuracy of factual claims, consent and rights over persons filmed or quoted." },
    { key: "c5", col: "5. Placement quality (10%)", title: "Quality of the visual and textual context of the logo", weight: 0.10,
      measures: "What surrounds the mark: official form, clear space, minimum size, absence of confusing lock-ups with sponsor marks." },
    { key: "c6", col: "6. Terminology (5%)", title: "Consistency with the terminology and priorities of the Synthesis document", weight: 0.05,
      measures: "Whether the activity uses the vocabulary of the Decade correctly and claims only the main goals it actually serves. Over-claiming scores low." }
  ],

  /* Methodology, "Scoring scale". */
  scale: [
    { v: 5, label: "Exemplary", text: "squarely within the framework of the Decade" },
    { v: 4, label: "Strong", text: "clearly eligible with minor drafting or placement points only" },
    { v: 3, label: "Acceptable", text: "eligible but requiring conditions" },
    { v: 2, label: "Weak", text: "not refusable outright but incomplete or with a link to the Decade that is asserted" },
    { v: 1, label: "Poor", text: "requiring a different activity rather than a different form" },
    { v: 0, label: "Fails", text: "directly contrary to the criterion, in which case whether a hard gate applies is examined" }
  ],

  /* Methodology, decision bands (weighted score out of five). */
  bands: [
    { min: 4, label: "Approve", tone: "good", action: "Authorisation notice issued with the period of use and the standard conditions." },
    { min: 3, label: "Approve with conditions", tone: "info", action: "Authorisation issued; the conditions are stated in the notice and recorded in the register." },
    { min: 2, label: "Revert to applicant", tone: "warning", action: "Written request for the missing element. The timeline is suspended until the applicant answers." },
    { min: 0, label: "Refuse", tone: "critical", action: "Refusal notice stating the reasons and, where a resubmission could succeed, the conditions under which it would. Where appropriate, the notice indicates other avenues of engagement with the Decade, such as a request at a different level or participation in the Alliance for the Cryosphere." }
  ],
  blockedLabel: "Refuse - ineligible (hard gate)",
  holdLabel: "Revert to applicant - gate unresolved",

  /* Register dropdown lists. */
  statuses: ["1 - Received", "2 - Screening", "3 - With WG", "4 - Awaiting applicant", "5 - Decided", "6 - Notified", "7 - Closed", "8 - Expired"],
  decisions: ["Pending", "Approved", "Approved with conditions", "Refused", "Withdrawn"],
  completeness: ["Complete", "Partial", "Incomplete"],
  wgRegisterValues: ["WG1", "WG2", "WG3", "WG4", "WG5", "WG1+WG5", "WG2+WG5", "WG3+WG5", "WG4+WG5", "WG1+WG3+WG5", "Several (see notes)", "None - Secretariat"],

  /* Inputs available to each governing body (methodology, "Procedure" under each level). */
  opinionOptions: {
    wg: ["Concur", "Concur with conditions", "Do not concur", "Not for this Working Group"],
    smcLevel2: ["Endorse", "Endorse with conditions", "Do not endorse", "Defer to next session"],
    smcLevel3: ["Recommend to the ESC", "Recommend with conditions", "Do not recommend", "Defer to next session"],
    esc: ["Designate as flagship", "Designate with conditions", "Do not designate", "Defer"]
  },

  /* Methodology, "Procedure and indicative timelines" (working days). */
  timeline: [
    { step: "1. Registration and acknowledgement", days: 5 },
    { step: "2. Screening", days: 5 },
    { step: "3. Assessment", days: 10 },
    { step: "4. Referral to the Working Group", days: 10 },
    { step: "5. Decision", days: 5, note: "Level 1. Levels 2 and 3: next ordinary SMC session (at least quarterly) or written procedure of 10 days; Level 3 then transmitted to the ESC." },
    { step: "6. Notification", days: 5 }
  ],
  level1TargetDays: 40
};
