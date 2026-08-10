window.Settings = {
  data: null,
  socialSlideDuration: 8,

  async init() {
    this.data = await window.Store.get('settings');
    this.socialSlideDuration = await window.Store.get('social_slide_duration_seconds') || 8;
    this.renderForm();
  },

  renderForm() {
    const S = window.STRINGS.settings;
    document.getElementById('settingsForm').innerHTML = `
      <div class="settings-cards">
        ${this._renderChurchSection(S)}
        ${this._renderLyricsSection(S)}
        ${this._renderNoticesSection(S)}
        ${this._renderSocialSection(S)}
        ${this._renderUpdateSection(S)}
      </div>
      <div class="settings-footer">
        <span class="settings-footer-hint">${S.footerHintEn || 'Changes apply to the next presentation.'}</span>
        <button class="btn btn-primary" id="settingsSaveBtn">${window.STRINGS.common.saveEn || window.STRINGS.common.save}</button>
      </div>
    `;

    document.getElementById('settingsSaveBtn').addEventListener('click', () => this.save());
    this._wireUpdateSection();
  },

  /* ---------- Section: Updates ---------- */
  _renderUpdateSection(S) {
    return `
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">Updates</h3>
          <p class="settings-section-desc">New versions are downloaded in the background and installed when you restart. Nothing is ever installed while the second screen is live.</p>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">Application version</span>
              <span class="settings-row-hint" id="setUpdateStatus">Checking...</span>
            </div>
            <div class="settings-row-control" style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="op-btn-toggle op-btn-sm" id="setUpdateCheckBtn">Check for Updates</button>
              <button type="button" class="op-btn-present" id="setUpdateInstallBtn" style="display:none;">
                <span class="icon">${window.ICONS.refresh}</span> Restart &amp; Install
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  _wireUpdateSection() {
    const statusEl = document.getElementById('setUpdateStatus');
    const checkBtn = document.getElementById('setUpdateCheckBtn');
    const installBtn = document.getElementById('setUpdateInstallBtn');
    if (!statusEl || !checkBtn) return;

    const render = (s) => {
      if (!s) return;
      const v = s.version ? ' (v' + s.version + ')' : '';
      const messages = {
        idle: 'Ready to check for updates.',
        checking: 'Checking for updates...',
        current: 'You are running the latest version.',
        available: 'Update found' + v + ' - downloading...',
        downloading: 'Downloading update' + v + '... ' + s.percent + '%',
        ready: 'Update' + v + ' is ready. Restart to install.',
        dev: s.error,
        error: 'Could not check for updates: ' + (s.error || 'unknown error')
      };
      statusEl.textContent = messages[s.status] || s.status;
      checkBtn.disabled = (s.status === 'checking' || s.status === 'downloading');
      installBtn.style.display = (s.status === 'ready') ? 'inline-flex' : 'none';
    };

    checkBtn.onclick = () => window.Store.updateCheck().then(render).catch(() => {});
    installBtn.onclick = async () => {
      const res = await window.Store.updateInstall().catch(() => null);
      if (res && !res.installed && res.reason === 'presenting') {
        statusEl.textContent = 'Close the presentation first - the second screen is still live.';
      }
    };

    // Progress arrives from the main process as the download runs.
    if (!window.Settings._updateBound) {
      window.Settings._updateBound = true;
      window.Store.onUpdateState(render);
    }
    window.Store.updateGetState().then(render).catch(() => {});
  },

  /* ---------- Section: Church ---------- */
  _renderChurchSection(S) {
    const d = this.data;
    return `
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">${S.sectionChurchEn || 'Church'}</h3>
          <p class="settings-section-desc">${S.sectionChurchDescEn || 'Identity shown across the app and on the display.'}</p>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.churchNameEn}</span>
              <span class="settings-row-hint">${S.churchNameHintEn || 'Appears in the header and presentation screen.'}</span>
            </div>
            <div class="settings-row-control">
              <input id="setChurchName" value="${escapeAttr(d.churchName)}" />
            </div>
          </div>
        </div>
      </section>
    `;
  },

  /* ---------- Section: Lyrics ---------- */
  _renderLyricsSection(S) {
    const d = this.data;
    return `
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">${S.sectionLyricsEn || 'Lyrics'}</h3>
          <p class="settings-section-desc">${S.sectionLyricsDescEn || 'How song lyrics appear on the display.'}</p>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.autoAdvanceSecondsEn}</span>
              <span class="settings-row-hint">${S.autoAdvanceHintEn || 'Seconds before the next verse is shown automatically.'}</span>
            </div>
            <div class="settings-row-control">
              <input type="number" min="2" max="120" id="setAutoAdvance" value="${d.autoAdvanceSeconds}" />
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.lyricsAnimationEn}</span>
              <span class="settings-row-hint">${S.lyricsAnimationHintEn || 'Transition style between verses.'}</span>
            </div>
            <div class="settings-row-control">
              <select id="setAnimation">
                <option value="fade" ${d.lyricsAnimation === 'fade' ? 'selected' : ''}>${S.fadeEn}</option>
                <option value="line" ${d.lyricsAnimation === 'line' ? 'selected' : ''}>${S.lineByLineEn}</option>
              </select>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.lyricsFontSizeEn}</span>
              <span class="settings-row-hint">${S.lyricsFontSizeHintEn || 'Base text size in points.'}</span>
            </div>
            <div class="settings-row-control">
              <input type="number" min="10" max="200" id="setLyricsFontSize" value="${d.lyricsFontSize || 46}" />
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.fontFamilyEn}</span>
              <span class="settings-row-hint">${S.fontFamilyHintEn || 'Default font for lyrics and notices.'}</span>
            </div>
            <div class="settings-row-control">
              <select id="setFontFamily">
                ${window.FONTS.map(f => `<option value="${f.value}" ${d.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.lyricsIdleAnimationEn}</span>
              <span class="settings-row-hint">${S.lyricsIdleHintEn || 'Background animation when no lyrics are showing.'}</span>
            </div>
            <div class="settings-row-control">
              <select id="setIdleAnim">
                <option value="soundwave"       ${d.lyricsIdleAnimation === 'soundwave'       ? 'selected' : ''}>${S.idleAnimSoundwaveEn}</option>
                <option value="circular-wave"   ${d.lyricsIdleAnimation === 'circular-wave'   ? 'selected' : ''}>${S.idleAnimCircularWaveEn}</option>
                <option value="glow-wave"       ${d.lyricsIdleAnimation === 'glow-wave'       ? 'selected' : ''}>${S.idleAnimGlowWaveEn}</option>
                <option value="pulse-cross"     ${d.lyricsIdleAnimation === 'pulse-cross'     ? 'selected' : ''}>${S.idleAnimPulseCrossEn}</option>
                <option value="floating-dots"   ${d.lyricsIdleAnimation === 'floating-dots'   ? 'selected' : ''}>${S.idleAnimFloatingDotsEn}</option>
                <option value="ripple"          ${d.lyricsIdleAnimation === 'ripple'          ? 'selected' : ''}>${S.idleAnimRippleEn}</option>
                <option value="breathing-glow"  ${d.lyricsIdleAnimation === 'breathing-glow'  ? 'selected' : ''}>${S.idleAnimBreathingGlowEn}</option>
                <option value="none"            ${d.lyricsIdleAnimation === 'none'            ? 'selected' : ''}>${S.idleAnimNoneEn}</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  /* ---------- Section: Notices ---------- */
  _renderNoticesSection(S) {
    const d = this.data;
    return `
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">${S.sectionNoticesEn || 'Notices'}</h3>
          <p class="settings-section-desc">${S.sectionNoticesDescEn || 'How announcements cycle on the display.'}</p>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.noticeRotateSecondsEn}</span>
              <span class="settings-row-hint">${S.noticeRotateHintEn || 'Seconds each notice group stays on screen.'}</span>
            </div>
            <div class="settings-row-control">
              <input type="number" min="3" max="120" id="setNoticeRotate" value="${d.noticeRotateSeconds}" />
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.noticesPerSlideEn}</span>
              <span class="settings-row-hint">${S.noticesPerSlideHintEn || 'Number of notices shown together per slide.'}</span>
            </div>
            <div class="settings-row-control">
              <input type="number" min="1" max="5" id="setNoticesPerSlide" value="${d.noticesPerSlide}" />
            </div>
          </div>
        </div>
      </section>
    `;
  },

  /* ---------- Section: Social Media ---------- */
  _renderSocialSection(S) {
    return `
      <section class="settings-section">
        <div class="settings-section-head">
          <h3 class="settings-section-title">${S.sectionSocialEn || 'Social Media'}</h3>
          <p class="settings-section-desc">${S.sectionSocialDescEn || 'Timing for social media slideshows.'}</p>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-label">
              <span class="settings-row-name">${S.slideDurationSecondsEn || 'Social media slide duration (seconds)'}</span>
              <span class="settings-row-hint">${S.slideDurationHintEn || 'Seconds each social post stays on screen.'}</span>
            </div>
            <div class="settings-row-control">
              <input type="number" min="2" max="120" id="setSocialSlideDuration" value="${this.socialSlideDuration}" />
            </div>
          </div>
        </div>
      </section>
    `;
  },

  async save() {
    const socialDur = Number(document.getElementById('setSocialSlideDuration').value) || 8;
    this.socialSlideDuration = socialDur;
    await window.Store.set('social_slide_duration_seconds', socialDur);

    this.data = {
      churchName: document.getElementById('setChurchName').value.trim() || this.data.churchName,
      autoAdvanceSeconds: Number(document.getElementById('setAutoAdvance').value) || 8,
      lyricsAnimation: document.getElementById('setAnimation').value,
      lyricsFontSize: Number(document.getElementById('setLyricsFontSize').value) || 46,
      fontFamily: document.getElementById('setFontFamily').value || 'Noto Sans Ethiopic',
      lyricsIdleAnimation: document.getElementById('setIdleAnim').value || 'soundwave',
      noticeRotateSeconds: Number(document.getElementById('setNoticeRotate').value) || 10,
      noticesPerSlide: Number(document.getElementById('setNoticesPerSlide').value) || 3
    };
    await window.Store.set('settings', this.data);
    window.AppState.churchName = this.data.churchName;
    window.AppState.fontFamily = this.data.fontFamily;

    // Split church name into three lines for the header
    const churchName = this.data.churchName || '';
    const parts = churchName.trim().split(/\s+/).filter(Boolean);
    const line1El = document.getElementById('topbarChurchLine1');
    const line2El = document.getElementById('topbarChurchLine2');
    const line3El = document.getElementById('topbarChurchLine3');

    if (parts.length >= 4) {
      line1El.textContent = parts.slice(0, 2).join(' ');
      line2El.textContent = parts.length === 4 ? parts[2] : parts.slice(2, parts.length - 2).join(' ');
      if (line3El) line3El.textContent = parts.slice(parts.length - 2).join(' ');
    } else if (parts.length === 3) {
      line1El.textContent = parts[0];
      line2El.textContent = parts[1];
      if (line3El) line3El.textContent = parts[2];
    } else if (parts.length === 2) {
      line1El.textContent = parts[0];
      line2El.textContent = parts[1];
      if (line3El) line3El.textContent = '';
    } else {
      line1El.textContent = churchName;
      line2El.textContent = '';
      if (line3El) line3El.textContent = '';
    }

    window.AppState.applyFont();
    if (window.Lyrics) {
      const lyricCustom = await window.Store.get('lyricsFontFamily');
      if (!lyricCustom) {
        window.Lyrics._fontFamily = this.data.fontFamily;
      }
      if (typeof window.Lyrics.refresh === 'function') {
        window.Lyrics.refresh();
      }
    }
  }
};
