**SOFTWARE REQUIREMENTS SPECIFICATION**

*for*

**Study Tracker**

A Progressive Web App for Lecture Time-Tracking, Test-Score Analytics,
Daily Habit Building and Exam Preparation

Version 1.8

7 September 2026

**Prepared by: Kanishk**

*Document Standard Followed: IEEE 830-1998 (adapted)*

**Document Control**

**Document Information**

| **Field** | **Detail** |
|----|----|
| Document Title | Software Requirements Specification — Study Tracker |
| Document ID | ST-SRS-001 |
| Project | Study Tracker (Web / PWA) |
| Version | 1.8 |
| Status | Final — Baseline |
| Classification | Public — Portfolio Reference |
| Author / Owner | Kanishk — Sole Developer & Product Owner |
| Issue Date | 7 September 2026 |
| Standard Followed | IEEE Std 830-1998 (adapted for a solo-developer project) |

**Revision History**

| **Version** | **Date** | **Description** | **Author** |
|----|----|----|----|
| 0.1 | 29 Aug 2026 | Initial draft — scope, product perspective and module list outlined from early build. | Kanishk |
| 0.5 | 01 Sep 2026 | Added full functional requirement tables per module; drafted data model. | Kanishk |
| 1.0 | 3 September 2026 | Reviewed against shipped source code for accuracy; baselined as v1.0. | Kanishk |
| 1.1 | 4 September 2026 | Folder-opening now renders a dedicated full-page folder dashboard (design port, css/folder-dashboard.css) instead of the in-drawer list; updated FR-6 and interface tracing, added the dashboard stylesheet to the module references. | Kanishk |
| 1.2 | 4 September 2026 | Night-shrine login redesign with interactive scene (stars/snow/embers/parallax/glass-sheen), viewport scale-lock on mobile, settings slide-in drawer, phone card overflow fix (subject cards stack vertically ≤480px), null-guard hardening across 14 CRUD chains, SW cache query-string fallback, JSON-LD WebSite schema, deleted unused legacy files. | Kanishk |
| 1.3 | 6 September 2026 | Ultra-dark dashboard port from reference mockup (css/ultra-dark.css): scorecard hero with stat pills, quick-action tiles, subject cards, priority/deadlines/revision panels, streak widget; contribution-calendar redesign as a 12-month strip (level thresholds 30/60/120 min, today ring/glow, Previous/Next-only navigation, instant scroll-restore fix); country/timezone engine (24 presets, week-start setting, zone-aware "today" everywhere); session-level global study timer with live calendar glow; visibility/SEO pass (SoftwareApplication + Article/Breadcrumb/FAQPage JSON-LD, `<noscript>` fallback, cross-linked guide pages, share button, retargeted title). Added FR-14.5/14.6, FR-5.4–5.7, modules 4.17–4.18; extended data model (settings, global-timer key) and NFR-18. | Kanishk |
| 1.4 | 7 September 2026 | why-study-tracker.html full redesign: liquid-glass dark editorial theme, Three.js 3D stage, scroll-triggered IntersectionObserver reveals, chapter-rail navigation, Rei character integration, 7-chapter structure with "Built by Kanishk" footer. Running-timer badge on Ongoing Subjects (pulsing "⏱ Xm" indicator, pins running subject to top). Mascot avatar hidden on subject-page view to prevent z-index overlap with kebab menu. Back-navigation system (pushState/popState, back-nav.js/back-nav.css, 8 navigation flows). Global scrollbar hiding (scrollbar-width:none, webkit-scrollbar). Added FR-18.4, FR-13.5, IR-12. | Kanishk |
| 1.5 | 7 September 2026 | SEO and marketing pass: why-study-tracker.html rewritten to emphasise unique organisational hierarchy (folders → subjects → units → lectures → notes) as core differentiator; added JSON-LD (Article, SoftwareApplication, BreadcrumbList), OG/Twitter meta, canonical URL, high-value keywords. index.html meta strengthened with hierarchy-focused descriptions. SRS scope updated to highlight the hierarchy as the core differentiator. | Kanishk |
| 1.6 | 7 September 2026 | Competitive positioning pass based on a review of current study/productivity apps (Study-Track, StudyTracker.co.in, StudyTracker.space, OneFightMore, Studylo, My Study Diary). No single product matches the full Study Tracker combination; differentiation is now framed honestly as **system design**, not a single feature. why-study-tracker.html updated: solution page gains a direct "the system design is the magic" statement; Rei reframed as a computed feedback system (mood, rapport, cooldowns) rather than decoration; Craft page adds lecture-notes depth (pagination, highlighting, code blocks, hyperlinks, timestamps, freehand drawing, Markdown export, sanitised re-import); System page gains the module chain (Subject → Unit → Lecture → Timer → Notes → Tests → Planner → Habits → Analytics → Exam pacing → Search → Mascot → Backup → Offline → Cloud sync → Timezone engine → Global timer) and a "the chain is the point" note. Scope updated to describe the unusual combination. | Kanishk |
| 1.7 | 7 September 2026 | Optional live-AI enhancement for the mascot: new js/rei-gemini.js module (Firebase AI Logic + Gemini Developer API, free tier, key held server-side by Firebase) lets Rei improvise context-aware lines when online. Fully additive: unconfigured console state, offline devices, API failures, or a localStorage kill-switch (studyReiAI="0") all fall back to the built-in line banks — the app's behaviour is unchanged without it. Added optional FR-13.6. | Kanishk |
| 1.8 | 7 September 2026 | Ask-Rei chat panel on the mascot: tapping Rei opens a small chat panel where the student can ask freeform questions about their own tracker data (e.g. "how many lectures left in DBMS?", "which subject am I ignoring?"). Answers come from Gemini (js/rei-gemini.js, same Firebase AI Logic grant, new ReiAI.answerChat with per-subject facts). Panel is purely additive; drag still moves Rei, rapid-poke reactions unchanged, chat closes via ✕ or a second tap, and the panel is hidden when the mascot is minimized. Added FR-13.7. | Kanishk |
| 1.9 | 8 September 2026 | Ask-Rei chat became Gemini-only: removed the local factual answerer and legacy conversational intents from js/mascot.js — when the device is offline or the AI call fails/times out/returns nothing, Rei posts no message at all (typing stops, panel silent; no canned or rule-based fallback). Fixed the chat input gate (the non-empty regex was written as a literal `\S` match, so every question was rejected before reaching the model); removed the 45s/hourly call throttle for chat calls only (ambient speech keeps its guardrails); deleted the dead mascotRespond fallback block; corrected em-dash/arrow mojibake in strings. Updated FR-13.7. | Kanishk |

**Approval**

| **Role** | **Name** | **Responsibility** | **Sign-off** |
|----|----|----|----|
| Author / Developer | Kanishk | Wrote the specification and implemented the system it describes. | Approved |
| Reviewer | Self-reviewed | Requirements checked against the live codebase for traceability (see file references, Section 4). | Approved |
| Product Owner | Kanishk | Owns scope decisions for this project. | Approved |

**Distribution**

This document is distributed as a public portfolio artifact accompanying
the Study Tracker project (source code, live build, and this
specification). It is not confidential. Any reader extending or forking
the project should treat this version as the baseline and log new
requirements as an incremented revision rather than editing prior
entries.

**Table of Contents**

|                                                  |        |
|--------------------------------------------------|-------:|
| **Document Control**                             |  **2** |
| Document Information                             |      2 |
| Revision History                                 |      2 |
| Approval                                         |      2 |
| Distribution                                     |      2 |
| **1. Introduction**                              |  **5** |
| 1.1 Purpose                                      |      5 |
| 1.2 Document Conventions                         |      5 |
| 1.3 Intended Audience and Reading Suggestions    |      5 |
| 1.4 Project Scope                                |      5 |
| 1.5 References                                   |      5 |
| **2. Overall Description**                       |  **6** |
| 2.1 Product Perspective                          |      6 |
| 2.2 Product Functions (Summary)                  |      6 |
| 2.3 User Classes and Characteristics             |      6 |
| 2.4 Operating Environment                        |      7 |
| 2.5 Design and Implementation Constraints        |      7 |
| 2.6 Assumptions and Dependencies                 |      7 |
| **3. External Interface Requirements**           |  **8** |
| 3.1 User Interfaces                              |      8 |
| 3.2 Hardware Interfaces                          |      8 |
| 3.3 Software Interfaces                          |      8 |
| 3.4 Communication Interfaces                     |      8 |
| **4. System Features (Functional Requirements)** |  **9** |
| 4.1 Subject, Unit and Lecture Management         |      9 |
| 4.2 Lecture Time Tracking                        |      9 |
| 4.3 Test / Quiz Score Tracking                   |      9 |
| 4.4 Priority Planner ("Today" view)              |     10 |
| 4.5 Calendar-Based Day Planning                  |     10 |
| 4.6 Folder Organisation                          |     10 |
| 4.7 Habit Tracker                                |     11 |
| 4.8 Analytics Dashboard                          |     11 |
| 4.9 Lecture Notes Editor                         |     11 |
| 4.10 Focus Mode                                  |     12 |
| 4.11 Exam Date & Pacing                          |     12 |
| 4.12 Global Search                               |     12 |
| 4.13 Study Mascot (Gamified Feedback)            |     12 |
| 4.14 Settings, Theme, Backup & Restore           |     12 |
| 4.15 Authentication & Cloud Sync                 |     13 |
| 4.16 Offline Support & Installability (PWA)      |     13 |
| 4.17 Country & Timezone Awareness                |     14 |
| 4.18 Global Study Timer & Streak Widget          |     14 |
| **5. Data Model**                                | **14** |
| **6. Non-Functional Requirements**               | **15** |
| 6.1 Performance                                  |     15 |
| 6.2 Reliability & Availability                   |     15 |
| 6.3 Security                                     |     15 |
| 6.4 Usability & Accessibility                    |     15 |
| 6.5 Maintainability                              |     15 |
| 6.6 Portability                                  |     15 |
| **7. Appendix**                                  | **16** |
| 7.1 Glossary                                     |     16 |
| 7.2 Supplementary Content Pages                  |     16 |
| 7.3 Assumptions on Document Scope                |     16 |

**1. Introduction**

**1.1 Purpose**

This Software Requirements Specification (SRS) describes the functional
and non-functional requirements of Study Tracker, a browser-based
Progressive Web App (PWA) that helps a student plan, time, and evaluate
their own study activity across multiple subjects. This document is
intended to serve as the authoritative reference for what the system
does, for anyone extending the codebase, evaluating it academically, or
onboarding as a contributor. It has been written by reverse-engineering
the current implementation (HTML/CSS/JavaScript, no build step) rather
than proposed as a future design, so every requirement below reflects a
feature that already exists in the shipped code.

**1.2 Document Conventions**

Requirements are identified with a prefix indicating their category:
FR-x.y for functional requirements (grouped by feature module, Section
4), NFR-x for non-functional requirements (Section 5), and IR-x for
interface requirements (Section 3). Priority is marked as High / Medium
/ Low, where High denotes a requirement the application cannot function
without. The keywords "shall" and "must" indicate mandatory
requirements; "should" indicates a recommended behaviour that degrades
gracefully if unavailable.

**1.3 Intended Audience and Reading Suggestions**

- Students/developers maintaining or extending the codebase — read
  Sections 2, 4 and 6.

- Academic evaluators / instructors grading this as a project
  deliverable — read Sections 1, 2 and 4.

- QA / testers — read Section 4 (System Features) and Section 5
  (Non-Functional Requirements) for testable acceptance criteria.

- End users (students using the app) — read Section 2.2 (Product
  Functions) for a plain-language feature summary.

**1.4 Project Scope**

Study Tracker is a single-user, client-side study-management tool. It
lets a student organise subjects into units, log lecture-by-lecture
study time with a live timer, record test/quiz scores, plan a daily and
weekly workload, track non-academic habits (e.g. gym, reading), take
rich-text lecture notes, and review progress through an analytics
dashboard. An on-screen animated "mascot" reacts to study behaviour
(streaks, procrastination, milestones) to add a gamified accountability
layer. The product is designed to run entirely offline in the browser,
with an optional cloud-sync layer (Firebase) for cross-device
continuity. The unique organisational hierarchy — folders → subjects →
units → lectures → notes — is the core differentiator: every kind of
studying (college, personal, team) is structured the same way, in one
system. The unusual combination is what sets it apart from typical
study apps: it is not primarily a Pomodoro/study-timer app, but a
system for modelling an entire academic workflow — academic hierarchy,
lecture-level time and notes, planner, habits, analytics, exam pacing,
a feedback-driven mascot, offline-first persistence, optional cloud
sync, a deliberate timezone engine, a global study timer, and
backup/restore all operating as connected modules. Each individual
feature overlaps with some existing product; the integrated combination
does not. It is out of scope for this version to support multiple
concurrent users collaborating on the same subject, or any server-side
grading/LMS integration.

**1.5 References**

- IEEE Std 830-1998 — IEEE Recommended Practice for Software
  Requirements Specifications.

- Project README.md — file/module map and local build instructions.

- W3C Web App Manifest specification (manifest.json conformance).

- Service Worker API (offline caching, sw.js).

**2. Overall Description**

**2.1 Product Perspective**

Study Tracker is a standalone, self-contained product — it is not a
component of a larger system. It is a static, no-build PWA: plain
HTML/CSS/JavaScript files served directly to the browser, with no
compilation step and no server-side application logic. Persistence is
client-first: data is written to the browser's local storage layer
(IndexedDB/localStorage, or the host platform's storage API when
embedded) and, optionally, mirrored to a Firebase cloud backend for
multi-device sync and account-based login. The application can therefore
be deployed as-is to any static host (the codebase includes Vercel
deployment configuration) or opened directly as a local file.

**2.2 Product Functions (Summary)**

At a high level, the system allows a user to:

- Create subjects, organise each into units, and log individual lectures
  within a unit.

- Run a live study timer against a lecture and have the elapsed time
  automatically added to that day's log.

- Record test/quiz scores per unit and view averages rolled up to the
  unit and subject level.

- Plan "today" and future days through a Priority Planner: goals, linked
  lectures, and calendar-based day plans.

- Track daily habits (e.g. gym, reading) on a calendar-style habit
  tracker, independent of academic subjects.

- Group subjects into folders for organisation, and open any folder into a
  dedicated full-page folder dashboard showing aggregate progress, total
  study time, per-folder streak, and filterable subject cards (from the
  mobile-optimised v26 design).

- View an Analytics dashboard: completion rings, per-subject bar/line
  charts, KPI stats, and a commit-graph-style calendar heatmap.

- Take rich-text lecture notes with a paginated editor, freehand
  drawing/annotation, colour highlighting, find-in-notes, and Markdown
  export.

- Enter a distraction-free Focus Mode for a single lecture/session.

- Set an exam date per subject and see automatically computed
  exam-pacing guidance and countdown.

- Receive mascot-driven feedback: mood changes and contextual messages
  driven by streaks, neglect of a subject, milestones, and time of day.

- Sign in (optional) for cloud sync across devices, or use the app fully
  offline with local-only storage.

- Export and import the entire dataset as a backup file, and toggle
  light/dark theme.

- Present a single-page "command centre" dashboard that combines a progress
  scorecard (progress-report eyebrow, headline, three stat pills), a
  "Today, at a glance" panel, a 12-month contribution-calendar strip, quick
  action tiles, today's priority list, per-subject progress cards, and
  deadlines / needs-revision panels — rebuilt against a reference ultra-dark
  mockup (css/ultra-dark.css).

- Run a session-level global study timer that is independent of any single
  lecture, with a live counter on the dashboard; its minutes also drive the
  calendar strip's intensity for the current day while running.

- Keep a visible study-streak widget (consecutive study days) on the dashboard.

- Operate with timezone awareness: "today" and the first day of the week are
  computed from a user-selected country/timezone (24 presets or a custom
  zone) rather than only the device clock, and every date-dependent view
  (calendar strip, streaks, daily planner, habits, exam pacing, daily logs,
  demo-data seeding) follows the selected zone consistently.

- Share or copy a link to the app directly from the dashboard via a share
  action that falls back from the native Web Share API to a copy-to-clipboard
  toast.

**2.3 User Classes and Characteristics**

| **User Class** | **Description** | **Technical Expertise** |
|----|----|----|
| Primary user (student) | A single student who owns the data on a given device/account. Uses the app daily to log study time, plan the day, and review progress. | Low — no technical knowledge required to use the app. |
| Developer / maintainer | Edits HTML/CSS/JS source files directly to add or change a feature. | Moderate — comfortable with vanilla JS, no framework knowledge needed. |
| Guest / offline user | Uses the app without signing in; all data stays local to that browser. | Low. |

**2.4 Operating Environment**

- Client: any evergreen desktop or mobile web browser supporting Service
  Workers, IndexedDB, and ES2017+ JavaScript (Chrome, Edge, Firefox,
  Safari).

- Installable as a PWA (standalone display mode) on Android, iOS (via
  "Add to Home Screen"), and desktop Chromium browsers.

- Optional backend: Google Firebase (Authentication + a document data
  store) for cloud sync — configured by the deployer via a
  FIREBASE_CONFIG value in js/cloud-sync.js; the app is fully functional
  without it.

- Hosting: static file hosting (verified against Vercel; equally
  deployable to any static host or opened as a local file).

**2.5 Design and Implementation Constraints**

- No build tooling: all JavaScript is loaded as classic, non-module
  \<script\> tags in a fixed order and shares one global scope by
  design; load order in index.html must not change.

- CSS files are loaded in a fixed cascade order (dark-mode.css and
  a11y.css load last, deliberately, to override earlier styles).

- All persistent data for a user is stored as a single JSON document
  under one storage key (scoped per signed-in user ID when cloud auth is
  active).

- Cloud writes are throttled to at most one push per 15 seconds per
  change, to stay within Firebase free-tier write budgets.

- The service worker caches only the static app shell; user data is
  explicitly excluded from the cache and is never available offline
  through the cache layer — only through local device storage.

**2.6 Assumptions and Dependencies**

- The user's browser supports and permits IndexedDB/localStorage; if
  both are blocked (e.g. strict privacy mode), data will not persist
  between sessions and the app surfaces a storage warning banner.

- If cloud sync is not configured by the deployer, all sign-in and
  cross-device sync features are inactive and the app runs local-only
  with no functional loss for a single-device user.

- The system assumes a single active user per local data store;
  concurrent multi-user editing of the same account from two devices
  resolves by last-write-wins (via an updatedAt timestamp comparison),
  not by merging.

**3. External Interface Requirements**

**3.1 User Interfaces**

- IR-1: The application shall present three primary views toggled by a
  top-level switcher: "Study Tracker", "Today" (priority planner) and
  "Gym & Reading" (habits) — only one visible at a time.

- IR-2: A persistent sidebar/drawer shall list folders and subjects with
  per-subject progress rings and quick stats, collapsible per folder.

- IR-2a: Selecting a folder shall open a dedicated full-page, scrollable
  folder dashboard overlay (css/folder-dashboard.css) presenting a greeting
  and live clock, four aggregate stat cards (overall progress ring, total
  study time, topics completed, group streak), filter tabs (All / In
  Progress / Completed), per-subject progress cards, and an add-subject
  control; the overlay shall close via a back control or Escape.

- IR-3: A slide-in Analytics Centre overlay shall present progress
  charts without navigating away from the current view.

- IR-4: Modal dialogs shall be used for add/edit operations (subject,
  unit, lecture, test, event, folder) and shall restore keyboard focus
  to the invoking element on close.

- IR-5: The interface shall support a light and a dark theme,
  user-toggleable and persisted across sessions.

- IR-5a: Settings shall be presented in a slide-in drawer from the right
  edge (not a centered modal), overlaying the current view with a
  backdrop.

- IR-6: The interface shall meet baseline accessibility behaviour:
  visible focus rings and a reduced-motion mode (see css/a11y.css).

- IR-7: The app head shall carry JSON-LD structured data (WebSite +
  SoftwareApplication); the guide pages shall carry Article + BreadcrumbList
  schema (the "why" page additionally FAQPage and SoftwareApplication); a
  `<noscript>` summary block and visible footer/guide links shall ensure
  crawlers can discover and reach the guide pages from the homepage.

- IR-8: The dashboard shall expose a share action that uses the native Web
  Share API when available and otherwise copies the app URL to the clipboard
  with a confirmation toast.

- IR-9: The dashboard shall present the ultra-dark "command centre" layout:
  progress scorecard, hero actions row ("Today, at a glance" + progress /
  backup / restore / share / settings), a 12-month contribution-calendar
  strip with weekday headers and a legend, quick-action tiles, priority list,
  subject cards, and deadlines/revision panels.

- IR-10: The calendar strip shall render each month as a 7-column week grid
  (grid-auto-flow: column) with per-day intensity cells; the current day
  shall be marked with a neon ring/glow that persists while the session
  timer is running.

- IR-11: Calendar month navigation shall be Previous/Next buttons only; mouse
  wheel and touch gestures shall not flip the month or hijack page scroll
  (the strip uses touch-action: pan-y).

- IR-12: The application shall implement browser-history-based back navigation
  using pushState/popState, supporting at least 8 navigation flows (subject page
  back, folder dashboard back, My Subjects landing back, analytics overlay close,
  login gate, planner detail, settings drawer, and search overlay) so the browser's
  back button always returns the user to the previous logical view.

**3.2 Hardware Interfaces**

None. The application uses only standard browser input (touch, mouse,
keyboard) and does not interface with device-specific hardware beyond
standard browser storage APIs.

**3.3 Software Interfaces**

| **Interface** | **Purpose** | **Nature** |
|----|----|----|
| Browser IndexedDB / localStorage | Primary offline data persistence for subjects, logs, habits, planner and settings. | Local, required. |
| Host "window.storage" API | Alternate storage backend used automatically when the app runs inside a host platform that provides it (e.g. an embedding artifact environment); falls back to IndexedDB otherwise. | Local, optional (auto-detected). |
| Firebase Authentication | Email/password (and related) sign-in for cloud sync identity. | Remote, optional. |
| Firebase data store | Stores a per-user JSON document mirroring local data, enabling cross-device sync. | Remote, optional. |
| Service Worker (sw.js) | Caches the static app shell (HTML/CSS/JS/icons) for offline load; explicitly excludes user data from the cache. | Local, required for offline app-shell access. |
| YouTube (thumbnail/ID parsing only) | Extracts a video ID from a pasted YouTube URL to render a lecture thumbnail preview. | Remote, optional, read-only. |

**3.4 Communication Interfaces**

All network communication is standard HTTPS. Cloud sync (when
configured) communicates with Firebase over HTTPS using the Firebase
JavaScript SDK. No custom network protocol is implemented.

**4. System Features (Functional Requirements)**

This section enumerates functional requirements grouped by feature
module, each traceable to the corresponding source file(s).

**4.1 Subject, Unit and Lecture Management**

*Implemented primarily in: js/modals.js, js/actions.js,
js/today-and-folders.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-1.1 | The system shall allow the user to create, rename and delete a subject. | High |
| FR-1.2 | Each subject shall be divisible into an ordered list of units, each of which can be created, renamed, and deleted independently. | High |
| FR-1.3 | Each unit shall contain zero or more lectures and zero or more tests, each independently addable, editable and deletable. | High |
| FR-1.4 | The system shall support bulk-adding multiple lectures to a unit in a single action. | Medium |
| FR-1.5 | A lecture may optionally store a link (e.g. a YouTube URL); the system shall parse a YouTube video ID from the link and render a thumbnail preview. | Low |
| FR-1.6 | The system shall allow a subject or folder to have a user-supplied cover image, and shall allow that image to be removed. | Low |
| FR-1.7 | Deleting a subject, unit or lecture shall prompt for confirmation before removing it and its nested data. | High |

**4.2 Lecture Time Tracking**

*Implemented primarily in: js/time-tracking.js, js/exam-scores.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-2.1 | The system shall provide a start/stop timer bound to a single lecture at a time; only one lecture's timer may run at once. | High |
| FR-2.2 | While a timer runs, the system shall display a live running banner with elapsed time updating at least once per second. | High |
| FR-2.3 | On stopping a timer, elapsed seconds shall be added to that lecture's cumulative total and to the day's dailyLog entry for the current date. | High |
| FR-2.4 | The system shall allow a manual time correction to be applied to a lecture (for time studied outside the in-app timer). | Medium |
| FR-2.5 | The system shall compute and display total time studied per unit and per subject by summing constituent lecture times. | High |

**4.3 Test / Quiz Score Tracking**

*Implemented primarily in: js/test-score-actions.js, js/exam-scores.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-3.1 | The system shall allow the user to add a test entry to a unit with a score and maximum score. | High |
| FR-3.2 | The system shall allow editing and deletion of an existing test entry, with a live score-percentage preview while editing. | Medium |
| FR-3.3 | The system shall compute a percentage for each test, an average percentage per unit, and an average percentage per subject. | High |

**4.4 Priority Planner ("Today" view)**

*Implemented primarily in: js/today-and-folders.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-4.1 | The system shall provide a dedicated "Today" view showing a date strip, a greeting, and the plan for the selected date. | High |
| FR-4.2 | The user shall be able to add a goal/task to a given date, optionally linked to a specific subject lecture. | High |
| FR-4.3 | The user shall be able to mark a planner item done, star it, and delete it. | High |
| FR-4.4 | The system shall support carrying an unfinished item over from a previous day to today ("carry over"). | Medium |
| FR-4.5 | The system shall show upcoming and important calendar events on the planner page and allow adding/deleting events. | Medium |
| FR-4.6 | The system shall be able to launch Focus Mode directly for a planner item. | Medium |
| FR-4.7 | The system shall render a month calendar allowing navigation between months and selection of a date to view/edit its plan. | High |

**4.5 Calendar-Based Day Planning**

*Implemented primarily in: js/calendar.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-5.1 | The system shall allow the user to plan specific lectures against a specific future or past date from a calendar popover. | Medium |
| FR-5.2 | The system shall allow un-planning (removing) a previously planned lecture from a date. | Medium |
| FR-5.3 | The system shall compute and display a consecutive-day study streak, both globally and per subject/folder group. | High |
| FR-5.4 | The system shall render a 12-month contribution strip on the dashboard (12 single-month panels in one horizontally scrollable track), each panel showing a week-grid of intensity cells; future dates with planned lectures shall be flagged and open the planning popover, past dates shall open the day-tooltip on click/hover. | High |
| FR-5.5 | A day's intensity level shall be derived from total minutes studied (l1 ≥ 30 min, l2 ≥ 60 min, l3 ≥ 120 min, l4 beyond) and rendered as a distinct fill; the level shall also include minutes from the session-level global timer for the current day. | Medium |
| FR-5.6 | The strip shall keep the layout aligned to the selected week start (Sunday or Monday) and must restore its horizontal scroll position instantly after every rebuild (including per-second session-timer ticks) so the visible month never shifts on its own. | High |
| FR-5.7 | The strip shall be navigable only via Previous/Next buttons; wheel or touch scrolling must not change the month nor trigger the page to scroll. | Medium |

**4.6 Folder Organisation**

*Implemented primarily in: js/today-and-folders.js, js/dashboard.js,
js/calendar.js (drawer folder tiles), css/folder-dashboard.css*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-6.1 | The system shall allow subjects to be grouped into user-created folders, including an implicit "unsorted" group. | Medium |
| FR-6.2 | The user shall be able to create, rename, and reassign a subject's folder. | Medium |
| FR-6.3 | Opening a folder shall render a dedicated full-page folder dashboard (not the in-drawer list) showing aggregate completion %, total study time, per-folder group streak, and a live clock, with the folder's subjects presented as cards that can be filtered by status (in-progress/completed) or shown all; each card shall display topic counts, progress, next unfinished lecture, and total time, and open the subject on click. | High |
| FR-6.4 | The folder dashboard shall be reachable from the My Subjects landing, the sidebar/drawer folder tiles, and folder cards, and shall close back to the landing via a back control or the Escape key. | Medium |

**4.7 Habit Tracker**

*Implemented primarily in: js/storage.js (habit functions)*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-7.1 | The system shall provide a dedicated habits view, independent from academic subjects, for tracking recurring activities (e.g. gym, reading). | High |
| FR-7.2 | The user shall be able to mark a habit as completed for a given calendar date and view a calendar-style history of entries. | High |

**4.8 Analytics Dashboard**

*Implemented primarily in: js/today-and-folders.js, js/dashboard.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-8.1 | The system shall render an overall-completion ring and per-subject completion rings. | High |
| FR-8.2 | The system shall render a study-time chart selectable over configurable date ranges (e.g. 7/14/30 days). | High |
| FR-8.3 | The system shall render per-subject bar charts and a multi-subject line comparison chart of time studied. | Medium |
| FR-8.4 | The system shall render a commit-graph-style calendar heatmap showing daily study intensity ("day level"). | Medium |
| FR-8.5 | The system shall surface key-performance-indicator statistics (e.g. totals, streaks, averages) in a summary panel. | Medium |

**4.9 Lecture Notes Editor**

*Implemented primarily in: js/lecture-notes.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-9.1 | The system shall provide a rich-text note editor per lecture, supporting bold/italic/underline and colour-highlighted text. | High |
| FR-9.2 | Notes shall be paginated: the user may add, delete and navigate between pages within one lecture's notes. | Medium |
| FR-9.3 | The editor shall support inserting a code block, a hyperlink, and a timestamp. | Low |
| FR-9.4 | The editor shall support freehand pen/marker drawing and an eraser, layered over the note page, with adjustable colour and stroke size. | Medium |
| FR-9.5 | The system shall support a find-in-notes search across all pages of a lecture's notes, with next/previous match navigation. | Low |
| FR-9.6 | The system shall support exporting notes (converted to Markdown) and shall sanitise pasted HTML content to prevent unsafe markup from being persisted. | Medium |
| FR-9.7 | The system shall support selectable paper styles/backgrounds for the notes page. | Low |

**4.10 Focus Mode**

*Implemented primarily in: js/lecture-notes.js
(openFocusMode/renderFocusControls/closeFocusMode)*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-10.1 | The system shall provide a distraction-free, full-screen Focus Mode for a single lecture or planner item, including timer controls. | Medium |

**4.11 Exam Date & Pacing**

*Implemented primarily in: js/exam-date.js, js/today-and-folders.js
(examPacing)*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-11.1 | The system shall allow setting a target exam date per subject. | High |
| FR-11.2 | Given an exam date, the system shall compute pacing guidance (e.g. required pace to complete remaining units/lectures before the exam) and display a countdown. | High |

**4.12 Global Search**

*Implemented primarily in: js/exam-date.js
(handleSearch/goToSearchResult)*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-12.1 | The system shall provide a header search that matches across subjects, units and lectures and navigates to the selected result. | Medium |

**4.13 Study Mascot (Gamified Feedback)**

*Implemented primarily in: js/mascot.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-13.1 | The system shall render an animated, draggable on-screen mascot whose mood is computed from recent study behaviour (streaks, missed goals, session length, time of day). | Medium |
| FR-13.2 | The mascot shall react to specific events: task completion, starting/ending a focus session, a quiz being saved, a multi-day streak, or several days of neglect of a subject, each with a distinct message/animation. | Medium |
| FR-13.3 | The system shall maintain a simple "respect"/rapport score for the mascot that adjusts based on user behaviour over time, influencing which message pool is drawn from. | Low |
| FR-13.4 | The mascot shall avoid repeating the same message too frequently by enforcing per-message and per-context cooldowns. | Low |
| FR-13.5 | The mascot avatar shall be hidden (display:none) when the user is viewing a subject page, to prevent overlapping with the subject page's back/kebab controls. | Medium |
| FR-13.6 | When the optional live-AI module (js/rei-gemini.js — Firebase AI Logic + Gemini Developer API, free tier) is configured and the device is online, the mascot may optionally improvise a context-aware line about the current moment (mood plus recent study data) in place of the built-in line. The built-in line must always render immediately and stand on its own; the AI line is a purely additive swap that only appears if it arrives while the same bubble is still showing. If the module is absent, unconfigured, offline, rate-limited, or disabled via the kill-switch (localStorage studyReiAI="0"), behaviour must be identical to the non-AI build. | Low |
| FR-13.7 | A tap on the mascot avatar (a click that is not a drag) shall toggle an "Ask Rei" chat panel where the user can type a freeform question about their own tracker data (e.g. lecture counts per subject, subject status, what to study next). The system shall answer from the tracker's actual data using Gemini only (ReiAI.answerChat — the prompt is restricted to facts supplied from the tracker: per-subject lecture/test/recency figures, today/7-day/month totals, streak, active session). If the device is offline or the AI call fails, times out, or returns nothing, the panel must post no Rei message at all (the typing indicator stops; no canned, rule-based, or legacy fallback replies). The panel must: render user and Rei messages safely (text-only), show a typing state while an answer is pending, never block the timer flow, close via its ✕ button or a second tap, and be hidden whenever the mascot is minimized. | Low |

**4.14 Settings, Theme, Backup & Restore**

*Implemented primarily in: js/settings.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-14.1 | The system shall allow the user to change their display name. | Low |
| FR-14.2 | The system shall allow switching between light and dark themes and persist the chosen theme. | High |
| FR-14.3 | The system shall allow correcting the recorded time for a specific lecture from the settings panel. | Medium |
| FR-14.4 | The system shall support exporting the entire dataset to a backup file and importing/restoring a previously exported backup, with the imported data validated/sanitised before being applied. | High |
| FR-14.5 | The settings drawer shall include a "Country & time" section presenting a country selector (24 presets), a manual timezone field, and a week-start choice (Sunday/Monday), with a live preview of the selected country's current date and time. | Medium |
| FR-14.6 | The dashboard shall provide a share action that invokes the native Web Share API when supported and otherwise copies the app URL to the clipboard with a confirmation toast. | Low |

**4.15 Authentication & Cloud Sync**

*Implemented primarily in: js/login.js, js/cloud-sync.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-15.1 | The system shall present a night-shrine-themed login/checkpoint screen with an interactive scene (animated stars, snow particles, embers, parallax, glass-sheen effects) and shall allow the user to continue in an offline/guest mode without an account. On mobile, the viewport scale shall be locked during the login gate to prevent pinch-zoom layout shifts. | High |
| FR-15.2 | When cloud sync is configured and the user is signed in, the system shall reconcile local and cloud copies of the data by comparing update timestamps and applying the more recent copy. | High |
| FR-15.3 | The system shall present friendly, human-readable error messages for authentication failures (e.g. wrong password, unverified email). | Medium |
| FR-15.4 | Cloud writes shall be de-duplicated and rate-limited (minimum interval between pushes) to conserve backend write quota, while guaranteeing the last change is eventually synced via a trailing push. | Medium |

**4.16 Offline Support & Installability (PWA)**

*Implemented primarily in: manifest.json, sw.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-16.1 | The system shall be installable to a device home screen/app list per the Web App Manifest (name, icons, standalone display, theme colour). | Medium |
| FR-16.2 | The system shall register a service worker that caches the static application shell so the app loads without a network connection. The fetch handler shall strip query strings (e.g. `?v=56`) before matching cached URLs, ensuring offline access works regardless of cache-busting parameters. | High |
| FR-16.3 | The system shall display a warning banner if browser storage is unavailable or a save operation fails, so the user is aware data may not persist. | High |

**4.17 Country & Timezone Awareness**

*Implemented primarily in: js/time-tracking.js, js/settings.js
(settingsPopulateCountry/settingsSetTimeZone/settingsSetWeekStart/
updateCountryNowHint), plus zone-aware reads across js/dashboard.js,
js/render.js, js/calendar.js, js/exam-date.js, js/mascot.js,
js/storage.js, js/demo.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-17.1 | The system shall let the user select a country/timezone from a preset list (24 entries covering major study regions, with a Device-default option) or enter a custom timezone, persisted in settings. | Medium |
| FR-17.2 | The system shall compute "today" from the selected timezone using a noon-anchored date (zoneTodayDate) so that the calendar day never flips at an unexpected boundary, independent of the device clock's zone. | High |
| FR-17.3 | The user shall be able to choose whether the week starts on Sunday or Monday; the calendar strip, planner date strips, and weekday headers shall follow that choice. | Medium |
| FR-17.4 | All date-anchored behaviour shall use the selected zone consistently: dailyLog keys, calendar intensity, streak computation, planner dates and carry-over, habit entries, exam pacing counts, mascot time-of-day logic, and demo-data seeding (demo days are generated relative to the selected zone's today). | High |

**4.18 Global Study Timer & Streak Widget**

*Implemented primarily in: js/dashboard.js
(toggleGlobalStudyTimer/renderStreak/computeCurrentStreak/monthCalLevel)*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-18.1 | The system shall provide a session-level study timer on the dashboard that starts and stops independently of any single lecture, displaying the running seconds live (formatCompactLive) and updating at least once per second. | Medium |
| FR-18.2 | Running minutes from the global timer shall be persisted under a dedicated auxiliary key (study-tracker-real-study-minutes-v1) so the session survives a reload, and shall feed the calendar strip's intensity for the current day while active (and its accumulated total thereafter). | Medium |
| FR-18.3 | The dashboard shall display a study-streak widget derived from consecutive days with logged study (computeCurrentStreak), alongside the strip and scorecard. | Medium |
| FR-18.4 | When a lecture timer is running, the Ongoing Subjects section shall pin the running subject to the top of the list with a pulsing badge showing the elapsed minutes (e.g. "⏱ 12m") and the unit→lecture name in the "Next" slot; the badge shall disappear when the timer is stopped. | Medium |

**5. Data Model**

All application data for one user is stored as a single JSON document
(storage key study-tracker-data, optionally suffixed with the signed-in
user's ID). Its top-level shape, as produced by defaultData() and
maintained thereafter, is summarised below.

| **Field** | **Type** | **Description** |
|----|----|----|
| subjects | Array\<Subject\> | Ordered list of subjects; each has id, name, and units\[\]. |
| subjects\[\].units | Array\<Unit\> | Each has id, name, open (UI expand state), lectures\[\] and tests\[\]. |
| units\[\].lectures | Array\<Lecture\> | Each lecture tracks its own accumulated seconds, optional link, priority flag, and notes (paginated rich HTML + drawing layer). |
| units\[\].tests | Array\<Test\> | Each test stores a score and a maximum score, used to compute percentage. |
| dailyLog | Object\<dateKey, seconds\> | Total seconds studied on each calendar date, used for streaks and the calendar heatmap. |
| habits.entries | Object\<habitKey, entry\> | Completion entries for the habit tracker, keyed by habit and date. |
| priorityPlanner.byDate | Object\<dateKey, PlanDay\> | Per-date planner items (goals/tasks), including linked-lecture references and completion/star state. |
| events | Array\<Event\> | User-created calendar events shown on the planner page. |
| settings | Object | User preferences persisted and sanitised on load (normalizeLoadedData): display name, theme, selected country/timezone, week-start preference, exam-date default, etc. |
| updatedAt | Number (epoch ms) | Last-modified timestamp, used to reconcile local vs. cloud copies on load. |

A small auxiliary, localStorage-only key — study-tracker-real-study-minutes-v1
— records total minutes accumulated by the dashboard's session-level global
study timer. It is deliberately kept separate from the main JSON document so
the running session (and live calendar glow) can survive a page reload; the
minutes are merged into the current day's calendar intensity at render time.

**6. Non-Functional Requirements**

**6.1 Performance**

- NFR-1: The live study timer display shall update at least once per
  second with no perceptible lag on the primary supported browsers.

- NFR-2: Cloud sync pushes shall be throttled to no more than one write
  per 15 seconds per user to control backend load and cost.

- NFR-3: Initial load of the cached app shell shall not depend on
  network round-trips once the service worker has cached it.

- NFR-18: While the session-level global timer runs, the dashboard
  re-renders (calendar strip, live counters) at least once per second; each
  rebuild must restore the strip's horizontal scroll position instantly
  (snapCalToMonth, no smooth glide) so repeated per-second refreshes never
  visibly shift the month a user is viewing, and must not produce scroll-jank
  or layout drift.

**6.2 Reliability & Availability**

- NFR-4: The application shall remain fully usable for core tracking
  features (subjects, timers, notes, planner, habits) with no network
  connection.

- NFR-5: A local data load shall time out (currently 5 seconds) and fall
  back gracefully rather than hang indefinitely if storage is
  unresponsive.

- NFR-6: If a save operation fails, the system shall notify the user
  visibly rather than silently discarding changes.

**6.3 Security**

- NFR-7: User-pasted HTML content in the notes editor shall be sanitised
  before being stored or rendered, to prevent script injection.

- NFR-8: When cloud sync is enabled, each user's data shall be isolated
  by account/user ID both in the local cache key and in the cloud
  document key.

- NFR-9: Authentication shall be delegated to a managed identity
  provider (Firebase Authentication) rather than custom credential
  handling.

**6.4 Usability & Accessibility**

- NFR-10: The interface shall provide visible keyboard focus indicators
  and shall honour the operating system's reduced-motion preference.

- NFR-11: Destructive actions (deleting a subject, unit, lecture, or
  test) shall require an explicit confirmation step.

- NFR-12: The interface shall support both light and dark colour themes
  to accommodate different lighting conditions and user preference.

**6.5 Maintainability**

- NFR-13: The codebase shall remain build-free (no bundler/transpiler
  dependency) so that any single feature file can be edited and the
  change observed on a simple page refresh.

- NFR-14: CSS and JS load order in index.html shall be preserved as
  documented in the project file map, since later files intentionally
  override or depend on earlier ones.

- NFR-17: All CRUD chain lookups (subject → unit → lecture/test) shall
  include null guards to prevent crashes when a parent entity has been
  deleted (e.g. by cloud sync from another device) while a child modal
  is open.

**6.6 Portability**

- NFR-15: The application shall run unmodified on any modern static file
  host (verified: Vercel) and shall not require server-side rendering.

- NFR-16: The storage layer shall auto-detect and use a host-provided
  storage API when present, and otherwise fall back to IndexedDB, then
  localStorage, so the same codebase runs both embedded in a host
  platform and as a standalone deployment.

**7. Appendix**

**7.1 Glossary**

| **Term** | **Definition** |
|----|----|
| Subject | A top-level course/topic the user is studying (e.g. "Database Management System"). |
| Unit | A subdivision of a subject, containing lectures and tests. |
| Lecture | A single trackable study item within a unit; has its own time total, notes, and optional link. |
| dailyLog | The record of total seconds studied on each calendar date, independent of which lecture. |
| Priority Planner | The "Today" view where the user plans and tracks daily goals/tasks. |
| Mascot | The animated on-screen character that reacts to study behaviour to encourage consistency. |
| PWA | Progressive Web App — a website that can be installed and behave like a native app, including offline support. |

**7.2 Supplementary Content Pages**

In addition to the core application (index.html), the product ships
three static informational pages that are outside the application's
functional scope but part of the deliverable:

- exam-prep.html — "How to Prepare for Exams: A Step-by-Step Study Plan
  and Revision Schedule".

- study-tips.html — "How to Study Effectively: 15 Proven Study
  Techniques That Actually Work".

- why-study-tracker.html — an editorial product journal explaining the
  app's origin, unique organisational hierarchy (folders → subjects →
  units → lectures → notes), problem statement, solution, engineering
  craft, and system architecture; features a liquid-glass dark theme,
  Three.js 3D stage, scroll-triggered reveals, chapter-rail navigation,
  and Rei character integration. Strongly SEO-optimised with JSON-LD
  (Article, SoftwareApplication, BreadcrumbList), OG/Twitter meta, and
  high-value keywords targeting "free study app", "study tracker",
  "organize study time", "lecture notes", and "exam scores".

All three pages are cross-linked with each other and with the home app, and
carry JSON-LD structured data (Article + BreadcrumbList; the "why" page also
ships SoftwareApplication and FAQPage schema). The home app links to all three
via its `<noscript>` block and the login-screen guide footer to help crawlers
reach the full content graph from the homepage.

**7.3 Assumptions on Document Scope**

This SRS was produced directly from the current source code rather than
from a separate design phase, and therefore documents the system "as
built." Any future feature request should be added to this document as a
new requirement before implementation, to keep the specification and the
code in sync.
