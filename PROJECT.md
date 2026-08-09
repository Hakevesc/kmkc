# Kebena MKC Church Display

An Electron-based dual-monitor presentation application for Kebena MKC Church services, built for Ethiopian Orthodox worship with Amharic-language UI and Ethiopian calendar support.

## Architecture

### Dual-Window System
- **Main window** (`src/index.html`): Operator control panel with sidebar navigation
- **Presentation window** (`src/present.html`): Dedicated audience output on the external display
- Communication via IPC: main window calls `window.Present.open()` → `window.api.presentUpdate()` → `presentApi.onRender()` in the presentation window

#### Audience window behaviour (`main.js`)
- **Borderless, not native fullscreen.** The window is created frameless at the exact
  bounds of the audience display and pinned `alwaysOnTop`. Electron's native fullscreen
  on Windows is tied to the foreground app, so minimizing or clicking away from the
  operator window used to drop the presentation out of fullscreen or minimize it.
- **Never minimizes.** `minimizable: false` plus a `minimize` handler that restores
  immediately, so Win+D / "minimize all" / taskbar actions cannot blank the audience.
- **Never steals focus.** Shown with `showInactive()` so arrow-key control stays with
  the operator window. `ensurePresentVisible()` is called on every render path because
  `ready-to-show` is not guaranteed to fire.
- **Follows the display.** `screen` add/remove/metrics events call
  `syncPresentWindowBounds()`, which re-fits the window and rebuilds it (replaying
  `lastPresentPayload`) when the output switches between windowed preview and a real
  audience display — i.e. the projector being switched on mid-service.
- **`backgroundThrottling: false`** on both windows: auto-advance timers live in the
  main renderer and must keep firing while it is minimized.

#### Resolution normalisation
`applyPresentZoom()` sets the presentation window's zoom factor so its CSS viewport
always matches a **1920×1080 reference canvas** (the same one `lyrics.js` scales its
slide thumbnails from). `display.css` mixes fixed px, `clamp()` caps and vw/vh, so
without this a 4K TV bottoms out every `clamp()` maximum and renders text visibly
smaller relative to the screen than a 1080p projector does. Zooming re-runs layout at
the target size — text stays crisp, unlike a CSS transform. The scale is computed in
the main process from `getContentSize()` (true device-independent pixels); the renderer
only sees already-zoomed CSS pixels and cannot invert that reliably. The factor is
pushed to the page as `present:scale` → `presentApi.onRescaled()` and the
`--display-scale` CSS variable.

Verified output (title text measured at every size): 720p / 1080p / 4K / small preview
all resolve to a 1920×1080 viewport with identical type sizes; 4:3 → 1920×1440 and
16:10 → 1920×1200 keep reference width and gain vertical margin; 21:9 → 2560×1080 keeps
reference height and gains width. Nothing is cropped or letterboxed.

#### Minimizing the preview vs. exiting
The operator dashboards (lyrics, notices) render into the main window's `presentOverlay`.
- **Minimize** (button, or `Ctrl+M`) — `Present.minimize()` hides only the local preview
  and drops the main window out of fullscreen. The audience screen keeps running and
  auto-advancing. A "Live on the second screen" bar offers *Show preview* / *Exit*.
- **Exit** (`Esc`) — `Present.close()` runs cleanup and closes the audience window.

While minimized, `Present.isPreviewActive()` returns false and the dashboards'
document-level arrow/space/Esc handlers stand down so they don't hijack typing in the
control panel.

### IPC Layer
- **Preload** (`preload.js`): Uses `contextBridge` to expose `window.api` and `window.presentApi`
- **Main process** (`main.js`): Handles IPC via `ipcMain.handle` for store operations, docx parsing, Bible loading, QR generation, presentation window management, YouTube auth, video dialog, and display enumeration

### Data Persistence
- JSON files stored in `app.getPath('userData')` via `STORE_FILES` map in `main.js`
- `src/js/store.js`: Thin wrapper mapping `window.Store.*` to `window.api.*` IPC calls

## Core Modules (`src/js/`)

| Module | Lines | Description |
|---|---|---|
| `app.js` | 91 | `window.AppState` (font + church name global state), `applyStrings()` builds nav buttons from `STRINGS` |
| `store.js` | 48 | Wrapper mapping `window.Store.*` to `window.api.*` IPC calls |
| `present.js` | 100 | `window.Present.open(renderFn, variant)` — renders full-screen overlay, mirrors to external window |
| `presentRenderer.js` | 28 | Preload for presentation window; exposes `presentApi` via contextBridge |
| `presentWindow.js` | 31 | Presentation window DOMContentLoaded handler — registers `presentApi` listeners |
| `escapeHtml.js` | 17 | Shared `escapeHtml`/`escapeAttr` utilities |
| `fonts.js` | 26 | Font list matching `@font-face` declarations |
| `ethiopianCalendar.js` | 116 | Offline GC↔EC (Amete Mihret) conversion using Dershowitz-Reingold algorithm |

## Features (`src/js/`)

### Lyrics (`lyrics.js`, 573 lines)
- `.docx` import via `mammoth`
- Per-song editor with background media support
- Auto animation: pulse-cross, floating-dots, ripple
- Keyboard controls (arrow keys, space)
- Per-slide font sizing

### Bible (`bible.js`, 552 lines)
- Book/chapter/verse browser
- Single verse + range modes
- Operator inline view + external presenter
- Keyboard navigation, scroll sync
- KJV or NASV translations loaded from `main.js`

### Bible Editor (`bibleContentUpdate.js`, 494 lines)
- Book/chapter/verse browser with inline editor
- Add/edit individual verses
- Saves via `saveBibleVerse`/`saveBibleChapter` IPC

### Bible Quotes (`bibleQuotes.js`, 294 lines)
- Custom quotes list (add/edit/delete)
- Present with MKC logo + church name overlay

### Notices (`notices.js`, 199 lines)
- Combined operator + management view
- Chunks into groups of 2
- Single/group present modes, auto-advance timer
- Ethiopian date display

### Bank Accounts (`bankAccounts.js`, 355 lines)
- Pre-built logo set (CBE, Oromia, Berhan, TeleBirr, Dashen, Awash, Abyssinia, Wegagen)
- Overview + detail present modes, auto-advance, keyboard controls

### Social Media (`social.js`, 390 lines)
- 15+ platforms (YouTube, TikTok, Facebook, Instagram, Telegram, X, WhatsApp, Threads, Snapchat, LinkedIn, Pinterest, Discord, Twitch, Rumble, Spotify)
- QR code generation via `qrcode` (redirect URL `https://kebenamkc.vercel.app/`)
- Auto-rotate carousel

### Slides (`slides.js`, 279 lines)
- Image slideshow: upload/reorder/present
- Auto-advance, keyboard controls

### Media (`media.js`, 358 lines)
- YouTube + offline video player
- Webview browser, YouTube login flow, local file dialog

### Creed (`creed.js`, 107 lines)
- Apostles' Creed in Amharic
- Default lines, 3-color scheme, editable, per-slide 2-line grouping

### Countdown (`countdown.js`, 370 lines)
- Duration, target-time, and stopwatch modes
- Flip-clock and circle styles

### Settings (`settings.js`, 325 lines)
- Church identity, lyrics/notices/social config
- Footer save

## Supporting Files

| File | Lines | Description |
|---|---|---|
| `src/strings.js` | 168 | Centralized Amharic/English UI text |
| `src/assets/icons.js` | 189 | Inline SVG icon library |
| `src/styles/theme.css` | 109 | Font declarations, CSS custom properties, base layout |
| `src/styles/display.css` | 364 | Presentation overlay styling, fullscreen present screens |
| `src/styles/app.css` | 258 | App shell layout (sidebar, topbar, nav, content views) |
| `src/styles/bibleContentUpdate.css` | 44 | Bible editor styling |

## Dependencies (`package.json`, 63 lines)
- `electron`: ^31.0.0
- `mammoth`: ^8.0.0 (`.docx` → HTML conversion)
- `qrcode`: ^1.17.0 (QR code generation)
