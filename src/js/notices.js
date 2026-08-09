window.Notices = {
  notices: [],
  editingId: null,
  _op: null,

  async init() {
    this.notices = await window.Store.get('notices');
    this._op = null;
    await this.renderCombinedView();
  },

  async refresh() {
    this.notices = await window.Store.get('notices');
    if (this._op) {
      this._op.refresh(this.notices);
    } else {
      await this.renderCombinedView();
    }
  },

  // -----------------------------------------------------------------------
  // Combined operator + management view (replaces old renderList + present)
  // -----------------------------------------------------------------------
  async renderCombinedView() {
    const container = document.getElementById('noticesOperatorContainer');
    if (!container) return;

    const settings = await window.Store.get('settings');
    const S = window.STRINGS.notices;
    const C = window.STRINGS.calendar;

    // Clean up previous state
    if (this._op && this._op._cleanup) this._op._cleanup();

    // Datetime strings
    const today = new Date();
    const ec = window.EthCal.gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const dateStr = `${C.ethMonths[ec.month - 1]} ${ec.day}, ${ec.year}`;
    const timeStr = this._ethiopianTimeStr();

    // Operator closure state
    let externalOpened = false;
    let autoTimer = null;
    let autoOn = false;
    let groupIndex = 0;
    let singleMode = false;
    let singleNoticeIdx = 0;
    let activeNotices = this.notices.filter(n => n.active !== false);
    let groups = chunk(activeNotices, 2);

    // ---- Render shell HTML ----
    container.innerHTML = `
      <div class="notices-combined-view">
        <div class="soc-op-view">
          <div class="soc-op-main" style="padding-top:0; grid-template-columns: 1fr 1fr;">

            <!-- LEFT: Previews + Controls + Slides (mirrors Bible left column) -->
            <div class="soc-op-preview-area" style="padding:14px 16px; gap:10px;">

              <!-- Top: Side-by-side LIVE + PENDING -->
              <div class="soc-op-preview-row" style="gap:10px; width:100%; flex-shrink:0;">

                <!-- LIVE -->
                <div class="soc-op-preview-card" style="flex:1; display:flex; flex-direction:column; border-radius:12px; min-width:0;">
                  <div class="soc-op-preview-header" style="padding:6px 10px;">
                    <div class="soc-op-preview-label" style="font-size:10px;">
                      <span class="soc-op-dot" id="noticesLiveDot" style="background:#94a3b8;"></span>
                      Presented Screen (Live)
                    </div>
                    <div class="soc-op-preview-timer" id="noticesLiveStatus" style="font-size:10px; font-weight:800; color:#94a3b8;">IDLE</div>
                  </div>
                  <div style="background:#fff; aspect-ratio:16/9; width:100%; overflow:hidden;" id="noticesPreviewScreen"></div>
                </div>

                <!-- PENDING -->
                <div class="soc-op-preview-card" style="flex:1; display:flex; flex-direction:column; border-radius:12px; min-width:0;">
                  <div class="soc-op-preview-header" style="padding:6px 10px; background:#fff3cd; border-bottom-color:#ffeeba;">
                    <div class="soc-op-preview-label" style="color:#856404; font-size:10px;">
                      <span class="soc-op-dot soc-op-dot-next" style="background:#f59e0b;"></span>
                      Pending Slide
                    </div>
                    <div class="soc-op-preview-timer" style="color:#856404; font-size:10px; font-weight:800;">NEXT</div>
                  </div>
                  <div style="background:#fffbf0; aspect-ratio:16/9; width:100%; overflow:hidden;" id="noticesPendingScreen"></div>
                </div>

              </div>

              <!-- Middle: Controller bar -->
              <div style="background:rgba(31,68,151,0.04); border:1px solid rgba(31,68,151,0.08); border-radius:12px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0;">
                <div style="display:flex; gap:8px; align-items:center;">
                  <button id="noticesAutoBtn" data-action="auto" style="height:32px; border-radius:8px; border:1px solid rgba(31,68,151,0.2); background:#fff; color:#1f4497; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; padding:0 12px; transition:all 0.2s;">
                    <span class="icon" id="noticesAutoIcon" style="display:inline-flex; align-items:center;">${window.ICONS.play}</span>
                    <span id="noticesAutoLabel">Auto: Off</span>
                  </button>
                  <div style="display:flex; gap:4px;">
                    <button data-action="prev" style="width:32px; height:32px; border-radius:8px; border:1px solid #dde3ef; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Previous">${window.ICONS.arrowLeft}</button>
                    <button data-action="next" style="width:32px; height:32px; border-radius:8px; border:1px solid #dde3ef; background:#fff; color:#333; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Next">${window.ICONS.arrowRight}</button>
                  </div>
                  <div id="noticesProgress" style="font-size:11px; font-weight:700; color:#1f4497;">${groups.length > 0 ? '1 / ' + groups.length : '\u2014'}</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button id="noticesCloseBtn" data-action="close-presentation" class="op-btn-stop" disabled title="Close presentation screen">
                    <span class="icon">${window.ICONS.close}</span> Close Presentation
                  </button>
                  <button data-action="present" class="op-btn-present" title="Send to presentation screen">
                    <span class="icon">${window.ICONS.play}</span> Change / Present
                  </button>
                </div>
              </div>

              <!-- Bottom: Presentation Slides -->
              <div style="flex:1; min-height:0; display:flex; flex-direction:column; border:1px solid #dde3ef; border-radius:10px; background:#fff; overflow:hidden;">
                <div class="notices-section-label" style="border-bottom:1px solid #dde3ef; display:flex; align-items:center; gap:8px;">
                  Presentation Slides
                  <span id="noticesProgressBadge" style="font-weight:700; color:var(--color-primary); font-size:0.8rem; text-transform:none; letter-spacing:0;">${groups.length > 0 ? '1 / ' + groups.length : '\u2014'}</span>
                </div>
                <div class="notices-slides-grid" id="noticesNavList" style="max-height:none; flex:1; overflow-y:auto;"></div>
              </div>

            </div>

            <!-- RIGHT: Weekly Notices sidebar -->
            <div class="soc-op-sidebar" style="padding:10px 12px; gap:10px; display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;">

              <!-- Header -->
              <div style="display:flex; align-items:center; justify-content:space-between; flex-shrink:0; padding:10px 14px; background:var(--color-surface); border-radius:var(--radius-sm); box-shadow:var(--shadow-sm); border:1px solid var(--color-border);">
                <div style="font-size:12px; font-weight:700; color:var(--color-text);">Weekly Notices</div>
                <button class="btn btn-primary notices-add-btn" data-action="add-notice" style="font-size:11px; padding:5px 12px;">
                  <span class="icon">${window.ICONS.plus}</span>${S.addNoticeEn}
                </button>
              </div>

              <!-- Regular + New columns -->
              <div style="flex:1; min-height:0; display:flex; gap:10px; overflow:hidden;">
                <div class="notices-mgmt-col" style="flex:1;">
                  <div class="notices-col-header notices-col-header-permanent"><span class="notices-tab-badge badge-permanent">Regular</span> Regular</div>
                  <div class="notices-col-list" id="noticesPermanentList"></div>
                </div>
                <div class="notices-mgmt-col" style="flex:1;">
                  <div class="notices-col-header notices-col-header-new"><span class="notices-tab-badge badge-new">New</span> New</div>
                  <div class="notices-col-list" id="noticesNewList"></div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    `;

    const previewScreen  = document.getElementById('noticesPreviewScreen');
    const pendingScreen  = document.getElementById('noticesPendingScreen');
    const progressEl     = document.getElementById('noticesProgress');
    const statusEl       = document.getElementById('noticesLiveStatus');
    const permanentListEl = document.getElementById('noticesPermanentList');
    const newListEl      = document.getElementById('noticesNewList');
    const navListEl      = document.getElementById('noticesNavList');

    // ---- HTML builders ----
    const buildNoticeGroupHtml = (group) => group.map((n) => `
      <div class="notice-card">
        <div class="notice-card-top">
          ${n.type === 'permanent'
            ? `<span class="notice-card-badge badge-permanent">${S.permanentShort}</span>`
            : `<span class="notice-card-badge badge-new">${S.newShort}</span>`}
        </div>
        <div class="notice-card-title">${parseHighlight(n.title)}</div>
        <div class="notice-card-body">${parseHighlight(n.body)}</div>
        <div class="notice-meta">
          ${n.date ? `<span class="notice-meta-item"><span class="icon">${window.ICONS.calendar}</span>${escapeHtml(formatNoticeDate(n))}</span>` : ''}
          <span class="notice-meta-item"><span class="icon">${window.ICONS.clock}</span>${escapeHtml(formatNoticeTime(n, timeStr))}</span>
        </div>
      </div>
    `).join('');

    const buildSingleNoticeHtml = (notice) => `
      <div class="notice-single-stage">
        <div class="notice-single-card">
          <div class="notice-single-badge-row">
            ${notice.type === 'permanent'
              ? `<span class="notice-card-badge badge-permanent">${S.permanentShort}</span>`
              : `<span class="notice-card-badge badge-new">${S.newShort}</span>`}
          </div>
          <div class="notice-single-title">${parseHighlight(notice.title)}</div>
          <div class="notice-single-body">${parseHighlight(notice.body)}</div>
          <div class="notice-single-meta">
            ${notice.date ? `<span class="notice-single-meta-item"><span class="icon">${window.ICONS.calendar}</span>${escapeHtml(formatNoticeDate(notice))}</span>` : ''}
            <span class="notice-single-meta-item"><span class="icon">${window.ICONS.clock}</span>${escapeHtml(formatNoticeTime(notice, timeStr))}</span>
          </div>
        </div>
      </div>
    `;

    const buildExternalGroupHtml = (group) => {
      if (group.length === 1) return buildExternalSingleHtml(group[0]);
      return `
        <div class="notice-header">
          <div class="notice-page-title">${S.title}</div>
          <div class="notice-ec-date">${escapeHtml(dateStr)}</div>
        </div>
        <div class="notice-stage">${buildNoticeGroupHtml(group)}</div>
      `;
    };

    const buildExternalSingleHtml = (notice) => `
      <div class="notice-header">
        <div class="notice-page-title">${S.title}</div>
        <div class="notice-ec-date">${escapeHtml(dateStr)}</div>
      </div>
      <div class="notice-stage notice-stage-single">${buildSingleNoticeHtml(notice)}</div>
    `;

    // ---- Fill a 16:9 preview box with realistic presented notice screen content ----
    const fillScreenBox = (box, group, notice) => {
      if (!box) return;
      
      box.style.position = 'relative';
      box.style.overflow = 'hidden';
      
      let html = '';
      if (notice) {
        html = buildExternalSingleHtml(notice);
      } else if (group && group.length === 1) {
        html = buildExternalSingleHtml(group[0]);
      } else if (group && group.length > 1) {
        html = buildExternalGroupHtml(group);
      } else {
        box.innerHTML = `<div style="color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100%;font-size:0.85rem;">— No Notice Selected —</div>`;
        return;
      }
      
      // Wrap the content inside a 1920x1080 canvas and scale it down to fit box width
      box.innerHTML = `
        <div class="notice-preview-scaled-content" style="
          width: 1920px;
          height: 1080px;
          position: absolute;
          top: 0;
          left: 0;
          transform-origin: top left;
          box-sizing: border-box;
          background: #ffffff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        ">
          ${html}
        </div>
      `;
      
      const updateScale = () => {
        const wrapper = box.querySelector('.notice-preview-scaled-content');
        if (!wrapper) return;
        const boxWidth = box.clientWidth;
        if (boxWidth > 0) {
          const scaleFactor = boxWidth / 1920;
          wrapper.style.transform = `scale(${scaleFactor})`;
        }
      };
      
      // Update scale immediately and in next event loop tick
      updateScale();
      setTimeout(updateScale, 0);
      
      // Keep it perfectly scaled on resize
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
          updateScale();
        });
        ro.observe(box);
        if (box._ro) box._ro.disconnect();
        box._ro = ro;
      }
    };

    // ---- Render presented screen preview ----
    const renderPreview = () => {
      if (singleMode) {
        fillScreenBox(previewScreen, null, activeNotices[singleNoticeIdx] || null);
      } else {
        fillScreenBox(previewScreen, groups[groupIndex] || null, null);
      }
    };

    // ---- Render pending (next) screen preview ----
    const renderPending = () => {
      if (groups.length <= 1 && !singleMode) {
        fillScreenBox(pendingScreen, null, null);
        return;
      }
      if (singleMode) {
        const nextIdx = ((singleNoticeIdx + 1) % (activeNotices.length || 1));
        fillScreenBox(pendingScreen, null, activeNotices[nextIdx] || null);
      } else {
        const nextIdx = ((groupIndex + 1) % (groups.length || 1));
        fillScreenBox(pendingScreen, groups[nextIdx] || null, null);
      }
    };

    // ---- External window update ----
    const updateExternal = async () => {
      if (activeNotices.length === 0) {
        if (statusEl) statusEl.textContent = 'No notices';
        return;
      }
      let html;
      if (singleMode) {
        const notice = activeNotices[singleNoticeIdx];
        if (!notice) return;
        html = buildExternalSingleHtml(notice);
      } else {
        const group = groups[groupIndex];
        if (!group) return;
        html = buildExternalGroupHtml(group);
      }
      renderPreview();
      renderPending();
      if (statusEl) statusEl.textContent = 'Sending...';
      const _font = 'Noto Sans Ethiopic';
      const result = externalOpened
        ? await window.Store.presentUpdate({ html, variant: 'notices', fontFamily: _font })
        : await window.Store.presentOpen({ html, variant: 'notices', fontFamily: _font });
      externalOpened = Boolean(result && (result.opened || result.updated));
      // Update live status badge
      if (statusEl) {
        statusEl.textContent = externalOpened ? 'LIVE' : 'IDLE';
        statusEl.style.color = externalOpened ? '#ed1c24' : '#94a3b8';
      }
      // Update live dot color
      const liveDot = document.getElementById('noticesLiveDot');
      if (liveDot) liveDot.style.background = externalOpened ? '#ed1c24' : '#94a3b8';
      updateCloseBtn();
    };

    // Enabled/disabled look comes from .op-btn-stop:disabled, so this only has
    // to flip the property — no inline colours to keep in sync any more.
    const updateCloseBtn = () => {
      const btn = document.getElementById('noticesCloseBtn');
      if (btn) btn.disabled = !externalOpened;
    };

    const closePresentation = async () => {
      if (!externalOpened) return;
      await window.Store.presentClose();
      externalOpened = false;
      if (statusEl) {
        statusEl.textContent = 'IDLE';
        statusEl.style.color = '#94a3b8';
      }
      const liveDot = document.getElementById('noticesLiveDot');
      if (liveDot) liveDot.style.background = '#94a3b8';
      if (autoOn) setAuto(false);
      updateCloseBtn();
    };


    // ---- Management list (two separate columns with drag reorder) ----
    const buildNoticeRows = (list, isPermanent) => list.map((n, idx) => `
      <div class="notice-mgmt-row${n.active === false ? ' notice-mgmt-inactive' : ''}" draggable="true" data-id="${n.id}">
        <span class="notice-order-num">${idx + 1}</span>
        <span class="notice-drag-handle" title="Drag to reorder">⋮⋮</span>
        ${isPermanent ? `
          <label class="notice-mgmt-toggle" title="${n.active !== false ? S.hideFromPresent : S.showInPresent}">
            <input type="checkbox" ${n.active !== false ? 'checked' : ''} data-toggle-id="${n.id}" />
            <span class="checkmark"></span>
          </label>` : ''}
        <span class="notice-mgmt-title">${escapeHtml(n.title)}</span>
        <span class="notice-mgmt-actions">
          <button class="icon-mini-btn" data-action="edit" data-id="${n.id}"><span class="icon">${window.ICONS.edit}</span></button>
          <button class="icon-mini-btn danger" data-action="delete" data-id="${n.id}"><span class="icon">${window.ICONS.trash}</span></button>
        </span>
      </div>
    `).join('');

    const setupDragReorder = (colEl, isPermanent) => {
      let draggedId = null;

      colEl.querySelectorAll('.notice-mgmt-row').forEach(row => {
        row.addEventListener('dragstart', (e) => {
          draggedId = row.dataset.id;
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', draggedId);
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          colEl.querySelectorAll('.notice-mgmt-row').forEach(r => r.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const targetRow = e.target.closest('.notice-mgmt-row');
          if (targetRow && targetRow.dataset.id !== draggedId) {
            colEl.querySelectorAll('.notice-mgmt-row').forEach(r => r.classList.remove('drag-over'));
            targetRow.classList.add('drag-over');
          }
        });

        row.addEventListener('dragleave', (e) => {
          const targetRow = e.target.closest('.notice-mgmt-row');
          if (targetRow && !targetRow.contains(e.relatedTarget)) {
            targetRow.classList.remove('drag-over');
          }
        });

        row.addEventListener('drop', async (e) => {
          e.preventDefault();
          colEl.querySelectorAll('.notice-mgmt-row').forEach(r => r.classList.remove('drag-over'));
          const targetRow = e.target.closest('.notice-mgmt-row');
          if (!targetRow || targetRow.dataset.id === draggedId) return;

          const targetId = targetRow.dataset.id;
          const catNotices = this.notices.filter(n => isPermanent ? n.type === 'permanent' : n.type !== 'permanent');
          const draggedIdx = catNotices.findIndex(n => n.id === draggedId);
          const targetIdx = catNotices.findIndex(n => n.id === targetId);

          if (draggedIdx === -1 || targetIdx === -1) return;

          const [movedItem] = catNotices.splice(draggedIdx, 1);
          catNotices.splice(targetIdx, 0, movedItem);

          const otherNotices = this.notices.filter(n => isPermanent ? n.type !== 'permanent' : n.type === 'permanent');
          if (isPermanent) {
            this.notices = [...catNotices, ...otherNotices];
          } else {
            this.notices = [...otherNotices, ...catNotices];
          }

          await window.Store.set('notices', this.notices);
          if (this._op) this._op.refresh(this.notices);
        });
      });
    };

    const renderMgmtList = () => {
      const permanent = this.notices.filter(n => n.type === 'permanent');
      const newOnes   = this.notices.filter(n => n.type !== 'permanent');
      permanentListEl.innerHTML = permanent.length
        ? buildNoticeRows(permanent, true)
        : `<div class="empty-state" style="padding:12px 8px;font-size:0.8rem;">${S.empty}</div>`;
      newListEl.innerHTML = newOnes.length
        ? buildNoticeRows(newOnes, false)
        : `<div class="empty-state" style="padding:12px 8px;font-size:0.8rem;">${S.empty}</div>`;

      // Wire events and drag-and-drop on both columns
      [ { col: permanentListEl, isPerm: true }, { col: newListEl, isPerm: false } ].forEach(({ col, isPerm }) => {
        col.querySelectorAll('[data-toggle-id]').forEach(cb => {
          cb.addEventListener('change', () => this.toggleActive(cb.dataset.toggleId));
        });
        col.querySelectorAll('[data-action="edit"]').forEach(btn => {
          btn.addEventListener('click', () => this.openForm(btn.dataset.id));
        });
        col.querySelectorAll('[data-action="delete"]').forEach(btn => {
          btn.addEventListener('click', () => this.deleteNotice(btn.dataset.id));
        });
        setupDragReorder(col, isPerm);
      });
    };

    // ---- Slide nav (2-column grid) ----
    const renderNav = () => {
      if (groups.length === 0) {
        navListEl.innerHTML = `<div class="empty-state" style="padding:10px;font-size:0.8rem;grid-column:1/-1;">${S.empty}</div>`;
        return;
      }
      navListEl.innerHTML = groups.map((group, i) => {
        const label   = group.map(n => n.title).join(' · ');
        const isActive = !singleMode && i === groupIndex;
        return `
          <button class="notices-slide-btn${isActive ? ' active' : ''}" data-action="goto-group" data-group-index="${i}">
            <span class="notices-slide-num">${i + 1}</span>
            <span class="notices-slide-label">${escapeHtml(label)}</span>
            ${isActive ? `<span class="notices-slide-live">▶</span>` : ''}
          </button>
        `;
      }).join('');
    };

    // ---- Progress ----
    const updateProgress = () => {
      const txt = singleMode
        ? (activeNotices[singleNoticeIdx]?.title || '—')
        : (groups.length > 0 ? `${groupIndex + 1} / ${groups.length}` : '—');
      if (progressEl) progressEl.textContent = txt;
      const badge = document.getElementById('noticesProgressBadge');
      if (badge) badge.textContent = singleMode ? '' : (groups.length > 0 ? `${groupIndex + 1} / ${groups.length}` : '—');
    };


    // ---- Navigation ----
    const goToGroup = (idx) => {
      if (groups.length === 0) return;
      singleMode = false;
      groupIndex = ((idx % groups.length) + groups.length) % groups.length;
      updateProgress();
      renderNav();
      updateExternal().catch(() => {});
      scheduleAuto();
    };

    const goToSingle = (idx) => {
      if (activeNotices.length === 0) return;
      singleMode = true;
      singleNoticeIdx = ((idx % activeNotices.length) + activeNotices.length) % activeNotices.length;
      updateProgress();
      renderNav();
      updateExternal().catch(() => {});
      if (autoOn) setAuto(false);
    };

    // ---- Auto ----
    const scheduleAuto = () => {
      if (autoTimer) clearTimeout(autoTimer);
      if (!autoOn || singleMode || groups.length <= 1) return;
      setTimeout(() => {
        if (!autoOn || singleMode) return;
        const durationMs = this._getNoticeGroupDurationMs(groups[groupIndex], previewScreen, settings.noticeRotateSeconds);
        autoTimer = setTimeout(() => goToGroup(groupIndex + 1), durationMs);
      }, 150);
    };

    const setAuto = (on) => {
      autoOn = on;
      const btn   = document.getElementById('noticesAutoBtn');
      const icon  = document.getElementById('noticesAutoIcon');
      const label = document.getElementById('noticesAutoLabel');
      if (btn)   btn.classList.toggle('active', on);
      if (icon)  icon.innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      if (label) label.textContent = on ? 'Auto: On' : 'Auto: Off';
      if (on && singleMode) { singleMode = false; groupIndex = 0; }
      scheduleAuto();
    };

    // ---- Events ----
    const clickHandler = (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const act = el.dataset.action;
      if (act === 'prev')        { singleMode ? goToSingle(singleNoticeIdx - 1) : goToGroup(groupIndex - 1); }
      else if (act === 'next')   { singleMode ? goToSingle(singleNoticeIdx + 1) : goToGroup(groupIndex + 1); }
      else if (act === 'auto')   { setAuto(!autoOn); }
      else if (act === 'present'){ updateExternal().catch(() => {}); }
      else if (act === 'close-presentation'){ closePresentation().catch(() => {}); }
      else if (act === 'add-notice') { this.openForm(null); }
      else if (act === 'goto-group') { goToGroup(Number(el.dataset.groupIndex)); }
    };

    const keyHandler = (e) => {
      const viewEl = document.getElementById('view-notices');
      if (!viewEl || !viewEl.classList.contains('active')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); singleMode ? goToSingle(singleNoticeIdx + 1) : goToGroup(groupIndex + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { e.preventDefault(); singleMode ? goToSingle(singleNoticeIdx - 1) : goToGroup(groupIndex - 1); }
    };

    container.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);

    // ---- Expose _op ----
    this._op = {
      refresh: (allNotices) => {
        activeNotices = allNotices.filter(n => n.active !== false);
        groups = chunk(activeNotices, 2);
        if (groupIndex >= groups.length) groupIndex = Math.max(0, groups.length - 1);
        if (singleNoticeIdx >= activeNotices.length) singleNoticeIdx = Math.max(0, activeNotices.length - 1);
        renderMgmtList();
        renderNav();
        updateProgress();
        renderPreview();
        renderPending();
        if (externalOpened && activeNotices.length > 0) updateExternal().catch(() => {});
      },
      _cleanup: () => {
        if (autoTimer) clearTimeout(autoTimer);
        container.removeEventListener('click', clickHandler);
        document.removeEventListener('keydown', keyHandler);
      }
    };

    // ---- Initial render (local only — no auto-push to external on startup) ----
    renderMgmtList();
    renderNav();
    updateProgress();
    renderPreview();
    renderPending();
    updateCloseBtn();
  },

  async toggleActive(id) {
    const notice = this.notices.find((n) => n.id === id);
    if (notice) {
      notice.active = notice.active === false ? true : false;
      await window.Store.set('notices', this.notices);
      if (this._op) this._op.refresh(this.notices);
    }
  },

  openForm(id) {
    const S = window.STRINGS;
    this.editingId = id;
    const notice = id ? this.notices.find((n) => n.id === id) : null;
    this._dateState = this._initDateState(notice);

    const html = `
      <h3>${notice ? 'Edit Notice' : 'Add Notice'}</h3>
      <div class="form-grid landscape-form">
        <div class="form-row">
          <label>Notice Type</label>
          <div class="notice-type-picker">
            <label class="type-radio">
              <input type="radio" name="noticeType" value="new" ${(!notice || notice.type !== 'permanent') ? 'checked' : ''} />
              <span class="notice-type-badge badge-new">New</span>
            </label>
            <label class="type-radio">
              <input type="radio" name="noticeType" value="permanent" ${(notice && notice.type === 'permanent') ? 'checked' : ''} />
              <span class="notice-type-badge badge-permanent">Regular</span>
            </label>
          </div>
        </div>
        <div class="form-row">
          <label>Title</label>
          <input id="noticeTitleInput" value="${escapeAttr(notice ? notice.title : '')}" />
          <span class="form-error hidden" id="noticeTitleError">Please enter a title</span>
        </div>
        <div class="landscape-fields">
          <div class="form-row">
            <label>Date</label>
            <div id="noticeDateControl"></div>
          </div>
          <div class="form-row">
            <label>Time</label>
            <input type="time" id="noticeTimeInput" value="${escapeAttr(notice ? notice.time : '')}" />
          </div>
        </div>
        <div class="form-row">
          <label>Body</label>
          <textarea id="noticeBodyInput" rows="4">${escapeHtml(notice ? notice.body : '')}</textarea>
          <span class="form-hint">Wrap words with **double stars** to highlight them</span>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="noticeCancelBtn">Cancel</button>
        <button class="btn btn-primary" id="noticeSaveBtn">Save</button>
      </div>
    `;
    window.Modal.show('modalOverlay', html);
    this._refreshDateControl();

    document.getElementById('noticeCancelBtn').addEventListener('click', () => window.Modal.hide('modalOverlay'));
    document.getElementById('noticeSaveBtn').addEventListener('click', () => this.saveNotice());
    document.getElementById('noticeTitleInput').addEventListener('input', () => {
      document.getElementById('noticeTitleError').classList.add('hidden');
    });
  },

  // --- Calendar-aware date control -------------------------------------------
  _initDateState(notice) {
    let gc;
    if (notice && notice.date && /^\d{4}-\d{2}-\d{2}$/.test(notice.date)) {
      const [y, m, d] = notice.date.split('-').map(Number);
      gc = { year: y, month: m, day: d };
    } else {
      const t = new Date();
      gc = { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
    }
    const calendar = (notice && notice.calendar) || 'ec';
    const v = calendar === 'ec' ? window.EthCal.gcToEc(gc.year, gc.month, gc.day) : gc;
    return { calendar, y: v.year, m: v.month, d: v.day };
  },

  _dateStateToGc() {
    const st = this._dateState;
    return st.calendar === 'ec' ? window.EthCal.ecToGc(st.y, st.m, st.d) : { year: st.y, month: st.m, day: st.d };
  },

  _maxDay() {
    const st = this._dateState;
    return st.calendar === 'ec' ? window.EthCal.daysInEthMonth(st.y, st.m) : window.EthCal.daysInGcMonth(st.y, st.m);
  },

  _refreshDateControl() {
    const C = window.STRINGS.calendar;
    const st = this._dateState;
    const months = st.calendar === 'ec' ? C.ethMonths : C.gcMonths;
    const maxDay = this._maxDay();
    if (st.d > maxDay) st.d = maxDay;

    let dayOpts = '';
    for (let d = 1; d <= maxDay; d++) dayOpts += `<option value="${d}" ${d === st.d ? 'selected' : ''}>${d}</option>`;
    const monOpts = months.map((nm, i) => `<option value="${i + 1}" ${i + 1 === st.m ? 'selected' : ''}>${nm}</option>`).join('');

    const other = st.calendar === 'ec' ? this._dateStateToGc() : window.EthCal.gcToEc(st.y, st.m, st.d);
    const otherMonths = st.calendar === 'ec' ? C.gcMonths : C.ethMonths;
    const otherLabel = st.calendar === 'ec' ? C.gregorian : C.ethiopian;

    document.getElementById('noticeDateControl').innerHTML = `
      <div class="cal-toggle">
        <button type="button" class="cal-tab ${st.calendar === 'ec' ? 'active' : ''}" data-cal="ec">Ethiopian (${C.ethiopian})</button>
        <button type="button" class="cal-tab ${st.calendar === 'gc' ? 'active' : ''}" data-cal="gc">Gregorian (${C.gregorian})</button>
      </div>
      <div class="cal-fields">
        <select id="noticeMonthInput" title="Month">${monOpts}</select>
        <select id="noticeDayInput" title="Day">${dayOpts}</select>
        <input type="number" id="noticeYearInput" title="Year" value="${st.y}" min="1" max="3000" />
      </div>
      <span class="form-hint">= ${otherLabel}: ${otherMonths[other.month - 1]} ${other.day}, ${other.year}</span>
    `;

    document.querySelectorAll('#noticeDateControl .cal-tab').forEach((tab) => {
      tab.addEventListener('click', () => this._switchCalendar(tab.dataset.cal));
    });
    document.getElementById('noticeMonthInput').addEventListener('change', (e) => { this._dateState.m = Number(e.target.value); this._refreshDateControl(); });
    document.getElementById('noticeDayInput').addEventListener('change', (e) => { this._dateState.d = Number(e.target.value); this._refreshDateControl(); });
    document.getElementById('noticeYearInput').addEventListener('change', (e) => {
      const y = Number(e.target.value);
      if (y >= 1 && y <= 3000) this._dateState.y = y;
      this._refreshDateControl();
    });
  },

  _switchCalendar(cal) {
    const st = this._dateState;
    if (cal === st.calendar) return;
    const conv = cal === 'ec'
      ? window.EthCal.gcToEc(st.y, st.m, st.d)
      : window.EthCal.ecToGc(st.y, st.m, st.d);
    this._dateState = { calendar: cal, y: conv.year, m: conv.month, d: conv.day };
    this._refreshDateControl();
  },

  async saveNotice() {
    const title = document.getElementById('noticeTitleInput').value.trim();
    const time = document.getElementById('noticeTimeInput').value;
    const body = document.getElementById('noticeBodyInput').value.trim();
    const typeEl = document.querySelector('input[name="noticeType"]:checked');
    const type = typeEl ? typeEl.value : 'new';
    if (!title) {
      document.getElementById('noticeTitleError').classList.remove('hidden');
      document.getElementById('noticeTitleInput').focus();
      return;
    }

    const yEl = document.getElementById('noticeYearInput');
    const yVal = Number(yEl.value);
    if (yVal >= 1 && yVal <= 3000) this._dateState.y = yVal;
    if (this._dateState.d > this._maxDay()) this._dateState.d = this._maxDay();

    const gc = this._dateStateToGc();
    const date = `${gc.year}-${String(gc.month).padStart(2, '0')}-${String(gc.day).padStart(2, '0')}`;
    const calendar = this._dateState.calendar;

    if (this.editingId) {
      const n = this.notices.find((x) => x.id === this.editingId);
      Object.assign(n, { title, date, calendar, time, body, type });
    } else {
      // New notices default to active=true, permanent also default active
      this.notices.push({ id: window.Store.newId(), title, date, calendar, time, body, type, active: true, createdAt: new Date().toISOString() });
    }
    await window.Store.set('notices', this.notices);
    window.Modal.hide('modalOverlay');
    if (this._op) this._op.refresh(this.notices);
  },

  async deleteNotice(id) {
    if (!confirm(window.STRINGS.common.confirmDelete)) return;
    this.notices = this.notices.filter((n) => n.id !== id);
    await window.Store.set('notices', this.notices);
    if (this._op) this._op.refresh(this.notices);
  },

  async present() {
    // Only show active notices
    const activeNotices = this.notices.filter((n) => n.active !== false);
    if (activeNotices.length === 0) return;
    const settings = await window.Store.get('settings');
    window.Present.open((body) => this._renderOperator(body, activeNotices, settings), 'operator', { mirror: false });
  },

  _ethiopianTimeStr() {
    const now = new Date();
    const localH = now.getHours();
    const mins = now.getMinutes();
    const ethH = (localH - 6 + 24) % 24;
    const period = (ethH < 12) ? 'AM' : 'PM';
    const displayH = (ethH % 12 === 0) ? 12 : ethH % 12;
    return `${displayH}:${String(mins).padStart(2, '0')} ${period}`;
  },

  _calculateNoticeScrollDuration(notice, isSingle, defaultSec = 10) {
    const defaultMs = (defaultSec || 10) * 1000;
    if (!notice || !notice.body) return defaultMs;

    const bodyText = String(notice.body || '').trim();
    if (!bodyText) return defaultMs;

    const rawLines = bodyText.split('\n');
    let totalLines = 0;
    const charsPerLine = isSingle ? 45 : 28;
    const lineHeightPx = isSingle ? 56 : 44;
    const visibleHeightPx = isSingle ? 400 : 330;

    rawLines.forEach((line) => {
      const len = line.trim().length;
      if (len === 0) {
        totalLines += 0.5;
      } else {
        totalLines += Math.ceil(len / charsPerLine);
      }
    });

    const totalTextHeight = totalLines * lineHeightPx;
    const overflowPx = totalTextHeight - visibleHeightPx;

    if (overflowPx > 20) {
      // 2000ms start delay + (overflowPx * 35ms/px scroll time) + 2000ms bottom pause + 2500ms return & buffer
      const timeMs = 2000 + (overflowPx * 35) + 2000 + 2500;
      return Math.max(defaultMs, timeMs);
    }

    return defaultMs;
  },

  _getNoticeGroupDurationMs(group, container, defaultSec = 10) {
    const defaultMs = (defaultSec || 10) * 1000;
    let maxTimeMs = defaultMs;

    // 1. Calculate duration from notice object data for presentation screen
    if (Array.isArray(group) && group.length > 0) {
      const isSingle = group.length === 1;
      group.forEach((n) => {
        const timeMs = this._calculateNoticeScrollDuration(n, isSingle, defaultSec);
        if (timeMs > maxTimeMs) maxTimeMs = timeMs;
      });
    }

    // 2. Also check DOM container if present
    if (container) {
      const targets = container.querySelectorAll('.notice-card-body, .notice-single-body');
      targets.forEach((el) => {
        const overflow = el.scrollHeight - el.clientHeight;
        if (overflow > 10) {
          const domTimeMs = 2000 + (overflow * 35) + 2000 + 2500;
          if (domTimeMs > maxTimeMs) maxTimeMs = domTimeMs;
        }
      });
    }

    return maxTimeMs;
  },

  _renderStage(body, notices, settings) {
    const C = window.STRINGS.calendar;
    const S = window.STRINGS.notices;
    const groups = chunk(notices, 2);
    let groupIndex = 0;

    const today = new Date();
    const ec = window.EthCal.gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const ecMonthName = C.ethMonths[ec.month - 1];
    const dateStr = `${ecMonthName} ${ec.day}, ${ec.year}`;
    const timeStr = this._ethiopianTimeStr();

    body.innerHTML = `
      <div class="notice-header">
        <div class="notice-page-title">${window.STRINGS.notices.title}</div>
        <div class="notice-ec-date">${escapeHtml(dateStr)}</div>
      </div>
      <div class="notice-stage" id="noticeStage"></div>
    `;
    const stage = document.getElementById('noticeStage');

    const renderGroup = () => {
      const group = groups[groupIndex];
      if (group.length === 1) {
        stage.className = 'notice-stage notice-stage-single';
        stage.innerHTML = `
          <div class="notice-single-stage">
            <div class="notice-single-card">
              <div class="notice-single-badge-row">
                ${group[0].type === 'permanent' ? `<span class="notice-card-badge badge-permanent">${S.permanentShort}</span>` : `<span class="notice-card-badge badge-new">${S.newShort}</span>`}
              </div>
              <div class="notice-single-title">${parseHighlight(group[0].title)}</div>
              <div class="notice-single-body">${parseHighlight(group[0].body)}</div>
              <div class="notice-single-meta">
                ${group[0].date ? `<span class="notice-single-meta-item"><span class="icon">${window.ICONS.calendar}</span>${escapeHtml(formatNoticeDate(group[0]))}</span>` : ''}
                <span class="notice-single-meta-item"><span class="icon">${window.ICONS.clock}</span>${escapeHtml(formatNoticeTime(group[0], timeStr))}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        stage.className = 'notice-stage';
        stage.innerHTML = group.map((n) => `
          <div class="notice-card">
            <div class="notice-card-top">
              ${n.type === 'permanent' ? `<span class="notice-card-badge badge-permanent">${S.permanentShort}</span>` : `<span class="notice-card-badge badge-new">${S.newShort}</span>`}
            </div>
            <div class="notice-card-title">${parseHighlight(n.title)}</div>
            <div class="notice-card-body">${parseHighlight(n.body)}</div>
            <div class="notice-meta">
              ${n.date ? `<span class="notice-meta-item"><span class="icon">${window.ICONS.calendar}</span>${escapeHtml(formatNoticeDate(n))}</span>` : ''}
              <span class="notice-meta-item"><span class="icon">${window.ICONS.clock}</span>${escapeHtml(formatNoticeTime(n, timeStr))}</span>
            </div>
          </div>
        `).join('');
      }
    };

    renderGroup();
    setTimeout(() => this._initNoticeAutoScroll(stage), 300);

    let timer = null;
    const scheduleNext = () => {
      if (groups.length <= 1) return;
      const currentGroup = groups[groupIndex];
      const durationMs = this._getNoticeGroupDurationMs(currentGroup, stage, settings.noticeRotateSeconds);
      timer = setTimeout(() => {
        groupIndex = (groupIndex + 1) % groups.length;
        renderGroup();
        setTimeout(() => this._initNoticeAutoScroll(stage), 300);
        scheduleNext();
      }, durationMs);
    };

    if (groups.length > 1) {
      setTimeout(() => scheduleNext(), 400);
    }

    return () => { if (timer) clearTimeout(timer); };
  },

  _initNoticeAutoScroll(container) {
    if (!container) return;
    const targets = container.querySelectorAll('.notice-card-body, .notice-single-body');
    targets.forEach((el) => {
      el.scrollTop = 0;
      if (el.scrollHeight > el.clientHeight + 10) {
        setTimeout(() => {
          const scrollTimer = setInterval(() => {
            if (el.scrollTop >= el.scrollHeight - el.clientHeight - 4) {
              clearInterval(scrollTimer);
              setTimeout(() => {
                el.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => this._initNoticeAutoScroll(container), 2000);
              }, 2000);
            } else {
              el.scrollTop += 1;
            }
          }, 35);
        }, 2000);
      }
    });
  },

  _buildExternalHtml(notices, settings) {
    const C = window.STRINGS.calendar;
    const S = window.STRINGS.notices;
    const groups = chunk(notices, 2);
    const today = new Date();
    const ec = window.EthCal.gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const ecMonthName = C.ethMonths[ec.month - 1];
    const dateStr = `${ecMonthName} ${ec.day}, ${ec.year}`;
    const timeStr = this._ethiopianTimeStr();

    return { groups, dateStr, timeStr };
  },

  _renderOperator(body, notices, settings) {
    let externalOpened = false;
    let autoTimer = null;
    let autoOn = false;

    const { groups, dateStr, timeStr } = this._buildExternalHtml(notices, settings);
    let groupIndex = 0;
    let singleMode = false;       // false = group mode (2-col), true = single notice full page
    let singleNoticeIdx = 0;      // index into notices array when in single mode

    const S = window.STRINGS.notices;

    body.innerHTML = `
            </button>
            <div class="operator-progress" id="noticesOperatorProgress">${groups.length > 0 ? `1 / ${groups.length}` : ''}</div>
            <span id="noticesOperatorStatus" class="operator-screen-badge">Ready</span>
          </div>
          <div class="operator-toolbar-right">
            <span class="operator-song-title">${window.STRINGS.notices.title}</span>
            <button class="operator-exit-btn" data-action="exit"><span class="icon">${window.ICONS.close}</span> Exit</button>
          </div>
        </div>
        <div class="operator-body">
          <div class="operator-preview-col">
            <div class="operator-preview">
              <div class="operator-preview-header">Presented Screen</div>
              <div class="operator-preview-screen" id="noticesPreviewScreen"></div>
            </div>
          </div>
          <div class="operator-nav-col">
            <div class="operator-slide-list" id="noticesSlideList"></div>
          </div>
        </div>
      </div>
    `;

    const previewScreen = document.getElementById('noticesPreviewScreen');
    const slideList = document.getElementById('noticesSlideList');
    const progressEl = document.getElementById('noticesOperatorProgress');
    const statusEl = document.getElementById('noticesOperatorStatus');

    const buildNoticeGroupHtml = (group) => {
      return group.map((n) => `
        <div class="notice-card">
          <div class="notice-card-top">
            ${n.type === 'permanent' ? `<span class="notice-card-badge badge-permanent">${S.permanentShort}</span>` : `<span class="notice-card-badge badge-new">${S.newShort}</span>`}
          </div>
          <div class="notice-card-title">${parseHighlight(n.title)}</div>
          <div class="notice-card-body">${parseHighlight(n.body)}</div>
          <div class="notice-meta">
            ${n.date ? `<span class="notice-meta-item"><span class="icon">${window.ICONS.calendar}</span>${escapeHtml(formatNoticeDate(n))}</span>` : ''}
            <span class="notice-meta-item"><span class="icon">${window.ICONS.clock}</span>${escapeHtml(formatNoticeTime(n, timeStr))}</span>
          </div>
        </div>
      `).join('');
    };

    // Build a single notice full-page HTML
    const buildSingleNoticeHtml = (notice) => {
      return `
        <div class="notice-single-stage">
          <div class="notice-single-card">
            <div class="notice-single-badge-row">
              ${notice.type === 'permanent' ? `<span class="notice-card-badge badge-permanent">${S.permanentShort}</span>` : `<span class="notice-card-badge badge-new">${S.newShort}</span>`}
            </div>
            <div class="notice-single-title">${parseHighlight(notice.title)}</div>
            <div class="notice-single-body">${parseHighlight(notice.body)}</div>
            <div class="notice-single-meta">
              ${notice.date ? `<span class="notice-single-meta-item"><span class="icon">${window.ICONS.calendar}</span>${escapeHtml(formatNoticeDate(notice))}</span>` : ''}
              <span class="notice-single-meta-item"><span class="icon">${window.ICONS.clock}</span>${escapeHtml(formatNoticeTime(notice, timeStr))}</span>
            </div>
          </div>
        </div>
      `;
    };

    const buildExternalHtml = (group) => {
      if (group.length === 1) {
        return buildSingleExternalHtml(group[0]);
      }
      return `
        <div class="notice-header">
          <div class="notice-page-title">${window.STRINGS.notices.title}</div>
          <div class="notice-ec-date">${escapeHtml(dateStr)}</div>
        </div>
        <div class="notice-stage">${buildNoticeGroupHtml(group)}</div>
      `;
    };

    const buildSingleExternalHtml = (notice) => {
      return `
        <div class="notice-header">
          <div class="notice-page-title">${window.STRINGS.notices.title}</div>
          <div class="notice-ec-date">${escapeHtml(dateStr)}</div>
        </div>
        <div class="notice-stage notice-stage-single">${buildSingleNoticeHtml(notice)}</div>
      `;
    };

    const updateExternal = async () => {
      let html;
      if (singleMode) {
        const notice = notices[singleNoticeIdx];
        html = buildSingleExternalHtml(notice);
        previewScreen.innerHTML = buildSingleNoticeHtml(notice);
        // Scale down preview for single notice
        previewScreen.querySelectorAll('.notice-single-title').forEach(el => {
          el.style.fontSize = 'clamp(18px, 2vw, 28px)';
          el.style.marginBottom = '12px';
        });
        previewScreen.querySelectorAll('.notice-single-body').forEach(el => {
          el.style.fontSize = 'clamp(14px, 1.5vw, 22px)';
        });
        previewScreen.querySelectorAll('.notice-single-meta-item').forEach(el => {
          el.style.fontSize = 'clamp(12px, 1.2vw, 18px)';
        });
        previewScreen.querySelectorAll('.notice-single-card').forEach(el => {
          el.style.padding = '16px 20px';
          el.style.borderTopWidth = '6px';
        });
      } else {
        const group = groups[groupIndex];
        html = buildExternalHtml(group);
        if (group.length === 1) {
          previewScreen.innerHTML = buildSingleNoticeHtml(group[0]);
          // Scale down preview for single notice
          previewScreen.querySelectorAll('.notice-single-title').forEach(el => {
            el.style.fontSize = 'clamp(18px, 2vw, 28px)';
            el.style.marginBottom = '12px';
          });
          previewScreen.querySelectorAll('.notice-single-body').forEach(el => {
            el.style.fontSize = 'clamp(14px, 1.5vw, 22px)';
          });
          previewScreen.querySelectorAll('.notice-single-meta-item').forEach(el => {
            el.style.fontSize = 'clamp(12px, 1.2vw, 18px)';
          });
          previewScreen.querySelectorAll('.notice-single-card').forEach(el => {
            el.style.padding = '16px 20px';
            el.style.borderTopWidth = '6px';
          });
        } else {
          previewScreen.innerHTML = `
            <div class="notice-stage" style="padding:8px;gap:6px;grid-template-columns:1fr 1fr;">
              ${buildNoticeGroupHtml(group)}
            </div>
          `;
          // Scale down preview
          previewScreen.querySelectorAll('.notice-card').forEach(card => {
            card.style.padding = '8px 12px';
            card.style.borderTopWidth = '4px';
          });
          previewScreen.querySelectorAll('.notice-card-title').forEach(el => {
            el.style.fontSize = 'clamp(12px, 1.2vw, 18px)';
            el.style.marginBottom = '8px';
          });
          previewScreen.querySelectorAll('.notice-card-body').forEach(el => {
            el.style.fontSize = 'clamp(10px, 1vw, 14px)';
            el.style.WebkitLineClamp = '3';
          });
          previewScreen.querySelectorAll('.notice-meta-item').forEach(el => {
            el.style.fontSize = 'clamp(10px, 1vw, 14px)';
          });
          previewScreen.querySelectorAll('.notice-card-badge').forEach(el => {
            el.style.fontSize = 'clamp(10px, 0.9vw, 14px)';
          });
        }
      }

      const _font = 'Noto Sans Ethiopic';
      statusEl.textContent = 'Sending...';
      const result = externalOpened
        ? await window.Store.presentUpdate({ html, variant: 'notices', fontFamily: _font })
        : await window.Store.presentOpen({ html, variant: 'notices', fontFamily: _font });
      externalOpened = Boolean(result && (result.opened || result.updated));
      statusEl.textContent = externalOpened ? 'Live' : 'No second screen';
    };

    const renderSlideList = () => {
      // Show group slides + individual notice slides
      let html = '';
      // Group slides
      groups.forEach((group, i) => {
        const titles = group.map(n => n.title).join(', ');
        const isActive = !singleMode && i === groupIndex;
        html += `
          <button class="operator-slide-row ${isActive ? 'active' : ''}" data-action="goto-group" data-group-index="${i}">
            <span class="operator-slide-badge">G${i + 1}</span>
            <span class="operator-slide-text">${escapeHtml(titles)}</span>
            <span class="operator-active-mark">${isActive ? '&#9654;' : ''}</span>
          </button>
        `;
      });
      // Individual notice slides
      notices.forEach((n, i) => {
        const isActive = singleMode && singleNoticeIdx === i;
        html += `
          <button class="operator-slide-row ${isActive ? 'active' : ''}" data-action="goto-single" data-notice-index="${i}">
            <span class="operator-slide-badge">${i + 1}</span>
            <span class="operator-slide-text">${escapeHtml(n.title)}</span>
            <span class="operator-active-mark">${isActive ? '&#9654;' : ''}</span>
          </button>
        `;
      });
      slideList.innerHTML = html;
      const activeEl = slideList.querySelector('.operator-slide-row.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    const goToGroup = (idx) => {
      singleMode = false;
      groupIndex = (idx + groups.length) % groups.length;
      progressEl.textContent = `Group ${groupIndex + 1} / ${groups.length}`;
      renderSlideList();
      updateExternal().catch(() => {});
      scheduleAuto();
    };

    const goToSingle = (idx) => {
      singleMode = true;
      singleNoticeIdx = (idx + notices.length) % notices.length;
      progressEl.textContent = `${notices[singleNoticeIdx].title}`;
      renderSlideList();
      updateExternal().catch(() => {});
      // Stop auto when in single mode
      if (autoOn) setAuto(false);
    };

    const scheduleAuto = () => {
      if (autoTimer) clearTimeout(autoTimer);
      if (!autoOn || singleMode || groups.length <= 1) return;
      setTimeout(() => {
        if (!autoOn || singleMode) return;
        const currentGroup = groups[groupIndex];
        const durationMs = this._getNoticeGroupDurationMs(currentGroup, previewScreen, settings.noticeRotateSeconds);
        autoTimer = setTimeout(() => {
          goToGroup(groupIndex + 1);
        }, durationMs);
      }, 150);
    };

    const setAuto = (on) => {
      autoOn = on;
      const btn = document.getElementById('noticesOperatorAutoBtn');
      const icon = document.getElementById('noticesOperatorAutoIcon');
      btn.classList.toggle('active', on);
      icon.innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      if (on && singleMode) {
        // Switching to auto while in single mode — go back to group mode
        singleMode = false;
        groupIndex = 0;
      }
      scheduleAuto();
    };

    const clickHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        if (action.dataset.action === 'prev') {
          if (singleMode) {
            goToSingle(singleNoticeIdx - 1);
          } else {
            goToGroup(groupIndex - 1);
          }
          return;
        }
        if (action.dataset.action === 'next') {
          if (singleMode) {
            goToSingle(singleNoticeIdx + 1);
          } else {
            goToGroup(groupIndex + 1);
          }
          return;
        }
        if (action.dataset.action === 'auto') setAuto(!autoOn);
        if (action.dataset.action === 'exit') window.Present.close();
        if (action.dataset.action === 'goto-group') {
          goToGroup(Number(action.dataset.groupIndex));
          return;
        }
        if (action.dataset.action === 'goto-single') {
          goToSingle(Number(action.dataset.noticeIndex));
          return;
        }
        return;
      }
    };

    const keyHandler = (e) => {
      // Stay silent while the operator has minimized this dashboard — the
      // audience screen keeps running, but these keys belong to whatever the
      // operator is doing in the control panel now.
      if (!window.Present.isPreviewActive()) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (singleMode) goToSingle(singleNoticeIdx + 1);
        else goToGroup(groupIndex + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (singleMode) goToSingle(singleNoticeIdx - 1);
        else goToGroup(groupIndex - 1);
      }
      if (e.key === 'Escape') window.Present.close();
    };

    body.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);
    renderSlideList();
    updateExternal().catch(() => {});

    return () => {
      if (autoTimer) clearTimeout(autoTimer);
      body.removeEventListener('click', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }
};

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatNoticeDate(n) {
  if (!n || !n.date || !/^\d{4}-\d{2}-\d{2}$/.test(n.date)) return '';
  const C = window.STRINGS.calendar;
  const [y, m, d] = n.date.split('-').map(Number);
  if ((n.calendar || 'gc') === 'ec') {
    const e = window.EthCal.gcToEc(y, m, d);
    return `${C.ethMonths[e.month - 1]} ${e.day}, ${e.year}`;
  }
  return `${C.gcMonths[m - 1]} ${d}, ${y}`;
}

function formatNoticeTime(n, defaultTimeStr) {
  if (!n || !n.time) return defaultTimeStr || '';
  const str = String(n.time).trim();
  if (!str) return defaultTimeStr || '';
  const parts = str.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    if (!isNaN(h)) {
      const period = (h >= 12 && h < 24) ? 'PM' : 'AM';
      const displayH = (h % 12 === 0) ? 12 : h % 12;
      return `${displayH}:${m} ${period}`;
    }
  }
  return str;
}

function parseHighlight(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<mark class="hl">$1</mark>')
    .replace(/\n/g, '<br/>');
}