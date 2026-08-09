// YouTube / Media player manager — embed and play YouTube videos full-screen.
// Also supports offline video files (mp4, webm, etc.).
window.Media = {
  links: [],
  videoFiles: [],
  pendingId: null,
  pendingType: null,
  liveId: null,
  liveType: null,
  externalOpened: false,
  youtubeLoggedIn: false,
  // Tracks the YouTube URL currently presented on the second screen (when navigated directly)
  liveYouTubeUrl: null,
  // Tracks the current URL of the operator-side webview browser
  currentBrowserUrl: '',

  async init() {
    this.links = await window.Store.get('mediaLinks') || [];
    this.videoFiles = await window.Store.get('videoFiles') || [];
    this.pendingId = null;
    this.pendingType = null;
    this.liveId = null;
    this.liveType = null;
    this.externalOpened = false;
    this.youtubeLoggedIn = false;
    
    // Listen for YouTube login state changes
    if (window.api.onYouTubeLoginState) {
      window.api.onYouTubeLoginState((state) => {
        this.youtubeLoggedIn = state;
        this.renderOperatorInline();
      });
    }
    
    this.renderOperatorInline();
  },

  async refresh() {
    this.links = await window.Store.get('mediaLinks') || [];
    this.videoFiles = await window.Store.get('videoFiles') || [];
    
    // Safety check: clear selection if deleted
    if (this.pendingId && !this.links.some(l => l.id === this.pendingId) && !this.videoFiles.some(v => v.id === this.pendingId)) {
      this.pendingId = null;
      this.pendingType = null;
    }
    if (this.liveId && !this.links.some(l => l.id === this.liveId) && !this.videoFiles.some(v => v.id === this.liveId)) {
      this.liveId = null;
      this.liveType = null;
      this.externalOpened = false;
    }
    this.renderOperatorInline();
  },

  // Alias for backward compatibility if called from elsewhere
  renderList() {
    this.renderOperatorInline();
  },

  async addVideoFile() {
    const filePath = await window.api.openVideoDialog();
    if (!filePath) return;
    const fileName = filePath.split(/[\\/]/).pop();
    const newFile = {
      id: window.Store.newId(),
      title: fileName,
      filePath: filePath,
      createdAt: new Date().toISOString()
    };
    this.videoFiles.push(newFile);
    await window.Store.set('videoFiles', this.videoFiles);
    
    // Auto select the new video file
    this.pendingId = newFile.id;
    this.pendingType = 'local';
    
    this.renderOperatorInline();
  },

  renderOperatorInline() {
    const container = document.getElementById('mediaOperatorContainer');
    if (!container) return;

    const self = this;
    const churchName = window.AppState.churchName || 'Kebena MKC';

    // Combine links and files into one list
    const mediaItems = [];
    this.links.forEach(l => {
      mediaItems.push({ id: l.id, type: 'youtube', title: l.title || l.url, subtitle: l.url, obj: l });
    });
    this.videoFiles.forEach(vf => {
      mediaItems.push({ id: vf.id, type: 'local', title: vf.title, subtitle: vf.filePath, obj: vf });
    });

    let selectedItem = null;
    if (this.pendingId) {
      selectedItem = mediaItems.find(m => m.id === this.pendingId);
    }

    let livePreviewContent = '';
    if (this.liveId) {
      const liveItem = mediaItems.find(m => m.id === this.liveId);
      if (liveItem) {
        const iconColor = liveItem.type === 'youtube' ? '#ff0000' : '#4f46e5';
        const typeLabel = liveItem.type === 'youtube' ? 'YouTube Video Playing on Second Monitor' : 'Local Video Playing on Second Monitor';
        livePreviewContent = `
          <div style="background:rgba(255,255,255,0.05); padding:30px 40px; border-radius:18px; border:1.5px dashed rgba(255,255,255,0.15); display:flex; flex-direction:column; align-items:center; gap:16px; max-width:85%;">
            <span class="icon" style="width:48px; height:48px; color:${iconColor}; display:flex; align-items:center; justify-content:center;">${window.ICONS.play}</span>
            <div style="font-size:1.25rem; font-weight:800; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,0.5);">${typeLabel}</div>
            <div style="font-size:0.95rem; color:rgba(255,255,255,0.6); word-break:break-all; font-weight:600;">${escapeHtml(liveItem.title)}</div>
          </div>
        `;
      }
    } else if (this.liveYouTubeUrl) {
      livePreviewContent = `
        <div style="background:rgba(255,255,255,0.05); padding:30px 40px; border-radius:18px; border:1.5px dashed rgba(255,255,255,0.15); display:flex; flex-direction:column; align-items:center; gap:16px; max-width:85%;">
          <span class="icon" style="width:48px; height:48px; color:#ff0000; display:flex; align-items:center; justify-content:center;">${window.ICONS.play}</span>
          <div style="font-size:1.25rem; font-weight:800; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,0.5);">YouTube Video Playing on Second Monitor</div>
          <div style="font-size:0.95rem; color:rgba(255,255,255,0.6); word-break:break-all; font-weight:600;">${escapeHtml(this.liveYouTubeUrl)}</div>
        </div>
      `;
    } else {
      livePreviewContent = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:16px; color:#5c6a8a;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.4;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <div style="font-size:1.15rem; font-weight:700;">No Media Playing</div>
          <div style="font-size:0.85rem; opacity:0.8;">Browse YouTube on the right, then click Present Current Video</div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="soc-op-view">
        <div class="soc-op-main" style="padding-top: 0; grid-template-columns: 1fr 1fr 280px;">

          <!-- LEFT: Live Preview Area -->
          <div class="soc-op-preview-area" style="padding: 20px 20px; gap: 12px;">
            
            <!-- LIVE card -->
            <div class="soc-op-preview-card ${(this.liveId || this.liveYouTubeUrl) ? 'soc-op-live-card' : ''}" style="flex:1; display:flex; flex-direction:column; min-height:0; border-radius:16px;">
              <div class="soc-op-preview-header" style="padding: 10px 16px;">
                <div class="soc-op-preview-label" style="font-size:11px;">
                  <span class="soc-op-dot ${(this.liveId || this.liveYouTubeUrl) ? 'soc-op-dot-live' : ''}" style="background:${(this.liveId || this.liveYouTubeUrl) ? '#ed1c24' : '#5c6a8a'};"></span>
                  Presented Screen (Live)
                </div>
                <div class="soc-op-preview-timer" id="mediaLiveStatus" style="font-size:11px; font-weight:800; color:${(this.liveId || this.liveYouTubeUrl) ? '#ed1c24' : '#5c6a8a'};">${(this.liveId || this.liveYouTubeUrl) ? 'LIVE' : 'IDLE'}</div>
              </div>
              <div class="soc-op-desktop-wrap" style="flex:1; background:#07070d;">
                <div class="soc-op-desktop-screen" id="mediaLivePreview" style="background:#07070d; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                  ${livePreviewContent}
                </div>
              </div>
            </div>

            <!-- Close media action -->
            <button id="mediaCloseBtn" class="op-btn-stop op-btn-block" style="flex-shrink:0;">
              <span class="icon" style="display:inline-flex; align-items:center;">${window.ICONS.close}</span> Close Media
            </button>

          </div><!-- /preview-area -->

          <!-- MIDDLE: YouTube Browser (webview) -->
          <div class="soc-op-preview-area" style="padding: 20px 20px; gap: 8px;">
            <div class="soc-op-preview-card media-browser-panel" style="flex:1; display:flex; flex-direction:column; min-height:0; border-radius:16px; overflow:hidden;">
              
              <!-- Browser toolbar -->
              <div class="media-browser-toolbar" style="display:flex; align-items:center; gap:6px; padding:8px 10px; background:#1f1f2e; border-bottom:1px solid #2a2a3e; flex-shrink:0;">
                <button id="ytBackBtn" title="Back" style="width:28px; height:28px; border:none; background:rgba(255,255,255,0.08); color:#fff; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px;">←</button>
                <button id="ytFwdBtn" title="Forward" style="width:28px; height:28px; border:none; background:rgba(255,255,255,0.08); color:#fff; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px;">→</button>
                <button id="ytReloadBtn" title="Reload" style="width:28px; height:28px; border:none; background:rgba(255,255,255,0.08); color:#fff; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px;">⟳</button>
                <button id="ytHomeBtn" title="YouTube Home" style="width:28px; height:28px; border:none; background:rgba(255,0,0,0.25); color:#fff; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800;">YT</button>
                <input id="ytAddressBar" type="text" placeholder="Search YouTube or paste URL..." value="${escapeAttr(this.currentBrowserUrl || '')}" style="flex:1; height:28px; border-radius:6px; border:1px solid #2a2a3e; background:#0f0f1a; color:#fff; font-size:11px; padding:0 10px; min-width:0;" />
                <button id="ytGoBtn" title="Go" style="height:28px; padding:0 12px; border:none; background:#1f4497; color:#fff; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700;">Go</button>
              </div>

              <!-- The webview: real YouTube.com with shared login partition -->
              <webview id="mediaWebview" partition="persist:youtube-login" src="https://www.youtube.com/" allowpopups="off" style="flex:1; min-height:0; width:100%; background:#000;" http_referrer="https://www.youtube.com/" useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"></webview>

            </div>

            <!-- Present Current Video action -->
            <button id="mediaPresentCurrentBtn" class="op-btn-present op-btn-block" style="flex-shrink:0;">
              <span class="icon">${window.ICONS.play}</span> Present Current Video
            </button>

          </div><!-- /browser-area -->

          <!-- RIGHT: Sidebar -->
          <div class="soc-op-sidebar" style="padding: 16px 14px; gap: 14px;">
            
            <!-- Screen Status Message (No Secondary Screen / Secondary Screen Detected) -->
            <div id="mediaScreenStatus" style="font-size:10px; font-weight:800; color:#5c6a8a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:6px; margin-bottom:2px; padding:4px 8px; border-radius:6px; background:rgba(0,0,0,0.03); width:fit-content; border: 1px solid rgba(0,0,0,0.05);">
               Detecting Screen...
            </div>



            <!-- ═══ SIDEBAR CONTROLS CARD ═══ -->
            <div class="soc-op-controls-card" style="background:rgba(31,68,151,0.04); padding:10px 12px; border-radius:14px; display:flex; flex-direction:column; gap:6px; border: 1px solid rgba(31,68,151,0.1; flex-shrink:0;">
              <div style="font-size:10px; font-weight:800; color:#1f4497; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">
                Saved Media
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn btn-primary" id="mediaAddYoutubeBtn" style="height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; font-weight:700; width:100%; padding:0; cursor:pointer;">
                  <span class="icon" style="display:inline-flex; align-items:center;">${window.ICONS.plus || '+'}</span> Add YouTube Link
                </button>
                <button class="btn btn-ghost" id="mediaAddFileBtn" style="height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; font-weight:700; border:1px solid rgba(31,68,151,0.2); background:#fff; color:#1f4497; width:100%; padding:0; cursor:pointer;">
                  <span class="icon" style="display:inline-flex; align-items:center; font-size:12px;">📁</span> Add Video File
                </button>
              </div>
            </div>

            <!-- Queue selector / Current Details control -->
            <div class="soc-op-queue-select" style="flex-direction:column; align-items:stretch; gap:6px; padding:10px 12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex;align-items:center;gap:8px; font-weight:800; font-size:11px;">
                  <span class="soc-op-queue-badge" style="background:#1f4497; padding:2px 8px; border-radius:5px;">INFO</span>
                  Selected Video
                </span>
                <div style="display:flex; gap:6px;">
                  <button class="soc-op-nav-btn" id="mediaEditBtn" title="Edit YouTube Link" style="width:28px; height:28px; background:rgba(31,68,151,0.08); border-color:rgba(31,68,151,0.2); display:${(selectedItem && selectedItem.type === 'youtube') ? 'flex' : 'none'}; align-items:center; justify-content:center; border-radius:6px; cursor:pointer;">
                    ${window.ICONS.edit}
                  </button>
                  <button class="soc-op-nav-btn" id="mediaDeleteBtn" title="Delete media" style="width:28px; height:28px; background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.3); display:${selectedItem ? 'flex' : 'none'}; align-items:center; justify-content:center; border-radius:6px; cursor:pointer;">
                    ${window.ICONS.trash}
                  </button>
                </div>
              </div>
              <div id="mediaSidebarDetail" style="font-size:11px; color:#5c6a8a; border-top:1px solid #dde3ef; padding-top:6px; margin-top:2px; line-height:1.4;">
                ${selectedItem ? `
                  <strong>Title:</strong> ${escapeHtml(selectedItem.title)}<br>
                  <strong style="margin-top:2px; display:inline-block;">Type:</strong> ${selectedItem.type === 'youtube' ? 'YouTube link' : 'Local file'}<br>
                  <strong style="margin-top:2px; display:inline-block;">Source:</strong> <span style="word-break:break-all; color:#7a89a8;">${escapeHtml(selectedItem.subtitle)}</span>
                ` : 'No saved media selected'}
              </div>
              ${selectedItem ? `
                <button id="mediaPresentBtn" class="op-btn-present op-btn-block" style="margin-top:4px;">
                  <span class="icon">${window.ICONS.play}</span> Present Saved
                </button>
              ` : ''}
            </div>

            <!-- Active Streams list -->
            <div class="soc-op-section" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div class="soc-op-section-label">Media Stream</div>
              <div class="soc-op-account-list" id="mediaStreamList" style="flex:1; overflow-y:auto; margin-top:2px;">
                ${mediaItems.map((item, i) => {
                  const isPending = self.pendingId === item.id;
                  const isLive = self.liveId === item.id;
                  const itemBadgeBg = item.type === 'youtube' ? '#ff0000' : '#4f46e5';
                  const itemBadgeText = item.type === 'youtube' ? 'YT' : 'LOC';
                  return `
                    <div class="soc-op-account-item ${isPending ? 'soc-op-account-active' : ''}" data-media-id="${item.id}" data-media-type="${item.type}">
                      <div class="soc-op-account-num ${isLive ? 'soc-op-account-num-active' : ''}" style="background:${isLive ? '#ed1c24' : '#f0f3fa'}; color:${isLive ? '#fff' : '#7a89a8'};">${i + 1}</div>
                      <div class="soc-op-account-info">
                        <div class="soc-op-account-handle" style="font-weight:700;">${escapeHtml(item.title)}</div>
                        <div class="soc-op-account-platform" style="display:flex; align-items:center; gap:5px;">
                          <span style="background:${itemBadgeBg}; color:#fff; font-size:8px; font-weight:900; padding:1px 4px; border-radius:3px;">${itemBadgeText}</span>
                          <span style="font-size:10px; color:#7a89a8; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.subtitle)}</span>
                        </div>
                      </div>
                      ${isLive ? `<div class="soc-op-account-status" style="background:#ed1c24; box-shadow:0 0 7px rgba(237,28,36,0.45);"></div>` : ''}
                    </div>
                  `;
                }).join('')}
                ${mediaItems.length === 0 ? `<div style="text-align:center; padding:30px 10px; color:#7a89a8; font-size:12px; font-weight:600;">No videos or links added yet.</div>` : ''}
              </div>
            </div>

          </div><!-- /sidebar -->
        </div><!-- /main -->
      </div>
    `;

    // Hook up screen detection
    const checkScreenDetection = async () => {
      let hasSecondScreen = false;
      try {
        const displays = await window.api.getDisplays();
        hasSecondScreen = displays && displays.some(d => d.isExternal);
      } catch (e) { /* ignore */ }
      
      const screenStatusMsg = document.getElementById('mediaScreenStatus');
      if (screenStatusMsg) {
        if (hasSecondScreen) {
          screenStatusMsg.innerHTML = `<span style="color:#22c55e;">●</span> Secondary Screen Detected`;
        } else {
          screenStatusMsg.innerHTML = `<span style="color:#ef4444;">●</span> No Secondary Screen`;
        }
      }
    };
    checkScreenDetection();

    // Hook up sidebar selection click
    const sList = document.getElementById('mediaStreamList');
    if (sList) {
      sList.querySelectorAll('.soc-op-account-item').forEach(item => {
        item.addEventListener('click', () => {
          self.pendingId = item.dataset.mediaId;
          self.pendingType = item.dataset.mediaType;
          // For saved YouTube links, navigate the webview to that video so the
          // user can preview it before presenting.
          if (item.dataset.mediaType === 'youtube') {
            const m = mediaItems.find(x => x.id === item.dataset.mediaId);
            if (m) {
              const videoId = self._extractVideoId(m.obj.url);
              if (videoId) {
                const wv = document.getElementById('mediaWebview');
                if (wv) wv.src = `https://www.youtube.com/watch?v=${videoId}`;
              }
            }
          }
          self.renderOperatorInline();
        });
      });
    }

    // Controls card buttons
    document.getElementById('mediaAddYoutubeBtn').onclick = () => this.openForm(null);
    document.getElementById('mediaAddFileBtn').onclick = () => this.addVideoFile();



    // ── Webview browser setup ──────────────────────────────────────────
    const webview = document.getElementById('mediaWebview');
    const addressBar = document.getElementById('ytAddressBar');

    if (webview) {
      // Update the address bar whenever the webview navigates
      webview.addEventListener('did-navigate', (e) => {
        self.currentBrowserUrl = e.url;
        if (addressBar) addressBar.value = e.url;
      });
      webview.addEventListener('did-navigate-in-page', (e) => {
        self.currentBrowserUrl = e.url;
        if (addressBar) addressBar.value = e.url;
      });

      // Keep webview focused so keyboard shortcuts (space, arrows, F for fullscreen) reach YouTube
      webview.addEventListener('dom-ready', () => {
        try { webview.focus(); } catch (e) { /* ignore */ }
      });

      // Block any popups the YouTube page tries to open
      webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        // If it's a YouTube video link, navigate the webview to it instead
        if (e.url && (e.url.includes('youtube.com/watch') || e.url.includes('youtu.be/'))) {
          webview.src = e.url;
        }
      });
    }

    // Browser toolbar buttons
    const backBtn = document.getElementById('ytBackBtn');
    const fwdBtn = document.getElementById('ytFwdBtn');
    const reloadBtn = document.getElementById('ytReloadBtn');
    const homeBtn = document.getElementById('ytHomeBtn');
    const goBtn = document.getElementById('ytGoBtn');

    if (backBtn) backBtn.onclick = () => { try { webview.goBack(); } catch (e) {} };
    if (fwdBtn) fwdBtn.onclick = () => { try { webview.goForward(); } catch (e) {} };
    if (reloadBtn) reloadBtn.onclick = () => { try { webview.reload(); } catch (e) {} };
    if (homeBtn) homeBtn.onclick = () => { webview.src = 'https://www.youtube.com/'; };

    // Address bar: Enter to go (handles search terms and URLs)
    if (goBtn) goBtn.onclick = () => navigateFromAddressBar();
    if (addressBar) {
      addressBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); navigateFromAddressBar(); }
      });
    }
    function navigateFromAddressBar() {
      if (!addressBar || !webview) return;
      const val = addressBar.value.trim();
      if (!val) return;
      // If it's a URL, go directly; otherwise treat as a YouTube search
      const isUrl = /^https?:\/\//i.test(val) || /^[\w-]+(\.[\w-]+)+/.test(val);
      const target = isUrl
        ? (/^https?:\/\//i.test(val) ? val : 'https://' + val)
        : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(val);
      webview.src = target;
    }

    // ── Present Current Video button ───────────────────────────────────
    // Reads the webview's current URL, extracts video ID, and navigates the
    // present window DIRECTLY to the YouTube watch URL (no iframe, no Error 153).
    const presentCurrentBtn = document.getElementById('mediaPresentCurrentBtn');
    if (presentCurrentBtn) {
      presentCurrentBtn.onclick = async () => {
        if (!webview) return;
        const currentUrl = self.currentBrowserUrl || webview.getURL();
        const videoId = self._extractVideoId(currentUrl);
        if (!videoId) {
          alert('No YouTube video is currently loaded in the browser. Browse to a video first.');
          return;
        }
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        // Reset saved-media live state since we are presenting from the browser
        self.liveId = null;
        self.liveType = null;
        self.liveYouTubeUrl = watchUrl;
        const result = await window.Store.presentNavigate(watchUrl);
        self.externalOpened = Boolean(result && result.navigated);
        self.renderOperatorInline();
      };
    }

    // Close Media button
    document.getElementById('mediaCloseBtn').onclick = async () => {
      if (self.liveId || self.liveYouTubeUrl) {
        await window.Store.presentClose();
        self.liveId = null;
        self.liveType = null;
        self.liveYouTubeUrl = null;
        self.externalOpened = false;
        self.renderOperatorInline();
      }
    };

    // Action button inside detail view (Present Saved)
    const presBtn = document.getElementById('mediaPresentBtn');
    if (presBtn) {
      presBtn.onclick = async () => {
        if (!self.pendingId) return;
        
        self.liveId = self.pendingId;
        self.liveType = self.pendingType;
        self.liveYouTubeUrl = null;
        
        const activeItem = mediaItems.find(m => m.id === self.liveId);
        if (activeItem) {
          if (self.liveType === 'youtube') {
            // For saved YouTube links, navigate the present window directly to the watch URL
            const videoId = self._extractVideoId(activeItem.obj.url);
            if (!videoId) { alert('Invalid YouTube URL'); return; }
            const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const result = await window.Store.presentNavigate(watchUrl);
            self.externalOpened = Boolean(result && result.navigated);
          } else {
            // Local video files still use the HTML IPC path (no Error 153 for local files)
            const html = self._buildVideoFileExternalHtml(activeItem.obj.filePath);
            const result = self.externalOpened
              ? await window.Store.presentUpdate({ html, variant: 'media' })
              : await window.Store.presentOpen({ html, variant: 'media' });
            self.externalOpened = Boolean(result && (result.opened || result.updated));
          }
          self.renderOperatorInline();
        }
      };
    }

    const editBtn = document.getElementById('mediaEditBtn');
    if (editBtn) {
      editBtn.onclick = () => {
        if (self.pendingId && self.pendingType === 'youtube') {
          self.openForm(self.pendingId);
        }
      };
    }

    const deleteBtn = document.getElementById('mediaDeleteBtn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!self.pendingId) return;
        if (self.pendingType === 'youtube') {
          await self.deleteLink(self.pendingId);
        } else {
          await self.deleteVideoFile(self.pendingId);
        }
      };
    }
  },

  // Extract YouTube video ID from various URL formats
  _extractVideoId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  },

  openForm(id) {
    const S = window.STRINGS;
    const link = id ? this.links.find((l) => l.id === id) : null;

    const html = `
      <h3>${link ? S.common.edit : S.media.addLink}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label>${S.media.titleLabel}</label>
          <input id="mediaTitleInput" value="${escapeAttr(link ? link.title : '')}" />
        </div>
        <div class="form-row">
          <label>${S.media.urlLabel}</label>
          <input id="mediaUrlInput" value="${escapeAttr(link ? link.url : '')}" placeholder="https://youtube.com/watch?v=... or video ID" style="width:100%; box-sizing:border-box;" />
          <span class="form-hint">${S.media.urlHint}</span>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="mediaCancelBtn">${S.common.cancel}</button>
        <button class="btn btn-primary" id="mediaSaveBtn">${S.common.save}</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);
    document.getElementById('mediaCancelBtn').onclick = () => window.Modal.hide('modalOverlay');
    document.getElementById('mediaSaveBtn').onclick = () => this.saveLink(id);
  },

  async saveLink(id) {
    const title = document.getElementById('mediaTitleInput').value.trim();
    const url = document.getElementById('mediaUrlInput').value.trim();
    if (!url) return;

    if (id) {
      const l = this.links.find((x) => x.id === id);
      if (l) Object.assign(l, { title, url });
    } else {
      const newLink = {
        id: window.Store.newId(),
        title: title || url,
        url,
        createdAt: new Date().toISOString()
      };
      this.links.push(newLink);
      // Auto select the new link
      this.pendingId = newLink.id;
      this.pendingType = 'youtube';
    }
    await window.Store.set('mediaLinks', this.links);
    window.Modal.hide('modalOverlay');
    this.renderOperatorInline();
  },

  async deleteLink(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    this.links = this.links.filter((l) => l.id !== id);
    await window.Store.set('mediaLinks', this.links);
    
    if (this.pendingId === id) {
      this.pendingId = null;
      this.pendingType = null;
    }
    if (this.liveId === id) {
      await window.Store.presentClose();
      this.liveId = null;
      this.liveType = null;
      this.externalOpened = false;
    }
    this.renderOperatorInline();
  },

  async deleteVideoFile(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    this.videoFiles = this.videoFiles.filter((vf) => vf.id !== id);
    await window.Store.set('videoFiles', this.videoFiles);
    
    if (this.pendingId === id) {
      this.pendingId = null;
      this.pendingType = null;
    }
    if (this.liveId === id) {
      await window.Store.presentClose();
      this.liveId = null;
      this.liveType = null;
      this.externalOpened = false;
    }
    this.renderOperatorInline();
  },

  _buildVideoFileExternalHtml(filePath) {
    return `
      <div class="media-stage" id="mediaStage" style="width:100vw; height:100vh; background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0;">
        <video
          class="media-video"
          src="file:///${filePath.replace(/\\/g, '/')}"
          autoplay
          controls
          style="max-width:100vw; max-height:100vh; width:auto; height:auto; object-fit:contain; background:#000;"
        ></video>
      </div>
    `;
  },

  _buildMediaExternalHtml(videoId) {
    return `
      <div class="media-stage" id="mediaStage" style="width:100vw; height:100vh; background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0;">
        <iframe
          class="media-iframe"
          src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=0&origin=https://www.youtube.com"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowfullscreen
          style="width:100%; height:100%; border:none;"
        ></iframe>
      </div>
    `;
  }
};