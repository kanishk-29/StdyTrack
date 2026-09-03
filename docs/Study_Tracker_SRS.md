**SOFTWARE REQUIREMENTS SPECIFICATION**

*for*

**Study Tracker**

A Progressive Web App for Lecture Time-Tracking, Test-Score Analytics,
Daily Habit Building and Exam Preparation

Version 1.1

4 September 2026

**Prepared by: Kanishk**

*Document Standard Followed: IEEE 830-1998 (adapted)*

**Document Control**

**Document Information**

| **Field** | **Detail** |
|----|----|
| Document Title | Software Requirements Specification — Study Tracker |
| Document ID | ST-SRS-001 |
| Project | Study Tracker (Web / PWA) |
| Version | 1.1 |
| Status | Final — Baseline |
| Classification | Public — Portfolio Reference |
| Author / Owner | Kanishk — Sole Developer & Product Owner |
| Issue Date | 4 September 2026 |
| Standard Followed | IEEE Std 830-1998 (adapted for a solo-developer project) |

**Revision History**

| **Version** | **Date** | **Description** | **Author** |
|----|----|----|----|
| 0.1 | 29 Aug 2026 | Initial draft — scope, product perspective and module list outlined from early build. | Kanishk |
| 0.5 | 01 Sep 2026 | Added full functional requirement tables per module; drafted data model. | Kanishk |
| 1.0 | 3 September 2026 | Reviewed against shipped source code for accuracy; baselined as v1.0. | Kanishk |
| 1.1 | 4 September 2026 | Folder-opening now renders a dedicated full-page folder dashboard (design port, css/folder-dashboard.css) instead of the in-drawer list; updated FR-6 and interface tracing, added the dashboard stylesheet to the module references. | Kanishk |

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
continuity. It is out of scope for this version to support multiple
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

- IR-6: The interface shall meet baseline accessibility behaviour:
  visible focus rings and a reduced-motion mode (see css/a11y.css).

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

**4.14 Settings, Theme, Backup & Restore**

*Implemented primarily in: js/settings.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-14.1 | The system shall allow the user to change their display name. | Low |
| FR-14.2 | The system shall allow switching between light and dark themes and persist the chosen theme. | High |
| FR-14.3 | The system shall allow correcting the recorded time for a specific lecture from the settings panel. | Medium |
| FR-14.4 | The system shall support exporting the entire dataset to a backup file and importing/restoring a previously exported backup, with the imported data validated/sanitised before being applied. | High |

**4.15 Authentication & Cloud Sync**

*Implemented primarily in: js/login.js, js/cloud-sync.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-15.1 | The system shall present a login/checkpoint screen and shall allow the user to continue in an offline/guest mode without an account. | High |
| FR-15.2 | When cloud sync is configured and the user is signed in, the system shall reconcile local and cloud copies of the data by comparing update timestamps and applying the more recent copy. | High |
| FR-15.3 | The system shall present friendly, human-readable error messages for authentication failures (e.g. wrong password, unverified email). | Medium |
| FR-15.4 | Cloud writes shall be de-duplicated and rate-limited (minimum interval between pushes) to conserve backend write quota, while guaranteeing the last change is eventually synced via a trailing push. | Medium |

**4.16 Offline Support & Installability (PWA)**

*Implemented primarily in: manifest.json, sw.js*

| **ID** | **Requirement** | **Priority** |
|----|----|----|
| FR-16.1 | The system shall be installable to a device home screen/app list per the Web App Manifest (name, icons, standalone display, theme colour). | Medium |
| FR-16.2 | The system shall register a service worker that caches the static application shell so the app loads without a network connection. | High |
| FR-16.3 | The system shall display a warning banner if browser storage is unavailable or a save operation fails, so the user is aware data may not persist. | High |

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
| updatedAt | Number (epoch ms) | Last-modified timestamp, used to reconcile local vs. cloud copies on load. |

**6. Non-Functional Requirements**

**6.1 Performance**

- NFR-1: The live study timer display shall update at least once per
  second with no perceptible lag on the primary supported browsers.

- NFR-2: Cloud sync pushes shall be throttled to no more than one write
  per 15 seconds per user to control backend load and cost.

- NFR-3: Initial load of the cached app shell shall not depend on
  network round-trips once the service worker has cached it.

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
  documented in README.md, since later files intentionally override or
  depend on earlier ones.

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

- why-study-tracker.html — a product-marketing page explaining the app's
  value proposition.

**7.3 Assumptions on Document Scope**

This SRS was produced directly from the current source code rather than
from a separate design phase, and therefore documents the system "as
built." Any future feature request should be added to this document as a
new requirement before implementation, to keep the specification and the
code in sync.
