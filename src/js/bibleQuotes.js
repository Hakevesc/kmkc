// Bible Quotes feature. Allows adding, editing, and presenting Bible verses/quotes
// with the MKC logo and church name displayed below.
window.BibleQuotes = {
  quotes: [],
  editingId: null,
  _currentIndex: 0,
  _bgMedia: null,
  _bgItems: [],
  _autoTimer: null,
  _autoOn: false,
  _externalOpened: false,
  _fontSize: 1.0,
  _fontFamily: 'Noto Sans Ethiopic',

  async init() {
    this.quotes = await window.Store.get('bibleQuotes') || [];
    this._fontSize = await window.Store.get('bibleQuotesFontSize') || 1.0;
    this._fontFamily = await window.Store.get('bibleQuotesFontFamily') || window.AppState.fontFamily || 'Noto Sans Ethiopic';
    this._externalOpened = false;
    this._currentIndex = 0;
    this._bgMedia = null;
    this._bgItems = [];
    this._autoTimer = null;
    this._autoOn = false;
    this.renderOperatorView();
  },

  async refresh() {
    this.quotes = await window.Store.get('bibleQuotes') || [];
    this.renderOperatorView();
  },

  _getImageUrl(src) {
    if (!src) return '';
    if (src.startsWith('file://')) return src;
    if (src.startsWith('churchslide://')) {
      const raw = src.replace('churchslide://', '');
      return 'file:///' + raw.replace(/\\/g, '/');
    }
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
    return 'file:///' + src.replace(/\\/g, '/');
  },

  openForm(id) {
    const S = window.STRINGS.bibleQuotes;
    this.editingId = id;
    const quote = id ? this.quotes.find((q) => q.id === id) : null;
    const currentTemplate = quote && quote.templateId ? quote.templateId : 'classic';

    const html = `
      <h3>${quote ? S.editQuoteEn : S.addQuoteEn}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label>${S.quoteTextEn}</label>
          <textarea id="bibleQuoteTextInput" rows="4" placeholder="${S.quoteHintEn}">${escapeHtml(quote ? quote.text : '')}</textarea>
        </div>
        <div class="form-row">
          <label>${S.referenceEn}</label>
          <input id="bibleQuoteRefInput" value="${escapeAttr(quote ? quote.reference : '')}" placeholder="${S.refHintEn}" />
        </div>
        <div class="form-row">
          <label>Presentation Template</label>
          <div class="bq-template-picker">
            <label class="bq-tpl-radio ${currentTemplate === 'classic' ? 'active' : ''}">
              <input type="radio" name="bqTemplate" value="classic" ${currentTemplate === 'classic' ? 'checked' : ''}> Classic
            </label>
            <label class="bq-tpl-radio ${currentTemplate === 'modern' ? 'active' : ''}">
              <input type="radio" name="bqTemplate" value="modern" ${currentTemplate === 'modern' ? 'checked' : ''}> Modern
            </label>
            <label class="bq-tpl-radio ${currentTemplate === 'cinematic' ? 'active' : ''}">
              <input type="radio" name="bqTemplate" value="cinematic" ${currentTemplate === 'cinematic' ? 'checked' : ''}> Cinematic
            </label>
            <label class="bq-tpl-radio ${currentTemplate === 'minimal' ? 'active' : ''}">
              <input type="radio" name="bqTemplate" value="minimal" ${currentTemplate === 'minimal' ? 'checked' : ''}> Minimal
            </label>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="bibleQuoteCancelBtn">${S.cancelEn}</button>
        <button class="btn btn-primary" id="bibleQuoteSaveBtn">${S.saveEn}</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);

    document.querySelectorAll('input[name="bqTemplate"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.bq-tpl-radio').forEach(lbl => lbl.classList.remove('active'));
        e.target.closest('.bq-tpl-radio').classList.add('active');
      });
    });

    document.getElementById('bibleQuoteCancelBtn').addEventListener('click', () => window.Modal.hide('modalOverlay'));
    document.getElementById('bibleQuoteSaveBtn').addEventListener('click', () => this.saveQuote());
  },

  async saveQuote() {
    const S = window.STRINGS.bibleQuotes;
    const text = document.getElementById('bibleQuoteTextInput').value.trim();
    const reference = document.getElementById('bibleQuoteRefInput').value.trim();
    const templateInput = document.querySelector('input[name="bqTemplate"]:checked');
    const templateId = templateInput ? templateInput.value : 'classic';

    if (!text) {
      alert(S.quoteRequiredEn);
      return;
    }

    if (this.editingId) {
      const q = this.quotes.find((x) => x.id === this.editingId);
      if (q) {
        q.text = text;
        q.reference = reference;
        q.templateId = templateId;
      }
    } else {
      this.quotes.push({
        id: window.Store.newId(),
        text,
        reference,
        templateId,
        createdAt: new Date().toISOString()
      });
      // Select the newly added quote
      this._currentIndex = this.quotes.length - 1;
    }
    await window.Store.set('bibleQuotes', this.quotes);
    window.Modal.hide('modalOverlay');
    if (this._renderQuoteList) this._renderQuoteList();
    if (this._renderQuoteListPanel) this._renderQuoteListPanel();
    if (this._renderCurrent) this._renderCurrent();
    if (this._updateBadge) this._updateBadge();
  },

  async deleteQuote(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    const idx = this.quotes.findIndex(q => q.id === id);
    this.quotes = this.quotes.filter((q) => q.id !== id);
    await window.Store.set('bibleQuotes', this.quotes);
    if (this._currentIndex >= this.quotes.length) {
      this._currentIndex = Math.max(0, this.quotes.length - 1);
    }
    if (this._renderQuoteList) this._renderQuoteList();
    if (this._renderQuoteListPanel) this._renderQuoteListPanel();
    if (this._renderCurrent) this._renderCurrent();
    if (this._updateBadge) this._updateBadge();
  },

  // ── Operator View ──────────────────────────────────────────────────────────

  renderOperatorView() {
    const self = this;
    const container = document.getElementById('bibleQuotesOperatorContainer');
    if (!container) return;

    const churchName = window.AppState.churchName || 'Kebena MKC';

    container.innerHTML = `
      <div class="operator-view" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">

        <!-- Main 3-Column Body -->
        <div style="flex:1; display:grid; grid-template-columns: 380px 1fr 380px; min-height:0; overflow:hidden;">

          <!-- LEFT COLUMN: Presented Screen + Pending Screen + Background Media -->
          <div style="display:flex; flex-direction:column; border-right:1.5px solid var(--color-border); overflow:hidden; background:var(--color-bg);">

            <!-- Presented Screen -->
            <div style="flex-shrink:0; padding:12px 12px 6px 12px; border-bottom:1px solid var(--color-border);">
              <div style="border:1px solid var(--color-border); border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); display:flex; flex-direction:column;">
                <div class="soc-op-preview-header" style="padding:6px 10px;">
                  <div class="soc-op-preview-label" style="font-size:10px;">
                    <span class="soc-op-dot" style="background:#ed1c24; box-shadow:0 0 6px rgba(237,28,36,0.45);"></span>
                    Presented Screen (Live)
                  </div>
                  <div class="soc-op-preview-timer" style="font-size:10px; font-weight:800; color:#ed1c24;">LIVE</div>
                </div>
                <div style="position:relative; width:100%; aspect-ratio:16/9; background:#ffffff; overflow:hidden;">
                  <div id="bqPreviewScreen" style="position:absolute; inset:0; width:100%; height:100%; overflow:hidden; background:#ffffff;"></div>
                </div>
              </div>
            </div>

            <!-- Pending Screen -->
            <div style="flex-shrink:0; padding:6px 12px 12px 12px; border-bottom:1.5px solid var(--color-border);">
              <div style="border:1px solid #ffeeba; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); display:flex; flex-direction:column;">
                <div class="soc-op-preview-header" style="padding:6px 10px; background:#fff3cd; border-bottom-color:#ffeeba;">
                  <div class="soc-op-preview-label" style="color:#856404; font-size:10px;">
                    <span class="soc-op-dot" style="background:#f59e0b;"></span>
                    Pending Screen
                  </div>
                  <div class="soc-op-preview-timer" style="color:#856404; font-size:10px; font-weight:800;">NEXT</div>
                </div>
                <div style="position:relative; width:100%; aspect-ratio:16/9; background:#ffffff; overflow:hidden;">
                  <div id="bqPendingScreen" style="position:absolute; inset:0; width:100%; height:100%; overflow:hidden; background:#ffffff;"></div>
                </div>
              </div>
            </div>

            <!-- Background Media -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="operator-media-header" style="padding:10px 14px; font-size:0.88rem; font-weight:700; flex-shrink:0; border-bottom:1px solid var(--color-border);">
                <span class="icon" style="width:16px;height:16px;">${window.ICONS.play}</span>
                Background Media
              </div>
              <div class="operator-media-list" id="bqMediaList" style="flex:1; overflow-y:auto; padding:8px;">
                <div class="operator-media-loading">Loading…</div>
              </div>
            </div>
          </div>

          <!-- MIDDLE COLUMN: Quote Cards Navigator -->
          <div style="display:flex; flex-direction:column; border-right:1.5px solid var(--color-border); overflow:hidden;">
            <div style="padding:10px 14px; background:var(--color-surface); border-bottom:1px solid var(--color-border); flex-shrink:0;">
              <span style="font-size:0.88rem; font-weight:700; color:var(--color-text-muted);">Quotes Navigator</span>
            </div>
            <div class="operator-slide-list" id="bqSlideList" style="flex:1; overflow-y:auto; padding:12px;"></div>
          </div>

          <!-- RIGHT COLUMN: Controls -->
          <div style="display:flex; flex-direction:column; overflow:hidden; background:var(--color-surface);">

            <!-- TOP CONTROLS CARD -->
            <div style="padding:14px; border-bottom:2px solid var(--color-border); display:flex; flex-direction:column; gap:10px; flex-shrink:0; background:var(--color-bg);">

              <!-- Navigation + Auto -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:var(--color-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border);">
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="operator-icon-btn" data-action="prev" title="Previous" style="height:34px; width:36px;"><span class="icon">${window.ICONS.arrowLeft}</span></button>
                  <button class="operator-icon-btn" data-action="next" title="Next" style="height:34px; width:36px;"><span class="icon">${window.ICONS.arrowRight}</span></button>
                  <button class="operator-auto-btn" data-action="auto" id="bqAutoBtn" title="Auto Advance" style="height:34px; padding:0 10px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:4px;">
                    <span class="icon" id="bqAutoIcon" style="width:14px;height:14px;">${window.ICONS.play}</span>
                    <span>Auto</span>
                  </button>
                </div>
                <div class="operator-progress" id="bqProgress" style="font-size:0.9rem; font-weight:800; color:var(--color-primary);"></div>
              </div>

              <!-- Active Quote Title -->
              <div style="background:var(--color-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border);">
                <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-muted);">Quote:</span>
                <div id="bqActiveTitle" style="font-size:0.85rem; font-weight:700; color:var(--color-text); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
              </div>

              <!-- Present & Exit Buttons -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <button data-action="toggle-present" id="bqTogglePresentBtn" class="op-btn-present op-btn-block" title="Present to second screen">
                  <span class="icon">${window.ICONS.play}</span> Present
                </button>
                <button data-action="exit" class="op-btn-stop op-btn-block" title="Exit presentation">
                  <span class="icon">${window.ICONS.close}</span> Exit
                </button>
              </div>

            </div>

            <!-- BOTTOM: BIBLE QUOTES PANEL -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">

              <!-- Panel Header -->
              <div class="operator-media-header" style="justify-content:space-between; padding:10px 14px; font-size:0.9rem; font-weight:700; flex-shrink:0; background:var(--color-bg); border-bottom:1px solid var(--color-border);">
                <span>📖 BIBLE QUOTES</span>
                <span id="bqCountBadge" style="font-size:0.8rem; background:var(--color-surface); padding:2px 8px; border-radius:12px; color:var(--color-text-muted); border:1px solid var(--color-border);">${self.quotes.length} Quotes</span>
              </div>

              <!-- + New Quote Button -->
              <div style="padding:8px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <button class="btn btn-ghost" data-action="add-quote" style="width:100%; border:1.5px solid var(--color-primary); color:var(--color-primary); font-weight:700; height:38px; font-size:13px; border-radius:6px;">
                  + New Quote
                </button>
              </div>

              <!-- Theme & Font Controls -->
              <div style="padding:10px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <div style="display:flex; flex-direction:column; gap:8px; background:var(--color-surface); padding:10px; border-radius:8px; border:1px solid var(--color-border);">

                  <!-- Theme Selector -->
                  <select id="bqThemeSelect" class="operator-font-select" data-action="change-theme" style="width:100%; height:34px; padding:0 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); font-weight:600; font-size:13px;">
                    <option value="classic">Classic Theme</option>
                    <option value="modern">Modern Theme</option>
                    <option value="cinematic">Cinematic Theme</option>
                    <option value="minimal">Minimal Theme</option>
                  </select>

                  <!-- Font Size -->
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-muted);">Font Size:</span>
                    <div style="display:inline-flex; align-items:center; gap:4px; background:var(--color-bg); padding:2px 6px; border-radius:6px; border:1px solid var(--color-border);">
                      <button class="operator-icon-btn" data-action="font-down" title="Decrease font size" style="width:30px; height:28px; font-weight:900; font-size:0.9rem;">A-</button>
                      <span id="bqFontSizeLabel" style="font-weight:800; font-size:0.9rem; min-width:38px; text-align:center; color:var(--color-primary);">${Math.round(self._fontSize * 100)}%</span>
                      <button class="operator-icon-btn" data-action="font-up" title="Increase font size" style="width:30px; height:28px; font-weight:900; font-size:0.9rem;">A+</button>
                    </div>
                  </div>

                  <!-- Font Family -->
                  <select class="operator-font-select" data-action="change-font" style="width:100%; height:36px; padding:0 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); font-weight:600; font-size:13px;">
                    ${window.FONTS ? window.FONTS.map(f => `<option value="${f.value}" ${self._fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('') : '<option value="Noto Sans Ethiopic">Noto Sans Ethiopic</option>'}
                  </select>
                </div>
              </div>

              <!-- Edit & Delete buttons for selected quote -->
              <div style="display:flex; gap:8px; padding:8px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <button class="btn btn-ghost" data-action="edit-quote" style="flex:1; height:44px; font-size:14px; font-weight:700; border:1px solid var(--color-border); background:var(--color-surface); border-radius:6px;" title="Edit selected quote">
                  ✏ Edit
                </button>
                <button class="btn btn-danger" data-action="delete-quote" style="flex:1; height:44px; font-size:14px; font-weight:700; background:#dc2626; border-color:#dc2626; color:#fff; border-radius:6px;" title="Delete selected quote">
                  🗑 Delete
                </button>
              </div>

              <!-- Scrollable Quotes List -->
              <div id="bqQuoteListContainer" style="flex:1; overflow-y:auto; padding:8px;">
                <!-- Quote items dynamically inserted -->
              </div>
            </div>

          </div>
        </div>

      </div>
    `;

    // ── DOM references ──────────────────────────────────────────────────────
    const previewScreen  = document.getElementById('bqPreviewScreen');
    const pendingScreen  = document.getElementById('bqPendingScreen');
    const progressEl     = document.getElementById('bqProgress');
    const activeTitleEl  = document.getElementById('bqActiveTitle');
    const slideList      = document.getElementById('bqSlideList');
    const mediaList      = document.getElementById('bqMediaList');
    const fontLabelEl    = document.getElementById('bqFontSizeLabel');
    const themeSelect    = document.getElementById('bqThemeSelect');

    // ── Build quote stage HTML ──────────────────────────────────────────────
    const buildStageHtml = (q, bgMedia) => {
      if (!q) return '<div style="background:#111;width:100%;height:100%;"></div>';
      const tpl = q.templateId || 'classic';
      const hasBg = Boolean(bgMedia);
      let bgLayerHtml = '';
      if (hasBg) {
        const mediaSrc = self._getImageUrl(bgMedia.src);
        if (bgMedia.type === 'image')   bgLayerHtml = `<div class="bq-bg-layer"><img src="${escapeAttr(mediaSrc)}" /></div>`;
        else if (bgMedia.type === 'video') bgLayerHtml = `<div class="bq-bg-layer"><video autoplay loop muted playsinline src="${escapeAttr(mediaSrc)}"></video></div>`;
        else if (bgMedia.type === 'youtube') {
          const vid = escapeAttr(bgMedia.videoId);
          bgLayerHtml = `<div class="bq-bg-layer"><iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
        }
      }
      return `
        <div class="bq-stage bq-template-${tpl} ${hasBg ? 'bq-has-media' : ''}" style="--bq-font-size: ${self._fontSize}; font-family:'${self._fontFamily}','Segoe UI',sans-serif;">
          ${bgLayerHtml}
          ${hasBg ? '<div class="bq-bg-overlay"></div>' : ''}
          <div class="bq-quote-section">
            <div class="bq-quote-mark">"</div>
            <div class="bq-quote-text">${escapeHtml(q.text)}</div>
            <div class="bq-quote-reference">— ${escapeHtml(q.reference || '')}</div>
          </div>
          <div class="bq-logo-section">
            <img src="assets/KebenaMKC-logo.svg" alt="MKC Logo" class="bq-logo" />
            <div class="bq-church-name">${escapeHtml(churchName)}</div>
          </div>
        </div>
      `;
    };

    // ── Scale a stage to fit a preview container ────────────────────────────
    const setScaledPreview = (container, stageHtml) => {
      container.innerHTML = stageHtml;
      setTimeout(() => {
        const stage = container.querySelector('.bq-stage');
        if (stage) {
          const factor = (container.clientWidth || 320) / 1920;
          Object.assign(stage.style, {
            width: '1920px', height: '1080px',
            transform: `scale(${factor})`, transformOrigin: 'top left',
            position: 'absolute', top: '0', left: '0'
          });
        }
      }, 0);
    };

    // ── Render Presented and Pending Screens ────────────────────────────────
    self._renderCurrent = () => {
      const q = self.quotes[self._currentIndex];
      if (!q) return;

      // Update meta
      progressEl.textContent = `${self._currentIndex + 1} / ${self.quotes.length}`;
      activeTitleEl.textContent = q.reference || q.text.substring(0, 50);
      if (themeSelect) themeSelect.value = q.templateId || 'classic';

      // Presented
      const stageHtml = buildStageHtml(q, self._bgMedia);
      setScaledPreview(previewScreen, stageHtml);

      // Pending (next quote, wraps)
      if (pendingScreen) {
        const nextIdx = (self._currentIndex + 1) % self.quotes.length;
        const nextQ = self.quotes[nextIdx] || null;
        setScaledPreview(pendingScreen, buildStageHtml(nextQ, self._bgMedia));
      }
    };

    // ── Render Quote Cards in middle column ────────────────────────────────
    self._renderQuoteList = () => {
      slideList.innerHTML = self.quotes.map((q, i) => {
        const isSel = i === self._currentIndex;
        const tpl = q.templateId || 'classic';
        return `
          <div class="operator-lyric-screen-btn ${isSel ? 'active' : ''}" data-action="goto-quote" data-index="${i}" style="cursor:pointer;">
            <div class="operator-lyric-screen-box">
              <span class="operator-lyric-screen-badge">${i + 1}</span>
              ${isSel ? '<div class="operator-lyric-screen-live" style="position:absolute; bottom:6px; left:6px; right:auto;">▶ LIVE</div>' : ''}
              <div class="operator-lyric-screen-text" style="font-size:0.7rem; line-height:1.4;">
                <div style="font-weight:700; margin-bottom:4px; color:var(--color-primary); font-size:0.65rem; text-transform:uppercase;">${escapeHtml(tpl)}</div>
                <div>${escapeHtml(q.text.length > 80 ? q.text.substring(0, 80) + '…' : q.text)}</div>
                ${q.reference ? `<div style="color:var(--color-text-muted); font-size:0.65rem; margin-top:4px;">— ${escapeHtml(q.reference)}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      const activeEl = slideList.querySelector('.operator-lyric-screen-btn.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    // ── Right-column quote list ─────────────────────────────────────────────
    self._renderQuoteListPanel = () => {
      const container = document.getElementById('bqQuoteListContainer');
      if (!container) return;
      container.innerHTML = self.quotes.map((q, i) => {
        const isSel = i === self._currentIndex;
        return `
          <div class="operator-song-item-row ${isSel ? 'active' : ''}" data-action="goto-quote" data-index="${i}" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; margin-bottom:4px; border-radius:6px; border:1px solid ${isSel ? 'var(--color-primary)' : 'var(--color-border)'}; background:${isSel ? '#eef2fb' : 'var(--color-surface)'}; cursor:pointer;">
            <span style="font-size:0.85rem; font-weight:700; color:${isSel ? 'var(--color-primary)' : 'var(--color-text)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">
              ${escapeHtml(q.text.length > 50 ? q.text.substring(0, 50) + '…' : q.text)}
            </span>
            <span style="font-size:0.7rem; color:${isSel ? 'var(--color-primary)' : 'var(--color-text-muted)'}; white-space:nowrap;">${escapeHtml(q.reference || '')}</span>
          </div>
        `;
      }).join('');
    };

    // ── Update badge count ──────────────────────────────────────────────────
    self._updateBadge = () => {
      const badge = document.getElementById('bqCountBadge');
      if (badge) badge.textContent = `${self.quotes.length} Quotes`;
    };

    // ── Media Panel ─────────────────────────────────────────────────────────
    const renderMediaPanel = () => {
      const activeId = self._bgMedia ? self._bgMedia.id : '__none__';
      const noneActive = activeId === '__none__';
      const items = self._bgItems.map((item) => {
        const isAct = item.id === activeId;
        const thumbHtml = item.thumb
          ? `<img class="operator-media-thumb" src="${escapeAttr(item.thumb)}" />`
          : `<div class="operator-media-thumb operator-media-thumb-icon">${item.type === 'youtube' ? '▶' : '🎬'}</div>`;
        return `
          <button class="operator-media-item ${isAct ? 'active' : ''}" data-action="set-media" data-media-id="${item.id}">
            ${thumbHtml}
            <span class="operator-media-label">${escapeHtml(item.label)}</span>
            ${isAct ? '<span class="operator-media-check">✓</span>' : ''}
            <span class="operator-media-delete" data-action="delete-media-item" data-media-id="${item.id}" title="Remove from list">✕</span>
          </button>
        `;
      }).join('');
      mediaList.innerHTML = `
        <button class="operator-media-item ${noneActive ? 'active' : ''}" data-action="set-media" data-media-id="__none__">
          <div class="operator-media-thumb operator-media-thumb-none">✕</div>
          <span class="operator-media-label">None</span>
          ${noneActive ? '<span class="operator-media-check">✓</span>' : ''}
        </button>
        <button class="operator-media-item operator-media-add" data-action="add-custom-bg">
          <div class="operator-media-thumb operator-media-thumb-add">+</div>
          <span class="operator-media-label" style="color:var(--color-primary); font-weight:700;">Add Custom BG</span>
        </button>
        ${items}
      `;
    };

    // ── Load Media Items ────────────────────────────────────────────────────
    Promise.all([
      window.Store.get('slides').catch(() => []),
      window.Store.get('mediaLinks').catch(() => [])
    ]).then(([slides, mediaLinks]) => {
      self._bgItems = [];
      (slides || []).forEach((img) => {
        const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(img.name || img.src || '');
        self._bgItems.push({
          id: 'slide_' + img.name,
          type: isVideo ? 'video' : 'image',
          label: img.name,
          src: img.src,
          thumb: isVideo ? null : self._getImageUrl(img.src)
        });
      });
      (mediaLinks || []).forEach((link) => {
        const vid = window.Media ? window.Media._extractVideoId(link.url) : null;
        if (vid) {
          self._bgItems.push({
            id: 'yt_' + link.id,
            type: 'youtube',
            label: link.title || link.url,
            videoId: vid,
            thumb: null
          });
        }
      });
      renderMediaPanel();
    });

    // ── Set Background ──────────────────────────────────────────────────────
    const setBg = (mediaId) => {
      if (mediaId === '__none__') {
        self._bgMedia = null;
      } else {
        const item = self._bgItems.find((m) => m.id === mediaId);
        if (!item) return;
        self._bgMedia = item;
      }
      renderMediaPanel();
      self._renderCurrent();
      if (self._externalOpened) sendToExternal();
    };

    // ── Add Custom BG ───────────────────────────────────────────────────────
    const addCustomBg = async () => {
      try {
        const copied = await window.Store.slidesPickAndCopy();
        if (!copied || copied.length === 0) return;
        const currentSlides = await window.Store.get('slides') || [];
        const newItems = [];
        for (const img of copied) {
          const item = { name: img.name, src: 'churchslide://' + img.src.replace(/\\/g, '/') };
          currentSlides.push(item);
          const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(img.name);
          newItems.push({
            id: 'slide_' + img.name,
            type: isVideo ? 'video' : 'image',
            label: img.name,
            src: item.src,
            thumb: isVideo ? null : self._getImageUrl(item.src)
          });
        }
        await window.Store.set('slides', currentSlides);
        self._bgItems = [...newItems, ...self._bgItems];
        if (newItems.length > 0) setBg(newItems[0].id);
        else renderMediaPanel();
      } catch (err) {
        console.error('Failed to add custom bg:', err);
      }
    };

    // ── External Presentation ───────────────────────────────────────────────
    const sendToExternal = async () => {
      const q = self.quotes[self._currentIndex];
      if (!q) return;
      const stageHtml = buildStageHtml(q, self._bgMedia);
      const _font = self._fontFamily || window.AppState.fontFamily || 'Noto Sans Ethiopic';
      if (self._externalOpened) {
        const result = await window.Store.presentUpdate({ html: stageHtml, variant: 'bible-quotes', fontFamily: _font });
        self._externalOpened = Boolean(result && (result.opened || result.updated));
      } else {
        const result = await window.Store.presentOpen({ html: stageHtml, variant: 'bible-quotes', fontFamily: _font });
        self._externalOpened = Boolean(result && result.opened);
      }
      window.Present.setPresentButton(
        document.getElementById('bqTogglePresentBtn'), self._externalOpened);
    };

    // ── Auto Advance ────────────────────────────────────────────────────────
    const scheduleAuto = () => {
      if (self._autoTimer) clearTimeout(self._autoTimer);
      if (self._autoOn) {
        const q = self.quotes[self._currentIndex];
        if (!q) return;
        const wordCount = (q.text + ' ' + (q.reference || '')).split(/\s+/).filter(Boolean).length;
        const delay = Math.min(Math.max(wordCount * 250, 4000), 12000);
        self._autoTimer = setTimeout(() => goTo(self._currentIndex + 1), delay);
      }
    };

    const setAuto = (on) => {
      self._autoOn = on;
      const autoBtn = document.getElementById('bqAutoBtn');
      const autoIcon = document.getElementById('bqAutoIcon');
      if (autoBtn) autoBtn.classList.toggle('active', on);
      if (autoIcon) autoIcon.innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      if (on) scheduleAuto();
      else if (self._autoTimer) { clearTimeout(self._autoTimer); self._autoTimer = null; }
    };

    // ── Navigate ────────────────────────────────────────────────────────────
    const goTo = (idx) => {
      if (self.quotes.length === 0) return;
      self._currentIndex = ((idx % self.quotes.length) + self.quotes.length) % self.quotes.length;
      self._renderCurrent();
      self._renderQuoteList();
      self._renderQuoteListPanel();
      if (self._autoOn) scheduleAuto();
      if (self._externalOpened) sendToExternal().catch(() => {});
    };

    // ── Event Handlers ──────────────────────────────────────────────────────
    const clickHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const act = action.dataset.action;

      if (act === 'prev') { goTo(self._currentIndex - 1); return; }
      if (act === 'next') { goTo(self._currentIndex + 1); return; }
      if (act === 'auto') { setAuto(!self._autoOn); return; }

      if (act === 'toggle-present') {
        if (!self._externalOpened) sendToExternal().catch(() => {});
        else {
          window.Store.presentClose().catch(() => {});
          self._externalOpened = false;
          window.Present.setPresentButton(document.getElementById('bqTogglePresentBtn'), false);
        }
        return;
      }
      if (act === 'exit') {
        if (self._externalOpened) { window.Store.presentClose().catch(() => {}); self._externalOpened = false; }
        if (self._autoTimer) { clearTimeout(self._autoTimer); self._autoTimer = null; }
        return;
      }
      if (act === 'add-quote') { self.openForm(null); return; }
      if (act === 'edit-quote') {
        const q = self.quotes[self._currentIndex];
        if (q) self.openForm(q.id);
        return;
      }
      if (act === 'delete-quote') {
        const q = self.quotes[self._currentIndex];
        if (q) self.deleteQuote(q.id);
        return;
      }
      if (act === 'font-up') {
        self._fontSize = Math.min(2.0, self._fontSize + 0.1);
        if (fontLabelEl) fontLabelEl.textContent = Math.round(self._fontSize * 100) + '%';
        window.Store.set('bibleQuotesFontSize', self._fontSize);
        self._renderCurrent();
        if (self._externalOpened) sendToExternal().catch(() => {});
        return;
      }
      if (act === 'font-down') {
        self._fontSize = Math.max(0.5, self._fontSize - 0.1);
        if (fontLabelEl) fontLabelEl.textContent = Math.round(self._fontSize * 100) + '%';
        window.Store.set('bibleQuotesFontSize', self._fontSize);
        self._renderCurrent();
        if (self._externalOpened) sendToExternal().catch(() => {});
        return;
      }
      if (act === 'goto-quote') { goTo(Number(action.dataset.index)); return; }
      if (act === 'set-media') {
        if (!e.target.closest('[data-action="delete-media-item"]')) setBg(action.dataset.mediaId);
        return;
      }
      if (act === 'delete-media-item') {
        e.stopPropagation();
        const delId = action.dataset.mediaId;
        if (self._bgMedia && self._bgMedia.id === delId) self._bgMedia = null;
        self._bgItems = self._bgItems.filter(item => item.id !== delId);
        (async () => {
          if (delId.startsWith('slide_')) {
            const name = delId.replace(/^slide_/, '');
            const slides = await window.Store.get('slides') || [];
            await window.Store.set('slides', slides.filter(s => s.name !== name));
          } else {
            const links = await window.Store.get('mediaLinks') || [];
            await window.Store.set('mediaLinks', links.filter(l => l.id !== delId));
          }
        })();
        renderMediaPanel();
        return;
      }
      if (act === 'add-custom-bg') { addCustomBg(); return; }
    };

    const changeHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'change-font') {
        self._fontFamily = action.value;
        window.Store.set('bibleQuotesFontFamily', self._fontFamily);
        self._renderCurrent();
        if (self._externalOpened) sendToExternal().catch(() => {});
        return;
      }
      if (action.dataset.action === 'change-theme') {
        const q = self.quotes[self._currentIndex];
        if (q) {
          q.templateId = action.value;
          window.Store.set('bibleQuotes', self.quotes);
          self._renderCurrent();
          self._renderQuoteList();
          if (self._externalOpened) sendToExternal().catch(() => {});
        }
        return;
      }
    };

    const keyHandler = (e) => {
      // Only handle keys when bible quotes view is active
      if (!document.getElementById('bibleQuotesOperatorContainer')) return;
      if (document.getElementById('modalOverlay') && !document.getElementById('modalOverlay').classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(self._currentIndex + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(self._currentIndex - 1); }
    };

    container.addEventListener('click', clickHandler);
    container.addEventListener('change', changeHandler);
    document.addEventListener('keydown', keyHandler);

    // ── Initial render ──────────────────────────────────────────────────────
    self._renderCurrent();
    self._renderQuoteList();
    self._renderQuoteListPanel();
    self._updateBadge();

    // Cleanup on teardown
    self._bqCleanup = () => {
      container.removeEventListener('click', clickHandler);
      container.removeEventListener('change', changeHandler);
      document.removeEventListener('keydown', keyHandler);
      if (self._autoTimer) { clearTimeout(self._autoTimer); self._autoTimer = null; }
    };
  }
};