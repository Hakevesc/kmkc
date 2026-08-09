window.AppState = {
  churchName: '',
  applyFont() {
    const font = this.fontFamily || 'Noto Sans Ethiopic';
    document.documentElement.style.setProperty('--presentation-font', `'${font}', 'Segoe UI', sans-serif`);
    document.documentElement.style.setProperty('--font-creed', `'${font}', 'Segoe UI', sans-serif`);
    document.documentElement.style.setProperty('--font-lyrics', `'${font}', 'Segoe UI', sans-serif`);
    if (window.Lyrics && typeof window.Lyrics.updateFont === 'function') {
      window.Lyrics.updateFont(font);
    }
    // Broadcast font change to the external display immediately
    window.Store.presentUpdate({ fontFamily: font }).catch(() => {});
  }
};

function applyStrings() {
  const S = window.STRINGS;

  const navs = [
    { view: 'home', icon: 'home', text: S.nav.homeEn },
    { view: 'lyrics', icon: 'music', text: S.nav.lyricsEn },
    { view: 'notices', icon: 'megaphone', text: S.nav.noticesEn },
    { view: 'bible', icon: 'book', text: S.nav.bibleEn },
    { view: 'bible-sync', icon: 'download', text: S.nav.bibleSyncEn || 'Online Bible', id: 'bibleSyncNavBtn' },
    { view: 'creed', icon: 'cross', text: S.creed.titleEn },
    { view: 'bank', icon: 'bank', text: S.nav.bankEn },
    { view: 'slides', icon: 'image', text: S.nav.slidesEn },
    { view: 'media', icon: 'video', text: S.nav.mediaEn },
    { view: 'social', icon: 'share', text: S.nav.socialEn },
    { view: 'bible-quotes', icon: 'book', text: S.bibleQuotes.titleEn },
    { view: 'countdown', icon: 'timer', text: S.nav.countdownEn },
    { view: 'bible-editor', icon: 'edit', text: 'Bible Editor', id: 'bibleEditorNavBtn' },
    { view: 'settings', icon: 'gear', text: S.settings.titleEn, id: 'settingsNavBtn' }
  ];

  navs.forEach(n => {
    const el = n.id ? document.getElementById(n.id) : document.querySelector(`[data-view="${n.view}"]`);
    if (el) {
      const iconSvg = window.ICONS[n.icon] || '';
      el.innerHTML = `<span class="icon">${iconSvg}</span><span class="nav-text">${n.text}</span>`;
      el.setAttribute('title', n.text);
    }
  });

  // Lyrics header elements are now rendered inside the operator view dynamically


  // notices strings are now applied inside Notices.renderCombinedView()

  // Bank Accounts
  const bankTitleEl = document.getElementById('bankTitle');
  if (bankTitleEl) bankTitleEl.textContent = S.bank.titleEn;
  const btnAddBankEl = document.getElementById('btnAddBank');
  if (btnAddBankEl) btnAddBankEl.innerHTML = `<span class="icon">${window.ICONS.plus}</span>${S.bank.addAccountEn}`;
  const btnPresentBankEl = document.getElementById('btnPresentBank');
  if (btnPresentBankEl) btnPresentBankEl.innerHTML = `<span class="icon">${window.ICONS.play}</span>${S.common.presentEn}`;




  document.getElementById('settingsTitle').textContent = S.settings.titleEn;
  const settingsSubtitleEl = document.getElementById('settingsSubtitle');
  if (settingsSubtitleEl) settingsSubtitleEl.textContent = S.settings.subtitleEn || '';

  // Slides
  const slidesTitleEl = document.getElementById('slidesTitle');
  if (slidesTitleEl) slidesTitleEl.textContent = S.slides.titleEn;
  const slidesAddLabelEl = document.getElementById('slidesAddLabel');
  if (slidesAddLabelEl) slidesAddLabelEl.textContent = S.slides.addImagesEn;
  const slidesPresentLabelEl = document.getElementById('slidesPresentLabel');
  if (slidesPresentLabelEl) slidesPresentLabelEl.textContent = S.slides.presentEn;
  const btnAddImagesEl = document.getElementById('btnAddImages');
  if (btnAddImagesEl && btnAddImagesEl.querySelector('.icon')) {
    btnAddImagesEl.querySelector('.icon').innerHTML = window.ICONS.image;
  }
  const btnPresentSlidesEl = document.getElementById('btnPresentSlides');
  if (btnPresentSlidesEl && btnPresentSlidesEl.querySelector('.icon')) {
    btnPresentSlidesEl.querySelector('.icon').innerHTML = window.ICONS.play;
  }

  // Media
  const mediaTitleEl = document.getElementById('mediaTitle');
  if (mediaTitleEl) mediaTitleEl.textContent = S.media.titleEn;
  const mediaAddLabelEl = document.getElementById('mediaAddLabel');
  if (mediaAddLabelEl) mediaAddLabelEl.textContent = S.media.addLinkEn;
  const btnAddMediaEl = document.getElementById('btnAddMedia');
  if (btnAddMediaEl && btnAddMediaEl.querySelector('.icon')) {
    btnAddMediaEl.querySelector('.icon').innerHTML = window.ICONS.video;
  }

  // Countdown
  const countdownTitleEl = document.getElementById('countdownTitle');
  if (countdownTitleEl) countdownTitleEl.textContent = S.countdown.titleEn;
  const countdownAddLabelEl = document.getElementById('countdownAddLabel');
  if (countdownAddLabelEl) countdownAddLabelEl.textContent = S.countdown.addPresetEn;
  const btnAddCountdownEl = document.getElementById('btnAddCountdown');
  if (btnAddCountdownEl && btnAddCountdownEl.querySelector('.icon')) {
    btnAddCountdownEl.querySelector('.icon').innerHTML = window.ICONS.timer;
  }

  // Bible Quotes
  const bqTitleEl = document.getElementById('bibleQuotesTitle');
  if (bqTitleEl) bqTitleEl.textContent = S.bibleQuotes.titleEn;
  const bqAddLabelEl = document.getElementById('bibleQuoteAddLabel');
  if (bqAddLabelEl) bqAddLabelEl.textContent = S.bibleQuotes.addQuoteEn;
  const bqPresentLabelEl = document.getElementById('bibleQuotePresentLabel');
  if (bqPresentLabelEl) bqPresentLabelEl.textContent = S.bibleQuotes.presentEn;
  const btnAddBQ = document.getElementById('btnAddBibleQuote');
  if (btnAddBQ && btnAddBQ.querySelector('.icon')) {
    btnAddBQ.querySelector('.icon').innerHTML = window.ICONS.plus;
  }
  const btnPresentBQ = document.getElementById('btnPresentBibleQuotes');
  if (btnPresentBQ && btnPresentBQ.querySelector('.icon')) {
    btnPresentBQ.querySelector('.icon').innerHTML = window.ICONS.play;
  }

  // Social
  const socTitleEl = document.getElementById('socialTitle');
  if (socTitleEl) socTitleEl.textContent = S.social.titleEn;
  const socAddEl = document.getElementById('socialAddLabel');
  if (socAddEl) socAddEl.textContent = S.social.addAccountEn;
  const socPresEl = document.getElementById('socialPresentLabel');
  if (socPresEl) socPresEl.textContent = S.social.presentEn;
  const btnAddSoc = document.getElementById('btnAddSocial');
  if (btnAddSoc) btnAddSoc.querySelector('.icon').innerHTML = window.ICONS.plus;
  const btnPresSoc = document.getElementById('btnPresentSocial');
  if (btnPresSoc) btnPresSoc.querySelector('.icon').innerHTML = window.ICONS.play;

  // Bible Sync
  const bsTitle = document.getElementById('bibleSyncTitle');
  if (bsTitle) bsTitle.innerHTML = `<span class="icon">${window.ICONS.download || ''}</span> ${S.bibleSync?.titleEn || 'Online Bible'}`;
  const bsVerLabel = document.getElementById('bibleVersionLabel');
  if (bsVerLabel) bsVerLabel.textContent = S.bibleSync?.versionLabelEn || 'Version:';
  const bsSyncLabel = document.getElementById('bibleSyncBtnLabel');
  if (bsSyncLabel) bsSyncLabel.textContent = S.bibleSync?.downloadBookEn || 'Download Book';
  const bsUpdateLabel = document.getElementById('bibleCheckUpdatesBtnLabel');
  if (bsUpdateLabel) bsUpdateLabel.textContent = S.bibleSync?.checkUpdatesEn || 'Check for Updates';
  const bsBooksHeader = document.getElementById('availableBooksHeader');
  if (bsBooksHeader) bsBooksHeader.textContent = S.bibleSync?.availableBooksEn || 'Available Books (Local)';
}

function buildHomeCards() {
  const S = window.STRINGS;
  const cards = [
    { view: 'lyrics', icon: 'music', title: S.nav.lyricsEn, sub: S.nav.lyrics },
    { view: 'notices', icon: 'megaphone', title: S.nav.noticesEn, sub: S.nav.notices },
    { view: 'bible', icon: 'book', title: S.nav.bibleEn, sub: S.nav.bible },
    { view: 'bible-sync', icon: 'download', title: S.nav.bibleSyncEn || 'Online Bible', sub: S.nav.bibleSync || 'Online Bible' },
    { view: 'creed', icon: 'cross', title: S.creed.titleEn, sub: S.creed.title },
    { view: 'bank', icon: 'bank', title: S.nav.bankEn, sub: S.nav.bank },
    { view: 'slides', icon: 'image', title: S.nav.slidesEn, sub: S.nav.slides },
    { view: 'media', icon: 'video', title: S.nav.mediaEn, sub: S.nav.media },
    { view: 'social', icon: 'share', title: S.nav.socialEn, sub: S.nav.social },
    { view: 'bible-quotes', icon: 'book', title: S.bibleQuotes.titleEn, sub: S.bibleQuotes.title },
    { view: 'countdown', icon: 'timer', title: S.nav.countdownEn, sub: S.nav.countdown }
  ];
  document.getElementById('homeCards').innerHTML = cards.map((c) => `
    <button class="home-card" data-view="${c.view}">
      <span class="icon">${window.ICONS[c.icon] || ''}</span>
      <span class="home-card-title">${c.title}</span>
      <span class="home-card-sub">${c.sub}</span>
    </button>
  `).join('');
}

function switchView(name) {
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('#topNav .nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  if (name === 'social' && window.Social && typeof window.Social.refresh === 'function') {
    window.Social.refresh();
  }
  if (name === 'media' && window.Media && typeof window.Media.refresh === 'function') {
    window.Media.refresh();
  }
  if (name === 'slides' && window.Slides && typeof window.Slides.refresh === 'function') {
    window.Slides.refresh();
  }
  if (name === 'bank' && window.BankAccounts && typeof window.BankAccounts.refresh === 'function') {
    window.BankAccounts.refresh();
  }
  if (name === 'bible-quotes' && window.BibleQuotes && typeof window.BibleQuotes.refresh === 'function') {
    window.BibleQuotes.refresh();
  }
  if (name === 'countdown' && window.Countdown && typeof window.Countdown.refresh === 'function') {
    window.Countdown.refresh();
  }
  if (name === 'bible-sync' && window.BibleSync && typeof window.BibleSync.refresh === 'function') {
    window.BibleSync.refresh();
  }
  if (name === 'bible-editor') {
    const container = document.getElementById('bibleEditorContainer');
    if (container && !container._bibleEditorInited) {
      container._bibleEditorInited = true;
      const doRender = () => {
        container.innerHTML = '';
        window.BibleContentUpdate.render(container);
      };
      if (!window.BibleContentUpdate._data) {
        window.BibleContentUpdate.init().then(doRender);
      } else {
        doRender();
      }
    }
  }
}

document.body.addEventListener('click', (e) => {
  const target = e.target.closest('[data-view]');
  if (target) {
    if (target.dataset.view === 'creed') {
      switchView('creed');
      if (window.Creed && typeof window.Creed.renderOperatorInline === 'function') {
        window.Creed.renderOperatorInline();
      }
    } else {
      switchView(target.dataset.view);
    }
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  applyStrings();
  buildHomeCards();

  const settings = await window.Store.get('settings');
  window.AppState.churchName = settings.churchName;
  window.AppState.fontFamily = settings.fontFamily || 'Noto Sans Ethiopic';
  window.AppState.applyFont();
  // Split church name into three lines for the header
  const churchName = settings.churchName || '';
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

  // Sidebar toggle setup
  const sidebar = document.getElementById('appSidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const toggleIcon = document.getElementById('sidebarToggleIcon');

  function updateSidebarIcon() {
    const isCollapsed = sidebar.classList.contains('collapsed');
    toggleIcon.innerHTML = isCollapsed ? window.ICONS.menu : window.ICONS.chevronLeft;
  }

  // Restore sidebar state from localStorage
  const savedCollapsed = localStorage.getItem('sidebarCollapsed');
  if (savedCollapsed === 'true') {
    sidebar.classList.add('collapsed');
  }
  updateSidebarIcon();

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    updateSidebarIcon();
  });

  await Promise.all([
    window.Lyrics.init(),
    window.Notices.init(),
    window.BankAccounts.init(),
    window.Bible.init(),
    window.Creed.init(),
    window.Settings.init(),
    window.Slides.init(),
    window.Media.init(),
    window.Countdown.init(),
    window.Social.init(),
    window.BibleQuotes.init(),
    window.BibleSync ? window.BibleSync.init() : Promise.resolve()
  ]);
});

