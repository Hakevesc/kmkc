// Countdown timer manager — supports duration-based, target-time, and stopwatch modes.
// Renders a unified 3-column operator view matching Song Lyrics, Notices, and Bible Quotes.
window.Countdown = {
  presets: [],
  _currentIndex: 0,
  _bgMedia: null,
  _bgItems: [],
  _timer: null,
  _paused: false,
  _remaining: 0,
  _laps: [],
  _externalOpened: false,

  async init() {
    this.presets = await window.Store.get('countdownPresets') || [];
    this._externalOpened = false;
    this._currentIndex = 0;
    this._bgMedia = null;
    this._bgItems = [];
    this._paused = false;
    this._laps = [];
    this.renderOperatorView();
  },

  async refresh() {
    this.presets = await window.Store.get('countdownPresets') || [];
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

  formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  openForm(id) {
    const S = window.STRINGS;
    const preset = id ? this.presets.find((p) => p.id === id) : null;
    this._editingId = id;

    const html = `
      <h3>${preset ? S.common.edit : S.countdown.addPreset}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label>${S.countdown.titleLabel}</label>
          <input id="cdTitleInput" value="${escapeAttr(preset ? preset.title : '')}" />
        </div>
        <div class="form-row">
          <label>${S.countdown.modeLabel}</label>
          <select id="cdModeSelect">
            <option value="duration" ${(!preset || preset.mode === 'duration') ? 'selected' : ''}>${S.countdown.modeDuration}</option>
            <option value="target" ${(preset && preset.mode === 'target') ? 'selected' : ''}>${S.countdown.modeTarget}</option>
            <option value="stopwatch" ${(preset && preset.mode === 'stopwatch') ? 'selected' : ''}>Stopwatch (Count Up)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Display Style</label>
          <select id="cdStyleSelect">
            <option value="circle" ${(!preset || preset.style === 'circle') ? 'selected' : ''}>Circle Progress</option>
            <option value="flipClock" ${(preset && preset.style === 'flipClock') ? 'selected' : ''}>Flip Clock Cards</option>
          </select>
        </div>
        <div id="cdDurationFields" class="form-row-2col ${(preset && (preset.mode === 'target' || preset.mode === 'stopwatch')) ? 'hidden' : ''}">
          <div class="form-row">
            <label>${S.countdown.hoursLabel}</label>
            <input type="number" id="cdHoursInput" min="0" max="99" value="${preset ? (preset.hours || 0) : 0}" />
          </div>
          <div class="form-row">
            <label>${S.countdown.minutesLabel}</label>
            <input type="number" id="cdMinutesInput" min="0" max="59" value="${preset ? (preset.minutes || 0) : 5}" />
          </div>
          <div class="form-row">
            <label>${S.countdown.secondsLabel}</label>
            <input type="number" id="cdSecondsInput" min="0" max="59" value="${preset ? (preset.seconds || 0) : 0}" />
          </div>
        </div>
        <div id="cdTargetFields" class="form-row-2col ${(preset && preset.mode === 'target') ? '' : 'hidden'}">
          <div class="form-row">
            <label>${S.countdown.targetDateLabel}</label>
            <input type="date" id="cdTargetDate" value="${preset ? (preset.targetDate || '') : ''}" />
          </div>
          <div class="form-row">
            <label>${S.countdown.targetTimeLabel}</label>
            <input type="time" id="cdTargetTime" value="${preset ? (preset.targetTime || '') : ''}" />
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="cdCancelBtn">${S.common.cancel}</button>
        <button class="btn btn-primary" id="cdSaveBtn">${S.common.save}</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);
    document.getElementById('cdModeSelect').addEventListener('change', () => {
      const mode = document.getElementById('cdModeSelect').value;
      document.getElementById('cdDurationFields').classList.toggle('hidden', mode !== 'duration');
      document.getElementById('cdTargetFields').classList.toggle('hidden', mode !== 'target');
    });
    document.getElementById('cdCancelBtn').addEventListener('click', () => window.Modal.hide('modalOverlay'));
    document.getElementById('cdSaveBtn').addEventListener('click', () => this.savePreset());
  },

  async savePreset() {
    const title = document.getElementById('cdTitleInput').value.trim();
    const mode = document.getElementById('cdModeSelect').value;
    const style = document.getElementById('cdStyleSelect').value;
    const hours = Number(document.getElementById('cdHoursInput').value) || 0;
    const minutes = Number(document.getElementById('cdMinutesInput').value) || 0;
    const seconds = Number(document.getElementById('cdSecondsInput').value) || 0;
    const targetDate = document.getElementById('cdTargetDate').value;
    const targetTime = document.getElementById('cdTargetTime').value;

    if (this._editingId) {
      const p = this.presets.find((x) => x.id === this._editingId);
      if (p) Object.assign(p, { title, mode, style, hours, minutes, seconds, targetDate, targetTime });
    } else {
      this.presets.push({
        id: window.Store.newId(),
        title,
        mode,
        style,
        hours,
        minutes,
        seconds,
        targetDate,
        targetTime,
        createdAt: new Date().toISOString()
      });
      this._currentIndex = this.presets.length - 1;
    }
    await window.Store.set('countdownPresets', this.presets);
    window.Modal.hide('modalOverlay');
    this.renderOperatorView();
  },

  async deletePreset(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    this.presets = this.presets.filter((p) => p.id !== id);
    await window.Store.set('countdownPresets', this.presets);
    if (this._currentIndex >= this.presets.length) {
      this._currentIndex = Math.max(0, this.presets.length - 1);
    }
    this.renderOperatorView();
  },

  // ── Stage HTML Generators ──────────────────────────────────────────────────

  _buildCircleHtml(preset, remaining, totalSeconds, bgMedia) {
    const progress = totalSeconds > 0 ? remaining / totalSeconds : 1;
    const textColor = (progress < 0.1 && !bgMedia) ? '#ed1c24' : '#111111';
    const titleText = (remaining <= 0 && preset.mode !== 'stopwatch') ? window.STRINGS.countdown.completed : (preset.title || '');
    const titleColor = (remaining <= 0 && preset.mode !== 'stopwatch') ? '#ed1c24' : '';

    let ticks = '';
    const activeTicks = Math.ceil(progress * 60);
    for (let i = 0; i < 60; i++) {
      const angle = (i * 360) / 60;
      const isMajor = i % 5 === 0;
      const isActive = i < activeTicks;
      const strokeColor = isActive ? '#ed1c24' : (bgMedia ? 'rgba(255,255,255,0.3)' : '#e2e8f0');
      const strokeWidth = isMajor ? 2.5 : 1.2;
      const y1 = isMajor ? 8 : 12;
      ticks += `<line x1="100" y1="${y1}" x2="100" y2="20" transform="rotate(${angle} 100 100)" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
    }

    const C = window.STRINGS.calendar;
    const now = new Date();
    const ec = window.EthCal.gcToEc(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const ecMonthName = C.ethMonths[ec.month - 1];
    const localH = now.getHours();
    const ethH = (localH - 6 + 24) % 24;
    const period = (ethH < 12) ? 'AM' : 'PM';
    const displayH = (ethH % 12 === 0) ? 12 : ethH % 12;
    const ethTimeText = `${ecMonthName} ${ec.day}, ${ec.year} · ${displayH}:${String(now.getMinutes()).padStart(2, '0')} ${period}`;

    const hasBg = Boolean(bgMedia);
    let bgLayerHtml = '';
    if (hasBg) {
      const mediaSrc = this._getImageUrl(bgMedia.src);
      if (bgMedia.type === 'image') bgLayerHtml = `<div class="countdown-bg-layer"><img src="${escapeAttr(mediaSrc)}" /></div>`;
      else if (bgMedia.type === 'video') bgLayerHtml = `<div class="countdown-bg-layer"><video autoplay loop muted playsinline src="${escapeAttr(mediaSrc)}"></video></div>`;
      else if (bgMedia.type === 'youtube') {
        const vid = escapeAttr(bgMedia.videoId);
        bgLayerHtml = `<div class="countdown-bg-layer"><iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
      }
    }

    return `
      <div class="countdown-stage countdown-style-circle ${hasBg ? 'countdown-has-bg' : ''}" style="background:${hasBg ? 'transparent' : '#ffffff'}; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; position:relative; overflow:hidden;">
        ${bgLayerHtml}
        ${hasBg ? '<div class="countdown-bg-overlay"></div>' : ''}
        <div class="countdown-title" style="color: ${titleColor}; font-size: clamp(32px, 4vw, 56px); font-weight: 800; margin-bottom: 20px; line-height: 1.2; z-index:2;">${escapeHtml(titleText)}</div>
        <div class="countdown-display" style="position: relative; display: flex; align-items: center; justify-content: center; z-index:2;">
          <div class="countdown-digits" style="color: ${textColor}; font-size: clamp(30px, 4.5vw, 68px); font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: 1px;">${this.formatTime(remaining)}</div>
          <div class="countdown-progress-ring" style="width: clamp(320px, 40vw, 520px); height: clamp(320px, 40vw, 520px);">
            <svg viewBox="0 0 200 200" style="width: 100%; height: 100%;">
              ${ticks}
            </svg>
          </div>
        </div>
        <div class="countdown-eth-time" style="margin-top: 24px; font-size: clamp(24px, 3vw, 40px); font-weight: 700; color: var(--color-text-muted); z-index:2;">${escapeHtml(ethTimeText)}</div>
      </div>
    `;
  },

  _buildFlipCard(value, label) {
    const formattedVal = String(value).padStart(2, '0');
    return `
      <div class="flip-card-container" style="display: flex; flex-direction: column; align-items: center; margin: 0 15px;">
        <div class="flip-card" style="position: relative; width: clamp(100px, 15vw, 180px); height: clamp(120px, 18vw, 220px); background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center; overflow: hidden;">
          <div class="flip-card-digits" style="font-size: clamp(55px, 8vw, 110px); font-weight: 800; color: #0f172a; font-family: 'Inter', sans-serif; font-variant-numeric: tabular-nums;">${formattedVal}</div>
          <div class="flip-card-divider" style="position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: rgba(15, 23, 42, 0.08); box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);"></div>
          <div class="flip-card-hinge flip-card-hinge-left" style="position: absolute; left: -4px; top: calc(50% - 6px); width: 8px; height: 12px; background: #94a3b8; border-radius: 4px; border: 1.5px solid #cbd5e1; box-shadow: inset 1px 1px 2px rgba(255,255,255,0.6);"></div>
          <div class="flip-card-hinge flip-card-hinge-right" style="position: absolute; right: -4px; top: calc(50% - 6px); width: 8px; height: 12px; background: #94a3b8; border-radius: 4px; border: 1.5px solid #cbd5e1; box-shadow: inset -1px 1px 2px rgba(255,255,255,0.6);"></div>
        </div>
        <div class="flip-card-label" style="margin-top: 16px; font-size: clamp(12px, 1.5vw, 18px); font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">${label}</div>
      </div>
    `;
  },

  _buildFlipClockHtml(preset, remaining, bgMedia) {
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    const titleText = (remaining <= 0 && preset.mode !== 'stopwatch') ? window.STRINGS.countdown.completed : (preset.title || '');
    const titleColor = (remaining <= 0 && preset.mode !== 'stopwatch') ? '#ed1c24' : '';

    const cardsHtml = `
      ${this._buildFlipCard(h, 'HOURS')}
      ${this._buildFlipCard(m, 'MINUTES')}
      ${this._buildFlipCard(s, 'SECONDS')}
    `;

    const C = window.STRINGS.calendar;
    const now = new Date();
    const ec = window.EthCal.gcToEc(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const ecMonthName = C.ethMonths[ec.month - 1];
    const localH = now.getHours();
    const ethH = (localH - 6 + 24) % 24;
    const period = (ethH < 12) ? 'AM' : 'PM';
    const displayH = (ethH % 12 === 0) ? 12 : ethH % 12;
    const ethTimeText = `${ecMonthName} ${ec.day}, ${ec.year} · ${displayH}:${String(now.getMinutes()).padStart(2, '0')} ${period}`;

    const hasBg = Boolean(bgMedia);
    let bgLayerHtml = '';
    if (hasBg) {
      const mediaSrc = this._getImageUrl(bgMedia.src);
      if (bgMedia.type === 'image') bgLayerHtml = `<div class="countdown-bg-layer"><img src="${escapeAttr(mediaSrc)}" /></div>`;
      else if (bgMedia.type === 'video') bgLayerHtml = `<div class="countdown-bg-layer"><video autoplay loop muted playsinline src="${escapeAttr(mediaSrc)}"></video></div>`;
      else if (bgMedia.type === 'youtube') {
        const vid = escapeAttr(bgMedia.videoId);
        bgLayerHtml = `<div class="countdown-bg-layer"><iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
      }
    }

    return `
      <div class="countdown-stage countdown-style-flip ${hasBg ? 'countdown-has-bg' : ''}" style="background:${hasBg ? 'transparent' : '#ffffff'}; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; position:relative; overflow:hidden;">
        ${bgLayerHtml}
        ${hasBg ? '<div class="countdown-bg-overlay"></div>' : ''}
        <div class="countdown-title" style="color: ${titleColor}; font-size: clamp(32px, 4vw, 56px); font-weight: 800; margin-bottom: 30px; line-height: 1.2; z-index:2;">${escapeHtml(titleText)}</div>
        <div class="flip-clock-display" style="display: flex; align-items: center; justify-content: center; z-index:2;">
          ${cardsHtml}
        </div>
        <div class="countdown-eth-time" style="margin-top: 40px; font-size: clamp(24px, 3vw, 40px); font-weight: 700; color: var(--color-text-muted); z-index:2;">${escapeHtml(ethTimeText)}</div>
      </div>
    `;
  },

  _buildStopwatchHtml(preset, elapsed, laps, bgMedia) {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    let ticks = '';
    const activeSecond = s % 60;
    for (let i = 0; i < 60; i++) {
      const angle = (i * 360) / 60;
      const isMajor = i % 5 === 0;
      const isActive = i === activeSecond;
      const strokeColor = isActive ? '#ed1c24' : (isMajor ? (bgMedia ? '#ffffff' : '#475569') : (bgMedia ? 'rgba(255,255,255,0.4)' : '#cbd5e1'));
      const strokeWidth = isActive ? 3 : (isMajor ? 2 : 1);
      const y1 = isMajor ? 6 : 10;
      ticks += `<line x1="100" y1="${y1}" x2="100" y2="18" transform="rotate(${angle} 100 100)" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
    }

    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const currentTimeStr = now.toLocaleTimeString([], timeOptions);

    const lastLapText = laps && laps.length > 0
      ? `Last Lap: ${this.formatTime(laps[laps.length - 1])}`
      : `Time: ${currentTimeStr}`;

    const hasBg = Boolean(bgMedia);
    let bgLayerHtml = '';
    if (hasBg) {
      const mediaSrc = this._getImageUrl(bgMedia.src);
      if (bgMedia.type === 'image') bgLayerHtml = `<div class="countdown-bg-layer"><img src="${escapeAttr(mediaSrc)}" /></div>`;
      else if (bgMedia.type === 'video') bgLayerHtml = `<div class="countdown-bg-layer"><video autoplay loop muted playsinline src="${escapeAttr(mediaSrc)}"></video></div>`;
      else if (bgMedia.type === 'youtube') {
        const vid = escapeAttr(bgMedia.videoId);
        bgLayerHtml = `<div class="countdown-bg-layer"><iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
      }
    }

    return `
      <div class="countdown-stage stopwatch-stage ${hasBg ? 'countdown-has-bg' : ''}" style="background:${hasBg ? 'transparent' : '#f1f5f9'}; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; position:relative; overflow:hidden;">
        ${bgLayerHtml}
        ${hasBg ? '<div class="countdown-bg-overlay"></div>' : ''}
        <div class="countdown-title" style="color:${hasBg ? '#ffffff' : '#0f172a'}; font-size: clamp(32px, 4vw, 56px); font-weight: 800; margin-bottom: 20px; line-height: 1.2; z-index:2;">${escapeHtml(preset.title || 'STOPWATCH')}</div>
        <div class="stopwatch-dial" style="position: relative; display: flex; align-items: center; justify-content: center; width: clamp(320px, 40vw, 520px); height: clamp(320px, 40vw, 520px); background:${hasBg ? 'rgba(15, 23, 42, 0.85)' : '#ffffff'}; border: 10px solid ${hasBg ? 'rgba(255,255,255,0.2)' : '#e2e8f0'}; border-radius: 50%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); z-index:2;">
          <div class="stopwatch-center" style="display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2;">
            <div class="countdown-digits" style="position: static; color:${hasBg ? '#ffffff' : '#0f172a'}; font-size: clamp(26px, 4vw, 56px); font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: 1px;">${timeStr}</div>
            <div class="stopwatch-lap-hint" style="margin-top: 8px; font-size: clamp(10px, 1.4vw, 18px); font-weight: 700; color:#ef4444; letter-spacing: 1px; text-transform: uppercase;">${escapeHtml(lastLapText)}</div>
          </div>
          <svg viewBox="0 0 200 200" style="position: absolute; top:0; left:0; width: 100%; height: 100%; transform: rotate(0deg); z-index: 1;">
            ${ticks}
            <line x1="100" y1="100" x2="100" y2="22" transform="rotate(${activeSecond * 6} 100 100)" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="100" cy="100" r="5" fill="#ef4444" />
          </svg>
        </div>
      </div>
    `;
  },

  _buildStageHtml(preset, remaining, totalSeconds, laps, bgMedia) {
    if (!preset) {
      return '<div style="background:#111;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">No Preset Selected</div>';
    }
    if (preset.mode === 'stopwatch') {
      return this._buildStopwatchHtml(preset, remaining, laps || [], bgMedia);
    }
    if (preset.style === 'flipClock') {
      return this._buildFlipClockHtml(preset, remaining, bgMedia);
    }
    return this._buildCircleHtml(preset, remaining, totalSeconds, bgMedia);
  },

  // ── Operator View Implementation ───────────────────────────────────────────

  renderOperatorView() {
    const self = this;
    const container = document.getElementById('countdownOperatorContainer');
    if (!container) return;

    // Fallback default preset if list is empty
    if (self.presets.length === 0) {
      self.presets = [{
        id: 'default_5m',
        title: '5 Minute Timer',
        mode: 'duration',
        style: 'circle',
        hours: 0,
        minutes: 5,
        seconds: 0,
        createdAt: new Date().toISOString()
      }];
    }

    if (self._currentIndex >= self.presets.length) {
      self._currentIndex = 0;
    }

    const currentPreset = self.presets[self._currentIndex];

    // Compute total seconds
    let totalSeconds = 0;
    if (currentPreset.mode === 'duration') {
      totalSeconds = (currentPreset.hours || 0) * 3600 + (currentPreset.minutes || 0) * 60 + (currentPreset.seconds || 0);
    } else if (currentPreset.mode === 'target' && currentPreset.targetDate && currentPreset.targetTime) {
      const target = new Date(`${currentPreset.targetDate}T${currentPreset.targetTime}`);
      totalSeconds = Math.max(0, Math.floor((target - new Date()) / 1000));
    }
    if (totalSeconds <= 0 && currentPreset.mode !== 'stopwatch') totalSeconds = 1;

    self._remaining = (currentPreset.mode === 'stopwatch') ? 0 : totalSeconds;
    self._paused = false;

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
                  <div class="soc-op-preview-timer" style="font-size:10px; font-weight:800; color:#ed1c24;" id="cdLiveStatusBadge">LIVE</div>
                </div>
                <div class="stage-preview" id="cdPreviewScreen"></div>
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
                <div class="stage-preview" id="cdPendingScreen"></div>
              </div>
            </div>

            <!-- Background Media -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="operator-media-header" style="padding:10px 14px; font-size:0.88rem; font-weight:700; flex-shrink:0; border-bottom:1px solid var(--color-border);">
                <span class="icon" style="width:16px;height:16px;">${window.ICONS.play}</span>
                Background Media
              </div>
              <div class="operator-media-list" id="cdMediaList" style="flex:1; overflow-y:auto; padding:8px;">
                <div class="operator-media-loading">Loading…</div>
              </div>
            </div>
          </div>

          <!-- MIDDLE COLUMN: Countdown Presets Navigator -->
          <div style="display:flex; flex-direction:column; border-right:1.5px solid var(--color-border); overflow:hidden;">
            <div style="padding:10px 14px; background:var(--color-surface); border-bottom:1px solid var(--color-border); flex-shrink:0;">
              <span style="font-size:0.88rem; font-weight:700; color:var(--color-text-muted);">Presets Navigator</span>
            </div>
            <div class="operator-slide-list" id="cdSlideList" style="flex:1; overflow-y:auto; padding:12px;"></div>
          </div>

          <!-- RIGHT COLUMN: Controls -->
          <div style="display:flex; flex-direction:column; overflow:hidden; background:var(--color-surface);">

            <!-- TOP CONTROLS CARD -->
            <div style="padding:14px; border-bottom:2px solid var(--color-border); display:flex; flex-direction:column; gap:10px; flex-shrink:0; background:var(--color-bg);">

              <!-- Navigation + Play/Pause/Reset -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:var(--color-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border);">
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="operator-icon-btn" data-action="prev" title="Previous" style="height:34px; width:36px;"><span class="icon">${window.ICONS.arrowLeft}</span></button>
                  <button class="operator-icon-btn" data-action="next" title="Next" style="height:34px; width:36px;"><span class="icon">${window.ICONS.arrowRight}</span></button>
                  <button class="btn btn-accent" data-action="toggle-pause" id="cdPauseBtn" style="height:34px; padding:0 12px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:4px;">
                    <span class="icon" id="cdPauseIcon" style="width:14px;height:14px;">${window.ICONS.pause}</span>
                    <span id="cdPauseLabel">Pause</span>
                  </button>
                  <button class="operator-icon-btn" data-action="reset" title="Reset Timer" style="height:34px; width:36px;"><span class="icon">${window.ICONS.close}</span></button>
                </div>
                <div class="operator-progress" id="cdProgress" style="font-size:0.95rem; font-weight:800; color:var(--color-primary);">00:00:00</div>
              </div>

              <!-- Active Preset Title -->
              <div style="background:var(--color-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--color-border);">
                <span style="font-size:0.75rem; font-weight:700; color:var(--color-text-muted);">Active Preset:</span>
                <div id="cdActiveTitle" style="font-size:0.85rem; font-weight:700; color:var(--color-text); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
              </div>

              <!-- Stopwatch Lap Controls (if stopwatch) -->
              <div id="cdStopwatchControls" style="display:${currentPreset.mode === 'stopwatch' ? 'flex' : 'none'}; gap:8px;">
                <button class="btn btn-ghost" data-action="lap" style="flex:1; height:36px; font-size:12px; font-weight:700; border:1.5px solid var(--color-border);">
                  ⏱ Lap
                </button>
                <button class="btn btn-ghost" data-action="clear-laps" style="height:36px; padding:0 10px; font-size:12px; font-weight:700; color:var(--color-text-muted);">
                  Clear Laps
                </button>
              </div>

              <!-- Present & Exit Buttons -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <button data-action="toggle-present" id="cdTogglePresentBtn" class="op-btn-present op-btn-block" title="Present to second screen">
                  <span class="icon">${window.ICONS.play}</span> Present
                </button>
                <button data-action="exit" class="op-btn-stop op-btn-block" title="Exit presentation">
                  <span class="icon">${window.ICONS.close}</span> Exit
                </button>
              </div>

            </div>

            <!-- BOTTOM: PRESETS PANEL -->
            <div style="flex:1; display:flex; flex-direction:column; min-height:0;">

              <!-- Panel Header -->
              <div class="operator-media-header" style="justify-content:space-between; padding:10px 14px; font-size:0.9rem; font-weight:700; flex-shrink:0; background:var(--color-bg); border-bottom:1px solid var(--color-border);">
                <span>⏱ COUNTDOWN PRESETS</span>
                <span id="cdCountBadge" style="font-size:0.8rem; background:var(--color-surface); padding:2px 8px; border-radius:12px; color:var(--color-text-muted); border:1px solid var(--color-border);">${self.presets.length} Presets</span>
              </div>

              <!-- + New Preset Button -->
              <div style="padding:8px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <button class="btn btn-ghost" data-action="add-preset" style="width:100%; border:1.5px solid var(--color-primary); color:var(--color-primary); font-weight:700; height:38px; font-size:13px; border-radius:6px;">
                  + New Preset
                </button>
              </div>

              <!-- Style & Mode Controls for selected preset -->
              <div style="padding:10px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <div style="display:flex; flex-direction:column; gap:8px; background:var(--color-surface); padding:10px; border-radius:8px; border:1px solid var(--color-border);">

                  <!-- Display Style Picker -->
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-muted);">Style:</span>
                    <select id="cdStyleSelectOp" class="operator-font-select" data-action="change-style" style="height:32px; padding:0 8px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); font-weight:600; font-size:12px;">
                      <option value="circle">Circle Progress</option>
                      <option value="flipClock">Flip Clock Cards</option>
                    </select>
                  </div>

                  <!-- Mode Picker -->
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--color-text-muted);">Mode:</span>
                    <select id="cdModeSelectOp" class="operator-font-select" data-action="change-mode" style="height:32px; padding:0 8px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text); font-weight:600; font-size:12px;">
                      <option value="duration">Duration (Countdown)</option>
                      <option value="target">Target Time</option>
                      <option value="stopwatch">Stopwatch (Count Up)</option>
                    </select>
                  </div>

                </div>
              </div>

              <!-- Edit & Delete buttons for selected preset -->
              <div style="display:flex; gap:8px; padding:8px 12px; background:var(--color-bg); border-bottom:1px solid var(--color-border); flex-shrink:0;">
                <button class="btn btn-ghost" data-action="edit-preset" style="flex:1; height:40px; font-size:13px; font-weight:700; border:1px solid var(--color-border); background:var(--color-surface); border-radius:6px;" title="Edit selected preset">
                  ✏ Edit
                </button>
                <button class="btn btn-danger" data-action="delete-preset" style="flex:1; height:40px; font-size:13px; font-weight:700; background:#dc2626; border-color:#dc2626; color:#fff; border-radius:6px;" title="Delete selected preset">
                  🗑 Delete
                </button>
              </div>

              <!-- Scrollable Presets & Laps List -->
              <div id="cdPresetListContainer" style="flex:1; overflow-y:auto; padding:8px;"></div>
            </div>

          </div>
        </div>

      </div>
    `;

    // ── DOM References ──────────────────────────────────────────────────────
    const previewScreen  = document.getElementById('cdPreviewScreen');
    const pendingScreen  = document.getElementById('cdPendingScreen');
    const progressEl     = document.getElementById('cdProgress');
    const activeTitleEl  = document.getElementById('cdActiveTitle');
    const slideList      = document.getElementById('cdSlideList');
    const mediaList      = document.getElementById('cdMediaList');
    const styleSelectOp  = document.getElementById('cdStyleSelectOp');
    const modeSelectOp   = document.getElementById('cdModeSelectOp');
    const pauseBtn       = document.getElementById('cdPauseBtn');
    const pauseIcon      = document.getElementById('cdPauseIcon');
    const pauseLabel     = document.getElementById('cdPauseLabel');

    // ── Render Presented & Pending Screens ──────────────────────────────────
    self._renderCurrent = () => {
      const p = self.presets[self._currentIndex];
      if (!p) return;

      if (progressEl) progressEl.textContent = self.formatTime(self._remaining);
      if (activeTitleEl) activeTitleEl.textContent = p.title || 'Timer';
      if (styleSelectOp) styleSelectOp.value = p.style || 'circle';
      if (modeSelectOp) modeSelectOp.value = p.mode || 'duration';

      // Live presented screen — the exact markup that goes to the audience,
      // laid out at 1920x1080 and scaled into the preview box.
      const liveHtml = self._buildStageHtml(p, self._remaining, totalSeconds, self._laps, self._bgMedia);
      window.Present.renderStagePreview(previewScreen, liveHtml, 'countdown');

      // Pending screen (shows next preset in list or reset target)
      if (pendingScreen) {
        const nextIdx = (self._currentIndex + 1) % self.presets.length;
        const nextP = self.presets[nextIdx] || p;
        let nextTotal = (nextP.hours || 0) * 3600 + (nextP.minutes || 0) * 60 + (nextP.seconds || 0);
        if (nextP.mode === 'stopwatch') nextTotal = 0;
        const pendingHtml = self._buildStageHtml(nextP, nextTotal, nextTotal || 1, [], self._bgMedia);
        window.Present.renderStagePreview(pendingScreen, pendingHtml, 'countdown');
      }
    };

    // ── Render Middle Column Preset Cards ──────────────────────────────────
    self._renderSlideList = () => {
      slideList.innerHTML = self.presets.map((p, i) => {
        const isSel = i === self._currentIndex;
        const styleLabel = p.style === 'flipClock' ? 'Flip Clock' : 'Circle Progress';
        const modeLabel = p.mode === 'target' ? 'Target' : (p.mode === 'stopwatch' ? 'Stopwatch' : 'Duration');
        const detail = p.mode === 'target'
          ? `${p.targetDate || ''} ${p.targetTime || ''}`
          : (p.mode === 'stopwatch' ? 'Count-up' : `${p.hours || 0}h ${p.minutes || 0}m ${p.seconds || 0}s`);

        return `
          <div class="operator-lyric-screen-btn ${isSel ? 'active' : ''}" data-action="goto-preset" data-index="${i}" style="cursor:pointer;">
            <div class="operator-lyric-screen-box">
              <span class="operator-lyric-screen-badge">${i + 1}</span>
              ${isSel ? '<div class="operator-lyric-screen-live" style="position:absolute; bottom:6px; left:6px; right:auto;">▶ LIVE</div>' : ''}
              <div class="operator-lyric-screen-text" style="font-size:0.7rem; line-height:1.4;">
                <div style="font-weight:700; margin-bottom:4px; color:var(--color-primary); font-size:0.65rem; text-transform:uppercase;">${escapeHtml(modeLabel)} · ${escapeHtml(styleLabel)}</div>
                <div style="font-weight:800; font-size:0.8rem; color:var(--color-text);">${escapeHtml(p.title || 'Timer')}</div>
                <div style="color:var(--color-text-muted); font-size:0.68rem; margin-top:4px;">${escapeHtml(detail)}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const activeEl = slideList.querySelector('.operator-lyric-screen-btn.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    // ── Render Right Column Preset List & Lap History ─────────────────────
    self._renderPresetListPanel = () => {
      const container = document.getElementById('cdPresetListContainer');
      if (!container) return;

      const p = self.presets[self._currentIndex];
      let lapsHtml = '';

      if (p && p.mode === 'stopwatch' && self._laps && self._laps.length > 0) {
        lapsHtml = `
          <div style="margin-bottom:10px; border:1px solid var(--color-border); border-radius:6px; overflow:hidden; background:var(--color-surface);">
            <div style="padding:6px 10px; background:var(--color-bg); font-weight:800; font-size:0.75rem; color:var(--color-primary); border-bottom:1px solid var(--color-border);">
              RECORDED LAPS (${self._laps.length})
            </div>
            <div style="max-height:120px; overflow-y:auto; padding:6px;">
              ${self._laps.map((l, idx) => `
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; padding:2px 4px; border-bottom:1px solid var(--color-border);">
                  <span>Lap #${idx + 1}</span>
                  <span style="font-weight:700; font-variant-numeric:tabular-nums;">${self.formatTime(l)}</span>
                </div>
              `).reverse().join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = lapsHtml + self.presets.map((pr, i) => {
        const isSel = i === self._currentIndex;
        return `
          <div data-action="goto-preset" data-index="${i}" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; margin-bottom:4px; border-radius:6px; border:1px solid ${isSel ? 'var(--color-primary)' : 'var(--color-border)'}; background:${isSel ? '#eef2fb' : 'var(--color-surface)'}; cursor:pointer;">
            <span style="font-size:0.85rem; font-weight:700; color:${isSel ? 'var(--color-primary)' : 'var(--color-text)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">
              ${escapeHtml(pr.title || 'Timer')}
            </span>
            <span style="font-size:0.7rem; color:${isSel ? 'var(--color-primary)' : 'var(--color-text-muted)'}; white-space:nowrap;">${pr.mode}</span>
          </div>
        `;
      }).join('');
    };

    // ── Update Badge Count ──────────────────────────────────────────────────
    self._updateBadge = () => {
      const badge = document.getElementById('cdCountBadge');
      if (badge) badge.textContent = `${self.presets.length} Presets`;
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
            <span class="operator-media-delete" data-action="delete-media-item" data-media-id="${item.id}" title="Remove">✕</span>
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
        self._bgItems.push({ id: 'slide_' + img.name, type: isVideo ? 'video' : 'image', label: img.name, src: img.src, thumb: isVideo ? null : self._getImageUrl(img.src) });
      });
      (mediaLinks || []).forEach((link) => {
        const vid = window.Media ? window.Media._extractVideoId(link.url) : null;
        if (vid) self._bgItems.push({ id: 'yt_' + link.id, type: 'youtube', label: link.title || link.url, videoId: vid, thumb: null });
      });
      renderMediaPanel();
    });

    // ── Set Background Media ────────────────────────────────────────────────
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
      if (self._externalOpened) sendToExternal().catch(() => {});
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
          newItems.push({ id: 'slide_' + img.name, type: isVideo ? 'video' : 'image', label: img.name, src: item.src, thumb: isVideo ? null : self._getImageUrl(item.src) });
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
      const p = self.presets[self._currentIndex];
      if (!p) return;
      const stageHtml = self._buildStageHtml(p, self._remaining, totalSeconds, self._laps, self._bgMedia);
      if (self._externalOpened) {
        const result = await window.Store.presentUpdate({ html: stageHtml, variant: 'countdown' });
        self._externalOpened = Boolean(result && (result.opened || result.updated));
      } else {
        const result = await window.Store.presentOpen({ html: stageHtml, variant: 'countdown' });
        self._externalOpened = Boolean(result && result.opened);
      }
      window.Present.setPresentButton(
        document.getElementById('cdTogglePresentBtn'), self._externalOpened);
    };

    // ── Timer Tick Loop ────────────────────────────────────────────────────
    const tick = () => {
      if (self._paused) return;
      const p = self.presets[self._currentIndex];
      if (!p) return;

      if (p.mode === 'stopwatch') {
        self._remaining++;
      } else {
        if (self._remaining <= 0) {
          self._remaining = 0;
          if (self._timer) { clearInterval(self._timer); self._timer = null; }
        } else {
          self._remaining--;
        }
      }

      self._renderCurrent();
      if (self._externalOpened) sendToExternal().catch(() => {});
    };

    if (self._timer) clearInterval(self._timer);
    self._timer = setInterval(tick, 1000);

    // ── Switch Active Preset ────────────────────────────────────────────────
    const goTo = (idx) => {
      if (self.presets.length === 0) return;
      if (self._timer) clearInterval(self._timer);
      self._currentIndex = ((idx % self.presets.length) + self.presets.length) % self.presets.length;

      const p = self.presets[self._currentIndex];
      totalSeconds = (p.mode === 'duration')
        ? (p.hours || 0) * 3600 + (p.minutes || 0) * 60 + (p.seconds || 0)
        : (p.mode === 'target' && p.targetDate && p.targetTime ? Math.max(0, Math.floor((new Date(`${p.targetDate}T${p.targetTime}`) - new Date()) / 1000)) : 1);

      self._remaining = (p.mode === 'stopwatch') ? 0 : (totalSeconds || 1);
      self._paused = false;
      self._laps = [];

      if (pauseIcon) pauseIcon.innerHTML = window.ICONS.pause;
      if (pauseLabel) pauseLabel.textContent = 'Pause';

      const swControls = document.getElementById('cdStopwatchControls');
      if (swControls) swControls.style.display = p.mode === 'stopwatch' ? 'flex' : 'none';

      self._renderCurrent();
      self._renderSlideList();
      self._renderPresetListPanel();

      if (self._externalOpened) sendToExternal().catch(() => {});
      self._timer = setInterval(tick, 1000);
    };

    // ── Reset Timer ────────────────────────────────────────────────────────
    const resetTimer = () => {
      if (self._timer) clearInterval(self._timer);
      const p = self.presets[self._currentIndex];
      if (p) {
        totalSeconds = (p.mode === 'duration')
          ? (p.hours || 0) * 3600 + (p.minutes || 0) * 60 + (p.seconds || 0)
          : (p.mode === 'target' && p.targetDate && p.targetTime ? Math.max(0, Math.floor((new Date(`${p.targetDate}T${p.targetTime}`) - new Date()) / 1000)) : 1);
        self._remaining = (p.mode === 'stopwatch') ? 0 : (totalSeconds || 1);
      } else {
        self._remaining = 0;
      }
      self._paused = false;
      self._laps = [];

      if (pauseIcon) pauseIcon.innerHTML = window.ICONS.pause;
      if (pauseLabel) pauseLabel.textContent = 'Pause';

      self._renderCurrent();
      self._renderPresetListPanel();
      if (self._externalOpened) sendToExternal().catch(() => {});
      self._timer = setInterval(tick, 1000);
    };

    // ── Event Handlers ──────────────────────────────────────────────────────
    const clickHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const act = action.dataset.action;

      if (act === 'prev') { goTo(self._currentIndex - 1); return; }
      if (act === 'next') { goTo(self._currentIndex + 1); return; }
      if (act === 'toggle-pause') {
        self._paused = !self._paused;
        if (pauseIcon) pauseIcon.innerHTML = self._paused ? window.ICONS.play : window.ICONS.pause;
        if (pauseLabel) pauseLabel.textContent = self._paused ? 'Resume' : 'Pause';
        return;
      }
      if (act === 'reset') { resetTimer(); return; }
      if (act === 'lap') {
        self._laps.push(self._remaining);
        self._renderPresetListPanel();
        if (self._externalOpened) sendToExternal().catch(() => {});
        return;
      }
      if (act === 'clear-laps') {
        self._laps = [];
        self._renderPresetListPanel();
        if (self._externalOpened) sendToExternal().catch(() => {});
        return;
      }
      if (act === 'toggle-present') {
        if (!self._externalOpened) sendToExternal().catch(() => {});
        else {
          window.Store.presentClose && window.Store.presentClose().catch(() => {});
          self._externalOpened = false;
          window.Present.setPresentButton(document.getElementById('cdTogglePresentBtn'), false);
        }
        return;
      }
      if (act === 'exit') {
        if (self._externalOpened) { window.Store.presentClose && window.Store.presentClose().catch(() => {}); self._externalOpened = false; }
        if (self._timer) { clearInterval(self._timer); self._timer = null; }
        return;
      }
      if (act === 'add-preset') { self.openForm(null); return; }
      if (act === 'edit-preset') { const p = self.presets[self._currentIndex]; if (p) self.openForm(p.id); return; }
      if (act === 'delete-preset') { const p = self.presets[self._currentIndex]; if (p) self.deletePreset(p.id); return; }
      if (act === 'goto-preset') { goTo(Number(action.dataset.index)); return; }
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
            const slides = await window.Store.get('slides') || [];
            await window.Store.set('slides', slides.filter(s => s.name !== delId.replace(/^slide_/, '')));
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
      if (action.dataset.action === 'change-style') {
        const p = self.presets[self._currentIndex];
        if (p) {
          p.style = action.value;
          window.Store.set('countdownPresets', self.presets);
          self._renderCurrent();
          self._renderSlideList();
          if (self._externalOpened) sendToExternal().catch(() => {});
        }
        return;
      }
      if (action.dataset.action === 'change-mode') {
        const p = self.presets[self._currentIndex];
        if (p) {
          p.mode = action.value;
          window.Store.set('countdownPresets', self.presets);
          resetTimer();
        }
        return;
      }
    };

    const keyHandler = (e) => {
      if (!document.getElementById('countdownOperatorContainer')) return;
      const modalVisible = document.getElementById('modalOverlay') && !document.getElementById('modalOverlay').classList.contains('hidden');
      if (modalVisible) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(self._currentIndex + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(self._currentIndex - 1); }
      if (e.key === ' ') { e.preventDefault(); self._paused = !self._paused; }
    };

    container.addEventListener('click', clickHandler);
    container.addEventListener('change', changeHandler);
    document.addEventListener('keydown', keyHandler);

    // ── Initial render ──────────────────────────────────────────────────────
    self._renderCurrent();
    self._renderSlideList();
    self._renderPresetListPanel();
    self._updateBadge();

    // Cleanup
    self._cdCleanup = () => {
      container.removeEventListener('click', clickHandler);
      container.removeEventListener('change', changeHandler);
      document.removeEventListener('keydown', keyHandler);
      if (self._timer) { clearInterval(self._timer); self._timer = null; }
    };
  }
};