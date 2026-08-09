window.Lyrics = {
  songs: [],
  selectedId: null,
  _pendingImport: null,
  _fontFamily: 'Noto Sans Ethiopic',

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

  async init() {
    this._fontFamily = await window.Store.get('lyricsFontFamily') || window.AppState.fontFamily || 'Noto Sans Ethiopic';
    this.songs = await window.Store.get('songs') || [];
    this.renderOperatorView();
  },

  async updateFont(font) {
    const customFont = await window.Store.get('lyricsFontFamily');
    if (!customFont) {
      this._fontFamily = font;
      if (this.songs && this.songs.length) {
        this.renderOperatorView();
      }
    }
  },

  // Returns idle-screen HTML for the chosen animation type.
  _buildIdleHtml(animType) {
    switch (animType) {
      case 'pulse-cross':
        return '<div class="pulse-cross-visualizer"><div class="pulse-cross-shape"></div></div>';
      case 'floating-dots':
        return `<div class="floating-dots-visualizer">${
          Array.from({ length: 9 }, () => '<div class="floating-dot"></div>').join('')
        }</div>`;
      case 'ripple':
        return `<div class="ripple-visualizer">
          <div class="ripple-ring"></div>
          <div class="ripple-ring"></div>
          <div class="ripple-ring"></div>
          <div class="ripple-ring"></div>
        </div>`;
      case 'breathing-glow':
        return '<div class="breathing-glow-visualizer"><div class="breathing-glow-orb"></div></div>';
      case 'glow-wave':
        return `<div class="glow-wave-visualizer">
          <svg class="glow-wave-svg" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00f2fe" stop-opacity="0" />
                <stop offset="50%" stop-color="#00f2fe" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#4facfe" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#9c27b0" stop-opacity="0" />
                <stop offset="50%" stop-color="#ff2a74" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#9c27b0" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00e676" stop-opacity="0" />
                <stop offset="50%" stop-color="#00b0ff" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#2979ff" stop-opacity="0" />
              </linearGradient>
              <filter id="waveGlow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path class="glow-path path-1" d="M 0,100 Q 100,60 200,100 T 400,100 T 600,100 T 800,100 T 1000,100 T 1200,100 T 1400,100 T 1600,100 T 1800,100 T 2000,100" />
            <path class="glow-path path-2" d="M 0,100 Q 75,45 150,100 T 300,100 T 450,100 T 600,100 T 750,100 T 900,100 T 1050,100 T 1200,100 T 1350,100 T 1500,100 T 1650,100 T 1800,100 T 1950,100 T 2100,100" />
            <path class="glow-path path-3" d="M 0,100 Q 125,75 250,100 T 500,100 T 750,100 T 1000,100 T 1250,100 T 1500,100 T 1750,100 T 2000,100" />
          </svg>
          <div class="glow-wave-reflection">
            <svg class="glow-wave-svg" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <path class="glow-path path-1" d="M 0,100 Q 100,60 200,100 T 400,100 T 600,100 T 800,100 T 1000,100 T 1200,100 T 1400,100 T 1600,100 T 1800,100 T 2000,100" />
              <path class="glow-path path-2" d="M 0,100 Q 75,45 150,100 T 300,100 T 450,100 T 600,100 T 750,100 T 900,100 T 1050,100 T 1200,100 T 1350,100 T 1500,100 T 1650,100 T 1800,100 T 1950,100 T 2100,100" />
              <path class="glow-path path-3" d="M 0,100 Q 125,75 250,100 T 500,100 T 750,100 T 1000,100 T 1250,100 T 1500,100 T 1750,100 T 2000,100" />
            </svg>
          </div>
        </div>`;
      case 'circular-wave':
        return `<div class="circular-visualizer">${
          Array.from({ length: 40 }, (_, i) => `<div class="circle-bar" style="--i: ${i + 1};"></div>`).join('')
        }</div>`;
      case 'none':
        return '';
      case 'soundwave':
      default:
        return `<div class="soundwave-visualizer">${
          Array.from({ length: 15 }, () => '<div class="soundwave-bar"></div>').join('')
        }</div>`;
    }
  },

  async adjustFontSize(delta) {
    const song = this.songs.find((s) => s.id === this.selectedId);
    if (!song) return;
    let current = song.fontSize || (window.Settings?.data?.lyricsFontSize || 46);
    current += delta;
    if (current < 10) current = 10;
    if (current > 200) current = 200;
    song.fontSize = current;
    await window.Store.set('songs', this.songs);
    this.renderDetail();
  },

  async refresh() {
    this.songs = await window.Store.get('songs');
    this.renderList();
    this.renderDetail();
  },

  renderList() {
    const S = window.STRINGS;
    const list = document.getElementById('songList');
    if (this.songs.length === 0) {
      list.innerHTML = `<li class="empty-state">${S.common.empty}</li>`;
      return;
    }
    list.innerHTML = this.songs.map((song) => `
      <li class="item-row ${song.id === this.selectedId ? 'selected' : ''}" data-id="${song.id}">
        <span class="item-row-title">${escapeHtml(song.title)}</span>
        <span class="item-row-actions">
          <button class="icon-mini-btn danger" data-action="delete" data-id="${song.id}" title="${S.common.delete}"><span class="icon">${window.ICONS.trash}</span></button>
        </span>
      </li>
    `).join('');

    list.querySelectorAll('.item-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete"]')) return;
        this.selectedId = row.dataset.id;
        this.renderList();
        this.renderDetail();
      });
    });
    list.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSong(btn.dataset.id);
      });
    });
  },

  renderDetail() {
    const S = window.STRINGS;
    const pane = document.getElementById('songDetail');
    const song = this.songs.find((s) => s.id === this.selectedId);
    if (!song) {
      pane.innerHTML = `<p class="empty-state">${S.common.empty}</p>`;
      return;
    }
    const currentSize = song.fontSize || (window.Settings?.data?.lyricsFontSize || 46);
    pane.innerHTML = `
      <h3>${escapeHtml(song.title)}</h3>
      <p class="form-hint">${S.lyrics.slideOf.replace('{current}', '1').replace('{total}', song.slides.length)}</p>
      <!-- Present / Exit row (equal width via grid) -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <button id="presentSongBtn" class="op-btn-present op-btn-block"><span class="icon">${window.ICONS.play}</span> Present</button>
        <button id="exitPresentBtn" class="op-btn-stop op-btn-block"><span class="icon">${window.ICONS.close}</span> Exit</button>
      </div>
      <!-- Icon action row -->
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button id="editSongBtn" title="Edit Song" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border:1.5px solid var(--color-border); border-radius:6px; background:transparent; color:var(--color-primary); cursor:pointer; flex-shrink:0;"><span class="icon" style="width:16px;height:16px;">${window.ICONS.edit}</span></button>
        <button id="deleteSongBtn" title="Delete Song" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border:1.5px solid rgba(237,28,36,0.4); border-radius:6px; background:transparent; color:var(--color-accent); cursor:pointer; flex-shrink:0;"><span class="icon" style="width:16px;height:16px;">${window.ICONS.trash}</span></button>
        <span style="margin-left:auto; display:inline-flex; align-items:center; gap:6px; font-size:0.9rem; color:var(--color-text-muted);">
          <button class="btn btn-ghost" id="detailFontDec" style="font-weight:800; padding:2px 10px; min-width:0;">A-</button>
          <span id="detailFontLabel" style="font-weight:700; min-width:40px; text-align:center;">${currentSize}pt</span>
          <button class="btn btn-ghost" id="detailFontInc" style="font-weight:800; padding:2px 10px; min-width:0;">A+</button>
        </span>
      </div>
    `;
    document.getElementById('presentSongBtn').addEventListener('click', () => this.presentSong(song.id));
    const exitBtn = document.getElementById('exitPresentBtn');
    if (exitBtn) exitBtn.addEventListener('click', () => this.exitPresent && this.exitPresent());
    document.getElementById('editSongBtn').addEventListener('click', () => this.openEdit(song.id));
    document.getElementById('deleteSongBtn').addEventListener('click', () => this.deleteSong(song.id));
    document.getElementById('detailFontDec').addEventListener('click', () => this.adjustFontSize(-2));
    document.getElementById('detailFontInc').addEventListener('click', () => this.adjustFontSize(2));
  },

  async importDocx() {
    const filePath = await window.Store.openDocxDialog();
    if (!filePath) return;
    const parsed = await window.Store.parseDocx(filePath);
    if (!parsed.slides || parsed.slides.length === 0) {
      alert(window.STRINGS.lyrics.noSlides);
      return;
    }
    this._pendingImport = parsed;
    this.showReview(parsed);
  },

  showReview(parsed) {
    const S = window.STRINGS.lyrics;
    const html = `
      <h3>${S.reviewTitle}</h3>
      <p class="form-hint">${S.reviewHint}</p>
      <div class="form-row">
        <label>${S.songTitleLabel}</label>
        <input id="reviewTitleInput" value="${escapeAttr(parsed.title)}" />
      </div>
      <div style="max-height:48vh;overflow-y:auto;border:1.5px solid var(--color-border);border-radius:var(--radius-md);padding:22px;font-size:1.3rem;line-height:1.7;margin-top:14px;">
        ${parsed.slides.map((s, i) => `<div style="margin-bottom:18px;"><div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:4px;">#${i + 1}</div>${escapeHtml(s).replace(/\n/g, '<br/>')}</div>`).join('')}
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="reviewCancelBtn">${window.STRINGS.common.cancel}</button>
        <button class="btn btn-primary" id="reviewSaveBtn">${S.looksGoodSave}</button>
      </div>
    `;
    window.Modal.show('reviewOverlay', html);
    document.getElementById('reviewCancelBtn').addEventListener('click', () => window.Modal.hide('reviewOverlay'));
    document.getElementById('reviewSaveBtn').addEventListener('click', () => this.confirmSave());
  },

  async confirmSave() {
    const title = document.getElementById('reviewTitleInput').value.trim() || this._pendingImport.title;
    const song = {
      id: window.Store.newId(),
      title,
      slides: this._pendingImport.slides,
      createdAt: new Date().toISOString()
    };
    this.songs.push(song);
    await window.Store.set('songs', this.songs);
    this.selectedId = song.id;
    window.Modal.hide('reviewOverlay');
    this.renderOperatorView();
  },

  async deleteSong(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    this.songs = this.songs.filter((s) => s.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    await window.Store.set('songs', this.songs);
    this.renderOperatorView();
  },

  // Edit a saved song. Slides are joined with a blank line into one textarea so
  // the operator can fix typos in context; on save the text is re-split into
  // slides whenever a blank line appears (mirrors the .docx import logic).
  autoSplitLyrics(text) {
    if (!text || !text.trim()) return [''];
    const raw = text.replace(/\r\n/g, '\n').trim();
    if (raw.includes('\n\n')) {
      const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
      if (blocks.length > 0) return blocks;
    }
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [''];
    const slides = [];
    const chunkSize = lines.length > 8 ? 4 : 2;
    for (let i = 0; i < lines.length; i += chunkSize) {
      slides.push(lines.slice(i, i + chunkSize).join('\n'));
    }
    return slides;
  },

  _setupSlideEditorToolbar(prefix, container) {
    const addBtn = document.getElementById(`${prefix}AddSlideBtn`);
    const togglePasteBtn = document.getElementById(`${prefix}TogglePasteBoxBtn`);
    const pasteContainer = document.getElementById(`${prefix}PasteLyricsContainer`);
    const pasteTextarea = document.getElementById(`${prefix}PasteLyricsTextarea`);
    const cancelPasteBtn = document.getElementById(`${prefix}CancelPasteBtn`);
    const appendBtn = document.getElementById(`${prefix}AppendPastedSlidesBtn`);
    const replaceBtn = document.getElementById(`${prefix}ReplacePastedSlidesBtn`);

    if (addBtn) {
      addBtn.onclick = () => {
        this._workingSlides.push('');
        this._renderSlideEditor(container, this._workingSlides);
        container.scrollTop = container.scrollHeight;
        const inputs = container.querySelectorAll('.slide-card-textarea');
        if (inputs.length) inputs[inputs.length - 1].focus();
      };
    }

    if (togglePasteBtn && pasteContainer) {
      togglePasteBtn.onclick = () => {
        pasteContainer.classList.toggle('hidden');
        if (!pasteContainer.classList.contains('hidden') && pasteTextarea) {
          pasteTextarea.focus();
        }
      };
    }

    if (cancelPasteBtn && pasteContainer) {
      cancelPasteBtn.onclick = () => {
        pasteContainer.classList.add('hidden');
        if (pasteTextarea) pasteTextarea.value = '';
      };
    }

    const processPaste = (isAppend) => {
      const text = pasteTextarea ? pasteTextarea.value : '';
      if (!text || !text.trim()) return;
      const parsedSlides = this.autoSplitLyrics(text);
      if (isAppend) {
        if (this._workingSlides.length === 1 && !this._workingSlides[0].trim()) {
          this._workingSlides = parsedSlides;
        } else {
          this._workingSlides.push(...parsedSlides);
        }
      } else {
        this._workingSlides = parsedSlides;
      }
      this._renderSlideEditor(container, this._workingSlides);
      if (pasteContainer) pasteContainer.classList.add('hidden');
      if (pasteTextarea) pasteTextarea.value = '';
    };

    if (appendBtn) appendBtn.onclick = () => processPaste(true);
    if (replaceBtn) replaceBtn.onclick = () => processPaste(false);
  },

  openEdit(id) {
    const S = window.STRINGS.lyrics;
    const song = this.songs.find((s) => s.id === id);
    if (!song) return;
    this._editingId = id;
    this._workingSlides = Array.isArray(song.slides) ? [...song.slides] : [''];

    const html = `
      <h3>${S.editSong}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label>${S.songTitleLabel}</label>
          <input id="editTitleInput" value="${escapeAttr(song.title)}" />
        </div>
        <div class="form-row">
          <label>${S.lyricsLabel}</label>
          <div class="slide-editor-toolbar">
            <button type="button" class="btn btn-primary" id="editAddSlideBtn" style="height:32px; padding:0 12px; font-size:12px;">
              + Add Slide
            </button>
            <button type="button" class="btn btn-ghost" id="editTogglePasteBoxBtn" style="border:1.5px solid var(--color-primary); color:var(--color-primary); font-weight:700; height:32px; padding:0 12px; font-size:12px;">
              📋 Paste Full Lyrics
            </button>
            <span class="form-hint" style="margin-left:auto; font-weight:600; color:var(--color-text-muted);">💡 Drag ⠿ handle to reorder slides</span>
          </div>
          <div class="paste-lyrics-box hidden" id="editPasteLyricsContainer" style="background:var(--color-surface); border:1.5px solid var(--color-primary); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-size:0.85rem; font-weight:700; margin-bottom:6px; color:var(--color-primary); display:flex; justify-content:space-between; align-items:center;">
              <span>📋 Paste Full Song Lyrics (Auto-Split into Slides)</span>
              <span style="font-size:0.75rem; font-weight:normal; color:var(--color-text-muted);">Stanzas separated by blank lines will auto-split</span>
            </div>
            <textarea id="editPasteLyricsTextarea" rows="5" style="width:100%; box-sizing:border-box; border:1px solid var(--color-border); border-radius:6px; padding:8px; font-size:0.95rem; font-family:inherit; resize:vertical;" placeholder="Paste full song text here..."></textarea>
            <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end;">
              <button type="button" class="btn btn-ghost" id="editCancelPasteBtn" style="height:30px; padding:0 10px; font-size:12px;">Cancel</button>
              <button type="button" class="btn btn-secondary" id="editAppendPastedSlidesBtn" style="height:30px; padding:0 10px; font-size:12px;">+ Append to Slides</button>
              <button type="button" class="btn btn-primary" id="editReplacePastedSlidesBtn" style="height:30px; padding:0 10px; font-size:12px;">⚡ Split & Replace Slides</button>
            </div>
          </div>
          <div class="slide-cards-list" id="editSlideCardsList"></div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="editCancelBtn">${window.STRINGS.common.cancel}</button>
        <button class="btn btn-primary" id="editSaveBtn">${window.STRINGS.common.save}</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);
    document.querySelector('#modalOverlay > div').classList.add('modal-wide');

    const container = document.getElementById('editSlideCardsList');
    this._renderSlideEditor(container, this._workingSlides);
    this._setupSlideEditorToolbar('edit', container);

    document.getElementById('editCancelBtn').addEventListener('click', () => this._closeEdit());
    document.getElementById('editSaveBtn').addEventListener('click', () => this.saveEdit());
  },

  _closeEdit() {
    document.querySelector('#modalOverlay > div').classList.remove('modal-wide');
    window.Modal.hide('modalOverlay');
    this._editingId = null;
    this._workingSlides = null;
  },

  async saveEdit() {
    const song = this.songs.find((s) => s.id === this._editingId);
    if (!song) { this._closeEdit(); return; }
    const title = document.getElementById('editTitleInput').value.trim() || song.title;
    const slides = (this._workingSlides || []).map(s => String(s || '').trim());

    song.title = title;
    song.slides = slides.length ? slides : [''];
    await window.Store.set('songs', this.songs);
    this._closeEdit();
    this.renderOperatorView();
  },

  // ── New-song form ──
  openNew() {
    const S = window.STRINGS.lyrics;
    this._workingSlides = [''];

    const html = `
      <h3>${S.newSong}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label>${S.songTitleLabel}</label>
          <input id="newTitleInput" placeholder="${S.songTitleLabel}" />
        </div>
        <div class="form-row">
          <label>${S.lyricsLabel}</label>
          <div class="slide-editor-toolbar">
            <button type="button" class="btn btn-primary" id="newAddSlideBtn" style="height:32px; padding:0 12px; font-size:12px;">
              + Add Slide
            </button>
            <button type="button" class="btn btn-ghost" id="newTogglePasteBoxBtn" style="border:1.5px solid var(--color-primary); color:var(--color-primary); font-weight:700; height:32px; padding:0 12px; font-size:12px;">
              📋 Paste Full Lyrics
            </button>
            <span class="form-hint" style="margin-left:auto; font-weight:600; color:var(--color-text-muted);">💡 Drag ⠿ handle to reorder slides</span>
          </div>
          <div class="paste-lyrics-box hidden" id="newPasteLyricsContainer" style="background:var(--color-surface); border:1.5px solid var(--color-primary); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-size:0.85rem; font-weight:700; margin-bottom:6px; color:var(--color-primary); display:flex; justify-content:space-between; align-items:center;">
              <span>📋 Paste Full Song Lyrics (Auto-Split into Slides)</span>
              <span style="font-size:0.75rem; font-weight:normal; color:var(--color-text-muted);">Stanzas separated by blank lines will auto-split</span>
            </div>
            <textarea id="newPasteLyricsTextarea" rows="5" style="width:100%; box-sizing:border-box; border:1px solid var(--color-border); border-radius:6px; padding:8px; font-size:0.95rem; font-family:inherit; resize:vertical;" placeholder="Paste full song text here..."></textarea>
            <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end;">
              <button type="button" class="btn btn-ghost" id="newCancelPasteBtn" style="height:30px; padding:0 10px; font-size:12px;">Cancel</button>
              <button type="button" class="btn btn-secondary" id="newAppendPastedSlidesBtn" style="height:30px; padding:0 10px; font-size:12px;">+ Append to Slides</button>
              <button type="button" class="btn btn-primary" id="newReplacePastedSlidesBtn" style="height:30px; padding:0 10px; font-size:12px;">⚡ Split & Replace Slides</button>
            </div>
          </div>
          <div class="slide-cards-list" id="newSlideCardsList"></div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="newCancelBtn">${window.STRINGS.common.cancel}</button>
        <button class="btn btn-primary" id="newSaveBtn">${window.STRINGS.common.save}</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);
    document.querySelector('#modalOverlay > div').classList.add('modal-wide');
    document.getElementById('newTitleInput').focus();

    const container = document.getElementById('newSlideCardsList');
    this._renderSlideEditor(container, this._workingSlides);
    this._setupSlideEditorToolbar('new', container);

    document.getElementById('newCancelBtn').addEventListener('click', () => this._closeNew());
    document.getElementById('newSaveBtn').addEventListener('click', () => this.saveNew());
  },

  _closeNew() {
    document.querySelector('#modalOverlay > div').classList.remove('modal-wide');
    window.Modal.hide('modalOverlay');
    this._workingSlides = null;
  },

  async saveNew() {
    const titleEl = document.getElementById('newTitleInput');
    const title = titleEl.value.trim();
    if (!title) {
      titleEl.focus();
      titleEl.style.borderColor = 'var(--color-accent)';
      return;
    }
    const slides = (this._workingSlides || []).map(s => String(s || '').trim());

    const song = {
      id: window.Store.newId(),
      title,
      slides: slides.length ? slides : [''],
      createdAt: new Date().toISOString()
    };
    this.songs.push(song);
    await window.Store.set('songs', this.songs);
    this.selectedId = song.id;
    this._closeNew();
    this.renderOperatorView();
  },

  // Interactive Drag-and-Drop Slide Cards Renderer
  _renderSlideEditor(containerEl, slidesArray) {
    if (!containerEl) return;
    const renderCards = () => {
      containerEl.innerHTML = slidesArray.map((slide, i) => {
        const isEmpty = !slide || slide.trim().length === 0;
        return `
          <div class="slide-edit-card" draggable="true" data-index="${i}">
            <div class="slide-card-header">
              <span class="slide-drag-handle" title="Drag to reorder slide">⠿</span>
              <span class="slide-card-title">
                Slide ${i + 1}
                ${isEmpty ? '<span class="slide-card-empty-badge">Empty / Idle Screen</span>' : ''}
              </span>
              <div class="slide-card-actions">
                <button type="button" class="icon-mini-btn" data-action="move-up" data-index="${i}" title="Move Up" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="icon-mini-btn" data-action="move-down" data-index="${i}" title="Move Down" ${i === slidesArray.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="icon-mini-btn danger" data-action="delete-slide" data-index="${i}" title="Delete Slide">✕</button>
              </div>
            </div>
            <textarea class="slide-card-textarea" data-index="${i}" rows="1" placeholder="Write lyrics or leave empty for a blank slide...">${escapeHtml(slide)}</textarea>
          </div>
        `;
      }).join('');

      // Wire textarea inputs
      containerEl.querySelectorAll('.slide-card-textarea').forEach((ta) => {
        ta.addEventListener('input', (e) => {
          const idx = Number(e.target.dataset.index);
          slidesArray[idx] = e.target.value;
          const titleEl = ta.closest('.slide-edit-card').querySelector('.slide-card-title');
          if (titleEl) {
            const isEmpty = !e.target.value || e.target.value.trim().length === 0;
            titleEl.innerHTML = `Slide ${idx + 1} ${isEmpty ? '<span class="slide-card-empty-badge">Empty / Idle Screen</span>' : ''}`;
          }
        });
      });

      // Wire Move Up / Move Down / Delete
      containerEl.querySelectorAll('[data-action]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const act = btn.dataset.action;
          const idx = Number(btn.dataset.index);
          if (act === 'move-up' && idx > 0) {
            const tmp = slidesArray[idx];
            slidesArray[idx] = slidesArray[idx - 1];
            slidesArray[idx - 1] = tmp;
            renderCards();
          } else if (act === 'move-down' && idx < slidesArray.length - 1) {
            const tmp = slidesArray[idx];
            slidesArray[idx] = slidesArray[idx + 1];
            slidesArray[idx + 1] = tmp;
            renderCards();
          } else if (act === 'delete-slide') {
            slidesArray.splice(idx, 1);
            if (slidesArray.length === 0) slidesArray.push('');
            renderCards();
          }
        };
      });

      // HTML5 Drag & Drop reordering
      let draggedIdx = -1;
      containerEl.querySelectorAll('.slide-edit-card').forEach((card) => {
        card.addEventListener('dragstart', (e) => {
          draggedIdx = Number(card.dataset.index);
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggedIdx);
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('drag-over');
          const targetIdx = Number(card.dataset.index);
          if (draggedIdx >= 0 && draggedIdx !== targetIdx) {
            const item = slidesArray.splice(draggedIdx, 1)[0];
            slidesArray.splice(targetIdx, 0, item);
            renderCards();
          }
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          containerEl.querySelectorAll('.slide-edit-card').forEach(c => c.classList.remove('drag-over'));
        });
      });
    };

    renderCards();
  },

  async presentSong(id) {
    const song = this.songs.find((s) => s.id === id);
    if (!song) return;
    const settings = await window.Store.get('settings');
    window.Present.open((body) => this._renderOperator(body, song.id, settings), 'operator', { mirror: false });
  },

  // Re-flow verses into display pages of AT MOST `maxLines` lines each. Works no
  // matter how the .docx was formatted - including older songs stored as one long
  // run-on line with no breaks: any line longer than `maxWords` words is wrapped
  // into shorter lines first, so a page never becomes a giant overflowing block.
  _toPages(slides, maxLines, maxWords) {
    maxLines = maxLines || 1;
    maxWords = maxWords || 6;
    const pages = [];
    
    // Always prepend a starting empty page for musical intro
    pages.push(['']);
    
    slides.forEach((slide) => {
      const rawLines = slide.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (rawLines.length === 0) {
        pages.push(['']);
        return;
      }
      const lines = [];
      rawLines.forEach((line) => {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length <= maxWords) {
          lines.push(line);
        } else {
          for (let i = 0; i < words.length; i += maxWords) {
            lines.push(words.slice(i, i + maxWords).join(' '));
          }
        }
      });
      for (let i = 0; i < lines.length; i += maxLines) {
        pages.push(lines.slice(i, i + maxLines));
      }
    });
    return pages.length ? pages : [['']];
  },

  _buildLyricDisplayHtml(lines, bgMedia, fontSize, fontFamily) {
    const isPageEmpty = lines.join('').trim() === '';
    const hasBg = Boolean(bgMedia);
    const size = fontSize || (window.Settings?.data?.lyricsFontSize || 46);
    const font = fontFamily || this._fontFamily || window.AppState.fontFamily || 'Noto Sans Ethiopic';
    const fontCss = `font-family: '${font.replace(/'/g, "\\'")}', 'Segoe UI', sans-serif;`;
    
    let textHtml = '';
    if (isPageEmpty) {
      const animType = (window.Settings && window.Settings.data && window.Settings.data.lyricsIdleAnimation) || 'soundwave';
      textHtml = this._buildIdleHtml(animType);
    } else {
      const wordCount = this._getSungWordCount(lines);
      const revealMs = Math.min(this._getSingingDurationMs(lines) * 0.72, 4200);
      const step = Math.min(revealMs / wordCount, 240);
      let w = 0;
      textHtml = lines.map((line) => {
        const words = line.split(/\s+/).filter(Boolean).map((word) => {
          // With a bg: animate to white; without: red/blue karaoke
          const active = hasBg ? '#ffffff' : (Math.random() < 0.28 ? '#1f4497' : '#ed1c24');
          const delay = (w++ * step).toFixed(0);
          return `<span class="kw" style="--active:${active};--d:${delay}ms">${escapeHtml(word)}</span>`;
        }).join(' ');
        return `<span class="lyric-line">${words}</span>`;
      }).join('');
    }

    let bgLayerHtml = '';
    if (hasBg) {
      const mediaSrc = this._getImageUrl(bgMedia.src);
      if (bgMedia.type === 'image') {
        bgLayerHtml = `<div class="lyrics-bg-layer"><img src="${escapeAttr(mediaSrc)}" /></div>`;
      } else if (bgMedia.type === 'video') {
        bgLayerHtml = `<div class="lyrics-bg-layer"><video autoplay loop muted playsinline src="${escapeAttr(mediaSrc)}"></video></div>`;
      } else if (bgMedia.type === 'youtube') {
        const vid = escapeAttr(bgMedia.videoId);
        bgLayerHtml = `<div class="lyrics-bg-layer"><iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
      }
    }

    return `
      <div class="lyrics-stage${hasBg ? ' lyrics-has-bg' : ''}" style="${fontCss}">
        ${bgLayerHtml}
        ${hasBg ? '<div class="lyrics-bg-overlay"></div>' : ''}
        <div class="lyrics-slide-text${hasBg ? ' lyrics-text-white' : ''}" style="${fontCss} font-size:${size}pt">${textHtml}</div>
      </div>
    `;
  },

  _buildScaledPreviewHtml(lines, bgMedia, fontSize, fontFamily, containerWidth) {
    const rawHtml = this._buildLyricDisplayHtml(lines, bgMedia, fontSize, fontFamily);
    const w = containerWidth || 320;
    const scale = (w / 1920).toFixed(4);
    return `
      <div style="width:1920px; height:1080px; transform: scale(${scale}); transform-origin: top left; pointer-events:none; position:absolute; top:0; left:0;">
        ${rawHtml}
      </div>
    `;
  },

  _getRepeatCount(lines) {
    const text = lines.join(' ');
    const matches = [...text.matchAll(/(?:^|[\s([{\-])(?:[x×]\s*(\d+)|(\d+)\s*[x×])(?=$|[\s)\]}.!?,:;\-])/gi)];
    const counts = matches
      .map((m) => Number(m[1] || m[2]))
      .filter((n) => Number.isFinite(n) && n > 1 && n <= 12);
    return counts.length ? Math.max(...counts) : 1;
  },

  _getSungWordCount(lines) {
    const text = lines
      .join(' ')
      .replace(/(?:^|[\s([{\-])(?:[x×]\s*\d+|\d+\s*[x×])(?=$|[\s)\]}.!?,:;\-])/gi, ' ')
      .trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 1;
  },

  _getSingingDurationMs(lines) {
    const words = this._getSungWordCount(lines);
    const seconds = Math.min(Math.max(3.8, 1.4 + (words * 0.62)), 18);
    return seconds * 1000;
  },

  renderOperatorView() {
    const container = document.getElementById('lyricsOperatorContainer');
    if (!container) return;
    this._renderOperator(container, this.selectedId);
  },

  _renderOperator(body, initialSongId, settings) {
    const self = this;
    self._fontFamily = self._fontFamily || window.AppState?.fontFamily || 'Noto Sans Ethiopic';
    let currentSong = this.songs.find((s) => s.id === (initialSongId || this.selectedId)) || this.songs[0] || { id: null, title: 'No Song', slides: [''] };
    this.selectedId = currentSong.id;
    let pages = this._toPages(currentSong.slides || [''], 2);
    let index = 0;
    let externalOpened = false;
    let autoTimer = null;
    let autoOn = false;
    let repeatStep = 0;
    let bgMedia = null;          // null = no background
    let bgItems = [];            // [{id, type, label, src?, videoId?, thumb?}]
    let pinnedSlideIdxs = [];    // indices of pinned/repeated slides (up to 6)
    let repeatSlideIdx = -1;     // index of slide set to loop/repeat (-1 = none)
    let resumeAfterIdx = -1;     // after a pinned-jump, auto continues from this index

    body.innerHTML = `
      <div class="operator-view" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">

        <!-- Main 3-Column Body -->
        <div style="flex:1; display:grid; grid-template-columns: 380px 1fr 380px; min-height:0; overflow:hidden;">

          <!-- LEFT COLUMN: Presented Screen (16:9) on top + Background Media on bottom -->
          <div style="display:flex; flex-direction:column; border-right:1.5px solid var(--color-border); overflow:hidden; background:var(--color-bg);">
            <!-- Top: 16:9 Presented Screen Preview -->
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
                  <div id="operatorPreviewScreen" style="position:absolute; inset:0; width:100%; height:100%; overflow:hidden; background:#ffffff;"></div>
                </div>
              </div>
            </div>

            <!-- Pending Screen Preview -->
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
                  <div id="operatorPendingScreen" style="position:absolute; inset:0; width:100%; height:100%; overflow:hidden; background:#ffffff;"></div>
                </div>
              </div>
            </div>

            <!-- Bottom: Background Media List -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="operator-media-header" style="padding:10px 14px; font-size:0.88rem; font-weight:700; flex-shrink:0; border-bottom:1px solid var(--color-border);">
                <span class="icon" style="width:16px;height:16px;">${window.ICONS.play}</span>
                Background Media
              </div>
              <div class="operator-media-list" id="operatorMediaList" style="flex:1; overflow-y:auto; padding:8px;">
                <div class="operator-media-loading">Loading…</div>
              </div>
            </div>
          </div>

          <!-- MIDDLE COLUMN: Slide Cards Navigator -->
          <div style="display:flex; flex-direction:column; border-right:1.5px solid var(--color-border); overflow:hidden;">
            <div style="padding:10px 14px; background:var(--color-surface); border-bottom:1px solid var(--color-border); flex-shrink:0;">
              <span style="font-size:0.88rem; font-weight:700; color:var(--color-text-muted);">Slides Navigator</span>
            </div>
            <div id="operatorStickySlides"></div>
            <div class="operator-slide-list" id="operatorSlideList" style="flex:1; overflow-y:auto; padding:12px;"></div>
          </div>

          <!-- RIGHT COLUMN: Control Strip on Top + Song Lyrics List & Creation Buttons on Bottom -->
          <div style="display:flex; flex-direction:column; overflow:hidden; background:var(--color-surface);">

            <!-- TOP CONTROLS CARD -->
            <div style="padding:14px; border-bottom:2px solid var(--color-border); display:flex; flex-direction:column; gap:10px; flex-shrink:0; background:var(--color-bg);">

              <!-- Slide Navigation & Auto Advance Row -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:var(--color-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border);">
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="operator-icon-btn" data-action="prev" title="Previous slide" style="height:34px; width:36px;"><span class="icon">${window.ICONS.arrowLeft}</span></button>
                  <button class="operator-icon-btn" data-action="next" title="Next slide" style="height:34px; width:36px;"><span class="icon">${window.ICONS.arrowRight}</span></button>
                  <button class="operator-auto-btn" data-action="auto" id="operatorAutoBtn" title="${window.STRINGS.lyrics.autoAdvance}" style="height:34px; padding:0 10px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:4px;">
                    <span class="icon" id="operatorAutoIcon" style="width:14px;height:14px;">${window.ICONS.play}</span>
                    <span>Auto</span>
                  </button>
                </div>
                <div class="operator-progress" id="operatorProgress" style="font-size:0.9rem; font-weight:800; color:var(--color-primary);"></div>
              </div>

              <!-- Active Song Title Display -->
              <div style="background:var(--color-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border); display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-muted);">Song:</span>
                <span class="operator-song-title" id="operatorSongTitle" style="font-weight:700; font-size:0.9rem; color:var(--color-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></span>
              </div>

              <!-- Main Presentation Buttons: Present & Exit (equal width via grid) -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <button data-action="toggle-present" id="opTogglePresentBtn" class="op-btn-present op-btn-block" title="Present to second screen">
                  <span class="icon">${window.ICONS.play}</span> Present
                </button>
                <button data-action="exit" class="op-btn-stop op-btn-block" title="Exit presentation">
                  <span class="icon">${window.ICONS.close}</span> Exit
                </button>
              </div>

            </div>

            <!-- BOTTOM: SONG LYRICS PANEL -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
              
              <!-- Panel Header -->
              <div class="operator-media-header" style="justify-content:space-between; padding:10px 14px; font-size:0.9rem; font-weight:700; flex-shrink:0; background:var(--color-bg); border-bottom:1px solid var(--color-border);">
                <span>🎵 SONG LYRICS</span>
                <span id="opSongCountBadge" style="font-size:0.8rem; background:var(--color-surface); padding:2px 8px; border-radius:12px; color:var(--color-text-muted); border:1px solid var(--color-border);">${self.songs.length} Songs</span>
              </div>

              <!-- Row 1: Add New Song & Import File Buttons -->
              <div style="display:flex; gap:8px; padding:8px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <button class="btn btn-ghost" id="opBtnNewSong" style="flex:1; border:1.5px solid var(--color-primary); color:var(--color-primary); font-weight:700; height:38px; font-size:13px; border-radius:6px;">
                  + New Song
                </button>
                <button class="btn btn-primary" id="opBtnImportDocx" style="flex:1; height:38px; font-size:12px; font-weight:700; border-radius:6px;">
                  📥 Import (.docx)
                </button>
              </div>

              <!-- Font Control Group: Song Lyrics Font & Size Chooser -->
              <div style="padding:10px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <div style="display:flex; flex-direction:column; gap:8px; background:var(--color-surface); padding:10px; border-radius:8px; border:1px solid var(--color-border);">
                  <!-- All Slides Font Size -->
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-muted);">All Slides Font:</span>
                    <div style="display:inline-flex; align-items:center; gap:4px; background:var(--color-bg); padding:2px 6px; border-radius:6px; border:1px solid var(--color-border);">
                      <button class="operator-icon-btn" data-action="font-global-dec" title="Decrease All Slides Font" style="width:30px; height:28px; font-weight:900; font-size:0.9rem;">A-</button>
                      <span id="operatorGlobalFontLabel" style="font-weight:800; font-size:0.9rem; min-width:38px; text-align:center; color:var(--color-primary);">46pt</span>
                      <button class="operator-icon-btn" data-action="font-global-inc" title="Increase All Slides Font" style="width:30px; height:28px; font-weight:900; font-size:0.9rem;">A+</button>
                    </div>
                  </div>
                  <!-- This Slide Font Size -->
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-muted);">This Slide Font:</span>
                    <div style="display:inline-flex; align-items:center; gap:4px; background:var(--color-bg); padding:2px 6px; border-radius:6px; border:1px solid var(--color-border);">
                      <button class="operator-icon-btn" data-action="font-dec" title="Decrease Current Slide Font" style="width:30px; height:28px; font-weight:900; font-size:0.9rem;">A-</button>
                      <span id="operatorFontLabel" style="font-weight:800; font-size:0.9rem; min-width:38px; text-align:center; color:var(--color-primary);">46pt</span>
                      <button class="operator-icon-btn" data-action="font-inc" title="Increase Current Slide Font" style="width:30px; height:28px; font-weight:900; font-size:0.9rem;">A+</button>
                    </div>
                  </div>
                  <!-- Font Family Select -->
                  <select class="operator-font-select" data-action="change-lyric-font" style="width:100%; height:36px; padding:0 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); font-weight:600; font-size:13px;">
                    ${window.FONTS ? window.FONTS.map(f => `<option value="${f.value}" ${self._fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('') : '<option value="Noto Sans Ethiopic">Noto Sans Ethiopic</option>'}
                  </select>
                </div>
              </div>

              <!-- Row 2: Action Buttons for Selected Song (Edit / Delete) -->
              <div style="display:flex; gap:8px; padding:8px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <button class="btn btn-ghost" data-action="edit-song" style="flex:1; height:44px; font-size:14px; font-weight:700; border:1px solid var(--color-border); background:var(--color-surface); border-radius:6px;" title="Edit song">
                  ✏ Edit
                </button>
                <button class="btn btn-danger" data-action="delete-song" style="flex:1; height:44px; font-size:14px; font-weight:700; background:#dc2626; border-color:#dc2626; color:#fff; border-radius:6px;" title="Delete song">
                  🗑 Delete
                </button>
              </div>

              <!-- Scrollable Song List Container -->
              <div id="opSongListContainer" style="flex:1; overflow-y:auto; padding:8px;">
                <!-- Song items dynamically inserted -->
              </div>
            </div>

          </div>
        </div>

        <!-- Edit Single Slide Modal Overlay -->
        <div id="operatorEditSlideOverlay" class="operator-edit-slide-overlay hidden">
          <div class="operator-edit-slide-modal">
            <h3 style="margin-top:0;margin-bottom:12px;color:var(--color-primary);">Edit Slide Content</h3>
            <textarea id="operatorEditSlideTextarea" rows="4" style="width:100%;box-sizing:border-box;padding:8px;border-radius:4px;border:1.5px solid var(--color-border);font-size:1.1rem;line-height:1.5;margin-bottom:12px;resize:vertical;"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button class="btn btn-ghost" id="operatorCancelEditSlideBtn" style="min-width:90px;">Cancel</button>
              <button class="btn btn-primary" id="operatorSaveEditSlideBtn" style="min-width:90px;">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const titleEl = document.getElementById('operatorSongTitle');
    const progressEl = document.getElementById('operatorProgress');
    const slideList = document.getElementById('operatorSlideList');
    const mediaList = document.getElementById('operatorMediaList');
    const previewScreen = document.getElementById('operatorPreviewScreen');
    const pendingScreen = document.getElementById('operatorPendingScreen');
    const screenStatus = document.getElementById('operatorScreenStatus');
    const fontLabelEl = document.getElementById('operatorFontLabel');

    const getFontSizeForPage = (pageIdx) => {
      if (currentSong && currentSong.pageFontSizes && currentSong.pageFontSizes[pageIdx] !== undefined && currentSong.pageFontSizes[pageIdx] !== null) {
        return currentSong.pageFontSizes[pageIdx];
      }
      const val = (currentSong && currentSong.fontSize) || (window.Settings?.data?.lyricsFontSize);
      return val || 46;
    };

    const updateFontLabel = () => {
      if (fontLabelEl) {
        fontLabelEl.textContent = `${getFontSizeForPage(index)}pt`;
      }
      const globalFontLabelEl = document.getElementById('operatorGlobalFontLabel');
      if (globalFontLabelEl) {
        const gVal = (currentSong && currentSong.fontSize) || (window.Settings?.data?.lyricsFontSize) || 46;
        globalFontLabelEl.textContent = `${gVal}pt`;
      }
    };

    const changeGlobalFontSize = async (delta) => {
      let current = (currentSong && currentSong.fontSize) || (window.Settings?.data?.lyricsFontSize) || 46;
      current += delta;
      if (current < 10) current = 10;
      if (current > 200) current = 200;
      currentSong.fontSize = current;
      currentSong.pageFontSizes = [];
      await window.Store.set('songs', self.songs);
      renderSlides();
      updateExternal().catch(() => {});
    };

    const updateExternal = async () => {
      if (!externalOpened) {
        if (screenStatus) screenStatus.textContent = 'Dual Screen Off';
        return;
      }
      const _font = self._fontFamily || window.AppState.fontFamily || 'Noto Sans Ethiopic';
      const payload = { html: this._buildLyricDisplayHtml(pages[index], bgMedia, getFontSizeForPage(index), _font), variant: 'lyrics', fontFamily: _font };
      if (screenStatus) screenStatus.textContent = 'Sending...';
      const result = await window.Store.presentUpdate(payload);
      externalOpened = Boolean(result && (result.opened || result.updated));
      if (screenStatus) screenStatus.textContent = externalOpened ? 'Live Dual Screen' : 'Dual Screen Off';
    };

    const toggleDualScreen = async () => {
      if (!externalOpened) {
        const _font = self._fontFamily || window.AppState.fontFamily || 'Noto Sans Ethiopic';
        const payload = { html: this._buildLyricDisplayHtml(pages[index], bgMedia, getFontSizeForPage(index), _font), variant: 'lyrics', fontFamily: _font };
        const result = await window.Store.presentOpen(payload);
        externalOpened = Boolean(result && (result.opened || result.updated));
      } else {
        await window.Present.close();
        externalOpened = false;
      }
      if (screenStatus) screenStatus.textContent = externalOpened ? 'Live Dual Screen' : 'Dual Screen Off';
      window.Present.setPresentButton(document.getElementById('opTogglePresentBtn'), externalOpened);
    };

    const stickySlidesContainer = document.getElementById('operatorStickySlides');

    const buildSlideHtml = (i) => {
      const lines = pages[i];
      const isActive = i === index;
      const isPinned = pinnedSlideIdxs.includes(i);
      const isRepeating = i === repeatSlideIdx;
      const activeFont = self._fontFamily || window.AppState?.fontFamily || 'Noto Sans Ethiopic';
      const linesHtml = lines.map(l => `<div class="lyric-mini-line" style="font-family:'${escapeHtml(activeFont)}', var(--font);">${escapeHtml(l)}</div>`).join('');
      return `
        <div class="operator-lyric-screen-btn ${isActive ? 'active' : ''} ${isPinned ? 'is-pinned' : ''} ${isRepeating ? 'is-repeating' : ''}" data-slide-index="${i}">
          <div class="operator-lyric-screen-box">
            <span class="operator-lyric-screen-badge">${i + 1}</span>

            <!-- Slide buttons: slide 0 (blank/pinned by default) gets only Repeat; others get Edit+Pin+Repeat -->
            ${i === 0 ? `
              <button class="operator-slide-repeat-btn ${isRepeating ? 'active-repeat' : ''}" data-action="repeat-slide" data-repeat-index="${i}" title="${isRepeating ? 'Stop Repeating' : 'Loop This Slide'}" style="position:absolute; bottom:6px; right:6px; width:32px; height:32px; border-radius:6px; border:1.5px solid ${isRepeating ? 'var(--color-accent)' : 'var(--color-border)'}; background:${isRepeating ? 'var(--color-accent)' : 'var(--color-bg)'}; color:${isRepeating ? '#fff' : 'var(--color-text)'}; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; font-weight:900; z-index:10; opacity:1;">&#x21BB;</button>
            ` : `
              <button class="operator-slide-edit-btn" data-action="edit-single-slide" data-edit-index="${i}" title="Edit Slide" style="position:absolute; top:6px; right:6px; width:32px; height:32px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; opacity:1;">
                <span class="icon" style="width:16px;height:16px;display:block;">${window.ICONS.edit}</span>
              </button>
              <button class="operator-slide-pin-btn ${isPinned ? 'pinned' : ''}" data-action="pin-slide" data-pin-index="${i}" title="${isPinned ? 'Unpin Slide' : 'Pin as Repeat'}" style="position:absolute; bottom:46px; right:6px; width:32px; height:32px; border-radius:6px; border:1.5px solid ${isPinned ? 'var(--color-accent)' : 'var(--color-border)'}; background:${isPinned ? 'var(--color-accent)' : 'var(--color-bg)'}; color:${isPinned ? '#fff' : 'var(--color-text)'}; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; opacity:1;">
                <span class="icon" style="width:16px;height:16px;display:block;">${window.ICONS.pin}</span>
              </button>
              <button class="operator-slide-repeat-btn ${isRepeating ? 'active-repeat' : ''}" data-action="repeat-slide" data-repeat-index="${i}" title="${isRepeating ? 'Stop Repeating' : 'Loop This Slide'}" style="position:absolute; bottom:6px; right:6px; width:32px; height:32px; border-radius:6px; border:1.5px solid ${isRepeating ? 'var(--color-accent)' : 'var(--color-border)'}; background:${isRepeating ? 'var(--color-accent)' : 'var(--color-bg)'}; color:${isRepeating ? '#fff' : 'var(--color-text)'}; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; font-weight:900; z-index:10; opacity:1;">&#x21BB;</button>
            `}

            <div class="operator-lyric-screen-text" style="font-family:'${escapeHtml(activeFont)}', var(--font);">${linesHtml}</div>

            <!-- Bottom-Left: LIVE & LOOP badges -->
            ${isActive ? '<div class="operator-lyric-screen-live" style="position:absolute; bottom:6px; left:6px; right:auto;">▶ LIVE</div>' : ''}
            ${isRepeating ? '<div class="operator-lyric-screen-live" style="position:absolute; top:32px; left:6px; background:#e44060; right:auto;">↻ LOOP</div>' : ''}
          </div>
        </div>
      `;
    };

    const renderStickySlides = () => {
      const stickyIndices = [0, ...pinnedSlideIdxs.filter(idx => idx !== 0)];
      stickySlidesContainer.innerHTML = stickyIndices.map(idx => {
        if (idx >= pages.length) return '';
        return buildSlideHtml(idx);
      }).join('');
    };

    const renderSlides = () => {
      const repeatCount = this._getRepeatCount(pages[index]);
      titleEl.textContent = currentSong.title;
      progressEl.textContent = repeatCount > 1
        ? `${index + 1} / ${pages.length} - ${repeatStep + 1} of ${repeatCount}x`
        : `${index + 1} / ${pages.length}`;
      updateFontLabel();

      const _lyricFont = self._fontFamily || window.AppState.fontFamily || 'Noto Sans Ethiopic';
      const previewWidth = previewScreen.clientWidth || 320;
      previewScreen.style.fontFamily = `'${_lyricFont}', sans-serif`;
      previewScreen.innerHTML = self._buildScaledPreviewHtml(pages[index], bgMedia, getFontSizeForPage(index), _lyricFont, previewWidth);

      if (pendingScreen) {
        const pendingWidth = pendingScreen.clientWidth || 320;
        pendingScreen.style.fontFamily = `'${_lyricFont}', sans-serif`;
        let pendingLines = [''];
        let pendingFontSize = 46;
        if (index + 1 < pages.length) {
          pendingLines = pages[index + 1];
          pendingFontSize = getFontSizeForPage(index + 1);
        }
        pendingScreen.innerHTML = self._buildScaledPreviewHtml(pendingLines, bgMedia, pendingFontSize, _lyricFont, pendingWidth);
      }

      const scrollPages = pages.slice(1);
      slideList.innerHTML = scrollPages.map((_, i) => {
        const idx = i + 1;
        return buildSlideHtml(idx);
      }).join('');

      renderStickySlides();

      const activeEl = slideList.querySelector('.operator-lyric-screen-btn.active') || 
                       stickySlidesContainer.querySelector('.operator-lyric-screen-btn.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    const renderSongList = (filterText = '') => {
      const containerEl = document.getElementById('opSongListContainer');
      if (!containerEl) return;
      const q = (filterText || '').toLowerCase().trim();
      const filtered = self.songs.filter(s => (s.title || '').toLowerCase().includes(q));
      if (filtered.length === 0) {
        containerEl.innerHTML = `<div style="font-size:0.8rem; color:var(--color-text-muted); text-align:center; padding:16px;">No songs found</div>`;
        return;
      }
      containerEl.innerHTML = filtered.map(s => {
        const isSel = s.id === currentSong.id;
        return `
          <div class="operator-song-item-row ${isSel ? 'active' : ''}" data-song-id="${s.id}" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; margin-bottom:4px; border-radius:6px; border:1px solid ${isSel ? 'var(--color-primary)' : 'var(--color-border)'}; background:${isSel ? '#eef2fb' : 'var(--color-surface)'}; cursor:pointer;">
            <span style="font-size:0.85rem; font-weight:700; color:${isSel ? 'var(--color-primary)' : 'var(--color-text)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">
              ${escapeHtml(s.title)}
            </span>
            <span style="font-size:0.7rem; font-weight:700; color:${isSel ? '#fff' : 'var(--color-text-muted)'}; background:${isSel ? 'var(--color-primary)' : 'var(--color-bg)'}; padding:2px 6px; border-radius:10px;">
              ${s.slides ? s.slides.length : 1}
            </span>
          </div>
        `;
      }).join('');
    };

    // --- Media panel ---
    const renderMediaPanel = () => {
      const activeId = bgMedia ? bgMedia.id : '__none__';
      const noneActive = activeId === '__none__';
      const items = bgItems.map((item) => {
        const isAct = item.id === activeId;
        const thumbHtml = item.thumb
          ? `<img class="operator-media-thumb" src="${escapeAttr(item.thumb)}" />`
          : `<div class="operator-media-thumb operator-media-thumb-icon">${item.type === 'youtube' ? '▶' : '🎬'}</div>`;
        return `
          <button class="operator-media-item ${isAct ? 'active' : ''}" data-media-id="${item.id}">
            ${thumbHtml}
            <span class="operator-media-label">${escapeHtml(item.label)}</span>
            ${isAct ? '<span class="operator-media-check">✓</span>' : ''}
            <span class="operator-media-delete" data-action="delete-media-item" data-media-id="${item.id}" title="Remove from list">✕</span>
          </button>
        `;
      }).join('');

      mediaList.innerHTML = `
        <button class="operator-media-item ${noneActive ? 'active' : ''}" data-media-id="__none__">
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

    Promise.all([
      window.Store.get('slides').catch(() => []),
      window.Store.get('mediaLinks').catch(() => [])
    ]).then(([slides, mediaLinks]) => {
      bgItems = [];
      (slides || []).forEach((img) => {
        const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(img.name || img.src || '');
        bgItems.push({
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
          bgItems.push({
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

    const setBg = (mediaId) => {
      if (mediaId === '__none__') {
        bgMedia = null;
      } else {
        const item = bgItems.find((m) => m.id === mediaId);
        if (!item) return;
        bgMedia = item;
      }
      renderMediaPanel();
      renderSlides();
      updateExternal().catch(() => {});
    };

    const addCustomBg = async () => {
      try {
        const copied = await window.Store.slidesPickAndCopy();
        if (!copied || copied.length === 0) return;
        const currentSlides = await window.Store.get('slides') || [];
        const newItems = [];
        for (const img of copied) {
          const item = {
            name: img.name,
            src: 'churchslide://' + img.src.replace(/\\/g, '/')
          };
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
        bgItems = [...newItems, ...bgItems];
        if (newItems.length > 0) {
          setBg(newItems[0].id);
        } else {
          renderMediaPanel();
        }
      } catch (err) {
        console.error('Failed to add custom bg:', err);
      }
    };

    let editingSlideIdx = null;

    const openEditSlideModal = (idx) => {
      editingSlideIdx = idx;
      const lines = pages[idx];
      const text = lines.join('\n');
      document.getElementById('operatorEditSlideTextarea').value = text;
      document.getElementById('operatorEditSlideOverlay').classList.remove('hidden');
      document.getElementById('operatorEditSlideTextarea').focus();
    };

    const closeEditSlideModal = () => {
      document.getElementById('operatorEditSlideOverlay').classList.add('hidden');
      editingSlideIdx = null;
    };

    const saveEditSlide = async () => {
      if (editingSlideIdx === null) return;
      const text = document.getElementById('operatorEditSlideTextarea').value;
      const newLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      pages[editingSlideIdx] = newLines;
      currentSong.slides = pages.map(p => p.join('\n'));
      await window.Store.set('songs', self.songs);
      closeEditSlideModal();
      renderSlides();
      updateExternal().catch(() => {});
    };

    const renderAll = () => {
      renderSlides();
      renderSongList();
      updateExternal().catch(() => {});
    };

    const goTo = (nextIndex, fromAutoClick = false) => {
      if (autoOn && !fromAutoClick) {
        resumeAfterIdx = index + 1;
      }
      index = (nextIndex + pages.length) % pages.length;
      repeatStep = 0;
      renderSlides();
      updateExternal().catch(() => {});
      scheduleAuto();
    };

    const advanceAuto = () => {
      if (index === repeatSlideIdx) {
        repeatStep = 0;
        renderSlides();
        updateExternal().catch(() => {});
        scheduleAuto();
        return;
      }
      const repeatCount = this._getRepeatCount(pages[index]);
      if (repeatStep < repeatCount - 1) {
        repeatStep += 1;
        renderSlides();
        updateExternal().catch(() => {});
        scheduleAuto();
        return;
      }
      if (resumeAfterIdx >= 0 && resumeAfterIdx < pages.length) {
        const dest = resumeAfterIdx;
        resumeAfterIdx = -1;
        goTo(dest, true);
      } else {
        goTo(index + 1, true);
      }
    };

    const scheduleAuto = () => {
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = autoOn ? setTimeout(advanceAuto, this._getSingingDurationMs(pages[index])) : null;
    };

    const setAuto = (on) => {
      autoOn = on;
      const btn = document.getElementById('operatorAutoBtn');
      const icon = document.getElementById('operatorAutoIcon');
      btn.classList.toggle('active', on);
      icon.innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      if (!on) { repeatStep = 0; resumeAfterIdx = -1; }
      scheduleAuto();
      renderSlides();
    };

    const switchSong = (songId) => {
      const song = self.songs.find((s) => s.id === songId);
      if (!song) return;
      if (song.id === currentSong.id) return;
      if (autoOn) setAuto(false);
      currentSong = song;
      self.selectedId = song.id;
      pages = self._toPages(currentSong.slides || [''], 2);
      index = 0;
      repeatStep = 0;
      pinnedSlideIdxs = [];
      renderAll();
    };

    const changeFontSize = async (delta) => {
      if (!currentSong.pageFontSizes) {
        currentSong.pageFontSizes = [];
      }
      let current = currentSong.pageFontSizes[index] !== undefined 
        ? currentSong.pageFontSizes[index] 
        : (currentSong.fontSize || (window.Settings?.data?.lyricsFontSize || 46));
      current += delta;
      if (current < 10) current = 10;
      if (current > 200) current = 200;
      currentSong.pageFontSizes[index] = current;
      await window.Store.set('songs', self.songs);
      renderSlides();
      updateExternal().catch(() => {});
    };

    const deleteMediaItem = async (mediaId) => {
      if (bgMedia && bgMedia.id === mediaId) {
        bgMedia = null;
      }
      bgItems = bgItems.filter(item => item.id !== mediaId);
      if (mediaId.startsWith('slide_')) {
        const name = mediaId.replace(/^slide_/, '');
        const currentSlides = await window.Store.get('slides') || [];
        const filtered = currentSlides.filter(s => s.name !== name);
        await window.Store.set('slides', filtered);
      } else {
        const links = await window.Store.get('mediaLinks') || [];
        await window.Store.set('mediaLinks', links.filter(l => l.id !== mediaId));
      }
      renderMediaPanel();
      if (bgMedia === null) renderSlides();
    };

    const clickHandler = (e) => {
      const delBtn = e.target.closest('[data-action="delete-media-item"]');
      if (delBtn) {
        e.stopPropagation();
        deleteMediaItem(delBtn.dataset.mediaId);
        return;
      }

      const action = e.target.closest('[data-action]');
      if (action) {
        const act = action.dataset.action;
        if (act === 'prev') goTo(index - 1);
        if (act === 'next') goTo(index + 1);
        if (act === 'auto') setAuto(!autoOn);
        if (act === 'exit') {
          if (externalOpened) window.Present.close();
          externalOpened = false;
          if (screenStatus) screenStatus.textContent = 'Dual Screen Off';
        }
        if (act === 'toggle-present' || act === 'present-song') {
          toggleDualScreen();
        }
        if (act === 'edit-song') {
          self.openEdit(currentSong.id);
        }
        if (act === 'delete-song') {
          self.deleteSong(currentSong.id);
        }
        if (act === 'add-custom-bg') addCustomBg();
        if (act === 'font-dec') changeFontSize(-2);
        if (act === 'font-inc') changeFontSize(2);
        if (act === 'font-global-dec') changeGlobalFontSize(-2);
        if (act === 'font-global-inc') changeGlobalFontSize(2);
        if (act === 'edit-single-slide') {
          const editIdx = Number(action.dataset.editIndex);
          openEditSlideModal(editIdx);
          return;
        }
        if (act === 'repeat-slide') {
          const repIdx = Number(action.dataset.repeatIndex);
          repeatSlideIdx = (repeatSlideIdx === repIdx) ? -1 : repIdx;
          renderSlides();
          return;
        }
        if (act === 'pin-slide') {
          const pinIdx = Number(action.dataset.pinIndex);
          const existIdx = pinnedSlideIdxs.indexOf(pinIdx);
          if (existIdx > -1) {
            pinnedSlideIdxs.splice(existIdx, 1);
          } else {
            if (pinnedSlideIdxs.length >= 6) {
              alert('You can pin up to 6 slides maximum.');
              return;
            }
            pinnedSlideIdxs.push(pinIdx);
            pinnedSlideIdxs.sort((a, b) => a - b);
          }
          renderSlides();
          return;
        }
        return;
      }

      const slideRow = e.target.closest('[data-slide-index]');
      if (slideRow && !e.target.closest('[data-action="edit-single-slide"]') && !e.target.closest('[data-action="pin-slide"]') && !e.target.closest('[data-action="repeat-slide"]')) {
        if (repeatSlideIdx >= 0 && Number(slideRow.dataset.slideIndex) !== repeatSlideIdx) {
          repeatSlideIdx = -1;
        }
        goTo(Number(slideRow.dataset.slideIndex));
        return;
      }

      const mediaItem = e.target.closest('[data-media-id]');
      if (mediaItem && !e.target.closest('[data-action="delete-media-item"]')) {
        setBg(mediaItem.dataset.mediaId);
        return;
      }

      const songRow = e.target.closest('[data-song-id]');
      if (songRow) switchSong(songRow.dataset.songId);
    };

    const keyHandler = (e) => {
      // Stay silent while the operator has minimized this dashboard — the
      // audience screen keeps running, but these keys belong to whatever the
      // operator is doing in the control panel now.
      if (!window.Present.isPreviewActive()) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(index - 1); }
      if (e.key === 'Escape') {
        if (externalOpened) window.Present.close();
        externalOpened = false;
        if (screenStatus) screenStatus.textContent = 'Dual Screen Off';
      }
    };

    const changeHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'change-lyric-font') {
        self._fontFamily = action.value;
        window.Store.set('lyricsFontFamily', self._fontFamily);
        renderSlides();
        if (externalOpened) updateExternal().catch(() => {});
      }
    };

    const searchInput = document.getElementById('opSongSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderSongList(e.target.value);
      });
    }

    const newSongBtn = document.getElementById('opBtnNewSong');
    if (newSongBtn) {
      newSongBtn.addEventListener('click', () => self.openNew());
    }

    const importDocxBtn = document.getElementById('opBtnImportDocx');
    if (importDocxBtn) {
      importDocxBtn.addEventListener('click', () => self.importDocx());
    }

    body.addEventListener('click', clickHandler);
    body.addEventListener('change', changeHandler);
    document.addEventListener('keydown', keyHandler);
    
    document.getElementById('operatorCancelEditSlideBtn').addEventListener('click', closeEditSlideModal);
    document.getElementById('operatorSaveEditSlideBtn').addEventListener('click', saveEditSlide);

    renderAll();

    return () => {
      if (autoTimer) clearTimeout(autoTimer);
      body.removeEventListener('click', clickHandler);
      body.removeEventListener('change', changeHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  },


  _renderStage(body, song, settings) {
    const S = window.STRINGS.lyrics;
    const pages = this._toPages(song.slides, 2);
    const total = pages.length;

    body.innerHTML = `
      <div class="lyrics-stage" id="lyricsStage"></div>
      <div class="lyrics-controls" id="lyricsControls">
        <button class="lyrics-nav-btn" id="lyricsPrevBtn" title="${S.prev || ''}"><span class="icon">${window.ICONS.arrowLeft}</span></button>
        <button class="lyrics-auto-btn" id="lyricsAutoToggle"><span class="icon">${window.ICONS.play}</span><span id="lyricsAutoLabel">${S.autoAdvance}</span></button>
        <div class="lyrics-progress" id="lyricsProgress"></div>
        <button class="lyrics-nav-btn" id="lyricsNextBtn"><span class="icon">${window.ICONS.arrowRight}</span></button>
      </div>
    `;

    const stage = document.getElementById('lyricsStage');
    
    let index = 0;
    let autoTimer = null;
    let autoOn = false;
    let repeatStep = 0;
 
    const renderPage = () => {
      const lines = pages[index];
      const isPageEmpty = lines.join('').trim() === '';
      const size = (song.pageFontSizes && song.pageFontSizes[index] !== undefined) 
        ? song.pageFontSizes[index] 
        : (song.fontSize || 60);
 
      const div = document.createElement('div');
      div.className = 'lyrics-slide-text';
      div.style.fontSize = size + 'pt';

      if (isPageEmpty) {
        const animType = (window.Settings && window.Settings.data && window.Settings.data.lyricsIdleAnimation) || 'soundwave';
        div.innerHTML = this._buildIdleHtml(animType);
      } else {
        const wordCount = this._getSungWordCount(lines);
        const REVEAL_MS = Math.min(this._getSingingDurationMs(lines) * 0.72, 4200);
        const step = Math.min(REVEAL_MS / wordCount, 240);
        let w = 0;
        div.innerHTML = lines.map((line) => {
          const words = line.split(/\s+/).filter(Boolean).map((word) => {
            const active = Math.random() < 0.28 ? '#1f4497' : '#ed1c24';
            const delay = (w++ * step).toFixed(0);
            return `<span class="kw" style="--active:${active};--d:${delay}ms">${escapeHtml(word)}</span>`;
          }).join(' ');
          return `<span class="lyric-line">${words}</span>`;
        }).join('');
      }
 
      stage.innerHTML = '';
      stage.appendChild(div);

      const repeatCount = this._getRepeatCount(lines);
      document.getElementById('lyricsProgress').textContent = repeatCount > 1
        ? `${index + 1} / ${total} - ${repeatStep + 1} of ${repeatCount}x`
        : `${index + 1} / ${total}`;
    };

    const scheduleAuto = () => {
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = autoOn ? setTimeout(advanceAuto, this._getSingingDurationMs(pages[index])) : null;
    };

    const goNext = () => {
      index = (index + 1) % total;
      repeatStep = 0;
      renderPage();
      scheduleAuto();
    };
    const goPrev = () => {
      index = (index - 1 + total) % total;
      repeatStep = 0;
      renderPage();
      scheduleAuto();
    };

    const advanceAuto = () => {
      const repeatCount = this._getRepeatCount(pages[index]);
      if (repeatStep < repeatCount - 1) {
        repeatStep += 1;
        renderPage();
        scheduleAuto();
        return;
      }
      goNext();
    };

    const setAuto = (on) => {
      autoOn = on;
      const btn = document.getElementById('lyricsAutoToggle');
      btn.classList.toggle('active', on);
      if (!on) repeatStep = 0;
      scheduleAuto();
      renderPage();
    };

    // Auto-hide controls after 3s of inactivity
    let hideTimer = null;
    const controls = document.getElementById('lyricsControls');
    const startHideTimer = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => controls.classList.remove('visible'), 3000);
    };
    const showControls = () => {
      controls.classList.add('visible');
      startHideTimer();
    };
    // Show on any mouse movement over the stage or controls
    stage.addEventListener('mousemove', showControls);
    controls.addEventListener('mousemove', showControls);
    // Also show when entering the stage from outside
    stage.addEventListener('mouseenter', showControls);
    // Hide when mouse leaves the entire overlay
    const overlay = document.getElementById('presentOverlay');
    overlay.addEventListener('mouseleave', () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => controls.classList.remove('visible'), 1500);
    });
    // Initial show then auto-hide after first display
    showControls();

    document.getElementById('lyricsNextBtn').addEventListener('click', goNext);
    document.getElementById('lyricsPrevBtn').addEventListener('click', goPrev);
    document.getElementById('lyricsAutoToggle').addEventListener('click', () => setAuto(!autoOn));

    const keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
    };
    document.addEventListener('keydown', keyHandler);

    renderPage();

    return () => {
      if (autoTimer) clearTimeout(autoTimer);
      document.removeEventListener('keydown', keyHandler);
    };
  }
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
