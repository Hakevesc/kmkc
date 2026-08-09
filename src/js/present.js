// Shared fullscreen "Present" overlay controller used by lyrics/notices/bank views.
// When a second monitor is available, content can be sent there too.
window.Present = {
  _cleanup: null,
  // True once the local preview has been minimized. The overlay DOM and every
  // timer inside it stay alive so the audience screen keeps advancing — only
  // the operator's own view is hidden.
  _minimized: false,

  // renderFn(bodyEl) populates the overlay and may return a cleanup function
  // (called automatically when the presentation is closed). `variant` adds a
  // theme class to the overlay (e.g. 'lyrics' = colorful gradient background).
  open(renderFn, variant, options) {
    options = options || {};
    document.getElementById('presentChurchName').textContent = window.AppState.churchName;
    const overlay = document.getElementById('presentOverlay');
    const body = document.getElementById('presentBody');
    body.innerHTML = '';
    overlay.classList.remove('present-lyrics', 'present-notices', 'present-bank', 'present-creed', 'present-bible', 'present-countdown', 'present-slides', 'present-media', 'present-operator', 'present-bible-quotes');
    if (variant) overlay.classList.add('present-' + variant);
    overlay.classList.remove('hidden');
    this._minimized = false;
    this._setResumeBar(false);
    window.Store.setFullScreen(true);
    this._cleanup = renderFn(body) || null;

    // Also try to mirror to second monitor (best-effort)
    if (options.mirror !== false) this._mirrorToExternal(body, variant);
  },

  // Render presented markup into an operator preview box as a true miniature.
  //
  // The alternative — dropping the stage HTML straight into a small div and
  // then overriding font sizes/dimensions element by element — drifts from the
  // real output the moment a stage gains a new element, and its vw-based
  // clamp() values resolve against the app window rather than the preview box,
  // so the proportions are wrong by construction.
  //
  // Instead we lay the stage out at the full 1920x1080 presentation canvas and
  // scale the whole thing down with one transform. What the operator sees is
  // then the presented screen, just smaller — the same trick the presentation
  // window itself uses to stay identical across TVs and projectors.
  renderStagePreview(box, html, variant) {
    if (!box) return;

    let canvas = box._stageCanvas;
    if (!canvas || canvas.parentNode !== box) {
      box.classList.add('stage-preview');
      box.innerHTML = '';
      canvas = document.createElement('div');
      canvas.className = 'stage-preview-canvas';
      // Mirror present.html's structure exactly so the same CSS applies.
      canvas.innerHTML = '<div class="present-overlay"><div class="present-body"></div></div>';
      box.appendChild(canvas);
      box._stageCanvas = canvas;

      // Re-scale when the panel is resized (window resize, sidebar collapse).
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => this._fitStagePreview(box));
        ro.observe(box);
      }
    }

    const overlay = canvas.firstElementChild;
    overlay.className = 'present-overlay' + (variant ? ' present-' + variant : '');
    overlay.firstElementChild.innerHTML = html || '';
    this._fitStagePreview(box);
  },

  _fitStagePreview(box) {
    const canvas = box && box._stageCanvas;
    if (!canvas) return;
    const w = box.clientWidth;
    if (!w) return;
    canvas.style.transform = 'scale(' + (w / 1920) + ')';
  },

  // Every "Present" button in the app is a toggle: green when idle, red while
  // its content is live. Routing all of them through one helper keeps the
  // wording, icon and colour identical across the eleven operator views.
  setPresentButton(btn, isLive, labels) {
    if (!btn) return;
    const t = labels || {};
    btn.classList.add('op-btn-present');
    btn.classList.toggle('is-live', Boolean(isLive));
    const icon = isLive ? window.ICONS.close : window.ICONS.play;
    const text = isLive ? (t.live || 'Stop Presenting') : (t.idle || 'Present');
    btn.innerHTML = '<span class="icon">' + icon + '</span> ' + text;
    btn.title = isLive
      ? 'Stop showing this on the second screen'
      : 'Present this on the second screen';
  },

  // False while the preview is minimized. The operator dashboards register
  // document-level arrow/space/Esc handlers; those must go quiet once the
  // operator is back in the control panel, or they hijack typing there.
  isPreviewActive() {
    return !this._minimized &&
      !document.getElementById('presentOverlay').classList.contains('hidden');
  },

  // Hide the operator's local preview WITHOUT touching the audience screen.
  // Content on the second monitor keeps running (and keeps auto-advancing)
  // until the operator exits the presentation or presents something else.
  async minimize() {
    const overlay = document.getElementById('presentOverlay');
    if (overlay.classList.contains('hidden')) return;
    this._minimized = true;
    overlay.classList.add('hidden');
    // Drop the main window out of fullscreen so the control panel is usable,
    // but never call presentClose() — that is what "exit" is for.
    window.Store.setFullScreen(false);
    // The audience window is driven straight from the operator views, not from
    // this overlay, so ask the main process whether it is actually still up.
    const live = await window.Store.presentIsOpen().catch(() => false);
    if (live && this._minimized) this._setResumeBar(true);
  },

  // Bring the local preview back. Nothing is re-rendered, so the preview
  // resumes exactly where the audience screen already is.
  restore() {
    if (!this._minimized) return;
    this._minimized = false;
    this._setResumeBar(false);
    document.getElementById('presentOverlay').classList.remove('hidden');
    window.Store.setFullScreen(true);
  },

  // Small persistent bar telling the operator the second screen is still live
  // while the preview is hidden — without it, a minimized preview looks
  // identical to a stopped presentation.
  _setResumeBar(show) {
    let bar = document.getElementById('presentResumeBar');
    if (!show) {
      if (bar) bar.remove();
      return;
    }
    if (bar) return;
    bar = document.createElement('div');
    bar.id = 'presentResumeBar';
    bar.className = 'present-resume-bar';
    const t = window.STRINGS.present;
    bar.innerHTML =
      '<span class="present-resume-dot"></span>' +
      '<span class="present-resume-text">' + t.presentingLive + '</span>' +
      '<button type="button" class="present-resume-show">' + t.showPreview + '</button>' +
      '<button type="button" class="present-resume-stop">' + t.exitPresentation + '</button>';
    bar.querySelector('.present-resume-show').addEventListener('click', () => window.Present.restore());
    bar.querySelector('.present-resume-stop').addEventListener('click', () => window.Present.close());
    document.body.appendChild(bar);
  },

  async _mirrorToExternal(body, variant) {
    try {
      // Clone the body content for the second window — strip controls
      const content = body.cloneNode(true);
      content.querySelectorAll('.lyrics-controls, .countdown-controls, .present-controls, .creed-progress').forEach((el) => el.remove());
      // Pass the current font family so the presentation window can use it
      const fontFamily = window.AppState.fontFamily || 'Noto Sans Ethiopic';
      await window.Store.presentOpen({ html: content.innerHTML, variant, fontFamily });
    } catch (e) {
      // No second monitor available — this is fine
    }
  },

  close() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    this._minimized = false;
    this._setResumeBar(false);
    const overlay = document.getElementById('presentOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('present-lyrics', 'present-notices', 'present-bank', 'present-creed', 'present-bible', 'present-countdown', 'present-slides', 'present-media', 'present-operator', 'present-bible-quotes');
    document.getElementById('presentBody').innerHTML = '';
    window.Store.setFullScreen(false);
    // Close second monitor window
    window.Store.presentClose().catch(() => {});
  }
};

// Generic modal helper shared by lyrics/notices/bank forms and the lyrics review screen.
window.Modal = {
  show(overlayId, html) {
    const overlay = document.getElementById(overlayId);
    overlay.querySelector(':scope > div').innerHTML = html;
    overlay.classList.remove('hidden');
  },
  hide(overlayId) {
    document.getElementById(overlayId).classList.add('hidden');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ['modalOverlay', 'reviewOverlay'].forEach((id) => {
    const overlay = document.getElementById(id);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) window.Modal.hide(id);
    });
  });

  // The audience window can be dismissed from its own screen (Esc). Tear the
  // local state down too, so a minimized preview never claims to still be live.
  window.Store.onPresentClosed(() => {
    if (!window.Present._minimized &&
        document.getElementById('presentOverlay').classList.contains('hidden')) return;
    window.Present.close();
  });

  const exitBtn = document.getElementById('presentExitBtn');
  exitBtn.innerHTML = '<span class="icon">' + window.ICONS.close + '</span>';
  exitBtn.title = window.STRINGS.present.exitPresentationEn;
  exitBtn.addEventListener('click', () => window.Present.close());

  const minBtn = document.getElementById('presentMinimizeBtn');
  minBtn.innerHTML = '<span class="icon">' + window.ICONS.minimize + '</span>';
  minBtn.title = window.STRINGS.present.minimizePreviewEn;
  minBtn.addEventListener('click', () => window.Present.minimize());

  document.addEventListener('keydown', (e) => {
    const overlayHidden = document.getElementById('presentOverlay').classList.contains('hidden');
    // Esc exits the whole presentation, including the audience screen.
    if (e.key === 'Escape' && !overlayHidden) {
      window.Present.close();
      return;
    }
    // Ctrl+M hides only the local preview; the second screen keeps presenting.
    if (e.key.toLowerCase() === 'm' && e.ctrlKey) {
      e.preventDefault();
      if (overlayHidden) window.Present.restore();
      else window.Present.minimize();
    }
  });
});
