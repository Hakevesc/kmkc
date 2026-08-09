window.BankAccounts = {
  accounts: [],
  editingId: null,
  _pickedLogo: null,
  _availableLogos: [],
  pendingMode: 'overview',
  pendingIdx: 0,
  liveMode: 'overview',
  liveIdx: 0,
  autoOn: false,
  autoTimer: null,
  externalOpened: false,

  async init() {
    this.accounts = await window.Store.get('bankAccounts') || [];
    this._availableLogos = [
      { file: 'cbe-logo.jpg', label: 'Commercial Bank of Ethiopia (CBE)' },
      { file: 'oromia-logo.png', label: 'Oromia Bank' },
      { file: 'berhanlog-logo.png', label: 'Berhan Bank' },
      { file: 'tele-birr-logo.jpg', label: 'Tele Birr' },
      { file: 'dashen-logo.png', label: 'Dashen Bank' },
      { file: 'awash-logo.png', label: 'Awash Bank' },
      { file: 'abyssinia-logo.png', label: 'Abyssinia Bank' },
      { file: 'wegagen-logo.png', label: 'Wegagen Bank' }
    ];
    this.pendingMode = 'overview';
    this.pendingIdx = 0;
    this.liveMode = 'overview';
    this.liveIdx = 0;
    this.autoOn = false;
    this.autoTimer = null;
    this.externalOpened = false;

    this.renderOperatorInline();
    
    // Bind keydown control
    document.addEventListener('keydown', (e) => this._handleKeydown(e));
    window.addEventListener('resize', () => this._scalePreviews());
  },

  async refresh() {
    this.accounts = await window.Store.get('bankAccounts') || [];
    
    // Bounds checking
    if (this.pendingIdx >= this.accounts.length) this.pendingIdx = 0;
    if (this.liveIdx >= this.accounts.length) this.liveIdx = 0;

    this.renderOperatorInline();
  },

  _handleKeydown(e) {
    const view = document.getElementById('view-bank');
    if (!view || !view.classList.contains('active')) return;
    
    if (this.accounts.length === 0) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      if (this.pendingMode === 'overview') {
        this.pendingMode = 'spotlight';
        this.pendingIdx = 0;
      } else if (this.pendingIdx + 1 < this.accounts.length) {
        this.pendingIdx++;
      } else {
        this.pendingMode = 'overview';
        this.pendingIdx = 0;
      }
      this.renderOperatorInline();
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (this.pendingMode === 'overview') {
        this.pendingMode = 'spotlight';
        this.pendingIdx = this.accounts.length - 1;
      } else if (this.pendingIdx > 0) {
        this.pendingIdx--;
      } else {
        this.pendingMode = 'overview';
        this.pendingIdx = 0;
      }
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
    const container = document.getElementById('bankOperatorContainer');
    if (!container) return;

    const self = this;
    const churchName = window.AppState.churchName || 'Kebena MKC Media Ministry';
    
    // Live HTML
    let liveHtml = '';
    if (this.externalOpened) {
      liveHtml = this._buildBankExternalHtml(this.accounts, this.liveMode, this.liveIdx);
    } else {
      liveHtml = `
        <div style="color:#5c6a8a; font-size:11px; text-align:center; display:flex; align-items:center; justify-content:center; height:100%;">
          No Active Bank Presentation
        </div>
      `;
    }

    // Pending HTML
    let pendingHtml = '';
    if (this.accounts.length > 0) {
      pendingHtml = this._buildBankExternalHtml(this.accounts, this.pendingMode, this.pendingIdx);
    } else {
      pendingHtml = `
        <div style="color:#5c6a8a; font-size:11px; text-align:center; display:flex; align-items:center; justify-content:center; height:100%;">
          No Pending Slide
        </div>
      `;
    }

    container.innerHTML = `
      <div class="soc-op-view">
        <div class="soc-op-main" style="padding-top:0; grid-template-columns: 1fr 420px;">
          
          <!-- LEFT: Previews and Controls -->
          <div class="soc-op-preview-area" style="padding:10px 14px; gap:8px;">
            
            <!-- Side-by-side Live and Pending -->
            <div class="soc-op-preview-row" style="gap:8px;">
              
              <!-- LIVE Preview Card -->
              <div class="soc-op-preview-card ${this.externalOpened ? 'soc-op-live-card' : ''}" style="flex:1; display:flex; flex-direction:column; border-radius:14px;">
                <div class="soc-op-preview-header" style="padding:4px 10px;">
                  <div class="soc-op-preview-label" style="font-size:9px;">
                    <span class="soc-op-dot ${this.externalOpened ? 'soc-op-dot-live' : ''}" style="background:${this.externalOpened ? '#ed1c24' : '#5c6a8a'};"></span>
                    Live
                  </div>
                  <div class="soc-op-preview-timer" style="font-size:9px; font-weight:800; color:${this.externalOpened ? '#ed1c24' : '#5c6a8a'};">${this.externalOpened ? 'LIVE' : 'IDLE'}</div>
                </div>
                <div class="soc-op-desktop-wrap" style="background:#fff; position:relative; aspect-ratio:16/9; flex:1; border-bottom:1px solid #dde3ef; overflow:hidden;">
                  <div class="present-overlay present-bank" style="position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden; font-family:var(--presentation-font);">
                    ${liveHtml}
                  </div>
                </div>
                <div style="padding:3px 8px; font-size:9px; color:#5c6a8a; background:#f8fafc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  Live: ${this.liveMode === 'overview' ? 'All accounts grid' : (this.accounts[this.liveIdx] ? this.accounts[this.liveIdx].bankName : 'None')}
                </div>
              </div>

              <!-- PENDING Preview Card -->
              <div class="soc-op-preview-card" style="flex:1; display:flex; flex-direction:column; border-radius:14px;">
                <div class="soc-op-preview-header" style="padding:4px 10px; background:#fff3cd; border-bottom-color:#ffeeba;">
                  <div class="soc-op-preview-label" style="color:#856404; font-size:9px;">
                    <span class="soc-op-dot soc-op-dot-next" style="background:#f59e0b;"></span>
                    Pending
                  </div>
                  <div class="soc-op-preview-timer" style="color:#856404; font-size:9px; font-weight:800;">NEXT</div>
                </div>
                <div class="soc-op-desktop-wrap" style="background:#fff; position:relative; aspect-ratio:16/9; flex:1; border-bottom:1px solid #dde3ef; overflow:hidden;">
                  <div class="present-overlay present-bank" style="position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden; font-family:var(--presentation-font);">
                    ${pendingHtml}
                  </div>
                </div>
                <div style="padding:3px 8px; font-size:9px; color:#5c6a8a; background:#f8fafc; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  Pending: ${this.pendingMode === 'overview' ? 'All accounts grid' : (this.accounts[this.pendingIdx] ? this.accounts[this.pendingIdx].bankName : 'None')}
                </div>
              </div>

            </div><!-- /preview-row -->

            <!-- Interactive Controller bar below previews -->
            <div style="background:rgba(31,68,151,0.04); border:1px solid rgba(31,68,151,0.08); border-radius:10px; padding:6px 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-shrink:0;">
              <div style="display:flex; gap:6px;">
                <button class="btn btn-ghost" id="bankAutoBtn" style="height:28px; border-radius:6px; border:1px solid rgba(31,68,151,0.2); background:#fff; color:#1f4497; font-size:10px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; padding:0 10px; transition:all 0.2s;">
                  <span class="icon" style="display:inline-flex; align-items:center;">${this.autoOn ? window.ICONS.pause : window.ICONS.play}</span>
                  Auto: ${this.autoOn ? 'On' : 'Off'}
                </button>
                <div style="display:flex; gap:3px;">
                  <button id="bankPrevBtn" class="soc-op-nav-btn" style="width:28px; height:28px; border-radius:6px; border:1px solid #dde3ef; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Previous Account (ArrowLeft)">
                    ${window.ICONS.arrowLeft}
                  </button>
                  <button id="bankNextBtn" class="soc-op-nav-btn" style="width:28px; height:28px; border-radius:6px; border:1px solid #dde3ef; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Next Account (ArrowRight)">
                    ${window.ICONS.arrowRight}
                  </button>
                </div>
              </div>
              
              <button id="bankChangeBtn" class="op-btn-present" title="Present Pending Account (Enter)">
                <span class="icon" style="display:inline-flex; align-items:center;">${window.ICONS.play}</span> Change / Present
              </button>
            </div>

            <!-- Close presentation action button -->
            <button id="bankCloseBtn" class="op-btn-stop op-btn-block" style="flex-shrink:0;">
              <span class="icon">${window.ICONS.close}</span> Close Presentation
            </button>

          </div><!-- /preview-area -->

          <!-- RIGHT: Sidebar -->
          <div class="soc-op-sidebar" style="padding:10px 10px; gap:8px;">
            
            <!-- Screen Status Message -->
            <div id="bankScreenStatus" style="font-size:9px; font-weight:800; color:#5c6a8a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px; padding:3px 6px; border-radius:5px; background:rgba(0,0,0,0.03); width:fit-content; border: 1px solid rgba(0,0,0,0.05);">
               Detecting Screen...
            </div>

            <!-- Add accounts card -->
            <div class="soc-op-controls-card" style="background:rgba(31,68,151,0.04); padding:8px 10px; border-radius:10px; display:flex; flex-direction:column; gap:4px; border: 1px solid rgba(31,68,151,0.1); flex-shrink:0;">
              <button class="btn btn-primary" id="bankAddAccountBtn" style="height:30px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:5px; font-size:11px; font-weight:700; width:100%; padding:0; cursor:pointer;">
                <span class="icon" style="display:inline-flex; align-items:center;">${window.ICONS.plus || '+'}</span> Add Bank Account
              </button>
            </div>

            <!-- Bank list manager -->
            <div class="soc-op-section" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="soc-op-section-label" style="font-size:11px; font-weight:800;">Bank Stream</div>
              <div class="soc-op-account-list" id="bankStreamList" style="flex:1; overflow-y:auto; margin-top:2px;">
                
                <!-- Overview Grid Option -->
                <div class="soc-op-account-item ${this.pendingMode === 'overview' ? 'soc-op-account-active' : ''}" data-mode="overview" style="padding:6px 8px; gap:8px; flex-shrink:0;">
                  <div class="soc-op-account-num ${this.liveMode === 'overview' && this.externalOpened ? 'soc-op-account-num-active' : ''}" style="background:${this.liveMode === 'overview' && this.externalOpened ? '#ed1c24' : '#f0f3fa'}; color:${this.liveMode === 'overview' && this.externalOpened ? '#fff' : '#7a89a8'}; width:22px; height:22px; font-size:9px; font-weight:900; border-radius:4px; flex-shrink:0;">OG</div>
                  <div class="soc-op-account-info" style="flex:1; min-width:0;">
                    <div class="soc-op-account-handle" style="font-size:12px; font-weight:800;">Overview Grid</div>
                    <div class="soc-op-account-platform" style="font-size:10px; color:#7a89a8;">All accounts grid</div>
                  </div>
                  ${this.liveMode === 'overview' && this.externalOpened ? `<div class="soc-op-account-status" style="background:#ed1c24; box-shadow:0 0 7px rgba(237,28,36,0.45); margin-left:4px;"></div>` : ''}
                </div>

                <!-- Individual Bank Accounts -->
                ${this.accounts.map((a, i) => {
                  const isPending = self.pendingMode === 'spotlight' && self.pendingIdx === i;
                  const isLive = self.liveMode === 'spotlight' && self.liveIdx === i && self.externalOpened;
                  return `
                    <div class="soc-op-account-item ${isPending ? 'soc-op-account-active' : ''}" data-mode="spotlight" data-bank-index="${i}" style="padding:6px 8px; gap:8px; flex-shrink:0;">
                      <div class="soc-op-account-num ${isLive ? 'soc-op-account-num-active' : ''}" style="background:${isLive ? '#ed1c24' : '#f0f3fa'}; color:${isLive ? '#fff' : '#7a89a8'}; width:22px; height:22px; font-size:10px; border-radius:4px; flex-shrink:0;">${i + 1}</div>
                      ${a.logo 
                        ? `<img src="assets/banks/${escapeAttr(a.logo)}" style="width:26px; height:26px; object-fit:contain; border-radius:4px; border:1px solid #dde3ef; padding:1px; background:#fff; flex-shrink:0;" />`
                        : `<div style="width:26px; height:26px; border-radius:4px; background:#f0f3fa; display:flex; align-items:center; justify-content:center; font-size:12px; color:#7a89a8; border:1px solid #dde3ef; flex-shrink:0;">${window.ICONS.bank}</div>`
                      }
                      <div class="soc-op-account-info" style="flex:1; min-width:0;">
                        <div class="soc-op-account-handle" style="font-size:13px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(a.bankName)}</div>
                        <div class="soc-op-account-platform" style="font-size:11px; color:#7a89a8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(a.accountNumber)}</div>
                      </div>
                      
                      <!-- Action buttons -->
                      <div style="display:flex; gap:2px; margin-left:auto; flex-shrink:0;">
                        <button class="bank-action-btn" data-action="edit" data-id="${a.id}" style="width:20px; height:20px; border:none; background:transparent; display:flex; align-items:center; justify-content:center; color:#7a89a8; cursor:pointer;" title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                        </button>
                        <button class="bank-action-btn" data-action="delete" data-id="${a.id}" style="width:20px; height:20px; border:none; background:transparent; display:flex; align-items:center; justify-content:center; color:#ef4444; cursor:pointer;" title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>

                      ${isLive ? `<div class="soc-op-account-status" style="background:#ed1c24; box-shadow:0 0 7px rgba(237,28,36,0.45); margin-left:4px;"></div>` : ''}
                    </div>
                  `;
                }).join('')}
                ${this.accounts.length === 0 ? `<div style="text-align:center; padding:30px 10px; color:#7a89a8; font-size:12px; font-weight:600;">No bank accounts added yet.</div>` : ''}
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
      
      const screenStatusMsg = document.getElementById('bankScreenStatus');
      if (screenStatusMsg) {
        if (hasSecondScreen) {
          screenStatusMsg.innerHTML = `<span style="color:#22c55e;">●</span> Secondary Screen Detected`;
        } else {
          screenStatusMsg.innerHTML = `<span style="color:#ef4444;">●</span> No Secondary Screen`;
        }
      }
    };
    checkScreenDetection();

    // Hook up row selection clicks
    const listStream = document.getElementById('bankStreamList');
    if (listStream) {
      listStream.querySelectorAll('.soc-op-account-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.bank-action-btn')) return;
          const mode = item.dataset.mode;
          if (mode === 'overview') {
            self.pendingMode = 'overview';
            self.pendingIdx = 0;
          } else {
            self.pendingMode = 'spotlight';
            self.pendingIdx = Number(item.dataset.bankIndex);
          }
          self.renderOperatorInline();
        });
      });

      // Hook up row action clicks
      listStream.querySelectorAll('.bank-action-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const act = btn.dataset.action;
          if (act === 'edit') {
            self.openForm(id);
          } else if (act === 'delete') {
            await self.deleteAccount(id);
          }
        };
      });
    }

    // Add Account button
    document.getElementById('bankAddAccountBtn').onclick = () => this.openForm(null);

    // Prev / Next button actions
    document.getElementById('bankPrevBtn').onclick = () => {
      if (self.accounts.length === 0) return;
      if (self.pendingMode === 'overview') {
        self.pendingMode = 'spotlight';
        self.pendingIdx = self.accounts.length - 1;
      } else if (self.pendingIdx > 0) {
        self.pendingIdx--;
      } else {
        self.pendingMode = 'overview';
        self.pendingIdx = 0;
      }
      self.renderOperatorInline();
    };
    
    document.getElementById('bankNextBtn').onclick = () => {
      if (self.accounts.length === 0) return;
      if (self.pendingMode === 'overview') {
        self.pendingMode = 'spotlight';
        self.pendingIdx = 0;
      } else if (self.pendingIdx + 1 < self.accounts.length) {
        self.pendingIdx++;
      } else {
        self.pendingMode = 'overview';
        self.pendingIdx = 0;
      }
      self.renderOperatorInline();
    };

    // Commit change button
    document.getElementById('bankChangeBtn').onclick = () => this.changeSlide();

    // Autoplay toggle button
    document.getElementById('bankAutoBtn').onclick = () => this.toggleAuto();

    // Close Presentation button
    document.getElementById('bankCloseBtn').onclick = () => this.closePresentation();

    setTimeout(() => this._scalePreviews(), 0);
  },

  _scalePreviews() {
    const container = document.getElementById('bankOperatorContainer');
    if (!container) return;
    container.querySelectorAll('.bank-stage').forEach((stage) => {
      const wrap = stage.closest('.soc-op-desktop-wrap');
      if (!wrap) return;
      const width = wrap.clientWidth;
      if (!width) return;
      const factor = width / 1920;
      Object.assign(stage.style, {
        width: '1920px',
        height: '1080px',
        transform: `scale(${factor})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: '0',
        left: '0'
      });
      wrap.style.height = `${width * 9 / 16}px`;
    });
  },

  async openForm(id) {
    const S = window.STRINGS;
    this.editingId = id;
    const account = id ? this.accounts.find((a) => a.id === id) : null;
    this._pickedLogo = account ? account.logo : null;

    const logoOptions = this._availableLogos.map((l) =>
      `<button type="button" class="logo-pick" data-logo="${l.file}" title="${escapeAttr(l.label)}">
        <img src="assets/banks/${l.file}" alt="${escapeAttr(l.label)}" />
      </button>`
    ).join('');

    const html = `
      <h3>${account ? S.common.editEn : S.bank.addAccountEn}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label>${S.bank.bankNameLabelEn}</label>
          <input id="bankNameInput" value="${escapeAttr(account ? account.bankName : '')}" />
        </div>
        <div class="form-row">
          <label>${S.bank.accountNumberLabelEn}</label>
          <input id="bankNumberInput" value="${escapeAttr(account ? account.accountNumber : '')}" style="width:100%; box-sizing:border-box;" />
        </div>
        <div class="form-row">
          <label>${S.bank.holderNameLabelEn}</label>
          <input id="bankHolderInput" value="${escapeAttr(account ? account.holderName : 'Kebena MKC')}" />
        </div>
        <div class="form-row">
          <label>${S.bank.iconLabelEn}</label>
          <div class="bank-logo-picker" id="bankLogoPicker">${logoOptions}</div>
        </div>
        <div class="form-row" style="flex-direction:row;align-items:center;gap:10px;">
          <input type="checkbox" id="bankHideOverviewInput" ${account && account.hideFromOverview ? 'checked' : ''} />
          <label for="bankHideOverviewInput" style="margin:0;cursor:pointer;font-weight:normal;">Hide from 4-Account Overview</label>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="bankCancelBtn">${S.common.cancelEn}</button>
        <button class="btn btn-primary" id="bankSaveBtn">${S.common.saveEn}</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);
    this._syncLogoPicker();
    document.querySelectorAll('#bankLogoPicker .logo-pick').forEach((btn) => {
      btn.onclick = () => { this._pickedLogo = btn.dataset.logo; this._syncLogoPicker(); };
    });
    document.getElementById('bankCancelBtn').onclick = () => window.Modal.hide('modalOverlay');
    document.getElementById('bankSaveBtn').onclick = () => this.saveAccount();
  },

  _syncLogoPicker() {
    document.querySelectorAll('#bankLogoPicker .logo-pick').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.logo === this._pickedLogo);
    });
  },

  async saveAccount() {
    const bankName = document.getElementById('bankNameInput').value.trim();
    const accountNumber = document.getElementById('bankNumberInput').value.trim();
    const holderName = document.getElementById('bankHolderInput').value.trim();
    const hideFromOverview = document.getElementById('bankHideOverviewInput').checked;
    const churchName = window.AppState.churchName || 'Kebena MKC Media Ministry';
    if (!bankName || !accountNumber) return;

    if (this.editingId) {
      const a = this.accounts.find((x) => x.id === this.editingId);
      if (a) {
        Object.assign(a, { bankName, accountNumber, holderName, logo: this._pickedLogo, hideFromOverview, churchName });
      }
    } else {
      const newAcc = { 
        id: window.Store.newId(), 
        bankName, 
        accountNumber, 
        holderName, 
        logo: this._pickedLogo, 
        hideFromOverview, 
        churchName,
        order: this.accounts.length 
      };
      this.accounts.push(newAcc);
      this.pendingMode = 'spotlight';
      this.pendingIdx = this.accounts.length - 1;
    }
    await window.Store.set('bankAccounts', this.accounts);
    window.Modal.hide('modalOverlay');
    this.renderOperatorInline();
    if (this.externalOpened) {
      this.sendToExternal().catch(() => {});
    }
  },

  async deleteAccount(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    this.accounts = this.accounts.filter((a) => a.id !== id);
    await window.Store.set('bankAccounts', this.accounts);
    
    // Bounds checking
    if (this.accounts.length === 0) {
      this.liveMode = 'overview';
      this.liveIdx = 0;
      this.pendingMode = 'overview';
      this.pendingIdx = 0;
      if (this.externalOpened) {
        await window.Store.presentClose();
        this.externalOpened = false;
      }
      if (this.autoTimer) {
        clearTimeout(this.autoTimer);
        this.autoTimer = null;
        this.autoOn = false;
      }
    } else {
      if (this.pendingIdx >= this.accounts.length) this.pendingIdx = this.accounts.length - 1;
      if (this.liveIdx >= this.accounts.length) this.liveIdx = this.accounts.length - 1;
      if (this.externalOpened) {
        await this.sendToExternal();
      }
    }
    
    this.renderOperatorInline();
  },

  async changeSlide() {
    if (this.accounts.length === 0) return;
    if (this.autoOn) this.toggleAuto(false);
    this.liveMode = this.pendingMode;
    this.liveIdx = this.pendingIdx;
    this.renderOperatorInline();
    await this.sendToExternal();
  },

  async sendToExternal() {
    if (this.accounts.length === 0) return;
    const html = this._buildBankExternalHtml(this.accounts, this.liveMode, this.liveIdx);
    const result = this.externalOpened
      ? await window.Store.presentUpdate({ html, variant: 'bank' })
      : await window.Store.presentOpen({ html, variant: 'bank' });
    this.externalOpened = Boolean(result && (result.opened || result.updated));
    this.renderOperatorInline();
  },

  async closePresentation() {
    if (this.externalOpened) {
      await window.Store.presentClose();
      this.externalOpened = false;
      this.liveMode = 'overview';
      this.liveIdx = 0;
      this.pendingMode = 'overview';
      this.pendingIdx = 0;
      if (this.autoTimer) {
        clearTimeout(this.autoTimer);
        this.autoTimer = null;
        this.autoOn = false;
      }
      this.renderOperatorInline();
    }
  },

  toggleAuto(forceState) {
    const nextState = forceState !== undefined ? forceState : !this.autoOn;
    this.autoOn = nextState;
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    
    if (this.autoOn) {
      if (this.liveMode !== 'spotlight') {
        this.liveMode = 'spotlight';
        this.liveIdx = 0;
        this.renderOperatorInline();
        this.sendToExternal().catch(() => {});
      }
      this.scheduleAuto();
    }
    this.renderOperatorInline();
  },

  scheduleAuto() {
    const SPOTLIGHT_DURATION = 10000;
    if (this.autoTimer) clearTimeout(this.autoTimer);
    
    this.autoTimer = setTimeout(() => {
      if (!this.autoOn) return;
      this.liveMode = 'spotlight';
      this.liveIdx = (this.liveIdx + 1) % this.accounts.length;
      this.renderOperatorInline();
      this.sendToExternal().catch(() => {});
      this.scheduleAuto();
    }, SPOTLIGHT_DURATION);
  },

  present() {
    this.sendToExternal();
  },

  _buildBankExternalHtml(accounts, mode, spotlightIdx) {
    if (mode === 'overview') {
      const overviewAccounts = accounts.filter(a => !a.hideFromOverview);
      return `
        <div class="bank-stage" data-state="overview">
          <div class="bank-grid bank-overview-grid${overviewAccounts.length === 4 ? ' bank-grid-4' : ''}">
            ${overviewAccounts.map((a, i) => `
              <div class="bank-card" style="animation-delay:${i * 0.12}s">
                ${a.logo
                  ? `<div class="bank-card-logo"><img src="assets/banks/${escapeAttr(a.logo)}" alt="${escapeHtml(a.bankName)}" /></div>`
                  : `<div class="bank-card-logo bank-card-logo-fallback"><span class="icon">${window.ICONS.bank}</span></div>`
                }
                <div class="bank-card-info">
                  <div class="bank-card-name">${escapeHtml(a.bankName)}</div>
                  <div class="bank-card-number">${escapeHtml(a.accountNumber)}</div>
                  <div class="bank-card-holder">${escapeHtml(a.holderName)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      const a = accounts[spotlightIdx];
      if (!a) return '';
      const logoHtml = a.logo
        ? `<img src="assets/banks/${escapeAttr(a.logo)}" alt="${escapeHtml(a.bankName)}" />`
        : `<span class="icon">${window.ICONS.bank}</span>`;
      const logoCls = a.logo ? '' : ' bank-spotlight-logo-fallback';
      return `
        <div class="bank-stage" data-state="spotlight">
          <div class="bank-spotlight-header">
            <img src="assets/KebenaMKC-logo.svg" alt="Church Logo" class="bank-spotlight-church-logo" />
            <div class="bank-spotlight-church">${escapeHtml(a.churchName || window.AppState.churchName)}</div>
          </div>
          <div class="bank-spotlight">
            <div class="bank-spotlight-card">
              <div class="bank-spotlight-card-accent"></div>
              <div class="bank-spotlight-card-body">
                <div class="bank-spotlight-brand">
                  <div class="bank-spotlight-logo${logoCls}">${logoHtml}</div>
                </div>
                <div class="bank-spotlight-details">
                  <div class="bank-spotlight-name">${escapeHtml(a.bankName)}</div>
                  <div class="bank-spotlight-detail">
                    <span class="bank-spotlight-label">Account Number</span>
                    <span class="bank-spotlight-value bank-spotlight-account-number">${escapeHtml(a.accountNumber)}</span>
                  </div>
                  <div class="bank-spotlight-detail">
                    <span class="bank-spotlight-label">Account Holder</span>
                    <span class="bank-spotlight-value bank-spotlight-holder-name">${escapeHtml(a.holderName)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bank-spotlight-footer">
              <div class="bank-spotlight-dots">
                ${accounts.map((_, i) => `<span class="bank-dot ${i === spotlightIdx ? 'active' : ''}"></span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
};
