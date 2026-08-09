// Bible / scripture display. Uses an operator screen in the main window and a
// clean presenter screen on the external display, mirroring the lyrics flow.
window.Bible = {
  _data: null,
  _loaded: false,
  _bibleFont: 'Noto Sans Ethiopic',
  _bibleFontSize: 46,

  // Pending selection (for operator view "Change" button workflow)
  _pendingBookIdx: 0,
  _pendingChapterIdx: 0,
  _pendingVerseIdx: null,
  _pendingRangeMode: false,
  _pendingRange: null,

  // Live selection (what's currently on the external display)
  _liveBookIdx: 0,
  _liveChapterIdx: 0,
  _liveVerseIdx: null,
  _liveRangeMode: false,
  _liveRange: null,

  _version: 'KJV',
  externalOpened: false,
  externalAutoOn: false,
  externalAutoTimer: null,
  _scrollSyncing: false,
  _testamentTab: 0, // 0 = Old Testament, 1 = New Testament

  _lastScrollSyncTime: 0,

  async init() {
    const settings = await window.Store.get('settings') || {};
    this._version = settings.bibleVersion || 'KJV';
    if (this._version !== 'KJV' && this._version !== 'NASV') {
      this._version = 'KJV';
    }
    this._bibleFont = settings.bibleFontFamily || 'Noto Sans Ethiopic';
    await this._ensureData();
    this.renderOperatorInline();

    // Bind global keydown handler
    document.addEventListener('keydown', (e) => this._handleKeydown(e));
  },

  async refresh() {
    this._loaded = false;
    await this._ensureData();
    this.renderOperatorInline();
  },

  async _ensureData() {
    if (this._loaded) return;
    this._loaded = true;
    const raw = await window.Store.loadBible(this._version);
    this._data = raw ? this._normalize(raw) : [];
    this._clampSelection();
  },

  _normalize(raw) {
    const books = Array.isArray(raw.books) ? raw.books : [];
    return books.map((b, i) => {
      const chapters = Array.isArray(b.chapters) ? b.chapters : [];
      return {
        name: String(b.name || b.book || b.title || ''),
        bookNum: b.bookNum !== undefined ? Number(b.bookNum) : (i + 1),
        chapters: chapters.map((c) => {
          let verses;
          if (Array.isArray(c.verses)) {
            const hasVerseNum = c.verses.some((v) => v && typeof v === 'object' && v.verse != null);
            if (hasVerseNum) {
              const maxVerse = c.verses.reduce((max, v) => Math.max(max, Number(v.verse) || 0), 0);
              verses = Array.from({ length: maxVerse }, () => '');
              for (const v of c.verses) {
                const num = Number(v.verse);
                if (num > 0 && num <= maxVerse) {
                  verses[num - 1] = String(v.text != null ? v.text : v.content || '');
                }
              }
            } else {
              verses = c.verses.map((v) => {
                if (typeof v === 'string') return v;
                return String(v.text != null ? v.text : v.content || '');
              });
            }
          } else if (c.verses && typeof c.verses === 'object') {
            verses = Object.keys(c.verses)
              .map((k) => Number(k))
              .filter((k) => k > 0)
              .sort((a, b) => a - b)
              .map((k) => String(c.verses[String(k)] || ''));
          } else {
            verses = [];
          }
          return { verses };
        })
      };
    }).filter((b) => b.name && b.chapters.length > 0);
  },

  _clampSelection() {
    if (!this._data || this._data.length === 0) {
      this._pendingBookIdx = 0; this._pendingChapterIdx = 0; this._pendingVerseIdx = null; this._pendingRange = null;
      this._liveBookIdx = 0; this._liveChapterIdx = 0; this._liveVerseIdx = null; this._liveRange = null;
      return;
    }
    this._pendingBookIdx = Math.min(Math.max(0, this._pendingBookIdx), this._data.length - 1);
    const book = this._data[this._pendingBookIdx];
    this._pendingChapterIdx = Math.min(Math.max(0, this._pendingChapterIdx), book.chapters.length - 1);
  },

  _splitTestaments() {
    const oldEnd = this._data.findIndex((b) => b.bookNum >= 40);
    if (oldEnd === -1) {
      const allNew = this._data.every((b) => b.bookNum >= 40);
      if (allNew) {
        return { old: [], new: this._data };
      }
      return { old: this._data, new: [] };
    }
    return {
      old: this._data.slice(0, oldEnd),
      new: this._data.slice(oldEnd)
    };
  },

  _getPendingSelection() {
    const book = this._data[this._pendingBookIdx] || this._data[0];
    const chapterIdx = Math.min(this._pendingChapterIdx, book.chapters.length - 1);
    const chapter = book.chapters[chapterIdx];
    const ref = `${book.name} ${chapterIdx + 1}`;
    return { book, chapter, chapterIdx, ref };
  },

  _buildPendingExternalHtml() {
    const { book, chapter, chapterIdx, ref } = this._getPendingSelection();
    const hasRange = this._pendingRangeMode && this._pendingRange && this._pendingRange.end !== null;
    const singleSel = !this._pendingRangeMode && this._pendingVerseIdx !== null;
    const rangeStart = hasRange ? this._pendingRange.start : (singleSel ? this._pendingVerseIdx : null);
    const rangeEnd = hasRange ? this._pendingRange.end : rangeStart;

    const refLabel = rangeStart === null
      ? escapeHtml(ref)
      : `${escapeHtml(ref)}${rangeEnd > rangeStart ? `: ${rangeStart + 1}-${rangeEnd + 1}` : `: ${rangeStart + 1}`}`;

    const refHtml = `
      <div class="bible-ref-wrapper">
        <div class="bible-ref" style="display:inline-flex; align-items:center;">
          <span class="icon" style="margin-right: 12px; display: inline-flex; align-items: center; width: 1.2em; height: 1.2em;">${window.ICONS.book || ''}</span>
          ${refLabel}
        </div>
      </div>
    `;

    if (rangeStart === null) {
      return `
        <div class="bible-stage-wrapper">
          ${refHtml}
          <div class="bible-stage"></div>
        </div>
      `;
    }

    const selectedVerses = chapter.verses.slice(rangeStart, rangeEnd + 1);
    const selectedNums = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i + 1);
    const verseHtml = selectedVerses.map((text, i) => {
      const num = selectedNums[i];
      return `<div class="external-verse-block"><span class="bible-external-verse-num">${num}</span><span class="external-verse-text">${escapeHtml(text)}</span></div>`;
    }).join('');

    return `
      <div class="bible-stage-wrapper">
        ${refHtml}
        <div class="bible-stage">
          <div class="bible-verse-text">${verseHtml}</div>
        </div>
      </div>
    `;
  },

  _buildLiveExternalHtml() {
    const book = this._data[this._liveBookIdx] || this._data[0];
    const chapterIdx = Math.min(this._liveChapterIdx, book.chapters.length - 1);
    const chapter = book.chapters[chapterIdx];
    const ref = `${book.name} ${chapterIdx + 1}`;
    const hasRange = this._liveRangeMode && this._liveRange && this._liveRange.end !== null;
    const singleSel = !this._liveRangeMode && this._liveVerseIdx !== null;
    const rangeStart = hasRange ? this._liveRange.start : (singleSel ? this._liveVerseIdx : null);
    const rangeEnd = hasRange ? this._liveRange.end : rangeStart;

    const refLabel = rangeStart === null
      ? escapeHtml(ref)
      : `${escapeHtml(ref)}${rangeEnd > rangeStart ? `: ${rangeStart + 1}-${rangeEnd + 1}` : `: ${rangeStart + 1}`}`;

    const refHtml = `
      <div class="bible-ref-wrapper">
        <div class="bible-ref" style="display:inline-flex; align-items:center;">
          <span class="icon" style="margin-right: 12px; display: inline-flex; align-items: center; width: 1.2em; height: 1.2em;">${window.ICONS.book || ''}</span>
          ${refLabel}
        </div>
      </div>
    `;

    if (rangeStart === null) {
      return `
        <div class="bible-stage-wrapper">
          ${refHtml}
          <div class="bible-stage"></div>
        </div>
      `;
    }

    const selectedVerses = chapter.verses.slice(rangeStart, rangeEnd + 1);
    const selectedNums = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i + 1);
    const verseHtml = selectedVerses.map((text, i) => {
      const num = selectedNums[i];
      return `<div class="external-verse-block"><span class="bible-external-verse-num">${num}</span><span class="external-verse-text">${escapeHtml(text)}</span></div>`;
    }).join('');

    return `
      <div class="bible-stage-wrapper">
        ${refHtml}
        <div class="bible-stage">
          <div class="bible-verse-text">${verseHtml}</div>
        </div>
      </div>
    `;
  },

  _commitPendingToLive() {
    this._liveBookIdx = this._pendingBookIdx;
    this._liveChapterIdx = this._pendingChapterIdx;
    this._liveVerseIdx = this._pendingVerseIdx;
    this._liveRangeMode = this._pendingRangeMode;
    this._liveRange = this._pendingRange ? { ...this._pendingRange } : null;
  },

  _handleKeydown(e) {
    const view = document.getElementById('view-bible');
    if (!view || !view.classList.contains('active')) return;

    if (!this._data || this._data.length === 0) return;

    const livePreviewEl = document.getElementById('bibleLivePreview');
    if (!livePreviewEl) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      if (this.externalAutoOn) this.setAuto(false);
      livePreviewEl.scrollBy({ top: livePreviewEl.clientHeight * 0.85, behavior: 'smooth' });
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (this.externalAutoOn) this.setAuto(false);
      livePreviewEl.scrollBy({ top: -livePreviewEl.clientHeight * 0.85, behavior: 'smooth' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.changeSlide();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closePresentation();
    }
  },

  renderOperatorInline() {
    const container = document.getElementById('bibleOperatorContainer');
    if (!container) return;

    const self = this;
    const S = window.STRINGS.bible;

    if (!this._data || this._data.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px; text-align:center;">
          <span class="icon" style="font-size:2.4rem;color:var(--color-text-muted);">${window.ICONS.book}</span>
          <p style="margin-top:14px;font-weight:600;">Bible files were not found.</p>
          <p class="form-hint" style="max-width:560px;margin:10px auto 0;line-height:1.7;">Please check version dropdown settings or verify data folders.</p>
        </div>
      `;
      return;
    }

    const testaments = this._splitTestaments();

    const renderBookButton = (b, actualIndex, displayIndex) => {
      const isActiveBook = self._pendingBookIdx === actualIndex;
      return `<button class="bible-book-row ${isActiveBook ? 'active' : ''}" data-book-index="${actualIndex}"><span class="book-num">${displayIndex + 1}</span><span class="book-name">${escapeHtml(b.name)}</span></button>`;
    };

    container.innerHTML = `
      <div class="soc-op-view">
        <div class="soc-op-main" style="padding-top:0; grid-template-columns: 1fr 1fr;">
          
          <!-- LEFT: Previews and Controls -->
          <div class="soc-op-preview-area" style="padding:16px 20px; gap:12px;">
            
            <!-- Side-by-side Live and Pending -->
            <div class="soc-op-preview-row" style="gap:12px; width: 100%; flex-shrink: 0;">
              
              <!-- LIVE Preview Card -->
              <div class="soc-op-preview-card ${this.externalOpened ? 'soc-op-live-card' : ''}" style="flex:1; display:flex; flex-direction:column; border-radius:14px; min-width: 0;">
                <div class="soc-op-preview-header" style="padding:6px 12px;">
                  <div class="soc-op-preview-label" style="font-size:10px;">
                    <span class="soc-op-dot ${this.externalOpened ? 'soc-op-dot-live' : ''}" style="background:${this.externalOpened ? '#ed1c24' : '#5c6a8a'};"></span>
                    Presented Screen (Live)
                  </div>
                  <div class="soc-op-preview-timer" style="font-size:10px; font-weight:800; color:${this.externalOpened ? '#ed1c24' : '#5c6a8a'};">${this.externalOpened ? 'LIVE' : 'IDLE'}</div>
                </div>
                <div class="soc-op-desktop-wrap" style="background:#fff; position:relative; aspect-ratio:16/9; width: 100%; flex: none; height: auto; border-bottom:1px solid #dde3ef; overflow-y:auto; box-sizing:border-box; margin: 0 auto;" id="bibleLivePreview">
                  <!-- Live Content -->
                </div>
              </div>

              <!-- PENDING Preview Card -->
              <div class="soc-op-preview-card" style="flex:1; display:flex; flex-direction:column; border-radius:14px; min-width: 0;">
                <div class="soc-op-preview-header" style="padding:6px 12px; background:#fff3cd; border-bottom-color:#ffeeba;">
                  <div class="soc-op-preview-label" style="color:#856404; font-size:10px;">
                    <span class="soc-op-dot soc-op-dot-next" style="background:#f59e0b;"></span>
                    Pending Slide
                  </div>
                  <div class="soc-op-preview-timer" style="color:#856404; font-size:10px; font-weight:800;">NEXT</div>
                </div>
                <div class="soc-op-desktop-wrap" style="background:#fff; position:relative; aspect-ratio:16/9; width: 100%; flex: none; height: auto; border-bottom:1px solid #dde3ef; overflow-y:auto; box-sizing:border-box; margin: 0 auto;" id="biblePendingPreview">
                  <!-- Pending Content -->
                </div>
              </div>

            </div><!-- /preview-row -->

            <!-- Interactive Controller bar below previews -->
            <div style="background:rgba(31,68,151,0.04); border:1px solid rgba(31,68,151,0.08); border-radius:12px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0;">
              <div style="display:flex; gap:8px; align-items:center;">
                <button class="op-btn-toggle op-btn-sm ${this.externalAutoOn ? 'active' : ''}" id="bibleAutoBtn">
                  <span class="icon">${this.externalAutoOn ? window.ICONS.pause : window.ICONS.play}</span>
                  <span class="auto-scroll-label">Auto Scroll: ${this.externalAutoOn ? 'On' : 'Off'}</span>
                </button>
                <input type="number" id="bibleAutoSpeed" class="op-speed-input" value="1" min="1" max="10" title="Auto scroll speed (1 = slowest)">
                <span class="op-speed-unit">sec</span>
                <div style="display:flex; gap:4px;">
                  <button id="biblePrevBtn" class="op-btn-nav op-btn-sm" title="Scroll Up (ArrowLeft)">
                    <span class="icon">${window.ICONS.arrowLeft}</span>
                  </button>
                  <button id="bibleNextBtn" class="op-btn-nav op-btn-sm" title="Scroll Down (ArrowRight)">
                    <span class="icon">${window.ICONS.arrowRight}</span>
                  </button>
                </div>
              </div>
              
              <button id="bibleChangeBtn" class="op-btn-present" title="Present Pending verses (Enter)">
                <span class="icon">${window.ICONS.play}</span> Change / Present
              </button>
            </div>

            <!-- Close presentation action button -->
            <button id="bibleCloseBtn" class="op-btn-stop op-btn-block" style="flex-shrink:0;">
              <span class="icon">${window.ICONS.close}</span> Close Presentation / Exit
            </button>

            <div class="bible-panel-chapters-section" id="biblePanelChapters" style="border:1px solid #dde3ef; border-radius:10px; margin-top:8px; background:#fff; display:flex; flex-direction:column; overflow:visible;">
              <!-- Chapters and Verses render dynamically here -->
            </div>

          </div><!-- /preview-area -->

          <!-- RIGHT: Sidebar (Books, Chapters, Verses) -->
          <div class="soc-op-sidebar" style="padding:10px 12px; gap:10px; display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;">
            
            <!-- Screen Status Message & Version Select Row - like kebena_mkc_display panel-header -->
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:8px; flex-shrink:0; padding:10px 14px; background:var(--color-surface); border-radius:var(--radius-sm); box-shadow:var(--shadow-sm); border:1px solid var(--color-border);">
              <div style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--color-text-muted);">
                <span style="color:var(--color-primary); display:inline-flex;">${window.ICONS.monitor || '🖥'}</span>
                <span id="bibleScreenStatus">Detecting Screen...</span>
              </div>
              <div style="display:flex; gap:6px; align-items:center;">
                <select id="bibleVersionSelect" style="padding:6px 10px; font-size:11px; font-weight:500; border-radius:6px; border:1.5px solid var(--color-border); background:var(--color-surface); color:var(--color-text); cursor:pointer; outline:none; min-width:100px;">
                  <option value="KJV">KJV</option>
                  <option value="NASV">NASV</option>
                </select>
                <select id="bibleFontSelect" style="padding:6px 10px; font-size:11px; font-weight:500; border-radius:6px; border:1.5px solid var(--color-border); background:var(--color-surface); color:var(--color-text); cursor:pointer; outline:none; min-width:100px;">
                  ${window.FONTS.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- OT/NT Tabbed Book list selector - like kebena_mkc_display dispenser -->
            <div class="bible-book-panel" style="flex:1; display:flex; flex-direction:column; min-height:0; border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-surface); box-shadow:var(--shadow-sm); overflow:hidden;">
              <div class="bible-book-panel-title" style="padding:10px 14px; font-size:11px; color:var(--color-text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.8px; flex-shrink:0; border-bottom:1px solid var(--color-border); background:linear-gradient(to right, var(--color-surface), var(--color-bg));">${S.book} <span style="font-weight:400;color:#a0afc5;text-transform:none;letter-spacing:0;">/ Book</span></div>
              <!-- Tab bar -->
              <div style="display:flex; gap:6px; padding:10px 14px 6px; flex-shrink:0;">
                <button id="bibleTabOT" class="bible-tab-btn ${this._testamentTab === 0 ? 'active' : ''}" data-tab="0" style="flex:1; padding:8px 10px; font-size:11px; font-weight:600; border-radius:6px; border:1px solid var(--color-border); cursor:pointer; background:${this._testamentTab === 0 ? '#ed1c24' : 'var(--color-surface)'}; color:${this._testamentTab === 0 ? '#fff' : 'var(--color-text)'}; transition:all 0.15s; text-align:center;">${S.oldTestament}</button>
                <button id="bibleTabNT" class="bible-tab-btn ${this._testamentTab === 1 ? 'active' : ''}" data-tab="1" style="flex:1; padding:8px 10px; font-size:11px; font-weight:600; border-radius:6px; border:1px solid var(--color-border); cursor:pointer; background:${this._testamentTab === 1 ? '#ed1c24' : 'var(--color-surface)'}; color:${this._testamentTab === 1 ? '#fff' : 'var(--color-text)'}; transition:all 0.15s; text-align:center;">${S.newTestament}</button>
              </div>
              <div class="bible-book-panel-scroll" style="padding:6px 10px 10px; flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden;">
                <div class="bible-book-list-equal" id="bibleBookGrid" style="display:grid; gap:4px; flex:1; overflow-y:auto; align-content: start; grid-template-columns: ${this._testamentTab === 0 ? '1fr 1fr 1fr' : '1fr 1fr'};">
${this._testamentTab === 0 ? testaments.old.map((b, i) => renderBookButton(b, i, i)).join('') : testaments.new.map((b, i) => renderBookButton(b, testaments.old.length + i, i)).join('')}
                </div>
              </div>
            </div>

          </div><!-- /sidebar -->
        </div><!-- /main -->
      </div>
    `;

    const livePreviewEl = document.getElementById('bibleLivePreview');
    const pendingPreviewEl = document.getElementById('biblePendingPreview');
    const statusEl = document.getElementById('bibleScreenStatus');
    const changeBtn = document.getElementById('bibleChangeBtn');
    const autoBtn = document.getElementById('bibleAutoBtn');

    // Helper: render pending preview from state
    const renderPendingPreview = () => {
      const font = this._bibleFont || 'Noto Sans Ethiopic';
      pendingPreviewEl.style.fontFamily = `'${font}', sans-serif`;
      pendingPreviewEl.innerHTML = this._buildPendingExternalHtml();
    };

    // Helper: render live preview
    const renderLivePreview = () => {
      const font = this._bibleFont || 'Noto Sans Ethiopic';
      livePreviewEl.style.fontFamily = `'${font}', sans-serif`;
      livePreviewEl.innerHTML = this._buildLiveExternalHtml();
    };

    // Helper: rebuild chapters panel
    const rebuildChaptersPanel = () => {
      const panel = document.getElementById('biblePanelChapters');
      if (!panel) return;
      const pendingBook = this._data[this._pendingBookIdx];
      if (!pendingBook) { panel.innerHTML = ''; return; }
      const hasVerseSelection = this._pendingVerseIdx !== null || (this._pendingRangeMode && this._pendingRange);
      panel.innerHTML = `
        <div class="bible-section-label" style="padding: 6px 10px 2px; font-size:10px; font-weight:800; color:#7a89a8; flex-shrink:0;">${S.chapter} <span style="font-weight:400;color:#a0afc5;">/ Chapter</span></div>
        <div class="bible-chapter-grid-slim" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(40px, 1fr)); gap:5px; padding:4px 8px; flex-shrink:0; border-bottom:1px solid #f1f5f9;">
          ${pendingBook.chapters.map((c, i) => {
            const isMissing = !c || !c.verses || c.verses.length === 0 || c.verses.every(v => !v || !v.trim());
            const isActive = i === this._pendingChapterIdx;
            if (isMissing) {
              return `<button disabled class="bible-chapter-num-btn disabled" title="Chapter ${i + 1} is missing in JSON file" style="height:32px; font-size:12px; font-weight:700; border-radius:6px; border:1px dashed #cbd5e1; cursor:not-allowed; background:#f1f5f9; color:#94a3b8; opacity:0.4;">${i + 1}</button>`;
            }
            return `
              <button class="bible-chapter-num-btn ${isActive ? 'active' : ''}" data-chapter-index="${i}" style="height:32px; font-size:12px; font-weight:700; border-radius:6px; border:1px solid #dde3ef; cursor:pointer; background:${isActive ? '#ed1c24' : '#fff'}; color:${isActive ? '#fff' : '#16213e'}; transition:all 0.12s;">${i + 1}</button>
            `;
          }).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px 2px; border-top:1px solid #f1f5f9; margin-top:4px; flex-shrink:0;">
          <div class="bible-section-label" style="padding:0; font-size:10px; font-weight:800; color:#7a89a8;">${S.verses} <span style="font-weight:400;color:#a0afc5;">/ Verses</span></div>
          ${hasVerseSelection ? `<button data-action="clear-verse-sel" style="font-size:9.5px;padding:1px 6px;border-radius:4px;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.05);color:#ef4444;cursor:pointer; font-weight:700;">✕ Clear</button>` : ''}
        </div>
        <div class="bible-verse-grid-slim" id="biblePanelVerseGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(40px, 1fr)); gap:5px; padding:4px 8px; flex-shrink:0;">
          ${pendingBook.chapters[this._pendingChapterIdx] ? pendingBook.chapters[this._pendingChapterIdx].verses.map((vText, i) => {
            const isVerseMissing = !vText || !vText.trim();
            if (isVerseMissing) {
              return `<button disabled class="bible-chapter-num-btn disabled" title="Verse ${i + 1} is missing in JSON file" style="height:32px; font-size:12px; font-weight:700; border-radius:6px; border:1px dashed #cbd5e1; cursor:not-allowed; background:#f1f5f9; color:#94a3b8; opacity:0.4;">${i + 1}</button>`;
            }
            let cls = 'bible-chapter-num-btn';
            let isActive = false;
            if (this._pendingRangeMode && this._pendingRange && this._pendingRange.end !== null) {
              if (i >= this._pendingRange.start && i <= this._pendingRange.end) {
                cls += ' active';
                isActive = true;
              }
            } else if (this._pendingVerseIdx === i && !this._pendingRangeMode) {
              cls += ' active';
              isActive = true;
            }
            return `<button class="${cls}" data-verse-index="${i}" style="height:32px; font-size:12px; font-weight:700; border-radius:6px; border:1px solid #dde3ef; cursor:pointer; background:${isActive ? '#ed1c24' : '#fff'}; color:${isActive ? '#fff' : '#16213e'}; transition:all 0.12s;">${i + 1}</button>`;
          }).join('') : ''}
        </div>
      `;
      // Chapter click events
      panel.querySelectorAll('[data-chapter-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._pendingChapterIdx = Number(btn.dataset.chapterIndex);
          this._pendingVerseIdx = null;
          this._pendingRangeMode = false;
          this._pendingRange = null;
          renderPendingPreview();
          renderOperatorSidebar();
        });
      });
      // Verse click events
      panel.querySelectorAll('[data-verse-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.verseIndex);
          if (this._pendingVerseIdx === null) {
            this._pendingVerseIdx = idx;
            this._pendingRangeMode = false;
            this._pendingRange = null;
          } else if (this._pendingRangeMode && this._pendingRange && this._pendingRange.end !== null) {
            this._pendingVerseIdx = idx;
            this._pendingRangeMode = false;
            this._pendingRange = null;
          } else if (this._pendingVerseIdx === idx) {
            this._pendingVerseIdx = null;
            this._pendingRangeMode = false;
            this._pendingRange = null;
          } else {
            const start = Math.min(this._pendingVerseIdx, idx);
            const end = Math.max(this._pendingVerseIdx, idx);
            this._pendingRange = { start, end };
            this._pendingRangeMode = true;
          }
          renderPendingPreview();
          renderOperatorSidebar();
        });
      });
      // Clear verse selection button
      const clearBtn = panel.querySelector('[data-action="clear-verse-sel"]');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._pendingVerseIdx = null;
          this._pendingRangeMode = false;
          this._pendingRange = null;
          renderPendingPreview();
          renderOperatorSidebar();
        });
      }
    };

    // Render sidebar to reflect pending selection
    const renderOperatorSidebar = () => {
      document.querySelectorAll('.bible-book-row').forEach(row => {
        row.classList.toggle('active', Number(row.dataset.bookIndex) === this._pendingBookIdx);
      });
      rebuildChaptersPanel();
    };

    // Scroll sync — throttled to ~30fps max to avoid IPC flooding
    const syncScrollToExternal = () => {
      if (livePreviewEl) {
        const card = livePreviewEl.closest('.soc-op-preview-card');
        if (card) card.classList.toggle('has-scrolled', livePreviewEl.scrollTop > 30);
      }
      const now = Date.now();
      if (now - this._lastScrollSyncTime < 30) return;
      this._lastScrollSyncTime = now;
      const scrollRatio = livePreviewEl.scrollHeight > livePreviewEl.clientHeight
        ? livePreviewEl.scrollTop / (livePreviewEl.scrollHeight - livePreviewEl.clientHeight)
        : 0;
      if (this.externalOpened) {
        const _font = this._bibleFont || 'Noto Sans Ethiopic';
        // Send scrollOnly=true — avoids rebuilding DOM on the external screen
        window.Store.presentUpdate({ variant: 'bible', scrollRatio, fontFamily: _font, scrollOnly: true }).catch(() => { });
      }
    };

    // Auto-scroll
    const doAutoScroll = () => {
      if (!this.externalAutoOn) return;
      const speedInput = document.getElementById('bibleAutoSpeed');
      const speedVal = speedInput ? Math.max(1, parseInt(speedInput.value) || 1) : 1;
      const interval = Math.max(20, 500 - (speedVal - 1) * 55);
      const maxScroll = livePreviewEl.scrollHeight - livePreviewEl.clientHeight;
      if (livePreviewEl.scrollTop >= maxScroll) {
        setTimeout(() => {
          if (this.externalAutoOn) {
            livePreviewEl.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 2000);
        this.externalAutoTimer = setTimeout(doAutoScroll, 4000);
        return;
      }
      livePreviewEl.scrollTop += 1;
      syncScrollToExternal();
      this.externalAutoTimer = setTimeout(doAutoScroll, interval);
    };

    const setAuto = (on) => {
      this.externalAutoOn = on;
      autoBtn.classList.toggle('active', on);
      autoBtn.querySelector('.icon').innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      autoBtn.querySelector('.auto-scroll-label').textContent = 'Auto Scroll: ' + (on ? 'On' : 'Off');
      if (on) {
        if (livePreviewEl.scrollTop >= livePreviewEl.scrollHeight - livePreviewEl.clientHeight - 10) {
          livePreviewEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
        this.externalAutoTimer = setTimeout(doAutoScroll, 1000);
      } else if (this.externalAutoTimer) {
        clearTimeout(this.externalAutoTimer);
        this.externalAutoTimer = null;
      }
    };
    this.setAuto = setAuto;

    // Initial renders
    renderLivePreview();
    renderPendingPreview();
    rebuildChaptersPanel();

    // Hook up version selector dropdown
    const versionSelect = document.getElementById('bibleVersionSelect');
    if (versionSelect) {
      versionSelect.value = this._version;
      versionSelect.onchange = async (e) => {
        this._version = e.target.value;
        const settings = await window.Store.get('settings') || {};
        settings.bibleVersion = this._version;
        await window.Store.set('settings', settings);
        this._loaded = false;
        this._data = null;
        await this._ensureData();
        this._clampSelection();
        this.renderOperatorInline();
      };
    }

    // Hook up bible font selector
    const fontSelect = document.getElementById('bibleFontSelect');
    if (fontSelect) {
      fontSelect.value = this._bibleFont;
      fontSelect.onchange = async (e) => {
        this._bibleFont = e.target.value;
        const settings = await window.Store.get('settings') || {};
        settings.bibleFontFamily = this._bibleFont;
        await window.Store.set('settings', settings);
        // Refresh both preview cards so they show the new font immediately
        renderLivePreview();
        renderPendingPreview();
        if (this.externalOpened) {
          const html = this._buildLiveExternalHtml();
          await window.Store.presentUpdate({ html, variant: 'bible', fontFamily: this._bibleFont }).catch(() => { });
        }
      };
    }

    // Send to external
    const sendToExternal = async () => {
      const html = this._buildLiveExternalHtml();
      statusEl.textContent = 'Sending...';
      const _font = this._bibleFont || 'Noto Sans Ethiopic';
      const result = this.externalOpened
        ? await window.Store.presentUpdate({ html, variant: 'bible', fontFamily: _font })
        : await window.Store.presentOpen({ html, variant: 'bible', fontFamily: _font });
      this.externalOpened = Boolean(result && (result.opened || result.updated));
      statusEl.textContent = this.externalOpened ? 'Live' : 'No second screen';
    };

    // Commit change button
    changeBtn.onclick = () => {
      this._commitPendingToLive();
      renderLivePreview();
      sendToExternal().catch(() => { });
      livePreviewEl.scrollTop = 0;
      const card = livePreviewEl.closest('.soc-op-preview-card');
      if (card) card.classList.remove('has-scrolled');
    };

    // Scroll sync listener
    livePreviewEl.addEventListener('scroll', syncScrollToExternal);

    // Auto scroll button
    autoBtn.onclick = () => setAuto(!this.externalAutoOn);

    // Prev / Next manual scroll buttons
    document.getElementById('biblePrevBtn').onclick = () => {
      if (this.externalAutoOn) setAuto(false);
      const step = livePreviewEl.clientHeight * 0.85;
      livePreviewEl.scrollBy({ top: -step, behavior: 'smooth' });
      setTimeout(syncScrollToExternal, 400);
    };

    document.getElementById('bibleNextBtn').onclick = () => {
      if (this.externalAutoOn) setAuto(false);
      const step = livePreviewEl.clientHeight * 0.85;
      livePreviewEl.scrollBy({ top: step, behavior: 'smooth' });
      setTimeout(syncScrollToExternal, 400);
    };

    // Close Presentation button
    document.getElementById('bibleCloseBtn').onclick = () => this.closePresentation();

    // Book sidebar row click events
    container.querySelectorAll('.bible-book-row').forEach(row => {
      row.onclick = () => {
        this._pendingBookIdx = Number(row.dataset.bookIndex);
        this._pendingChapterIdx = 0;
        this._pendingVerseIdx = null;
        this._pendingRangeMode = false;
        this._pendingRange = null;
        renderPendingPreview();
        renderOperatorSidebar();
      };
    });

    // Testament tab click events
    const tabOT = document.getElementById('bibleTabOT');
    const tabNT = document.getElementById('bibleTabNT');
    if (tabOT) {
      tabOT.onclick = () => {
        this._testamentTab = 0;
        this.renderOperatorInline();
      };
    }
    if (tabNT) {
      tabNT.onclick = () => {
        this._testamentTab = 1;
        this.renderOperatorInline();
      };
    }
  },

  changeSlide() {
    this._commitPendingToLive();
    const livePreviewEl = document.getElementById('bibleLivePreview');
    if (livePreviewEl) {
      livePreviewEl.innerHTML = this._buildLiveExternalHtml();
      livePreviewEl.scrollTop = 0;
    }
    this.sendToExternal().catch(() => { });
  },

  async sendToExternal() {
    const html = this._buildLiveExternalHtml();
    const _font = window.AppState.fontFamily || 'Noto Sans Ethiopic';
    const result = this.externalOpened
      ? await window.Store.presentUpdate({ html, variant: 'bible', fontFamily: _font })
      : await window.Store.presentOpen({ html, variant: 'bible', fontFamily: _font });
    this.externalOpened = Boolean(result && (result.opened || result.updated));
    this.renderOperatorInline();
  },

  async closePresentation() {
    if (this.externalOpened) {
      await window.Store.presentClose();
      this.externalOpened = false;
      this._liveBookIdx = 0;
      this._liveChapterIdx = 0;
      this._liveVerseIdx = null;
      this._liveRange = null;
      this._pendingBookIdx = 0;
      this._pendingChapterIdx = 0;
      this._pendingVerseIdx = null;
      this._pendingRange = null;
      if (this.externalAutoTimer) {
        clearTimeout(this.externalAutoTimer);
        this.externalAutoTimer = null;
        this.externalAutoOn = false;
      }
      this.renderOperatorInline();
    }
  }
};
