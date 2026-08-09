// src/js/bibleSync.js — On-Demand Online Bible Verse Lookup
(function () {
  'use strict';

  // ── Book data ────────────────────────────────────────────────────────────
  const OLD_TESTAMENT = [
    { abbr: 'GEN', en: 'Genesis',          am: 'Genesis' },
    { abbr: 'EXO', en: 'Exodus',           am: 'Exodus' },
    { abbr: 'LEV', en: 'Leviticus',        am: 'Leviticus' },
    { abbr: 'NUM', en: 'Numbers',          am: 'Numbers' },
    { abbr: 'DEU', en: 'Deuteronomy',      am: 'Deuteronomy' },
    { abbr: 'JOS', en: 'Joshua',           am: 'Joshua' },
    { abbr: 'JDG', en: 'Judges',           am: 'Judges' },
    { abbr: 'RUT', en: 'Ruth',             am: 'Ruth' },
    { abbr: '1SA', en: '1 Samuel',         am: '1 Samuel' },
    { abbr: '2SA', en: '2 Samuel',         am: '2 Samuel' },
    { abbr: '1KI', en: '1 Kings',          am: '1 Kings' },
    { abbr: '2KI', en: '2 Kings',          am: '2 Kings' },
    { abbr: '1CH', en: '1 Chronicles',     am: '1 Chronicles' },
    { abbr: '2CH', en: '2 Chronicles',     am: '2 Chronicles' },
    { abbr: 'EZR', en: 'Ezra',             am: 'Ezra' },
    { abbr: 'NEH', en: 'Nehemiah',         am: 'Nehemiah' },
    { abbr: 'EST', en: 'Esther',           am: 'Esther' },
    { abbr: 'JOB', en: 'Job',              am: 'Job' },
    { abbr: 'PSA', en: 'Psalms',           am: 'Psalms' },
    { abbr: 'PRO', en: 'Proverbs',         am: 'Proverbs' },
    { abbr: 'ECC', en: 'Ecclesiastes',     am: 'Ecclesiastes' },
    { abbr: 'SNG', en: 'Song of Solomon',  am: 'Song of Solomon' },
    { abbr: 'ISA', en: 'Isaiah',           am: 'Isaiah' },
    { abbr: 'JER', en: 'Jeremiah',         am: 'Jeremiah' },
    { abbr: 'LAM', en: 'Lamentations',     am: 'Lamentations' },
    { abbr: 'EZK', en: 'Ezekiel',          am: 'Ezekiel' },
    { abbr: 'DAN', en: 'Daniel',           am: 'Daniel' },
    { abbr: 'HOS', en: 'Hosea',            am: 'Hosea' },
    { abbr: 'JOE', en: 'Joel',             am: 'Joel' },
    { abbr: 'AMO', en: 'Amos',             am: 'Amos' },
    { abbr: 'OBA', en: 'Obadiah',          am: 'Obadiah' },
    { abbr: 'JON', en: 'Jonah',            am: 'Jonah' },
    { abbr: 'MIC', en: 'Micah',            am: 'Micah' },
    { abbr: 'NAM', en: 'Nahum',            am: 'Nahum' },
    { abbr: 'HAB', en: 'Habakkuk',         am: 'Habakkuk' },
    { abbr: 'ZEP', en: 'Zephaniah',        am: 'Zephaniah' },
    { abbr: 'HAG', en: 'Haggai',           am: 'Haggai' },
    { abbr: 'ZEC', en: 'Zechariah',        am: 'Zechariah' },
    { abbr: 'MAL', en: 'Malachi',          am: 'Malachi' }
  ];

  const NEW_TESTAMENT = [
    { abbr: 'MAT', en: 'Matthew',          am: 'Matthew' },
    { abbr: 'MRK', en: 'Mark',             am: 'Mark' },
    { abbr: 'LUK', en: 'Luke',             am: 'Luke' },
    { abbr: 'JHN', en: 'John',             am: 'John' },
    { abbr: 'ACT', en: 'Acts',             am: 'Acts' },
    { abbr: 'ROM', en: 'Romans',           am: 'Romans' },
    { abbr: '1CO', en: '1 Corinthians',    am: '1 Corinthians' },
    { abbr: '2CO', en: '2 Corinthians',    am: '2 Corinthians' },
    { abbr: 'GAL', en: 'Galatians',        am: 'Galatians' },
    { abbr: 'EPH', en: 'Ephesians',        am: 'Ephesians' },
    { abbr: 'PHP', en: 'Philippians',      am: 'Philippians' },
    { abbr: 'COL', en: 'Colossians',       am: 'Colossians' },
    { abbr: '1TH', en: '1 Thessalonians',  am: '1 Thessalonians' },
    { abbr: '2TH', en: '2 Thessalonians',  am: '2 Thessalonians' },
    { abbr: '1TI', en: '1 Timothy',        am: '1 Timothy' },
    { abbr: '2TI', en: '2 Timothy',        am: '2 Timothy' },
    { abbr: 'TIT', en: 'Titus',            am: 'Titus' },
    { abbr: 'PHM', en: 'Philemon',         am: 'Philemon' },
    { abbr: 'HEB', en: 'Hebrews',          am: 'Hebrews' },
    { abbr: 'JAS', en: 'James',            am: 'James' },
    { abbr: '1PE', en: '1 Peter',          am: '1 Peter' },
    { abbr: '2PE', en: '2 Peter',          am: '2 Peter' },
    { abbr: '1JN', en: '1 John',           am: '1 John' },
    { abbr: '2JN', en: '2 John',           am: '2 John' },
    { abbr: '3JN', en: '3 John',           am: '3 John' },
    { abbr: 'JUD', en: 'Jude',             am: 'Jude' },
    { abbr: 'REV', en: 'Revelation',       am: 'Revelation' }
  ];

  const BIBLE_VERSIONS = [
    { id: '1260', name: 'Amharic NASV',  code: 'NASV', lang: 'am' },
    { id: '1301', name: 'Amharic KJV',   code: 'KJV',  lang: 'am' },
    { id: '96',   name: 'English NIV',   code: 'NIV',  lang: 'en' },
    { id: '1',    name: 'English KJV',   code: 'KJV',  lang: 'en' }
  ];

  // In-memory cache: key = "versionId|ABBR|chapter"
  const _cache = new Map();
  let _currentTestament = 'NT';
  let _isFetching = false;
  // Last successful fetch result — used by the Present button
  let _lastResult = null; // { verses, bookAbbr, chapter, bookAm, bookEn }

  // ── Live scroll state (mirrors the offline Bible view) ───────────────────
  // A fetched chapter rarely fits one screen, so the operator scrolls the live
  // preview and the audience screen follows. present.html applies scrollRatio
  // to its .bible-stage when it receives scrollOnly — the markup we present
  // below uses that same class, so no changes are needed on the display side.
  let _externalOpened = false;
  let _autoOn = false;
  let _autoTimer = null;
  let _lastScrollSyncTime = 0;

  // Under .soc-op-desktop-wrap the preview box itself is the scroll container
  // (its inner .bible-stage is forced to height:auto/overflow:visible), same as
  // the offline Bible operator preview.
  function livePreviewEl() { return document.getElementById('ob-live-preview'); }

  function syncScrollToExternal() {
    const el = livePreviewEl();
    if (!el || !_externalOpened) return;
    const now = Date.now();
    if (now - _lastScrollSyncTime < 30) return; // throttle to ~30fps
    _lastScrollSyncTime = now;
    const scrollable = el.scrollHeight - el.clientHeight;
    const scrollRatio = scrollable > 0 ? el.scrollTop / scrollable : 0;
    window.Store.presentUpdate({ variant: 'bible', scrollRatio, scrollOnly: true })
      .catch(() => {});
  }

  function doAutoScroll() {
    if (!_autoOn) return;
    const el = livePreviewEl();
    if (!el) return;
    const speedInput = document.getElementById('ob-auto-speed');
    const speed = speedInput ? Math.max(1, parseInt(speedInput.value, 10) || 1) : 1;
    const interval = Math.max(20, 500 - (speed - 1) * 55);

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (el.scrollTop >= maxScroll) {
      // Reached the end — pause, rewind to the top, then keep cycling.
      setTimeout(() => { if (_autoOn) el.scrollTo({ top: 0, behavior: 'smooth' }); }, 2000);
      _autoTimer = setTimeout(doAutoScroll, 4000);
      return;
    }
    el.scrollTop += 1;
    syncScrollToExternal();
    _autoTimer = setTimeout(doAutoScroll, interval);
  }

  function setAuto(on) {
    _autoOn = on;
    const btn = document.getElementById('ob-auto-btn');
    const el = livePreviewEl();
    if (btn) {
      btn.classList.toggle('active', on);
      btn.querySelector('.icon').innerHTML = on ? window.ICONS.pause : window.ICONS.play;
      btn.querySelector('.auto-scroll-label').textContent = 'Auto Scroll: ' + (on ? 'On' : 'Off');
    }
    if (on) {
      if (el && el.scrollTop >= el.scrollHeight - el.clientHeight - 10) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
      _autoTimer = setTimeout(doAutoScroll, 1000);
    } else if (_autoTimer) {
      clearTimeout(_autoTimer);
      _autoTimer = null;
    }
  }

  function setLiveState(isLive) {
    _externalOpened = isLive;
    const wrap = document.getElementById('ob-live-wrap');
    const closeBtn = document.getElementById('ob-close-btn');
    const status = document.getElementById('ob-live-status');
    const dot = document.getElementById('ob-live-dot');
    if (wrap) wrap.style.display = isLive ? '' : 'none';
    if (closeBtn) closeBtn.style.display = isLive ? 'inline-flex' : 'none';
    if (status) status.textContent = isLive ? 'LIVE' : 'IDLE';
    if (dot) dot.classList.toggle('soc-op-dot-live', isLive);
    // Present stays green here: while live it re-sends the current selection
    // rather than stopping, so it is never the "stop" action — that is what the
    // separate red Close Presentation button is for.
    const presentBtn = document.getElementById('ob-present-btn');
    if (presentBtn) {
      presentBtn.disabled = false;
      presentBtn.innerHTML = '<span class="icon">' + window.ICONS.play + '</span> '
        + (isLive ? 'Change / Present' : 'Present');
    }
    if (!isLive) setAuto(false);
  }

  async function closePresentation() {
    setAuto(false);
    try { await window.Store.presentClose(); } catch (e) { /* already gone */ }
    setLiveState(false);
  }

  function getBookList(testament) {
    return testament === 'OT' ? OLD_TESTAMENT : NEW_TESTAMENT;
  }

  function getSelectedVersion() {
    const sel = document.getElementById('ob-version-select');
    return sel ? sel.value : '1260';
  }

  function getSelectedBook() {
    const sel = document.getElementById('ob-book-select');
    return sel ? sel.value : '';
  }

  function getChapter() {
    const inp = document.getElementById('ob-chapter-input');
    return inp ? parseInt(inp.value, 10) || 1 : 1;
  }

  function getVerseInput() {
    return (document.getElementById('ob-verse-input') || {}).value || '';
  }

  function parseVerseRange(raw) {
    const str = (raw || '').trim();
    if (!str) return { verseStart: null, verseEnd: null };
    const parts = str.split('-').map(s => parseInt(s.trim(), 10));
    const vStart = isNaN(parts[0]) ? null : parts[0];
    const vEnd = parts.length > 1 ? (isNaN(parts[1]) ? vStart : parts[1]) : vStart;
    return { verseStart: vStart, verseEnd: vEnd };
  }

  function populateVersionSelect() {
    const sel = document.getElementById('ob-version-select');
    if (!sel) return;
    sel.innerHTML = BIBLE_VERSIONS.map(v =>
      `<option value="${v.id}">${v.name}</option>`
    ).join('');
  }

  function populateBookSelect(testament) {
    const sel = document.getElementById('ob-book-select');
    if (!sel) return;
    const books = getBookList(testament);
    sel.innerHTML = books.map(b =>
      `<option value="${b.abbr}">${b.am} (${b.en})</option>`
    ).join('');
  }

  function setLoading(isLoading) {
    const spinner = document.getElementById('ob-spinner');
    const btn = document.getElementById('ob-fetch-btn');
    if (spinner) spinner.style.display = isLoading ? 'flex' : 'none';
    if (btn) {
      btn.disabled = isLoading;
      btn.innerHTML = isLoading
        ? '<span class="ob-btn-spinner"></span> Loading verse...'
        : 'Fetch Verses';
    }
  }

  function showError(msg) {
    const results = document.getElementById('ob-results');
    const activeBar = document.getElementById('ob-active-bar');
    const presentBtn = document.getElementById('ob-present-btn');
    if (activeBar) activeBar.style.display = 'none';
    if (presentBtn) presentBtn.style.display = 'none';
    if (!results) return;
    results.innerHTML = `<div class="ob-error"><span>⚠️</span><p>${msg}</p></div>`;
  }

  function renderVerses(verses, bookAbbr, chapter) {
    const results = document.getElementById('ob-results');
    const activeBar = document.getElementById('ob-active-bar');
    const activeAm = document.getElementById('ob-active-am');
    const activeEn = document.getElementById('ob-active-en');
    const activeCount = document.getElementById('ob-active-count');
    const presentBtn = document.getElementById('ob-present-btn');

    if (!results) return;

    if (!verses || verses.length === 0) {
      if (activeBar) activeBar.style.display = 'none';
      if (presentBtn) presentBtn.style.display = 'none';
      results.innerHTML = `<div class="ob-empty">No verses found for this selection.</div>`;
      return;
    }

    const allBooks = OLD_TESTAMENT.concat(NEW_TESTAMENT);
    const bookEntry = allBooks.find(b => b.abbr === bookAbbr);
    const bookAm = bookEntry ? bookEntry.am : bookAbbr;
    const bookEn = bookEntry ? bookEntry.en : bookAbbr;

    // Store for Present button
    _lastResult = { verses, bookAbbr, chapter, bookAm, bookEn };

    if (activeAm) activeAm.textContent = bookAm;
    if (activeEn) activeEn.textContent = `${bookEn} ${chapter}`;
    if (activeCount) activeCount.textContent = `${verses.length} verse${verses.length > 1 ? 's' : ''}`;
    if (activeBar) activeBar.style.display = 'inline-flex';
    // Visibility only — the click handler is bound once in bindEvents().
    // Assigning onclick here as well made every Present click fire twice.
    if (presentBtn) presentBtn.style.display = 'inline-flex';

    const cards = verses.map(v => `
      <div class="ob-verse-card">
        <p class="ob-verse-text"><span class="ob-verse-num">${v.verse}</span> ${v.text}</p>
      </div>`).join('');

    results.innerHTML = `<div class="ob-verse-list">${cards}</div>`;
  }

  // ── Present fetched verses to the display window ────────────────────────
  async function presentVerses() {
    if (!_lastResult || !_lastResult.verses || _lastResult.verses.length === 0) return;

    const { verses, bookAm, bookEn, chapter } = _lastResult;
    const firstVerse = verses[0].verse;
    const lastVerse = verses[verses.length - 1].verse;
    const vRangeStr = firstVerse === lastVerse ? `${firstVerse}` : `${firstVerse}-${lastVerse}`;
    const ref = `${bookAm} ${chapter}: ${vRangeStr}`;

    const verseHtml = verses.map(v =>
      `<div class="external-verse-block"><span class="bible-external-verse-num">${v.verse}</span><span class="external-verse-text">${v.text}</span></div>`
    ).join('');

    const html = `
      <div class="bible-stage-wrapper">
        <div class="bible-ref-wrapper">
          <div class="bible-ref" style="display:inline-flex; align-items:center;">
            ${ref}
          </div>
        </div>
        <div class="bible-stage">
          <div class="bible-verse-text">${verseHtml}</div>
        </div>
      </div>`;

    const presentBtn = document.getElementById('ob-present-btn');
    try {
      if (presentBtn) { presentBtn.textContent = 'Opening...'; presentBtn.disabled = true; }

      const result = _externalOpened
        ? await window.Store.presentUpdate({ html, variant: 'bible' })
        : await window.Store.presentOpen({ html, variant: 'bible' });

      // Mirror the same markup locally so the operator scrolls exactly what the
      // audience sees; .bible-stage is what present.html scrolls on its side.
      const box = livePreviewEl();
      if (box) {
        box.innerHTML = html;
        box.scrollTop = 0;
      }
      setAuto(false);
      setLiveState(Boolean(result && (result.opened || result.updated)));
      syncScrollToExternal();
    } catch (err) {
      console.error('[BibleSync] presentVerses error:', err);
      setLiveState(_externalOpened);
    }
  }

  async function fetchVerses() {
    if (_isFetching) return;

    const versionId = getSelectedVersion();
    const bookAbbr = getSelectedBook();
    const chapter = getChapter();
    const { verseStart, verseEnd } = parseVerseRange(getVerseInput());

    if (!bookAbbr) { showError('Please select a book.'); return; }
    if (!chapter || chapter < 1) { showError('Please enter a valid chapter number.'); return; }

    const cacheKey = `${versionId}|${bookAbbr}|${chapter}`;

    if (!verseStart && _cache.has(cacheKey)) {
      renderVerses(_cache.get(cacheKey), bookAbbr, chapter);
      return;
    }

    _isFetching = true;
    setLoading(true);
    const results = document.getElementById('ob-results');
    if (results) results.innerHTML = '';

    try {
      const fetchFn = (window.Store && window.Store.fetchBibleVerses)
        ? window.Store.fetchBibleVerses.bind(window.Store)
        : window.api.fetchBibleVerses.bind(window.api);

      const res = await fetchFn({ versionId, bookAbbr, chapter, verseStart, verseEnd });

      if (res && res.success) {
        if (!verseStart) _cache.set(cacheKey, res.verses);
        renderVerses(res.verses, bookAbbr, chapter);
      } else {
        showError(res && res.error ? res.error : 'Failed to fetch. Check your internet connection.');
      }
    } catch (err) {
      showError('Error: ' + err.message);
    } finally {
      _isFetching = false;
      setLoading(false);
    }
  }

  function bindEvents() {
    document.querySelectorAll('input[name="ob-testament"]').forEach(radio => {
      if (radio._obBound) return;
      radio._obBound = true;
      radio.addEventListener('change', e => {
        _currentTestament = e.target.value;
        populateBookSelect(_currentTestament);
        const chapInput = document.getElementById('ob-chapter-input');
        if (chapInput) chapInput.value = '1';
        const verseInput = document.getElementById('ob-verse-input');
        if (verseInput) verseInput.value = '';
        const results = document.getElementById('ob-results');
        if (results) results.innerHTML = '';
      });
    });

    const btn = document.getElementById('ob-fetch-btn');
    if (btn && !btn._obBound) {
      btn._obBound = true;
      btn.addEventListener('click', fetchVerses);
    }

    const presentBtn = document.getElementById('ob-present-btn');
    if (presentBtn && !presentBtn._obBound) {
      presentBtn._obBound = true;
      presentBtn.addEventListener('click', presentVerses);
    }

    ['ob-chapter-input', 'ob-verse-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el._obBound) {
        el._obBound = true;
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter') fetchVerses();
        });
      }
    });

    // ── Live scroll controller ────────────────────────────────────────────
    const once = (id, event, handler) => {
      const el = document.getElementById(id);
      if (!el || el._obBound) return el;
      el._obBound = true;
      el.addEventListener(event, handler);
      return el;
    };

    once('ob-close-btn', 'click', () => { closePresentation().catch(() => {}); });
    once('ob-auto-btn', 'click', () => setAuto(!_autoOn));
    once('ob-live-preview', 'scroll', syncScrollToExternal);

    const scrollByPage = (dir) => {
      const el = livePreviewEl();
      if (!el) return;
      if (_autoOn) setAuto(false);
      el.scrollBy({ top: dir * el.clientHeight * 0.85, behavior: 'smooth' });
      // Smooth scrolling fires its own scroll events, but sync once more after
      // it settles so the audience screen lands on the exact final position.
      setTimeout(syncScrollToExternal, 400);
    };
    once('ob-scroll-up', 'click', () => scrollByPage(-1));
    once('ob-scroll-down', 'click', () => scrollByPage(1));
    once('ob-scroll-top', 'click', () => {
      const el = livePreviewEl();
      if (!el) return;
      if (_autoOn) setAuto(false);
      el.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(syncScrollToExternal, 400);
    });

    const upBtn = document.getElementById('ob-scroll-up');
    if (upBtn && !upBtn.innerHTML.trim()) upBtn.innerHTML = '<span class="icon">' + window.ICONS.arrowLeft + '</span>';
    const downBtn = document.getElementById('ob-scroll-down');
    if (downBtn && !downBtn.innerHTML.trim()) downBtn.innerHTML = '<span class="icon">' + window.ICONS.arrowRight + '</span>';
    const autoBtn = document.getElementById('ob-auto-btn');
    if (autoBtn) autoBtn.querySelector('.icon').innerHTML = window.ICONS.play;

    if (!document._obKeysBound) {
      document._obKeysBound = true;
      document.addEventListener('keydown', (e) => {
        const view = document.getElementById('view-bible-sync');
        if (!view || !view.classList.contains('active')) return;
        if (!_externalOpened) return;
        // Don't steal arrows while the operator is typing a chapter/verse.
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
          e.preventDefault(); scrollByPage(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault(); scrollByPage(-1);
        } else if (e.key === 'Escape') {
          e.preventDefault(); closePresentation().catch(() => {});
        }
      });
    }
  }

  function init() {
    populateVersionSelect();
    populateBookSelect(_currentTestament);
    bindEvents();
    const ntRadio = document.getElementById('ob-testament-nt');
    if (ntRadio) ntRadio.checked = true;
    setLiveState(false);
  }

  // Called when the operator switches back to this view. The audience screen
  // may have been closed from elsewhere (Esc on the presentation window, or
  // another module presenting) — re-check rather than trusting stale state.
  async function refresh() {
    bindEvents();
    if (!_externalOpened) return;
    const stillLive = await window.Store.presentIsOpen().catch(() => false);
    if (!stillLive) setLiveState(false);
  }

  window.BibleSync = { init: init, refresh: refresh };
})();
