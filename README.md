# Study Tracker

A static, no-build PWA. Plain HTML/CSS/JS — nothing to compile, no
`node_modules` needed to run it.

## Structure

```
index.html            # markup only — links every file below, in order
manifest.json         # PWA manifest (name, icons, theme color)
sw.js                 # offline cache (app shell only — your data stays in
                       #   the browser's localStorage, never cached here)
icon-192.png
apple-touch-icon.png
icon-512.png

css/                   # loaded top-to-bottom in index.html — order matters
  base.css              # design tokens (colors/vars), reset, body, app shell
  habit-tracker.css      # habit-tracking calendar card
  header-search.css      # top scorecard header + search
  today-calendar.css     # today page layout + commit-graph
  calendar-popover.css   # "plan a day" popover + lecture badge
  timer.css               # running timer banner + alert banner
  sidebar.css              # sidebar, folder picker, progress rings, stat chips
  subject-detail.css       # subject detail main panel
  exam-pacing.css          # exam pacing card
  tooltip-footer.css       # "studied on" tooltip + footer quote strip
  modal.css                # modals + slide-in progress panel
  today-planner.css        # priority planner / today page (hero, plan, etc.)
  lecture-notes.css        # lecture notes editor
  analytics.css             # analytics dashboard theme
  focus-mode.css             # focus mode overlay
  login.css                    # login / checkpoint screen
  mascot.css                    # study mascot
  dark-mode.css                 # dark-theme overrides (loaded last)
  a11y.css                      # focus rings + reduced-motion (loaded very last)

js/                    # loaded top-to-bottom in index.html — order matters,
                       # everything is a plain global script (no bundler,
                       # no modules) so functions in one file can call
                       # functions/variables defined in another
  data.js                 # in-memory state + constants
  today-and-folders.js    # today/priority page + subject folders
  cloud-sync.js           # optional Firebase sync — set FIREBASE_CONFIG here
  storage.js              # load/save/migrate (local device storage + cloud)
  settings.js             # backup/restore + settings
  time-tracking.js
  exam-scores.js
  render.js               # core render dispatcher
  dashboard.js
  calendar.js             # "plan a day" calendar
  tooltip.js              # "studied on" reveal tooltip
  lecture-notes.js
  actions.js
  test-score-actions.js
  modals.js
  exam-date.js
  init.js                 # app bootstrap
  mascot.js               # mascot behavior, dragging, tilt
  login.js                # login gate + service-worker registration
```

## Making a change

Find the file for the feature you're touching (see the table above),
edit it, save, refresh. You don't need to touch any other file unless
your change genuinely spans two features.

**The one rule:** don't reorder the `<link>`/`<script>` tags in
`index.html`. CSS files are loaded in cascade order (later files can
override earlier ones), and JS files share one global scope loaded in
sequence — reordering either can break something even though each
individual file is unrelated to the reorder.

## Local preview

```
npx serve .
```

or just open `index.html` directly in a browser — no build step, no
dependencies to install.

## License

MIT — see [LICENSE](./LICENSE). Anyone reusing this code must keep the
copyright notice and license text, per the terms of the license.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → Import** that repo.
3. Framework preset: **Other** (it's static — no build command, no
   output directory needed).
4. Deploy.

Every future push to your main branch auto-deploys. Since this is
plain files with no build step, there's no risk of a build breaking —
what you see locally is exactly what ships.
