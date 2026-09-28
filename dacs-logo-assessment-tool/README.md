# DACS logo assessment tool

Interactive tool for assessing requests to use the logo of the **Decade of Action for Cryospheric Sciences 2025–2034** (DACS). It is administered by the UNESCO Secretariat (Intergovernmental Hydrological Programme) and used by the Working Group leadership, the Strategic Management Committee (SMC) and the Executive Steering Committee (ESC).

The tool applies the internal methodology *Authorisation of use of the logo of the Decade for activities contributing to it* (draft, September 2026): the three levels of authorisation, the four hard gates, the six weighted criteria, the decision bands, the referral to the Working Groups and the indicative timelines. It reads and writes the Secretariat's Excel register, `DACS_Logo_Requests_Register_2026.xlsx`.

![Dashboard, with fictional example data](docs/screenshots/dashboard.png)

## What it does

| Role | In the tool |
|---|---|
| **UNESCO Secretariat** (administrator) | Opens the register; screens each request against the hard gates; retains the level, the overarching challenge and the main goals; scores the six criteria (weighted score and recommendation calculated live, exactly as in the register); selects the Working Groups to consult; sends review packs; imports opinions and decisions; records the final decision, the conditions and the authorisation period; follows timelines; exports back to Excel. |
| **Working Group leadership** | Opens the review pack for its Working Group; reads each submission and the Secretariat's assessment; gives its opinion (concurrence at Level 1, substantive written opinion at Levels 2 and 3); returns a response file. |
| **Strategic Management Committee** | Decides at Level 2 (endorse, with or without conditions, or not); recommends to the ESC at Level 3. |
| **Executive Steering Committee** | Decides on the flagship designation at Level 3, on the recommendation of the SMC. |

Following the methodology, the assessment is carried out **once**, by the Secretariat. The Working Groups, the SMC and the ESC rely on it and give their opinion or decision; they do not re-score.

| Assessing a request (Secretariat) | Giving an opinion or decision (SMC member) |
|---|---|
| ![Scoring the six criteria](docs/screenshots/scoring.png) | ![SMC recommendation panel](docs/screenshots/reviewer-smc.png) |

*Screenshots use the fictional example data included in the tool.*

## How it works: no server, no data in the repository

The register contains personal data of applicants (names, email addresses). The tool is therefore built so that **no data ever leaves the user's computer**:

- It is a static web page (HTML, CSS, JavaScript, no build step). GitHub Pages only serves the program.
- Files are opened from the user's computer and processed in the browser. The page's Content Security Policy forbids any network connection (`connect-src 'none'`), so nothing can be uploaded, even by mistake.
- The repository contains **no request data**. Only fictional examples, clearly marked as such, are included (`examples/`, `assets/js/demo-data.js`).
- `.gitignore` excludes `*.xlsx` and the workspace, pack and response files, so they cannot be committed by accident.

Collaboration happens by exchanging files, through the channels UNESCO already uses (email, SharePoint):

```
 Register (.xlsx) ──► Secretariat workspace ──► Review pack (.json) ──► WG / SMC / ESC
      ▲                     │      ▲                                        │
      │                     │      └──────── Response file (.json) ◄────────┘
      └── Register update ◄─┘
          (.xlsx, paste values)
```

1. **Secretariat** opens the register (`.xlsx`). New Form responses are added; submission data are refreshed from the register; what was recorded in the tool is kept.
2. The Secretariat assesses, then **sends a review pack** to a body (WG1–WG5, SMC or ESC). The pack contains only the requests referred to that body. The applicant's name and email are **left out by default**.
3. The reviewer opens the pack, records an opinion or decision for each request, and **downloads a response file**, which they return to the Secretariat.
4. The Secretariat **imports the responses**, previews the changes and applies them. An SMC decision at Level 2 and an ESC decision at Level 3 set the final decision; Working Group opinions fill the "WG opinion – summary" column.
5. The Secretariat saves the **workspace file** (`.json`) on SharePoint at the end of each session and, when needed, downloads a **register update** to paste into the Excel register.

The browser keeps a working copy between visits (it can be switched off in *Role and settings*, e.g. on a shared computer). The workspace file remains the record.

## Publishing on GitHub Pages

1. Create a repository (for example `dacs-logo-assessment-tool`) in the UNESCO GitHub organisation, and push the contents of this folder to the `main` branch.
2. In **Settings → Pages**, set *Source* to *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The tool is available at `https://<organisation>.github.io/dacs-logo-assessment-tool/` after a minute or two.

Notes:
- A GitHub Pages site is public, even when the repository is private (unless the organisation uses GitHub Enterprise Cloud with access control on Pages). This is acceptable because the site holds **no data**; the page is marked `noindex`. It does display the logos of UNESCO and of the Decade: confirm with the UNESCO services concerned that this use is in order before publishing.
- The tool also works without GitHub: open `index.html` from a folder on SharePoint, OneDrive or a local disk (double-click), or serve the folder from any web server.
- To test locally: `python3 -m http.server 8000` in this folder, then open <http://localhost:8000>.

## Visual identity

The interface uses the components of the Decade's visual identity:

- **Logos**: the white versions of the Decade logo and of the UNESCO logo on the navy header and footer (`assets/img/decade-logo-white.png`, `unesco-logo-white.png`); the emblem as favicon.
- **Colours**: navy `#23315F`, mountain navy `#003760`, mid blue `#3570A8`, sky `#8ED2EE`, snow `#EAEAEA`, and the four colours of the emblem's ring (blue `#0072B8`, glacier `#00A3DA`, green `#3DA63A`, forest `#4A7A36`), shown as the band under the header. Typeface: Arial.
- **Pattern 2, topographic curves**: the white and navy contour lines, extracted as transparent layers (`topo-lines-white.webp`, `topo-lines-navy.webp`) for the header and page headings, and the navy topographic panel (`topo-navy.jpg`) on the start page.
- **Shapes**: the layered waves (sky, snow, mid blue, navy) above the footer and on the Level 1 card; the angular mountain on the Level 2 card; the mountain of the emblem on the Level 3 card; the white-edged wave bands of the collage poster, showing ice photography, on the start page.
- **Photography**: one ice-cave photograph (`assets/img/ice-cave.jpg`).

**Image rights.** Before the repository is made public, confirm that UNESCO holds the rights to publish `ice-cave.jpg` on the web. Two other photographs supplied with the identity components were deliberately not included: a stock illustration of blue mountains (it appears to come from a stock agency, which normally requires a licence for web use) and a second ice-cave photograph of unknown origin.

## Changing the rules

All reference values are in **[`assets/js/config.js`](assets/js/config.js)**, taken from the methodology and from the *Reference* sheet of the register: levels and approval chains, hard gates, criteria and weights, scoring scale, decision bands, dropdown lists, main goals, opinion options for each body, and timelines. Change a weight or a band there and the whole tool follows. Keep it in step with the register's *Reference* sheet.

Two items still need completing in `config.js`: the titles of **MG3.1** and **MG3.2**, which have not yet appeared in the application Form.

## Moving data back into Excel

*Review packs & files → Back to Excel*:

- **Register update** (`.xlsx`): the reviewer columns placed at the same cell addresses as the *Requests* sheet (Form ID *n* on row 4 + *n*). Paste three blocks as values, as described on its first sheet: `Z:AF`, `AH`, `AJ:AQ`, `AT:BI`. The register's own formulas (gate outcome `AG`, deciding body `AI`, weighted score `AR`, first screening result `AS`) are never overwritten and recalculate. Keep a copy of the register first; SharePoint's version history also allows a restore.
- **Summary** (`.xlsx`): one readable row per request, for meetings and reporting to the SMC.

## Repository layout

```
index.html                 the application page
assets/css/styles.css      visual identity of the Decade (colours, pattern, waves; Arial)
assets/js/config.js        methodology and register reference values - the only file to edit for rule changes
assets/js/model.js         register calculations (gate outcome, weighted score, recommendation, timelines)
assets/js/io.js            Excel import and export, workspace, review packs and responses
assets/js/app.js           user interface
assets/js/demo-data.js     fictional examples for trying the tool
assets/img/                white logos, topographic pattern layers, ice photograph, favicon
assets/vendor/exceljs.min.js  ExcelJS 4.4.0 (MIT licence), to read and write .xlsx in the browser
docs/USER_GUIDE.md         step-by-step guide for each role
examples/                  fictional workspace, review pack and response files
```

## Checks carried out

- Imported the Secretariat's register of 24 September 2026 (11 requests): the gate outcome, weighted score and first screening result calculated by the tool match the register's formulas for all eleven.
- Full cycle tested in separate browser sessions: Secretariat → WG1 pack → WG1 response → import; SMC pack → Level 2 endorsement (sets the final decision) and Level 3 recommendation (the ESC still decides).
- No console errors under the Content Security Policy; layout checked at desktop and phone width, in light and dark display.

## Limits

- Roles in the tool are a working mode, not access control: what a reviewer can see is limited by the pack the Secretariat sends them.
- Two Secretariat staff editing separate copies of the workspace at the same time will create two versions. Keep one focal point per session, as for the Excel register.
- Timelines count working days (Monday to Friday) and do not account for UNESCO holidays. The count is shown as suspended while a request is "4 - Awaiting applicant".
- Requests without a date of receipt in the register (Form IDs 6 to 11 at present) have no timeline until the date is entered in the register.

## Licences

Code: to be set by UNESCO before the repository is made public. ExcelJS: MIT licence (`assets/vendor/EXCELJS-LICENSE.txt`). The logos of UNESCO and of the Decade are marks of UNESCO; their use is governed by the Directives concerning the use of the name, acronym, logo and Internet domain names of UNESCO (34 C/Resolution 86).
