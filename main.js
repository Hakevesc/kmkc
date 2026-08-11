const { app, BrowserWindow, ipcMain, dialog, protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('lang', 'en');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-gpu-vsync');

const mammoth = require('mammoth');
const QRCode = require('qrcode');

const STORE_FILES = {
  songs: 'songs.json',
  notices: 'notices.json',
  bankAccounts: 'bankAccounts.json',
  settings: 'settings.json',
  social: 'social.json',
  social_qr_redirect_url: 'social_qr_redirect_url.json',
  social_overview_settings: 'social_overview_settings.json',
  social_slide_duration_seconds: 'social_slide_duration_seconds.json',
  slides: 'slides.json',
  mediaLinks: 'mediaLinks.json',
  videoFiles: 'videoFiles.json',
  countdownPresets: 'countdownPresets.json',
  servicePlaylists: 'servicePlaylists.json',
  bibleQuotes: 'bibleQuotes.json',
  creed: 'creed.json',
  creedFontFamily: 'creedFontFamily.json',
  creedFontSize: 'creedFontSize.json',
  lyricsFontFamily: 'lyricsFontFamily.json'
};

const defaults = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'defaults.json'), 'utf-8'));

function storePath(name) {
  return path.join(app.getPath('userData'), STORE_FILES[name]);
}

function readStore(name) {
  if (!STORE_FILES[name]) return null;
  const file = storePath(name);
  if (!fs.existsSync(file)) {
    // Only write a default file if we have a default value for this key
    if (defaults[name] !== undefined) {
      fs.writeFileSync(file, JSON.stringify(defaults[name], null, 2), 'utf-8');
    } else {
      return null;
    }
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    // For settings, merge defaults so new keys are always present
    if (name === 'settings' && defaults[name] && typeof data === 'object') {
      return Object.assign({}, defaults[name], data);
    }
    return data;
  } catch (err) {
    return defaults[name] || null;
  }
}

function writeStore(name, data) {
  if (!STORE_FILES[name]) return;
  fs.writeFileSync(storePath(name), JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

// We parse the .docx as HTML (not raw text) because mammoth.extractRawText DROPS
// soft line breaks (Shift+Enter / <w:br/>), gluing whole verses into one line.
// convertToHtml preserves every line break as <br /> and every paragraph as <p>,
// so we can recover the real lyric lines.
function decodeStrip(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

// Returns an array of paragraphs, each as a list of its non-empty lines.
// An empty paragraph yields [] and acts as a verse separator.
function extractParagraphs(html) {
  const out = [];
  const re = /<(p|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const lines = m[2]
      .split(/<br\s*\/?>/i)
      .map(decodeStrip)
      .filter((l) => l.length > 0);
    out.push(lines);
  }
  return out;
}

// Build verse-blocks (slides). Adapts to how the document is formatted:
//  - If any paragraph holds multiple lines (verse-per-paragraph style), each
//    non-empty paragraph becomes one slide.
//  - Otherwise (one line per paragraph), lines are grouped into slides using
//    blank paragraphs as separators; with no blanks it's one flowing block.
// Either way, the presentation later re-flows each slide to max 3 lines.
function splitIntoSlides(html) {
  const paras = extractParagraphs(html);
  const hasMultiLinePara = paras.some((lines) => lines.length > 1);

  if (hasMultiLinePara) {
    return paras.filter((lines) => lines.length > 0).map((lines) => lines.join('\n'));
  }

  const slides = [];
  let current = [];
  for (const lines of paras) {
    if (lines.length === 0) {
      if (current.length) { slides.push(current.join('\n')); current = []; }
    } else {
      current.push(lines[0]);
    }
  }
  if (current.length) slides.push(current.join('\n'));
  return slides;
}

let mainWindow;
let presentWindow = null;
// Whether the live presentation window is on a real audience display (frameless,
// always-on-top, full display bounds) or is the single-monitor windowed preview.
let presentWindowIsExternal = false;
// Last payload rendered, replayed when the window has to be rebuilt because a
// monitor was plugged in or removed.
let lastPresentPayload = null;
// What we last asked the presentation window to load: 'present' (present.html)
// or 'external' (a YouTube watch page via present:navigate). Tracked explicitly
// because webContents.getURL() is still empty while a load is in flight, which
// would make us re-issue loadFile() on top of the one already running.
let presentWindowPage = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#1f4497',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'src', 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Auto-advance timers for the audience screen live in THIS renderer, so
      // they must keep firing at full rate while the operator window is
      // minimized or hidden behind another app.
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Show maximized once content is ready — avoids a visible resize flash.
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // If presentation is running when user closes the main window, keep the app
  // alive in the background so the second screen stays active. Fully quit only
  // when presentWindow is gone too (handled in presentWindow's 'closed' event).
  mainWindow.on('close', (e) => {
    if (presentWindow && !presentWindow.isDestroyed()) {
      e.preventDefault();   // block the default close
      mainWindow.hide();    // hide instead — second screen keeps showing
    }
  });

  // Always load the latest HTML/CSS/JS from disk - never a cached copy. This
  // guarantees edits to the app show up on the next launch via the .bat.
  mainWindow.webContents.session.clearCache().finally(() => {
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  });
}

// Reference canvas every presented screen is authored against — the same one
// lyrics.js scales its slide thumbnails from.
const PRESENT_DESIGN_WIDTH = 1920;
const PRESENT_DESIGN_HEIGHT = 1080;

// Make the presentation window's CSS viewport match the reference canvas,
// whatever the output really is. Zooming the frame (rather than CSS-transforming
// the content) re-runs layout at the target size, so text stays crisp and the
// vw/vh/clamp() values throughout display.css all resolve against the same
// 1920x1080 box — a 4K TV, a 720p projector and a 16:10 screen then show the
// identical composition instead of three different ones.
//
// The size is read here rather than in the renderer because getContentSize()
// reports device-independent pixels unaffected by the zoom we are about to
// apply; the renderer only sees already-zoomed CSS pixels and cannot invert
// that reliably.
function applyPresentZoom() {
  if (!presentWindow || presentWindow.isDestroyed()) return;
  // Externally navigated pages (YouTube watch pages) render at native scale.
  if (presentWindowPage !== 'present') return;

  const [width, height] = presentWindow.getContentSize();
  if (!width || !height) return;

  // Fit: the tighter axis sets the scale, so nothing is ever cropped. A
  // non-16:9 output keeps reference size on the binding axis and gains slack
  // on the other, which the centred layouts absorb as margin.
  let zoom = Math.min(width / PRESENT_DESIGN_WIDTH, height / PRESENT_DESIGN_HEIGHT);
  zoom = Math.max(0.25, Math.min(5, zoom));

  try {
    presentWindow.webContents.setZoomFactor(zoom);
  } catch (e) {
    return; // webContents not ready yet — the did-finish-load pass will cover it
  }
  presentWindow.webContents.send('present:scale', zoom);
}

// Bring the audience window up without stealing focus from the operator's
// control panel. 'ready-to-show' is not guaranteed to fire promptly, so every
// path that puts content on screen calls this rather than relying on it — a
// missed event would otherwise leave the audience looking at a black screen.
function ensurePresentVisible() {
  if (!presentWindow || presentWindow.isDestroyed()) return;
  if (presentWindow.isMinimized()) presentWindow.restore();
  if (!presentWindow.isVisible()) presentWindow.showInactive();
}

// Picks the monitor the audience sees: the first display that is not the one
// the operator's main window lives on. Falls back to the primary display when
// only a single screen is connected (windowed preview mode).
function pickPresentDisplay() {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  if (displays.length < 2) return { display: displays[0], isExternal: false };

  // Prefer the display the operator window is NOT on, so we never cover the
  // control panel. Comparing by display id is more reliable than bounds.x!==0,
  // which breaks when Windows places the second screen to the left (negative x)
  // or above (y<0) the primary one.
  let operatorDisplayId = null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      operatorDisplayId = screen.getDisplayMatching(mainWindow.getBounds()).id;
    } catch (e) { /* ignore */ }
  }
  if (operatorDisplayId === null) operatorDisplayId = screen.getPrimaryDisplay().id;

  const external = displays.find((d) => d.id !== operatorDisplayId);
  return external ? { display: external, isExternal: true } : { display: displays[0], isExternal: false };
}

// Keeps the presentation window glued to the full bounds of the audience
// display. Called when monitors are plugged in/out or the resolution changes
// (e.g. a projector negotiating a new mode mid-service).
function syncPresentWindowBounds() {
  if (!presentWindow || presentWindow.isDestroyed()) return;
  const { display, isExternal } = pickPresentDisplay();
  if (!display) return;

  // Windowed preview <-> audience display is not something we can toggle on a
  // live BrowserWindow (frame/always-on-top are creation-time options), so
  // rebuild and replay the last slide. This is the "projector switched on
  // after the app was already presenting" case.
  if (isExternal !== presentWindowIsExternal) {
    const payload = lastPresentPayload;
    const stale = presentWindow;
    presentWindow = null;
    // Detach the 'closed' handler first: this teardown is a rebuild, not the
    // operator ending the presentation, so it must not un-fullscreen the main
    // window or tell the renderer the presentation stopped.
    stale.removeAllListeners('closed');
    stale.destroy();
    createPresentWindow();
    if (payload) renderToPresentWindow(payload);
    return;
  }

  if (!isExternal) return; // windowed preview — leave the operator's size alone

  const b = display.bounds;
  const cur = presentWindow.getBounds();
  if (cur.x === b.x && cur.y === b.y && cur.width === b.width && cur.height === b.height) return;

  presentWindow.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height });
  applyPresentZoom();
}

// Push a payload to the presentation window, waiting for present.html if the
// window is still loading or has been navigated away (e.g. to a YouTube page).
function renderToPresentWindow(data) {
  if (!presentWindow || presentWindow.isDestroyed()) return false;
  // Only full slides are worth replaying after a rebuild. Settings-only
  // payloads (a font change) and scroll-sync ticks carry no markup.
  if (data && typeof data === 'object' && data.html && !data.scrollOnly) {
    lastPresentPayload = data;
  }

  const send = () => {
    if (presentWindow && !presentWindow.isDestroyed()) {
      presentWindow.webContents.send('present:render', data);
      ensurePresentVisible();
    }
  };

  if (presentWindowPage !== 'present') {
    // Coming back from a YouTube watch page — reload the presentation shell.
    presentWindowPage = 'present';
    presentWindow.loadFile(path.join(__dirname, 'src', 'present.html'));
    presentWindow.webContents.once('did-finish-load', send);
  } else if (presentWindow.webContents.isLoadingMainFrame()) {
    presentWindow.webContents.once('did-finish-load', send);
  } else {
    send();
  }
  return true;
}

// Create or show the dedicated presentation window on the second monitor.
function createPresentWindow() {
  if (presentWindow && !presentWindow.isDestroyed()) {
    // showInactive() — never steal focus from the operator's control panel.
    // .focus() here would move keyboard control away from the main window on
    // every slide change, and makes the operator window look like it "lost"
    // the presentation.
    ensurePresentVisible();
    syncPresentWindowBounds();
    return presentWindow;
  }

  const { display: targetDisplay, isExternal } = pickPresentDisplay();
  const bounds = targetDisplay.bounds;
  presentWindowIsExternal = isExternal;

  // On the audience display we use a frameless window sized to the exact
  // display bounds rather than Electron's native fullscreen. Native fullscreen
  // on Windows is tied to the foreground app: minimizing or clicking away from
  // the operator window drops the presentation out of fullscreen or minimizes
  // it entirely. A borderless window at full display bounds is immune to that.
  presentWindow = new BrowserWindow({
    x: bounds.x + (isExternal ? 0 : 50),
    y: bounds.y + (isExternal ? 0 : 50),
    width: isExternal ? bounds.width : 1024,
    height: isExternal ? bounds.height : 768,
    frame: !isExternal,
    show: false,
    resizable: !isExternal,
    movable: !isExternal,
    minimizable: false,
    maximizable: !isExternal,
    fullscreenable: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'js', 'presentRenderer.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep timers, animations and video running at full rate while the
      // operator works in the main window — otherwise Chromium throttles this
      // renderer as soon as it is not the foreground window.
      backgroundThrottling: false,
      partition: 'persist:youtube-login'
    }
  });

  presentWindow.setMenuBarVisibility(false);

  if (isExternal) {
    // Float above the taskbar and any other window on the audience display.
    // Scoped to this window's own bounds, so the operator monitor is untouched.
    presentWindow.setAlwaysOnTop(true, 'screen-saver');
    presentWindow.setVisibleOnAllWorkspaces(false);
  }

  // Hard guard: the audience screen must never minimize on its own. Windows
  // can still issue a minimize (Win+D, "minimize all", taskbar group actions)
  // even with minimizable:false, so we bounce straight back.
  presentWindow.on('minimize', () => {
    if (!presentWindow || presentWindow.isDestroyed()) return;
    setImmediate(() => {
      if (presentWindow && !presentWindow.isDestroyed() && presentWindow.isMinimized()) {
        presentWindow.restore();
        presentWindow.showInactive();
      }
    });
  });

  // Show without taking focus so the operator keeps keyboard control.
  presentWindow.once('ready-to-show', ensurePresentVisible);

  // Re-normalise whenever the output geometry changes: the window being placed
  // on the audience display, a projector renegotiating its mode, or the
  // operator resizing the single-monitor preview.
  presentWindow.on('resize', applyPresentZoom);
  presentWindow.webContents.on('did-finish-load', () => {
    ensurePresentVisible();
    if (presentWindowPage === 'present') {
      applyPresentZoom();
      // First layout after the window lands on the audience display can settle
      // a beat later; re-assert so the very first slide is never shown at the
      // wrong scale.
      setTimeout(applyPresentZoom, 300);
    } else if (presentWindow && !presentWindow.isDestroyed()) {
      // Chromium keys zoom by host, so reset it once the external page (a
      // YouTube watch page) is the current one — otherwise it can inherit the
      // presentation canvas scale and render the player at the wrong size.
      try { presentWindow.webContents.setZoomFactor(1); } catch (e) { /* ignore */ }
    }
  });

  // Apply Referer header for YouTube embeds on the partitioned session.
  // The present window uses partition:'persist:youtube-login' which has its own
  // session (NOT defaultSession), so the global onBeforeSendHeaders in app.whenReady
  // does NOT apply here. Without a valid Referer, YouTube rejects embeds from the
  // file:// origin with Error 153.
  const presentSession = presentWindow.webContents.session;
  presentSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('youtube.com') || details.url.includes('youtube-nocookie.com') || details.url.includes('youtubei.com') || details.url.includes('ggpht.com') || details.url.includes('googlevideo.com')) {
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
      details.requestHeaders['Origin'] = 'https://www.youtube.com';
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Prevent YouTube iframe from opening new windows/popups.
  // YouTube sometimes tries to navigate away from the embed to youtube.com/watch?v=
  // in a new window — we intercept that and prevent it so the video plays inline.
  presentWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If YouTube tries to open a video URL, cancel it — the embed should handle it
    if (url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'))) {
      return { action: 'deny' };
    }
    // Allow other popups (shouldn't happen, but just in case)
    return { action: 'deny' };
  });

  presentWindowPage = 'present';
  presentWindow.loadFile(path.join(__dirname, 'src', 'present.html'));

  presentWindow.on('closed', () => {
    presentWindow = null;
    presentWindowIsExternal = false;
    presentWindowPage = null;
    lastPresentPayload = null;
    // Show the main window again — do NOT quit the app
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.setFullScreen(false);
      // Clear any "still live on the second screen" state in the operator UI.
      mainWindow.webContents.send('present:closed');
    }
  });

  return presentWindow;
}

app.whenReady().then(() => {
  // Register custom protocol for serving slide images
  protocol.registerFileProtocol('churchslide', (request, callback) => {
    const filePath = request.url.replace('churchslide://', '');
    callback({ path: filePath });
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('youtube.com') || details.url.includes('youtube-nocookie.com')) {
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  createWindow();

  // Follow the audience display when a projector/TV is plugged in, unplugged,
  // or renegotiates its resolution mid-service.
  const { screen } = require('electron');
  const onDisplayChange = () => setTimeout(syncPresentWindowBounds, 400);
  screen.on('display-added', onDisplayChange);
  screen.on('display-removed', onDisplayChange);
  screen.on('display-metrics-changed', onDisplayChange);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // If presentation is still running on second screen, don't quit yet —
  // the app will quit automatically when presentWindow closes (see above).
  if (presentWindow && !presentWindow.isDestroyed()) return;
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('store:get', (event, name) => readStore(name));
ipcMain.handle('store:set', (event, name, data) => writeStore(name, data));

ipcMain.handle('dialog:openDocx', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a song lyrics file (.docx)',
    properties: ['openFile'],
    filters: [{ name: 'Word Document', extensions: ['docx'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:openVideo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a video file',
    properties: ['openFile'],
    filters: [{ name: 'Video Files', extensions: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'wmv', 'flv'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('docx:parse', async (event, filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const { value: html } = await mammoth.convertToHtml({ buffer: fileBuffer });
  const slides = splitIntoSlides(html);
  const title = path.basename(filePath, path.extname(filePath));
  return { title, slides };
});

function loadNasvBible() {
  const nasvDir = path.join(__dirname, 'data', 'Bible NASV');
  if (!fs.existsSync(nasvDir)) return null;

  const booksMap = {};

  const scanRecursive = (dirPath) => {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanRecursive(fullPath);
      } else if (stat.isFile() && item.toLowerCase().endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          if (!Array.isArray(content)) continue;
          for (const v of content) {
            const bookNum = Number(v.book);
            const bookName = v.book_name || item.replace(/\.json$/i, '');
            const chapterNum = Number(v.chapter);
            const verseNum = Number(v.verse);
            const text = v.text || '';
            
            if (!bookNum || !chapterNum || !verseNum) continue;

            if (!booksMap[bookNum]) {
              booksMap[bookNum] = {
                name: bookName,
                chapters: {}
              };
            }
            if (!booksMap[bookNum].chapters[chapterNum]) {
              booksMap[bookNum].chapters[chapterNum] = [];
            }
            booksMap[bookNum].chapters[chapterNum][verseNum - 1] = text;
          }
        } catch (err) {
          console.error('Failed to parse NASV file:', item, err);
        }
      }
    }
  };

  scanRecursive(nasvDir);
  if (typeof BIBLE_SYNC_DIR !== 'undefined') {
    scanRecursive(BIBLE_SYNC_DIR);
  }

  const sortedBookNums = Object.keys(booksMap).map(Number).sort((a, b) => a - b);
  const maxBookNum = sortedBookNums.length ? Math.max(...sortedBookNums) : 0;

  const books = [];
  for (let bNum = 1; bNum <= maxBookNum; bNum++) {
    const nasvBook = booksMap[bNum];
    if (!nasvBook) continue;

    const chapterNums = Object.keys(nasvBook.chapters).map(Number);
    const maxCh = chapterNums.length ? Math.max(...chapterNums) : 0;

    const chapters = [];
    for (let ch = 1; ch <= maxCh; ch++) {
      const versesRaw = nasvBook.chapters[ch] || [];
      const verses = [];
      for (let v = 0; v < versesRaw.length; v++) {
        verses.push(versesRaw[v] || '');
      }
      chapters.push({
        chapter: ch.toString(),
        title: "",
        verses: verses
      });
    }

    books.push({
      title: nasvBook.name,
      abbv: "",
      bookNum: bNum,
      chapters: chapters
    });
  }

  if (books.length === 0) return null;

  return {
    title: "NASV Bible",
    books: books
  };
}

// Static reference asset (not a Store collection). Read on demand from the
// project's data folder so the renderer never touches the filesystem directly.
ipcMain.handle('bible:load', (event, version) => {
  if (version === 'NASV') {
    return loadNasvBible();
  }

  const file = path.join(__dirname, 'data', 'bible.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!parsed || !Array.isArray(parsed.books) || parsed.books.length === 0) return null;
    return parsed;
  } catch (err) {
    return null;
  }
});

// Save a single Bible verse
ipcMain.handle('bible:saveVerse', (event, payload) => {
  try {
    const { version, book, book_name, chapter, verse, text } = payload;
    if (!book || !chapter || !verse) return { success: false, error: 'Missing required fields' };

    if (version === 'NASV') {
      return saveNasvVerse(book, book_name, chapter, verse, text);
    }

    // KJV - update data/bible.json
    const file = path.join(__dirname, 'data', 'bible.json');
    if (!fs.existsSync(file)) return { success: false, error: 'Bible file not found' };
    const bible = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!bible || !Array.isArray(bible.books)) return { success: false, error: 'Invalid bible data' };

    const bookEntry = bible.books.find(b => b.bookNum === book || b.title === book_name);
    if (!bookEntry) return { success: false, error: 'Book not found' };

    const chIdx = chapter - 1;
    if (!bookEntry.chapters[chIdx]) return { success: false, error: 'Chapter not found' };

    const vIdx = verse - 1;
    // Ensure verses array is long enough
    while (bookEntry.chapters[chIdx].verses.length <= vIdx) {
      bookEntry.chapters[chIdx].verses.push('');
    }
    bookEntry.chapters[chIdx].verses[vIdx] = text;

    fs.writeFileSync(file, JSON.stringify(bible, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Save a full chapter (multiple verses)
ipcMain.handle('bible:saveChapter', (event, payload) => {
  try {
    const { version, book, book_name, chapter, verses } = payload;
    if (!book || !chapter || !Array.isArray(verses) || verses.length === 0) {
      return { success: false, error: 'Missing required fields' };
    }

    if (version === 'NASV') {
      return saveNasvChapter(book, book_name, chapter, verses);
    }

    // KJV - update data/bible.json
    const file = path.join(__dirname, 'data', 'bible.json');
    if (!fs.existsSync(file)) return { success: false, error: 'Bible file not found' };
    const bible = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!bible || !Array.isArray(bible.books)) return { success: false, error: 'Invalid bible data' };

    const bookEntry = bible.books.find(b => b.bookNum === book || b.title === book_name);
    if (!bookEntry) return { success: false, error: 'Book not found' };

    const chIdx = chapter - 1;
    if (!bookEntry.chapters[chIdx]) return { success: false, error: 'Chapter not found' };

    // Build verses array from parsed data
    const maxVerse = verses.reduce((max, v) => Math.max(max, v.verse), 0);
    const newVerses = Array.from({ length: maxVerse }, () => '');
    for (const v of verses) {
      if (v.verse > 0 && v.verse <= maxVerse) {
        newVerses[v.verse - 1] = v.text;
      }
    }
    bookEntry.chapters[chIdx].verses = newVerses;

    fs.writeFileSync(file, JSON.stringify(bible, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Online Bible Sync IPC & Helpers ─────────────────────────────────────
const BIBLE_VERSIONS = {
  '1260': { name: 'Amharic NASV', code: 'NASV', lang: 'am' },
  '1301': { name: 'Amharic KJV', code: 'KJV', lang: 'am' },
  '96': { name: 'English NIV', code: 'NIV', lang: 'en' },
  '1': { name: 'English KJV', code: 'KJV-EN', lang: 'en' }
};

const BIBLE_SYNC_DIR = path.join(app.getPath('userData'), 'Bible');
const BIBLE_METADATA_FILE = path.join(BIBLE_SYNC_DIR, 'versions.json');

function ensureBibleSyncDir() {
  if (!fs.existsSync(BIBLE_SYNC_DIR)) {
    fs.mkdirSync(BIBLE_SYNC_DIR, { recursive: true });
  }
}

function getBookFilePath(versionId, bookAbbr) {
  ensureBibleSyncDir();
  return path.join(BIBLE_SYNC_DIR, `v${versionId}_${bookAbbr}.json`);
}

async function loadVersionMetadata() {
  try {
    ensureBibleSyncDir();
    const data = await fs.promises.readFile(BIBLE_METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveVersionMetadata(metadata) {
  ensureBibleSyncDir();
  await fs.promises.writeFile(BIBLE_METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
}

function getAmharicBookNameSync(abbr) {
  const map = {
    'GEN': 'ኦሪት ዘፍጥረት', 'EXO': 'ኦሪት ዘጸአት', 'LEV': 'ኦሪት ዘሌዋውያን', 'NUM': 'ኦሪት ዘኍልቍ',
    'DEU': 'ኦሪት ዘዳግም', 'JOS': 'መጽሐፈ ኢያሱ', 'JDG': 'መጽሐፈ መሳፍንት', 'RUT': 'መጽሐፈ ሩት',
    '1SA': '1ኛ ሳሙኤል', '2SA': '2ኛ ሳሙኤል', '1KI': '1ኛ ነገሥት', '2KI': '2ኛ ነገሥት',
    '1CH': '1ኛ ዜና መዋዕል', '2CH': '2ኛ ዜና መዋዕል', 'EZR': 'መጽሐፈ ዕዝራ', 'NEH': 'መጽሐፈ ነህምያ',
    'EST': 'መጽሐፈ አስቴር', 'JOB': 'መጽሐፈ ኢዮብ', 'PSA': 'መዝሙረ ዳዊት', 'PRO': 'መጽሐፈ ምሳሌ',
    'ECC': 'መክብብ', 'SNG': 'መኃልየ መኃልይ', 'ISA': 'ትንቢተ ኢሳይያስ', 'JER': 'ትንቢተ ኤርምያስ',
    'LAM': 'ሰቆቃወ ኤርምያስ', 'EZK': 'ትንቢተ ሕዝቅኤል', 'DAN': 'ትንቢተ ዳንኤል', 'HOS': 'ትንቢተ ሆሴዕ',
    'JOE': 'ትንቢተ ኢዮኤል', 'AMO': 'ትንቢተ አሞጽ', 'OBA': 'ትንቢተ አብድዩ', 'JON': 'ትንቢተ ዮናስ',
    'MIC': 'ትንቢተ ሚክያስ', 'NAM': 'ትንቢተ ናሆም', 'HAB': 'ትንቢተ ዕንባቆም', 'ZEP': 'ትንቢተ ሶፎንያስ',
    'HAG': 'ትንቢተ ሐጌ', 'ZEC': 'ትንቢተ ዘካርያስ', 'MAL': 'ትንቢተ ሚልክያስ',
    'MAT': 'ወንጌል በማቴዎስ', 'MRK': 'ወንጌል በማርቆስ', 'LUK': 'ወንጌል በሉቃስ', 'JHN': 'ወንጌል በዮሐንስ',
    'ACT': 'የሐዋርያት ሥራ', 'ROM': 'ወደ ሮሜ ሰዎች', '1CO': '1ኛ ቆሮንቶስ', '2CO': '2ኛ ቆሮንቶስ',
    'GAL': 'ወደ ገላትያ ሰዎች', 'EPH': 'ወደ ኤፌሶን ሰዎች', 'PHP': 'ወደ ፊልጵስዩስ ሰዎች', 'COL': 'ወደ ቆላስይስ ሰዎች',
    '1TH': '1ኛ ተሰሎንቄ', '2TH': '2ኛ ተሰሎንቄ', '1TI': '1ኛ ጢሞቴዎስ', '2TI': '2ኛ ጢሞቴዎስ',
    'TIT': 'ወደ ቲቶ', 'PHM': 'ወደ ፊልሞን', 'HEB': 'ወደ ዕብራውያን', 'JAS': 'የያዕቆብ መልእክት',
    '1PE': '1ኛ ጴጥሮስ', '2PE': '2ኛ ጴጥሮስ', '1JN': '1ኛ ዮሐንስ', '2JN': '2ኛ ዮሐንስ',
    '3JN': '3ኛ ዮሐንስ', 'JUD': 'የይሁዳ መልእክት', 'REV': 'የዮሐንስ ራእይ'
  };
  return map[abbr] || abbr;
}

function getBookNumberSync(abbr) {
  const books = [
    'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT',
    '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH',
    'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER',
    'LAM', 'EZK', 'DAN', 'HOS', 'JOE', 'AMO', 'OBA', 'JON',
    'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO',
    'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI',
    'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN',
    '3JN', 'JUD', 'REV'
  ];
  const idx = books.indexOf(abbr);
  return idx >= 0 ? idx + 1 : 1;
}

ipcMain.handle('bible:getVersions', async () => {
  return Object.entries(BIBLE_VERSIONS).map(([id, info]) => ({
    id,
    ...info
  }));
});

ipcMain.handle('bible:fetchBook', async (event, { versionId, bookAbbr }) => {
  try {
    const version = BIBLE_VERSIONS[versionId];
    if (!version) {
      throw new Error(`Unknown version: ${versionId}`);
    }

    const cleanBookAbbr = bookAbbr.toUpperCase().trim();
    const url = `https://www.bible.com/${version.lang}/bible/${versionId}/${cleanBookAbbr}.1.${version.code}`;

    console.log(`Fetching ${cleanBookAbbr} from Bible.com version ${versionId}...`);

    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      return { success: false, error: 'Puppeteer dependency missing. Please run "npm install puppeteer" in project directory.' };
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0');

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('[data-usfm]', { timeout: 15000 });

    const totalChapters = await page.evaluate(() => {
      const chapterSelect = document.querySelector('select[data-testid="chapter-select"]');
      if (chapterSelect) {
        return chapterSelect.options.length;
      }
      return 1;
    });

    console.log(`Book ${cleanBookAbbr} has ${totalChapters} chapters`);

    const allVerses = [];
    const bookName = getAmharicBookNameSync(cleanBookAbbr);
    const bookNum = getBookNumberSync(cleanBookAbbr);

    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      const chapterUrl = `https://www.bible.com/${version.lang}/bible/${versionId}/${cleanBookAbbr}.${chapter}.${version.code}`;
      await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('[data-usfm]', { timeout: 30000 });

      const chapterVerses = await page.evaluate((abbr, chNum, bName, bNum) => {
        const versesMap = new Map();
        const elements = document.querySelectorAll('[data-usfm]');

        elements.forEach(el => {
          const usfm = el.getAttribute('data-usfm');
          if (!usfm) return;
          const parts = usfm.split('.');
          if (parts.length >= 3) {
            const vVerse = parseInt(parts[parts.length - 1], 10);
            if (isNaN(vVerse)) return;

            const clone = el.cloneNode(true);
            clone.querySelectorAll('[class*="note"], [class*="footnote"], [class*="ft"], [class*="f"], [class*="label"], .label').forEach(n => n.remove());

            let text = (clone.innerText || clone.textContent || '').trim();
            text = text.replace(/#\s*\d+[\:\፥]\d+[^.]*?(\s|$)/g, '').trim();

            if (text) {
              if (!versesMap.has(vVerse)) {
                versesMap.set(vVerse, text);
              } else {
                versesMap.set(vVerse, versesMap.get(vVerse) + ' ' + text);
              }
            }
          }
        });

        const verses = [];
        versesMap.forEach((text, vNum) => {
          verses.push({
            book_name: bName,
            book: bNum,
            chapter: chNum,
            verse: vNum,
            text: text.replace(/\s+/g, ' ').trim()
          });
        });

        verses.sort((a, b) => a.verse - b.verse);
        return verses;
      }, cleanBookAbbr, chapter, bookName, bookNum);

      allVerses.push(...chapterVerses);

      event.sender.send('bible:fetch-progress', {
        book: cleanBookAbbr,
        chapter,
        total: totalChapters,
        verses: chapterVerses.length
      });
    }

    await browser.close();

    const filePath = getBookFilePath(versionId, cleanBookAbbr);
    await fs.promises.writeFile(filePath, JSON.stringify(allVerses, null, 2), 'utf-8');

    // Also mirror into data/Bible NASV for immediate availability in main Bible view
    try {
      const testament = bookNum >= 40 ? 'New Testament' : 'Old Testament';
      const nasvPath = path.join(__dirname, 'data', 'Bible NASV', testament, `${cleanBookAbbr}.json`);
      const nasvDir = path.dirname(nasvPath);
      if (!fs.existsSync(nasvDir)) fs.mkdirSync(nasvDir, { recursive: true });
      await fs.promises.writeFile(nasvPath, JSON.stringify(allVerses, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write to Bible NASV directory:', e);
    }

    const metadata = await loadVersionMetadata();
    if (!metadata[versionId]) metadata[versionId] = {};
    metadata[versionId][cleanBookAbbr] = {
      lastUpdated: new Date().toISOString(),
      verseCount: allVerses.length,
      chapters: totalChapters
    };
    await saveVersionMetadata(metadata);

    return { success: true, count: allVerses.length };
  } catch (error) {
    console.error('Error fetching Bible book:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('bible:checkUpdates', async (event, { versionId, bookAbbr }) => {
  try {
    const metadata = await loadVersionMetadata();
    const bookMeta = metadata[versionId]?.[bookAbbr];

    if (!bookMeta) {
      return { hasUpdate: true, reason: 'Not downloaded yet' };
    }

    const lastUpdated = new Date(bookMeta.lastUpdated);
    const daysOld = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    return {
      hasUpdate: daysOld > 7,
      lastUpdated: bookMeta.lastUpdated,
      daysOld: Math.round(daysOld)
    };
  } catch (error) {
    return { hasUpdate: false, error: error.message };
  }
});

ipcMain.handle('bible:getLocalBooks', async (event, versionId) => {
  try {
    ensureBibleSyncDir();
    const files = await fs.promises.readdir(BIBLE_SYNC_DIR);
    const prefix = `v${versionId}_`;

    return files
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .map(f => f.replace(prefix, '').replace('.json', ''));
  } catch {
    return [];
  }
});

// ── On-Demand Verse Lookup ─────────────────────────────────────────────────
// Fetches a specific chapter or verse range from Bible.com using Puppeteer.
// Returns [{verse, text}] — no file saving. versionId defaults to '1260' (Amharic NASV).
ipcMain.handle('bible:fetchVerses', async (event, { versionId = '1260', bookAbbr, chapter, verseStart, verseEnd }) => {
  try {
    const version = BIBLE_VERSIONS[versionId];
    if (!version) throw new Error(`Unknown Bible version: ${versionId}`);

    const cleanAbbr = bookAbbr.toUpperCase().trim();
    const cleanChapter = parseInt(chapter, 10);
    if (!cleanAbbr || isNaN(cleanChapter) || cleanChapter < 1) {
      return { success: false, error: 'Invalid book or chapter.' };
    }

    const url = `https://www.bible.com/${version.lang}/bible/${versionId}/${cleanAbbr}.${cleanChapter}.${version.code}`;
    console.log(`[bible:fetchVerses] Loading: ${url}`);

    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      return { success: false, error: 'Puppeteer not installed. Run: npm install puppeteer' };
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('[data-usfm]', { timeout: 30000 });
    } catch (navErr) {
      await browser.close();
      return { success: false, error: `Could not load page: ${navErr.message}` };
    }

    // Parse verseStart / verseEnd
    const vStart = verseStart ? parseInt(verseStart, 10) : null;
    const vEnd = verseEnd ? parseInt(verseEnd, 10) : (vStart ? vStart : null);

    const verses = await page.evaluate((abbr, chNum, vS, vE) => {
      const verseMap = new Map(); // vNum -> array of text strings
      const elements = document.querySelectorAll('[data-usfm]');

      elements.forEach(el => {
        const usfm = el.getAttribute('data-usfm'); // e.g. "JUD.1.2"
        if (!usfm) return;
        const parts = usfm.split('.');
        if (parts.length < 3) return;
        if (parts[0] !== abbr) return;
        if (parseInt(parts[1], 10) !== chNum) return;

        const vNum = parseInt(parts[parts.length - 1], 10);
        if (isNaN(vNum)) return;

        // Filter to requested verse range (null = all)
        if (vS !== null && vNum < vS) return;
        if (vE !== null && vNum > vE) return;

        // Clone and strip footnotes, labels, heading markers
        const clone = el.cloneNode(true);
        clone.querySelectorAll(
          '[class*="note"], [class*="footnote"], [class*="ft"], [class*="label"], ' +
          '[class*="heading"], [class*="para-style-d"], sup'
        ).forEach(n => n.remove());

        const rawText = (clone.innerText || clone.textContent || '').trim();
        // Remove stray verse number prefixes like "2 " at start
        const text = rawText.replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim();

        if (text) {
          if (!verseMap.has(vNum)) {
            verseMap.set(vNum, []);
          }
          verseMap.get(vNum).push(text);
        }
      });

      const result = [];
      for (const [vNum, partsArr] of verseMap.entries()) {
        result.push({ verse: vNum, text: partsArr.join(' ') });
      }
      result.sort((a, b) => a.verse - b.verse);
      return result;
    }, cleanAbbr, cleanChapter, vStart, vEnd);

    await browser.close();

    if (!verses || verses.length === 0) {
      return { success: false, error: 'No verses found. The page may have loaded incorrectly or the reference is invalid.' };
    }

    console.log(`[bible:fetchVerses] ✅ Fetched ${verses.length} verse(s) from ${cleanAbbr} ${cleanChapter}`);
    return { success: true, verses, book: cleanAbbr, chapter: cleanChapter };

  } catch (error) {
    console.error('[bible:fetchVerses] Error:', error);
    return { success: false, error: error.message };
  }
});

function saveNasvVerse(book, book_name, chapter, verse, text) {
  const nasvDir = path.join(__dirname, 'data', 'Bible NASV');
  const testament = book >= 40 ? 'New Testament' : 'Old Testament';
  const bookFile = path.join(nasvDir, testament, getNasvFileName(book_name));
  
  let data = [];
  if (fs.existsSync(bookFile)) {
    data = JSON.parse(fs.readFileSync(bookFile, 'utf-8'));
  }

  // Find existing verse or add new
  const existing = data.findIndex(v => v.book === book && v.chapter === chapter && v.verse === verse);
  const entry = { book_name, book, chapter, verse, text };
  if (existing >= 0) {
    data[existing] = entry;
  } else {
    data.push(entry);
    data.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  }

  // Ensure directory exists
  const dir = path.dirname(bookFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(bookFile, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true };
}

function saveNasvChapter(book, book_name, chapter, verses) {
  const nasvDir = path.join(__dirname, 'data', 'Bible NASV');
  const testament = book >= 40 ? 'New Testament' : 'Old Testament';
  const bookFile = path.join(nasvDir, testament, getNasvFileName(book_name));
  
  let data = [];
  if (fs.existsSync(bookFile)) {
    data = JSON.parse(fs.readFileSync(bookFile, 'utf-8'));
  }

  // Remove existing verses for this chapter
  data = data.filter(v => !(v.book === book && v.chapter === chapter));

  // Add new verses
  for (const v of verses) {
    data.push({ book_name, book, chapter, verse: v.verse, text: v.text });
  }
  data.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

  const dir = path.dirname(bookFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(bookFile, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true };
}

function getNasvFileName(bookName) {
  // Map common book names to their file abbreviations
  const map = {
    'ኦሪት ዘፍጥረት': 'GEN', 'ኦሪት ዘጸአት': 'EXO', 'ኦሪት ዘሌዋውያን': 'LEV',
    'ኦሪት ዘኍልቍ': 'NUM', 'ኦሪት ዘዳግም': 'DEU', 'መጽሐፈ ኢያሱ': 'JOS',
    'መጽሐፈ መሳፍንት': 'JDG', 'መጽሐፈ ሩት': 'RUT', 'ቀዳማዊ መጽሐፈ ሳሙኤል': '1SA',
    'ቀዳማዊ መጽሐፈ ነገሥት': '1KI', 'ቀዳማዊ መጽሐፈ ዜና መዋዕል': '1CH',
    'መጽሐፈ ዕዝራ': 'EZR', 'መጽሐፈ ነህምያ': 'NEH', 'መጽሐፈ አስቴር': 'EST',
    'መጽሐፈ ኢዮብ': 'JOB', 'መዝሙረ ዳዊት': 'PSA', 'መጽሐፈ ምሳሌ': 'PRO',
    'መክብብ': 'ECC', 'መኃልየ መኃልይ': 'SNG', 'ትንቢተ ኢሳይያስ': 'ISA',
    'ትንቢተ ኤርምያስ': 'JER', 'ሰቆቃወ ኤርምያስ': 'LAM', 'ትንቢተ ሕዝቅኤል': 'EZK',
    'ትንቢተ ዳንኤል': 'DAN', 'ትንቢተ ሆሴዕ': 'HOS', 'ትንቢተ ኢዮኤል': 'JOL',
    'ትንቢተ አሞጽ': 'AMO', 'ትንቢተ አብድዩ': 'OBA', 'ትንቢተ ዮናስ': 'JON',
    'ትንቢተ ሚክያስ': 'MIC', 'ትንቢተ ናሆም': 'NAM', 'ትንቢተ ዕንባቆም': 'HAB',
    'ትንቢተ ሶፎንያስ': 'ZEP', 'ትንቢተ ሐጌ': 'HAG', 'ትንቢተ ዘካርያስ': 'ZEC',
    'ትንቢተ ሚልክያስ': 'MAL',
    'ወንጌል በማቴዎስ': 'MAT', 'ወንጌል በማርቆስ': 'MRK', 'ወንጌል በሉቃስ': 'LUK',
    'ወንጌል በዮሐንስ': 'JHN', 'የሐዋርያት ሥራ': 'ACT', 'ወደ ሮሜ ሰዎች': 'ROM',
    'ቀዳማዊ ወደ ቆሮንቶስ ሰዎች': '1CO', 'ሁለተኛ ወደ ቆሮንቶስ ሰዎች': '2CO',
    'ወደ ገላትያ ሰዎች': 'GAL', 'ወደ ኤፌሶን ሰዎች': 'EPH', 'ወደ ፊልጵስዩስ ሰዎች': 'PHP',
    'ወደ ቆላስይስ ሰዎች': 'COL', 'ቀዳማዊ ወደ ተሰሎንቄ ሰዎች': '1TH',
    'ሁለተኛ ወደ ተሰሎንቄ ሰዎች': '2TH', 'ቀዳማዊ ወደ ጢሞቴዎስ': '1TI',
    'ሁለተኛ ወደ ጢሞቴዎስ': '2TI', 'ወደ ቲቶ': 'TIT', 'ወደ ፊልሞን': 'PHM',
    'ወደ ዕብራውያን': 'HEB', 'የያዕቆብ መልእክት': 'JAS',
    'ቀዳማዊ የጴጥሮስ መልእክት': '1PE', 'ሁለተኛ የጴጥሮስ መልእክት': '2PE',
    'ቀዳማዊ የዮሐንስ መልእክት': '1JN', 'ሁለተኛ የዮሐንስ መልእክት': '2JN',
    'ሦስተኛ የዮሐንስ መልእክት': '3JN', 'የይሁዳ መልእክት': 'JUD',
    'የዮሐንስ ራእይ': 'REV'
  };
  // Try to find by name, fallback to first 3 chars uppercase
  if (map[bookName]) return map[bookName] + '.json';
  // Try matching partial names
  for (const [key, val] of Object.entries(map)) {
    if (bookName.includes(key) || key.includes(bookName)) return val + '.json';
  }
  return bookName.substring(0, 3).toUpperCase() + '.json';
}

// Slideshow image handling — copies selected images to a userData folder so
// they are portable and survive re-installs.
function slidesPath() {
  const dir = path.join(app.getPath('userData'), 'slides');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle('slides:pickAndCopy', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select images or videos for slideshow',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'mp4', 'webm', 'mov', 'mkv', 'avi'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  const copied = [];
  for (const src of result.filePaths) {
    const ext = path.extname(src);
    const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ext;
    const dest = path.join(slidesPath(), name);
    fs.copyFileSync(src, dest);
    copied.push({ name, src: dest });
  }
  return copied;
});

ipcMain.handle('slides:list', () => {
  const dir = slidesPath();
  try {
    return fs.readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(f))
      .map((f) => ({ name: f, src: path.join(dir, f) }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('slides:delete', (event, fileName) => {
  const file = path.join(slidesPath(), fileName);
  try { fs.unlinkSync(file); return true; } catch (e) { return false; }
});

ipcMain.handle('app:setFullScreen', (event, value) => {
  if (mainWindow) mainWindow.setFullScreen(Boolean(value));
  return true;
});

// Used by the operator views to show a "Secondary Screen connected" indicator.
ipcMain.handle('app:getDisplays', () => {
  const { screen } = require('electron');
  const { display: target, isExternal } = pickPresentDisplay();
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    bounds: d.bounds,
    size: d.size,
    scaleFactor: d.scaleFactor,
    rotation: d.rotation,
    internal: d.internal,
    isPresentTarget: isExternal && target && d.id === target.id,
    isExternal: isExternal && target && d.id === target.id
  }));
});

// True while the audience screen is live. Lets the operator UI show a
// "presenting" badge and offer to hide the local preview without stopping it.
ipcMain.handle('present:isOpen', () => !!(presentWindow && !presentWindow.isDestroyed()));

let youtubeLoginWindow = null;
let youtubeLoggedIn = false;

ipcMain.handle('youtube:login', () => {
  if (youtubeLoginWindow && !youtubeLoginWindow.isDestroyed()) {
    youtubeLoginWindow.show();
    return true;
  }
  youtubeLoginWindow = new BrowserWindow({
    width: 500,
    height: 700,
    title: 'YouTube Login',
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:youtube-login'
    }
  });
  
  let navigatedToYoutube = false;
  
  youtubeLoginWindow.webContents.on('did-navigate', (event, url) => {
    if (url && (url.includes('youtube.com') || url.includes('youtube-nocookie.com'))) {
      navigatedToYoutube = true;
      youtubeLoggedIn = true;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('youtube:loginState', true);
      }
    }
  });
  
  youtubeLoginWindow.on('closed', () => {
    youtubeLoginWindow = null;
  });
  
  youtubeLoginWindow.loadURL('https://www.youtube.com/');
  return true;
});

ipcMain.handle('youtube:logout', () => {
  if (youtubeLoginWindow && !youtubeLoginWindow.isDestroyed()) {
    youtubeLoginWindow.close();
    youtubeLoginWindow = null;
  }
  const ses = session.fromPartition('persist:youtube-login');
  ses.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb'] }).then(() => {
    youtubeLoggedIn = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('youtube:loginState', false);
    }
  }).catch(() => {
    youtubeLoggedIn = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('youtube:loginState', false);
    }
  });
  return true;
});

ipcMain.handle('youtube:isLoggedIn', () => {
  return youtubeLoggedIn;
});

ipcMain.on('youtube:loginSuccess', () => {
  youtubeLoggedIn = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('youtube:loginState', true);
  }
});


ipcMain.handle('qrcode:generate', async (e, url, opts) => {
  try {
    return await QRCode.toDataURL(url, opts || { margin: 1, width: 220, color: { dark: '#000000', light: '#ffffff' } });
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return null;
  }
});

// ── Dual-monitor presentation IPC ──────────────────────────────────────
ipcMain.handle('present:open', (event, payload) => {
  const win = createPresentWindow();
  if (!win) return { opened: false };
  const data = typeof payload === 'string' ? { html: payload } : payload;
  renderToPresentWindow(data);
  return { opened: true };
});

ipcMain.handle('present:update', (event, payload) => {
  if (!presentWindow || presentWindow.isDestroyed()) return { updated: false };
  const data = typeof payload === 'string' ? { html: payload } : payload;
  return { updated: renderToPresentWindow(data) };
});

// Navigate the present window directly to a URL (e.g. YouTube watch page).
// This bypasses the HTML IPC path entirely, giving native playback with no
// iframe — no Error 153. Uses the present window's partition so YouTube login
// cookies are shared.
ipcMain.handle('present:navigate', (event, url) => {
  if (!url || typeof url !== 'string') return { navigated: false };
  const win = createPresentWindow();
  if (!win) return { navigated: false };
  try {
    // External pages (YouTube) do their own layout — the did-finish-load
    // handler resets them to native scale.
    presentWindowPage = 'external';
    presentWindow.webContents.loadURL(url);

    // If navigating to a YouTube video, inject CSS/JS to automatically maximize the video player
    // to 100% full screen (100vw x 100vh) and trigger playback without showing page clutter or Error 152.
    if (url.includes('youtube.com/watch')) {
      const injectMaximizedView = () => {
        if (!presentWindow || presentWindow.isDestroyed()) return;
        presentWindow.webContents.insertCSS(`
          #masthead-container, ytd-masthead, #secondary, #comments, #below, ytd-watch-metadata, #info, #related, tp-yt-app-drawer, #header { display: none !important; }
          #page-manager { margin-top: 0 !important; }
          ytd-watch-flexy { padding: 0 !important; margin: 0 !important; }
          #player-container-outer, #player-container-inner, #player-container, #ytd-player, .html5-video-player, .html5-main-video {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            z-index: 999999 !important;
            background: #000 !important;
          }
        `).catch(() => {});
        presentWindow.webContents.executeJavaScript(`
          (function() {
            const v = document.querySelector('video');
            if (v) {
              v.play().catch(() => {});
            }
          })();
        `).catch(() => {});
      };

      presentWindow.webContents.once('did-finish-load', injectMaximizedView);
      setTimeout(injectMaximizedView, 1000);
      setTimeout(injectMaximizedView, 2500);
    }

    return { navigated: true };
  } catch (e) {
    console.error('present:navigate failed:', e);
    return { navigated: false };
  }
});

ipcMain.handle('present:close', () => {
  if (presentWindow && !presentWindow.isDestroyed()) {
    presentWindow.webContents.send('present:clear');
    presentWindow.close();
    presentWindow = null;
  }
  // Re-show main window and exit fullscreen
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.setFullScreen(false);
  }
  return true;
});

ipcMain.on('present:closeRequest', () => {
  if (presentWindow && !presentWindow.isDestroyed()) {
    presentWindow.close();
    presentWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('present:closed');
  }
});

// ── Auto-update ────────────────────────────────────────────────────────────
// Checks GitHub Releases (Hakevesc/kmkc) for a newer version, downloads it in
// the background, and installs on quit.
//
// A church PC is mid-service for hours at a time, so this deliberately never
// takes the app down on its own: nothing is installed while the audience screen
// is live, and the restart is always the operator's choice.
const { autoUpdater } = require('electron-updater');

let updateState = { status: 'idle', version: null, error: null, percent: 0 };
// True while a check was started by the app rather than the operator. Those
// run on a timer against whatever network the church has that day, so their
// failures must not surface as an error the operator never asked for.
let silentCheck = false;

function sendUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:state', updateState);
  }
}

function setUpdateState(patch) {
  updateState = Object.assign({}, updateState, patch);
  sendUpdateState();
}

// We drive download/install explicitly so a service is never interrupted.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking', error: null }));
autoUpdater.on('update-available', (info) => {
  // Stop at "available". The installer is ~82MB and a church connection is
  // often metered or shared, so downloading is the operator's call.
  setUpdateState({ status: 'available', version: info.version, percent: 0 });
});
autoUpdater.on('update-not-available', () => setUpdateState({ status: 'current', error: null }));
autoUpdater.on('download-progress', (p) => {
  setUpdateState({ status: 'downloading', percent: Math.round(p.percent) });
});
autoUpdater.on('update-downloaded', (info) => {
  setUpdateState({ status: 'ready', version: info.version, percent: 100 });
});
autoUpdater.on('error', (err) => {
  // Offline, no releases published yet, or rate-limited — all non-fatal.
  // A background check that fails leaves the previous state alone, so the
  // operator doesn't open Settings to an error they never triggered.
  if (silentCheck) return;
  setUpdateState({ status: 'error', error: (err && err.message) || String(err) });
});

ipcMain.handle('update:getState', () => updateState);

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('update:check', async () => {
  // Updates are only meaningful for an installed build; in `npm start` there is
  // no installer to replace, and electron-updater throws instead of no-oping.
  if (!app.isPackaged) {
    setUpdateState({ status: 'dev', error: 'Update checks only run in the installed app.' });
    return updateState;
  }
  silentCheck = false;
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    setUpdateState({ status: 'error', error: err.message });
  }
  return updateState;
});

// Download the pending update. Separate from the check so the operator chooses
// when ~82MB crosses the church's connection.
ipcMain.handle('update:download', () => {
  if (updateState.status !== 'available') return { started: false, reason: 'nothing-to-download' };
  setUpdateState({ status: 'downloading', percent: 0 });
  autoUpdater.downloadUpdate().catch((err) => {
    setUpdateState({ status: 'error', error: err.message });
  });
  return { started: true };
});

// Restart into the new version. Refused while the audience screen is live so a
// mis-click can't black out the projector mid-service.
ipcMain.handle('update:install', () => {
  if (updateState.status !== 'ready') return { installed: false, reason: 'not-ready' };
  if (presentWindow && !presentWindow.isDestroyed()) {
    return { installed: false, reason: 'presenting' };
  }
  // Silent install + relaunch: the NSIS build is oneClick, so there is no
  // meaningful installer UI to show a volunteer operator mid-Sunday.
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return { installed: true };
});

// One quiet check shortly after launch, then every 6 hours for machines that
// are left on all week. Failures are swallowed by the error handler above.
app.whenReady().then(() => {
  if (!app.isPackaged) return;
  const check = () => {
    silentCheck = true;
    autoUpdater.checkForUpdates().catch(() => {}).finally(() => { silentCheck = false; });
  };
  setTimeout(check, 15000);
  setInterval(check, 6 * 60 * 60 * 1000);
});
