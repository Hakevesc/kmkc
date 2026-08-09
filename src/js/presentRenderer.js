// Renderer script for the dedicated presentation window.
// Listens for IPC messages from the main process to render content.
const { contextBridge, ipcRenderer } = require('electron');

// ── Resolution normalisation ───────────────────────────────────────────────
// Every presented screen is authored against a 1920x1080 reference canvas
// (the same one lyrics.js uses for its slide thumbnails). display.css mixes
// fixed px, clamp() caps and vw/vh units, so without normalisation a 4K TV
// bottoms out every clamp() maximum and renders text visibly smaller relative
// to the screen than a 1080p projector does, while a 1280x720 output overflows.
//
// The main process owns the actual scaling (it can read the window's true
// device-independent size, which the renderer cannot infer reliably) and
// pushes the resulting factor here so the page can re-measure anything that
// depends on box heights. See applyPresentZoom() in main.js.
const rescaleCallbacks = [];
let currentScale = 1;

ipcRenderer.on('present:scale', (event, zoom) => {
  currentScale = zoom;
  // The DOM is shared across isolated worlds, so this hook is visible to the
  // page's own stylesheets and scripts.
  document.documentElement.style.setProperty('--display-scale', String(zoom));
  document.documentElement.dataset.displayScale = zoom.toFixed(3);

  // Synthetic events do NOT cross the contextIsolation boundary, so notify the
  // page through bridged callbacks rather than dispatchEvent.
  rescaleCallbacks.forEach((cb) => {
    try { cb(zoom); } catch (e) { /* a bad listener must not break scaling */ }
  });
});

contextBridge.exposeInMainWorld('presentApi', {
  onRender: (callback) => {
    ipcRenderer.on('present:render', (event, data) => {
      callback(data);
    });
  },
  onClear: () => {
    ipcRenderer.on('present:clear', () => {
      document.getElementById('presentBody').innerHTML = '';
    });
  },
  onClose: () => {
    ipcRenderer.on('present:close', () => {
      document.getElementById('presentBody').innerHTML = '';
    });
  },
  // Fires whenever the output resolution changes and the frame is re-scaled.
  onRescaled: (callback) => {
    if (typeof callback === 'function') rescaleCallbacks.push(callback);
  },
  // Reference canvas the presented screens are authored against.
  designSize: { width: 1920, height: 1080 },
  getScale: () => currentScale
});

// Listen for Escape key to close presentation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ipcRenderer.send('present:closeRequest');
  }
});
