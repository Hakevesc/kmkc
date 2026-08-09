// Image slideshow manager — upload images, reorder, present full-screen.
window.Slides = {
  images: [],
  liveIdx: 0,
  pendingIdx: 0,
  autoOn: false,
  autoTimer: null,
  externalOpened: false,

  async init() {
    this.images = await window.Store.get('slides') || [];
    this.liveIdx = 0;
    this.pendingIdx = this.images.length > 1 ? 1 : 0;
    this.autoOn = false;
    this.autoTimer = null;
    this.externalOpened = false;
    this.renderOperatorInline();
    
    // Bind global keydown handler for slides control
    document.addEventListener('keydown', (e) => this._handleKeydown(e));
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

  async refresh() {
    this.images = await window.Store.get('slides') || [];
    
    // Safety check: bound checking for indices
    if (this.liveIdx >= this.images.length) this.liveIdx = 0;
    if (this.pendingIdx >= this.images.length) this.pendingIdx = this.images.length > 1 ? 1 : 0;

    this.renderOperatorInline();
  },

  _handleKeydown(e) {
    const view = document.getElementById('view-slides');
    if (!view || !view.classList.contains('active')) return;
    
    if (this.images.length === 0) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      this.pendingIdx = (this.pendingIdx + 1) % this.images.length;
      this.renderOperatorInline();
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      this.pendingIdx = (this.pendingIdx - 1 + this.images.length) % this.images.length;
      this.renderOperatorInline();
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

  renderList() {
    this.renderOperatorInline();
  },

  renderOperatorInline() {
    const container = document.getElementById('slidesOperatorContainer');
    if (!container) return;

    const self = this;
    const churchName = window.AppState.churchName || 'Kebena MKC';
    
    // Live image source or placeholder
    let liveSrc = '';
    let liveName = 'No Slide Presenting';
    if (this.images.length > 0 && this.externalOpened) {
      const img = this.images[this.liveIdx];
      if (img) {
        liveSrc = this._getImageUrl(img.src);
        liveName = img.name;
      }
    }

    // Pending image source or placeholder
    let pendingSrc = '';
    let pendingName = 'No Pending Slide';
    if (this.images.length > 0) {
      const img = this.images[this.pendingIdx];
      if (img) {
        pendingSrc = this._getImageUrl(img.src);
        pendingName = img.name;
      }
    }

    container.innerHTML = `
      <div class="soc-op-view">
        <div class="soc-op-main" style="padding-top:0; grid-template-columns: 1fr 340px;">
          
          <!-- LEFT: Previews and Controls -->
          <div class="soc-op-preview-area" style="padding:16px 20px; gap:12px;">
            
            <!-- Side-by-side Live and Pending -->
            <div class="soc-op-preview-row" style="gap:12px;">
              
              <!-- LIVE Preview Card -->
              <div class="soc-op-preview-card ${this.externalOpened ? 'soc-op-live-card' : ''}" style="flex:1; display:flex; flex-direction:column; border-radius:14px;">
                <div class="soc-op-preview-header" style="padding:6px 12px;">
                  <div class="soc-op-preview-label" style="font-size:10px;">
                    <span class="soc-op-dot ${this.externalOpened ? 'soc-op-dot-live' : ''}" style="background:${this.externalOpened ? '#ed1c24' : '#5c6a8a'};"></span>
                    Presented Screen (Live)
                  </div>
                  <div class="soc-op-preview-timer" style="font-size:10px; font-weight:800; color:${this.externalOpened ? '#ed1c24' : '#5c6a8a'};">${this.externalOpened ? 'LIVE' : 'IDLE'}</div>
                </div>
                <div class="soc-op-desktop-wrap" style="background:#0a0a14; position:relative; aspect-ratio:16/9; flex:1;">
                  ${liveSrc ? `
                    <img src="${escapeAttr(liveSrc)}" style="width:100%; height:100%; object-fit:contain;" />
                    <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">
                      ${this.liveIdx + 1} / ${this.images.length}
                    </div>
                  ` : `
                    <div style="color:#5c6a8a; font-size:11px; text-align:center; display:flex; align-items:center; justify-content:center; height:100%;">
                      No Live Slide
                    </div>
                  `}
                </div>
                <div style="padding:6px 10px; font-size:10.5px; color:#5c6a8a; border-top:1px solid #dde3ef; background:#f8fafc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escapeHtml(liveName)}
                </div>
              </div>

              <!-- PENDING Preview Card -->
              <div class="soc-op-preview-card" style="flex:1; display:flex; flex-direction:column; border-radius:14px;">
                <div class="soc-op-preview-header" style="padding:6px 12px; background:#fff3cd; border-bottom-color:#ffeeba;">
                  <div class="soc-op-preview-label" style="color:#856404; font-size:10px;">
                    <span class="soc-op-dot soc-op-dot-next" style="background:#f59e0b;"></span>
                    Pending Slide
                  </div>
                  <div class="soc-op-preview-timer" style="color:#856404; font-size:10px; font-weight:800;">NEXT</div>
                </div>
                <div class="soc-op-desktop-wrap" style="background:#0a0a14; position:relative; aspect-ratio:16/9; flex:1;">
                  ${pendingSrc ? `
                    <img src="${escapeAttr(pendingSrc)}" style="width:100%; height:100%; object-fit:contain;" />
                    <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">
                      ${this.pendingIdx + 1} / ${this.images.length}
                    </div>
                  ` : `
                    <div style="color:#5c6a8a; font-size:11px; text-align:center; display:flex; align-items:center; justify-content:center; height:100%;">
                      No Pending Slide
                    </div>
                  `}
                </div>
                <div style="padding:6px 10px; font-size:10.5px; color:#5c6a8a; border-top:1px solid #dde3ef; background:#f8fafc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${escapeHtml(pendingName)}
                </div>
              </div>

            </div><!-- /preview-row -->

            <!-- Interactive Controller bar below previews -->
            <div style="background:rgba(31,68,151,0.04); border:1px solid rgba(31,68,151,0.08); border-radius:12px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0;">
              <div style="display:flex; gap:8px;">
                <button class="btn btn-ghost" id="slidesAutoBtn" style="height:32px; border-radius:8px; border:1px solid rgba(31,68,151,0.2); background:#fff; color:#1f4497; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; padding:0 12px; transition:all 0.2s;">
                  <span class="icon" style="display:inline-flex; align-items:center;">${this.autoOn ? window.ICONS.pause : window.ICONS.play}</span>
                  Auto: ${this.autoOn ? 'On' : 'Off'}
                </button>
                <div style="display:flex; gap:4px;">
                  <button id="slidesPrevBtn" class="soc-op-nav-btn" style="width:32px; height:32px; border-radius:8px; border:1px solid #dde3ef; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Previous Slide (ArrowLeft)">
                    ${window.ICONS.arrowLeft}
                  </button>
                  <button id="slidesNextBtn" class="soc-op-nav-btn" style="width:32px; height:32px; border-radius:8px; border:1px solid #dde3ef; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Next Slide (ArrowRight)">
                    ${window.ICONS.arrowRight}
                  </button>
                </div>
              </div>
              
              <button id="slidesChangeBtn" class="op-btn-present" title="Present Pending Slide (Enter)">
                <span class="icon" style="display:inline-flex; align-items:center;">${window.ICONS.play}</span> Change / Present
              </button>
            </div>

            <!-- Close presentation action button -->
            <button id="slidesCloseBtn" class="op-btn-stop op-btn-block" style="flex-shrink:0;">
              <span class="icon">${window.ICONS.close}</span> Close Presentation / Exit
            </button>

          </div><!-- /preview-area -->

          <!-- RIGHT: Sidebar -->
          <div class="soc-op-sidebar" style="padding:16px 14px; gap:14px;">
            
            <!-- Screen Status Message -->
            <div id="slidesScreenStatus" style="font-size:10px; font-weight:800; color:#5c6a8a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:6px; margin-bottom:2px; padding:4px 8px; border-radius:6px; background:rgba(0,0,0,0.03); width:fit-content; border: 1px solid rgba(0,0,0,0.05);">
               Detecting Screen...
            </div>

            <!-- Add images card -->
            <div class="soc-op-controls-card" style="background:rgba(31,68,151,0.04); padding:10px 12px; border-radius:14px; display:flex; flex-direction:column; gap:6px; border: 1px solid rgba(31,68,151,0.1); flex-shrink:0;">
              <div style="font-size:10px; font-weight:800; color:#1f4497; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">
                Slideshow Actions
              </div>
              <button class="btn btn-primary" id="slidesAddImagesBtn" style="height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; font-weight:700; width:100%; padding:0; cursor:pointer;">
                <span class="icon" style="display:inline-flex; align-items:center;">${window.ICONS.image || '+'}</span> Add Images
              </button>
            </div>



            <!-- Slide list manager -->
            <div class="soc-op-section" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="soc-op-section-label">Slide Stream</div>
              <div class="soc-op-account-list" id="slidesStreamList" style="flex:1; overflow-y:auto; margin-top:2px;">
                ${this.images.map((img, i) => {
                  const isPending = self.pendingIdx === i;
                  const isLive = self.liveIdx === i && self.externalOpened;
                  return `
                    <div class="soc-op-account-item ${isPending ? 'soc-op-account-active' : ''}" data-slide-index="${i}" style="padding:6px 8px; gap:8px; flex-shrink:0;">
                      <div class="soc-op-account-num ${isLive ? 'soc-op-account-num-active' : ''}" style="background:${isLive ? '#ed1c24' : '#f0f3fa'}; color:${isLive ? '#fff' : '#7a89a8'}; width:22px; height:22px; font-size:10px; border-radius:5px; flex-shrink:0;">${i + 1}</div>
                      <img src="${escapeAttr(self._getImageUrl(img.src))}" style="width:38px; height:24px; object-fit:cover; border-radius:4px; border:1px solid #dde3ef; flex-shrink:0;" />
                      <div class="soc-op-account-info" style="flex:1; min-width:0;">
                        <div class="soc-op-account-handle" style="font-size:11px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(img.name)}</div>
                      </div>
                      
                      <!-- Action buttons on hover/row -->
                      <div style="display:flex; gap:2px; margin-left:auto; flex-shrink:0;">
                        <button class="slides-action-btn" data-action="up" data-idx="${i}" style="width:20px; height:20px; border:none; background:transparent; display:flex; align-items:center; justify-content:center; color:#7a89a8; cursor:pointer;" title="Move Up">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button class="slides-action-btn" data-action="down" data-idx="${i}" style="width:20px; height:20px; border:none; background:transparent; display:flex; align-items:center; justify-content:center; color:#7a89a8; cursor:pointer;" title="Move Down">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <button class="slides-action-btn" data-action="delete" data-idx="${i}" style="width:20px; height:20px; border:none; background:transparent; display:flex; align-items:center; justify-content:center; color:#ef4444; cursor:pointer;" title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>

                      ${isLive ? `<div class="soc-op-account-status" style="background:#ed1c24; box-shadow:0 0 7px rgba(237,28,36,0.45); margin-left:4px;"></div>` : ''}
                    </div>
                  `;
                }).join('')}
                ${this.images.length === 0 ? `<div style="text-align:center; padding:30px 10px; color:#7a89a8; font-size:12px; font-weight:600;">No images added yet.</div>` : ''}
              </div>
            </div>

          </div><!-- /sidebar -->
        </div><!-- /main -->
      </div>
    `;

    // Hook up screen status auto-detection
    const checkScreenDetection = async () => {
      let hasSecondScreen = false;
      try {
        const displays = await window.api.getDisplays();
        hasSecondScreen = displays && displays.some(d => d.isExternal);
      } catch (e) { /* ignore */ }
      
      const screenStatusMsg = document.getElementById('slidesScreenStatus');
      if (screenStatusMsg) {
        if (hasSecondScreen) {
          screenStatusMsg.innerHTML = `<span style="color:#22c55e;">●</span> Secondary Screen Detected`;
        } else {
          screenStatusMsg.innerHTML = `<span style="color:#ef4444;">●</span> No Secondary Screen`;
        }
      }
    };
    checkScreenDetection();

    // Hook up list row clicks (select pending slide)
    const listStream = document.getElementById('slidesStreamList');
    if (listStream) {
      listStream.querySelectorAll('.soc-op-account-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // If clicked action button inside row, ignore selection click
          if (e.target.closest('.slides-action-btn')) return;
          self.pendingIdx = Number(item.dataset.slideIndex);
          self.renderOperatorInline();
        });
      });

      // Hook up row actions
      listStream.querySelectorAll('.slides-action-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const idx = Number(btn.dataset.idx);
          const act = btn.dataset.action;
          if (act === 'up') {
            self.moveImage(idx, -1);
          } else if (act === 'down') {
            self.moveImage(idx, 1);
          } else if (act === 'delete') {
            await self.deleteImage(idx);
          }
        };
      });
    }

    // Add Images button
    document.getElementById('slidesAddImagesBtn').onclick = () => this.addImages();

    // Prev / Next button actions
    document.getElementById('slidesPrevBtn').onclick = () => {
      if (self.images.length === 0) return;
      self.pendingIdx = (self.pendingIdx - 1 + self.images.length) % self.images.length;
      self.renderOperatorInline();
    };
    document.getElementById('slidesNextBtn').onclick = () => {
      if (self.images.length === 0) return;
      self.pendingIdx = (self.pendingIdx + 1) % self.images.length;
      self.renderOperatorInline();
    };

    // Change / Present button
    document.getElementById('slidesChangeBtn').onclick = () => this.changeSlide();

    // Autoplay toggle button
    document.getElementById('slidesAutoBtn').onclick = () => this.toggleAuto();

    // Close Presentation button
    document.getElementById('slidesCloseBtn').onclick = () => this.closePresentation();
  },

  async changeSlide() {
    if (this.images.length === 0) return;
    this.liveIdx = this.pendingIdx;
    this.pendingIdx = (this.liveIdx + 1) % this.images.length;
    this.renderOperatorInline();
    await this.sendToExternal();
  },

  async sendToExternal() {
    if (this.images.length === 0) return;
    const html = this._buildSlidesExternalHtml(this.liveIdx);
    const result = this.externalOpened
      ? await window.Store.presentUpdate({ html, variant: 'slides' })
      : await window.Store.presentOpen({ html, variant: 'slides' });
    this.externalOpened = Boolean(result && (result.opened || result.updated));
    this.renderOperatorInline();
  },

  async closePresentation() {
    if (this.externalOpened) {
      await window.Store.presentClose();
      this.externalOpened = false;
      this.liveIdx = 0;
      this.pendingIdx = this.images.length > 1 ? 1 : 0;
      if (this.autoTimer) {
        clearInterval(this.autoTimer);
        this.autoTimer = null;
        this.autoOn = false;
      }
      this.renderOperatorInline();
    }
  },

  async toggleAuto() {
    const settings = await window.Store.get('settings') || {};
    const duration = (settings.slideDurationSeconds || 6) * 1000;

    this.autoOn = !this.autoOn;
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    
    if (this.autoOn) {
      this.autoTimer = setInterval(() => {
        this.liveIdx = (this.liveIdx + 1) % this.images.length;
        this.pendingIdx = (this.liveIdx + 1) % this.images.length;
        this.renderOperatorInline();
        this.sendToExternal().catch(() => {});
      }, duration);
    }
    this.renderOperatorInline();
  },

  moveImage(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= this.images.length) return;
    [this.images[idx], this.images[newIdx]] = [this.images[newIdx], this.images[idx]];
    
    // Swap indexes to maintain selection focus
    if (this.pendingIdx === idx) this.pendingIdx = newIdx;
    else if (this.pendingIdx === newIdx) this.pendingIdx = idx;

    if (this.liveIdx === idx) this.liveIdx = newIdx;
    else if (this.liveIdx === newIdx) this.liveIdx = idx;

    this._persist();
    this.renderOperatorInline();
    if (this.externalOpened) {
      this.sendToExternal().catch(() => {});
    }
  },

  async addImages() {
    const copied = await window.Store.slidesPickAndCopy();
    if (!copied || copied.length === 0) return;
    for (const img of copied) {
      this.images.push({
        name: img.name,
        src: 'file:///' + img.src.replace(/\\/g, '/')
      });
    }
    await this._persist();
    
    // Auto focus new image as pending
    if (this.images.length > 0) {
      this.pendingIdx = this.images.length - 1;
    }
    this.renderOperatorInline();
  },

  async deleteImage(idx) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    const img = this.images[idx];
    if (img) {
      const fileName = img.name;
      await window.Store.slidesDelete(fileName);
    }
    this.images.splice(idx, 1);
    await this._persist();

    if (this.images.length === 0) {
      this.liveIdx = 0;
      this.pendingIdx = 0;
      if (this.externalOpened) {
        await window.Store.presentClose();
        this.externalOpened = false;
      }
      if (this.autoTimer) {
        clearInterval(this.autoTimer);
        this.autoTimer = null;
        this.autoOn = false;
      }
    } else {
      if (this.liveIdx >= this.images.length) this.liveIdx = this.images.length - 1;
      if (this.pendingIdx >= this.images.length) this.pendingIdx = this.images.length - 1;
      if (this.externalOpened) {
        await this.sendToExternal();
      }
    }
    this.renderOperatorInline();
  },

  async _persist() {
    await window.Store.set('slides', this.images);
  },

  present() {
    this.sendToExternal();
  },

  _buildSlidesExternalHtml(index) {
    const img = this.images[index];
    if (!img) return '';
    const src = this._getImageUrl(img.src);
    return `
      <div class="slides-stage" style="background:#000; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
        <img class="slides-img" src="${escapeAttr(src)}" alt="" style="max-width:100vw; max-height:100vh; width:100%; height:100%; object-fit:contain;" />
        <div class="slides-counter" style="position:absolute; bottom:30px; right:30px; font-size:1.2rem; font-weight:700; color:rgba(255,255,255,0.8); background:rgba(0,0,0,0.5); padding:6px 16px; border-radius:20px; z-index:10;">${index + 1} / ${this.images.length}</div>
      </div>
    `;
  }
};