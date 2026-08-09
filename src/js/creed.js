// Apostles' Creed in English

const DEFAULT_CREED_LINES = [
  'I believe in God the Father Almighty,',
  'Maker of heaven and earth:',
  '',
  'And in Jesus Christ His only Son our Lord,',
  'Who was conceived by the Holy Spirit,',
  'Born of the Virgin Mary,',
  'Suffered under Pontius Pilate,',
  'Was crucified, dead, and buried;',
  'He descended into hell;',
  'The third day He rose again from the dead;',
  'He ascended into heaven,',
  'And sitteth on the right hand of God the Father Almighty;',
  'From thence He shall come to judge the quick and the dead.',
  '',
  'I believe in the Holy Spirit;',
  'The holy catholic church;',
  'The communion of saints;',
  'The forgiveness of sins;',
  'The resurrection of the body;',
  'And the life everlasting.',
  'Amen!'
];

window.Creed = {
  _lines: [...DEFAULT_CREED_LINES],
  _colors: ['#ed1c24', '#363636', '#1f4497'],
  _fontFamily: 'Noto Sans Ethiopic',
  _fontSize: 1.0,

  async init() {
    const savedLines = await window.Store.get('creed');
    if (Array.isArray(savedLines) && savedLines.length > 0) {
      this._lines = savedLines;
    }
    this._fontFamily = await window.Store.get('creedFontFamily') || window.AppState.fontFamily || 'Noto Sans Ethiopic';
    this._fontSize = await window.Store.get('creedFontSize') || 1.0;
    this.renderOperatorInline();
  },

  async refresh() {
    this.renderOperatorInline();
  },

  _toSlides() {
    const slides = [];
    const nonEmpty = this._lines.filter((l) => l.length > 0);
    for (let i = 0; i < nonEmpty.length; i += 2) {
      slides.push(nonEmpty.slice(i, i + 2));
    }
    return slides.length ? slides : [['']];
  },

  _buildCreedExternalHtml(lines) {
    let w = 0;
    const html = lines.map((line) => {
      const words = line.split(/\s+/).filter(Boolean).map((word) => {
        const color = this._colors[Math.floor(Math.random() * this._colors.length)];
        const delay = (w++ * 60).toFixed(0);
        return `<span class="cw" style="--active:${color};--d:${delay}ms">${escapeHtml(word)}</span>`;
      }).join(' ');
      return `<span class="creed-line">${words}</span>`;
    }).join('');

    const fontStyle = `font-family: '${(this._fontFamily || 'Noto Sans Ethiopic').replace(/'/g, "\\'")}', 'Segoe UI', sans-serif; --creed-font-size: ${this._fontSize || 1.0};`;

    return `
      <div class="creed-stage" id="creedStage" style="${fontStyle}">
        <div class="creed-slide" id="creedSlide">${html}</div>
      </div>
    `;
  },

  _buildSlideBoxHtml(lines, index, isActive) {
    const linesHtml = lines.map(l => `<div class="lyric-mini-line">${escapeHtml(l)}</div>`).join('');
    return `
      <div class="operator-lyric-screen-btn ${isActive ? 'active' : ''}" data-slide-index="${index}">
        <div class="operator-lyric-screen-box">
          <span class="operator-lyric-screen-badge">${index + 1}</span>
          <div class="operator-lyric-screen-text">${linesHtml}</div>
          ${isActive ? '<div class="operator-lyric-screen-live">▶ LIVE</div>' : ''}
        </div>
      </div>
    `;
  },

  editWholeCreed() {
    const textContent = this._lines.join('\n');
    const html = `
      <h3>Edit Apostles' Creed Content</h3>
      <p class="form-hint" style="margin-bottom:12px; font-size:13px; color:var(--color-text-muted);">
        Edit the full text of the Apostles' Creed below. Each line will be dynamically split into presentation slides.
      </p>
      <div class="form-row">
        <textarea id="editCreedTextarea" rows="16" style="width:100%; padding:10px; font-family:'Noto Sans Ethiopic', sans-serif; font-size:14px; line-height:1.6; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); resize:vertical;">${escapeHtml(textContent)}</textarea>
      </div>
      <div class="form-actions" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
        <button class="btn btn-ghost" id="btnResetCreed" style="color:#ef4444; border:1px solid #ef4444; background:transparent;">Reset to Default</button>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-ghost" id="btnCancelCreed">Cancel</button>
          <button class="btn btn-primary" id="btnSaveCreed">Save Changes</button>
        </div>
      </div>
    `;

    window.Modal.show('modalOverlay', html);

    const cancelBtn = document.getElementById('btnCancelCreed');
    const saveBtn = document.getElementById('btnSaveCreed');
    const resetBtn = document.getElementById('btnResetCreed');
    const textarea = document.getElementById('editCreedTextarea');

    if (cancelBtn) {
      cancelBtn.onclick = () => window.Modal.hide('modalOverlay');
    }

    if (saveBtn && textarea) {
      saveBtn.onclick = async () => {
        const lines = textarea.value.split('\n').map(l => l.trimEnd());
        this._lines = lines;
        await window.Store.set('creed', this._lines);
        window.Modal.hide('modalOverlay');
        this.refresh();
      };
    }

    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (!confirm('Are you sure you want to reset the Apostles\' Creed to default text?')) return;
        this._lines = [...DEFAULT_CREED_LINES];
        await window.Store.set('creed', this._lines);
        window.Modal.hide('modalOverlay');
        this.refresh();
      };
    }
  },

  renderOperatorInline() {
    const container = document.getElementById('creedOperatorContainer');
    if (!container) return;

    const self = this;
    const slides = this._toSlides();
    const total = slides.length;
    let index = 0;
    let externalOpened = false;
    let autoTimer = null;
    let autoOn = false;

    container.innerHTML = `
      <div class="operator-view">
        <div class="operator-toolbar">
          <div class="operator-toolbar-left">
            <button class="operator-icon-btn" data-action="prev" title="Previous"><span class="icon">${window.ICONS.arrowLeft}</span></button>
            <button class="operator-icon-btn" data-action="next" title="Next"><span class="icon">${window.ICONS.arrowRight}</span></button>
            <button class="operator-auto-btn" data-action="auto" id="creedOperatorAutoBtn" title="Auto Advance">
              <span class="icon" id="creedOperatorAutoIcon">${window.ICONS.play}</span>
              <span>Auto</span>
            </button>
            <div class="operator-progress" id="creedOperatorProgress">1 / ${total}</div>
            <span id="creedOperatorStatus" class="operator-screen-badge">Ready</span>
          </div>
          <div class="operator-toolbar-right">
            <button class="operator-icon-btn" data-action="edit-creed" title="Edit Whole Creed Content" style="width:auto; height:32px; padding:0 10px; border-radius:6px; background:var(--color-surface-hover); border:1px solid var(--color-border); font-size:12px; font-weight:600; margin-right:8px; display:flex; align-items:center; gap:5px; color:var(--color-text);">
              <span class="icon" style="display:inline-flex;">${window.ICONS.edit}</span> Edit Text
            </button>
            <div class="bq-font-control" style="display:flex;align-items:center;gap:6px;margin-right:12px;">
              <select class="operator-font-select" data-action="change-font" style="padding:4px 8px; border-radius:4px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-weight:600; font-size:12px;">
                ${window.FONTS ? window.FONTS.map(f => `<option value="${f.value}" ${self._fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('') : '<option value="Noto Sans Ethiopic">Noto Sans Ethiopic</option>'}
              </select>
              <button class="operator-icon-btn" data-action="font-down" title="Decrease font size" style="width:28px;height:28px;font-size:14px;font-weight:700;">A−</button>
              <span id="creedFontSizeLabel" style="font-size:11px;font-weight:700;color:var(--color-text-muted);min-width:32px;text-align:center;">${Math.round(self._fontSize * 100)}%</span>
              <button class="operator-icon-btn" data-action="font-up" title="Increase font size" style="width:28px;height:28px;font-size:14px;font-weight:700;">A+</button>
            </div>
            <span class="operator-song-title">${window.STRINGS.creed.titleEn}</span>
            <button class="op-btn-present" id="creedPresentBtn" style="margin-right:8px;">
              <span class="icon">${window.ICONS.play}</span> Present
            </button>
            <button class="op-btn-stop" data-action="exit"><span class="icon">${window.ICONS.close}</span> Exit</button>
          </div>
        </div>
        <div class="operator-body">
          <div class="operator-preview-col">
            <div class="operator-preview">
              <div class="operator-preview-header">Presented Screen</div>
              <div class="operator-preview-screen" id="creedPreviewScreen"></div>
            </div>
            <div class="operator-preview operator-preview-pending">
              <div class="operator-preview-header pending"><span>Pending Screen</span><span class="next-label">NEXT</span></div>
              <div class="operator-preview-screen operator-preview-screen-pending" id="creedPendingScreen"></div>
            </div>
          </div>
          <div class="operator-nav-col">
            <div class="operator-slide-list" id="creedSlideList"></div>
          </div>
        </div>
      </div>
    `;

    const previewScreen = document.getElementById('creedPreviewScreen');
    const pendingScreen = document.getElementById('creedPendingScreen');
    const slideList = document.getElementById('creedSlideList');
    const progressEl = document.getElementById('creedOperatorProgress');
    const statusEl = document.getElementById('creedOperatorStatus');
    const presentBtn = document.getElementById('creedPresentBtn');
    const autoBtn = document.getElementById('creedOperatorAutoBtn');
    const autoIcon = document.getElementById('creedOperatorAutoIcon');

    const updatePreview = () => {
      const lines = slides[index];
      const html = self._buildCreedExternalHtml(lines);
      previewScreen.innerHTML = html;

      const _font = self._fontFamily || 'Noto Sans Ethiopic';
      previewScreen.style.setProperty('--font', "'" + _font.replace(/'/g, "\\'") + "', 'Segoe UI', sans-serif");
      previewScreen.style.setProperty('--creed-font-size', self._fontSize || 1.0);

      if (pendingScreen) {
        const nextIndex = (index + 1) % total;
        const pendingHtml = self._buildCreedExternalHtml(slides[nextIndex]);
        pendingScreen.innerHTML = pendingHtml;
        pendingScreen.style.setProperty('--font', "'" + _font.replace(/'/g, "\\'") + "', 'Segoe UI', sans-serif");
        pendingScreen.style.setProperty('--creed-font-size', self._fontSize || 1.0);
      }
    };

    const sendToExternal = async () => {
      const lines = slides[index];
      const html = self._buildCreedExternalHtml(lines);
      const _font = self._fontFamily || 'Noto Sans Ethiopic';
      statusEl.textContent = 'Sending...';
      const result = externalOpened
        ? await window.Store.presentUpdate({ html, variant: 'creed', fontFamily: _font, fontSize: self._fontSize })
        : await window.Store.presentOpen({ html, variant: 'creed', fontFamily: _font, fontSize: self._fontSize });
      externalOpened = Boolean(result && (result.opened || result.updated));
      statusEl.textContent = externalOpened ? 'Live' : 'No second screen';
      presentBtn.style.display = externalOpened ? 'none' : 'flex';
    };

    const renderSlideList = () => {
      slideList.innerHTML = slides.map((lines, i) => {
        return self._buildSlideBoxHtml(lines, i, i === index);
      }).join('');

      const activeEl = slideList.querySelector('.operator-lyric-screen-btn.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    const goTo = (nextIndex) => {
      index = (nextIndex + total) % total;
      progressEl.textContent = `${index + 1} / ${total}`;
      updatePreview();
      renderSlideList();
      if (externalOpened) {
        sendToExternal().catch(() => {});
      }
      scheduleAuto();
    };

    const scheduleAuto = () => {
      if (autoTimer) clearTimeout(autoTimer);
      if (autoOn) {
        const lines = slides[index];
        const wordCount = lines.reduce((sum, ln) => sum + ln.split(/\s+/).filter(Boolean).length, 0);
        const delay = Math.min(Math.max(wordCount * 250, 3000), 8000);
        autoTimer = setTimeout(() => goTo(index + 1), delay);
      }
    };

    const setAuto = (on) => {
      autoOn = on;
      autoBtn.classList.toggle('active', on);
      autoIcon.innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      if (on) scheduleAuto();
      else if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    };

    const changeFontSize = (delta) => {
      self._fontSize = Math.max(0.5, Math.min(2.0, self._fontSize + delta));
      const lbl = document.getElementById('creedFontSizeLabel');
      if (lbl) lbl.textContent = Math.round(self._fontSize * 100) + '%';
      window.Store.set('creedFontSize', self._fontSize);
      updatePreview();
      if (externalOpened) sendToExternal().catch(() => {});
    };

    const startPresentation = async () => {
      await sendToExternal();
    };

    const clickHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        if (action.dataset.action === 'edit-creed') { self.editWholeCreed(); return; }
        if (action.dataset.action === 'prev') { goTo(index - 1); return; }
        if (action.dataset.action === 'next') { goTo(index + 1); return; }
        if (action.dataset.action === 'auto') { setAuto(!autoOn); return; }
        if (action.dataset.action === 'exit') { window.Present.close(); return; }
        if (action.dataset.action === 'font-up') { changeFontSize(0.1); return; }
        if (action.dataset.action === 'font-down') { changeFontSize(-0.1); return; }
      }
      const slideBox = e.target.closest('.operator-lyric-screen-btn');
      if (slideBox) {
        goTo(Number(slideBox.dataset.slideIndex));
      }
    };

    const changeHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'change-font') {
        self._fontFamily = action.value;
        window.Store.set('creedFontFamily', self._fontFamily);
        updatePreview();
        if (externalOpened) sendToExternal().catch(() => {});
        return;
      }
    };

    const keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(index - 1); }
      if (e.key === 'Escape') window.Present.close();
    };

    presentBtn.onclick = startPresentation;

    const opView = container.querySelector('.operator-view');
    opView.addEventListener('click', clickHandler);
    opView.addEventListener('change', changeHandler);
    document.addEventListener('keydown', keyHandler);

    updatePreview();
    renderSlideList();
    presentBtn.style.display = 'flex';

    return () => {
      if (autoTimer) clearTimeout(autoTimer);
      opView.removeEventListener('click', clickHandler);
      opView.removeEventListener('change', changeHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  },

  async present() {
    const slides = this._toSlides();
    const lines = slides[0];
    const html = this._buildCreedExternalHtml(lines);
    const _font = this._fontFamily || window.AppState.fontFamily || 'Noto Sans Ethiopic';
    await window.Store.presentOpen({ html, variant: 'creed', fontFamily: _font, fontSize: this._fontSize });
  }
};
