// Bible Content Update module
// Provides a book/chapter/verse browser with an editor for adding/editing verses
window.BibleContentUpdate = {
  _data: null,
  _version: 'KJV',
  _bookIdx: 0,
  _chapterIdx: 0,
  _testamentTab: 0,
  _editMode: null,
  _editText: '',
  _editErrors: [],
  _editPreview: null,

  async init() {
    await this._loadData();
  },

  async _loadData() {
    const raw = await window.Store.loadBible(this._version);
    this._data = raw ? this._normalize(raw) : [];
  },

  _normalize(raw) {
    const books = Array.isArray(raw.books) ? raw.books : [];
    return books.map((b, i) => {
      const chapters = Array.isArray(b.chapters) ? b.chapters : [];
      return {
        name: String(b.name || b.title || b.book || ''),
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

  _splitTestaments() {
    const oldEnd = this._data.findIndex((b) => b.bookNum >= 40);
    if (oldEnd === -1) {
      const allNew = this._data.every((b) => b.bookNum >= 40);
      if (allNew) return { old: [], new: this._data };
      return { old: this._data, new: [] };
    }
    return {
      old: this._data.slice(0, oldEnd),
      new: this._data.slice(oldEnd)
    };
  },

  _validateVerse(text) {
    const errors = [];
    if (!text || !text.trim()) {
      errors.push('Verse text cannot be empty');
      return errors;
    }
    if (text !== text.trimStart()) {
      errors.push('Text starts with a space - remove leading spaces');
    }
    if (text !== text.trimEnd()) {
      errors.push('Text ends with a space - remove trailing spaces');
    }
    const firstChar = text.trim()[0];
    if (firstChar) {
      const allowedFirst = /[\u1200-\u137F"'"«»\u201C\u201D]/;
      if (!allowedFirst.test(firstChar)) {
        errors.push('First character is not a valid Amharic letter or allowed punctuation');
      }
    }
    const amharicOnly = /^[\u1200-\u137F\s.,;:!?()\-"'"«»\u201C\u201D\u2018\u2019\u2013\u2014\u2026]+$/;
    if (!amharicOnly.test(text)) {
      errors.push('Text contains non-Amharic characters');
    }
    if (/\n{3,}/.test(text)) {
      errors.push('Text contains excessive consecutive newlines (max 2)');
    }
    return errors;
  },

  _parseChapterText(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const verses = [];
    let currentNum = null;
    let currentText = '';
    const verseStart = /^(\d+)[\.\s\)\]]\s*(.*)$/;

    for (const line of lines) {
      const m = line.match(verseStart);
      if (m) {
        if (currentNum !== null && currentText.trim()) {
          verses.push({ verse: currentNum, text: currentText.trim() });
        }
        currentNum = parseInt(m[1], 10);
        currentText = m[2];
      } else {
        if (currentNum !== null) {
          currentText += (currentText ? ' ' : '') + line;
        }
      }
    }
    if (currentNum !== null && currentText.trim()) {
      verses.push({ verse: currentNum, text: currentText.trim() });
    }
    return verses;
  },

  _validateChapter(parsedVerses, chapterNum) {
    const errors = [];
    if (parsedVerses.length === 0) {
      errors.push('No verses found - ensure each verse starts with a number (e.g. "1 Text...")');
      return errors;
    }
    for (let i = 0; i < parsedVerses.length; i++) {
      const expected = i + 1;
      if (parsedVerses[i].verse !== expected) {
        errors.push('Verse numbering is not sequential: expected ' + expected + ', found ' + parsedVerses[i].verse);
        break;
      }
    }
    for (const v of parsedVerses) {
      const ve = this._validateVerse(v.text);
      if (ve.length > 0) {
        errors.push('Verse ' + v.verse + ': ' + ve[0]);
      }
    }
    return errors;
  },

  render(container) {
    const self = this;
    container.innerHTML = '<div class="bible-update-layout">'
      + '<div class="bible-update-browser">'
      + '<div class="bible-update-toolbar" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--color-border);flex-shrink:0;background:var(--color-surface);">'
      + '<div style="display:flex;gap:4px;">'
      + '<button class="bible-update-tab' + (this._testamentTab === 0 ? ' active' : '') + '" data-testament="0" style="padding:5px 12px;font-size:11px;">Old Testament</button>'
      + '<button class="bible-update-tab' + (this._testamentTab === 1 ? ' active' : '') + '" data-testament="1" style="padding:5px 12px;font-size:11px;">New Testament</button>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
      + '<span style="font-size:10px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.4px;">Version</span>'
      + '<select id="bibleUpdateVersion" class="bible-update-select" style="width:auto;padding:4px 8px;font-size:12px;">'
      + '<option value="KJV"' + (this._version === 'KJV' ? ' selected' : '') + '>KJV</option>'
      + '<option value="NASV"' + (this._version === 'NASV' ? ' selected' : '') + '>NASV</option>'
      + '</select>'
      + '</div>'
      + '</div>'
      + '<div class="bible-update-book-panel" style="flex-shrink:0;">'
      // Chapter and Verses each carry a section label; the book list was the
      // only panel without one, so the three columns read inconsistently.
      + '<div class="bible-update-section-label">Book</div>'
      + '<div class="bible-update-book-list" id="bibleUpdateBookList"></div></div>'
      + '<div class="bible-update-chapter-panel" id="bibleUpdateChapterPanel">'
      + '<div class="bible-update-section-label">Chapter</div>'
      + '<div class="bible-update-chapter-grid" id="bibleUpdateChapterGrid"></div></div>'
      + '<div class="bible-update-verse-panel" id="bibleUpdateVersePanel" style="flex:1;min-height:0;">'
      + '<div class="bible-update-section-label">Verses</div>'
      + '<div class="bible-update-verse-grid" id="bibleUpdateVerseGrid"></div>'
      + '</div>'
      + '<div class="bible-update-editor" id="bibleUpdateEditor" style="display:none;">'
      + '<div class="bible-update-editor-placeholder">'
      + '<span class="icon" style="font-size:2rem;opacity:0.3;">' + (window.ICONS.edit || '&#9998;') + '</span>'
      + '<p>Select a verse or chapter to edit</p></div></div>'
      + '</div>'
      + '</div>';

    container.querySelector('#bibleUpdateVersion').onchange = async (e) => {
      this._version = e.target.value;
      await this._loadData();
      this._bookIdx = 0;
      this._chapterIdx = 0;
      this._editMode = null;
      this.render(container);
    };

    container.querySelectorAll('.bible-update-tab').forEach(btn => {
      btn.onclick = () => {
        this._testamentTab = Number(btn.dataset.testament);
        this._bookIdx = 0;
        this._chapterIdx = 0;
        this._editMode = null;
        this.render(container);
      };
    });

    this._renderBookList(container);
    this._renderChapterGrid(container);
    this._renderVerseGrid(container);
  },

  _getCurrentBooks() {
    const testaments = this._splitTestaments();
    return this._testamentTab === 0 ? testaments.old : testaments.new;
  },

  _renderBookList(container) {
    const list = container.querySelector('#bibleUpdateBookList');
    const books = this._getCurrentBooks();
    list.innerHTML = books.map((b, i) => {
      const hasMissing = b.chapters.some((c, ci) => !c || !c.verses || c.verses.length === 0 || c.verses.every(v => !v || !v.trim()));
      return '<button class="bible-update-book-btn' + (i === this._bookIdx ? ' active' : '') + (hasMissing ? ' has-missing' : '') + '" data-book-idx="' + i + '">'
        + '<span class="book-num">' + (i + 1) + '</span>'
        + '<span class="book-name">' + this._escapeHtml(b.name) + '</span>'
        + (hasMissing ? '<span class="missing-badge">!</span>' : '')
        + '</button>';
    }).join('');

    list.querySelectorAll('.bible-update-book-btn').forEach(btn => {
      btn.onclick = () => {
        this._bookIdx = Number(btn.dataset.bookIdx);
        this._chapterIdx = 0;
        this._editMode = null;
        this.render(container);
      };
    });
  },

  _renderChapterGrid(container) {
    const grid = container.querySelector('#bibleUpdateChapterGrid');
    const books = this._getCurrentBooks();
    const book = books[this._bookIdx];
    if (!book) { grid.innerHTML = ''; return; }

    grid.innerHTML = book.chapters.map((c, i) => {
      const isMissing = !c || !c.verses || c.verses.length === 0 || c.verses.every(v => !v || !v.trim());
      const hasPartial = !isMissing && c.verses.some(v => !v || !v.trim());
      const isActive = i === this._chapterIdx;
      let cls = 'bible-update-chapter-btn';
      if (isActive) cls += ' active';
      if (isMissing) cls += ' missing';
      else if (hasPartial) cls += ' partial';
      else cls += ' complete';
      return '<button class="' + cls + '" data-chapter-idx="' + i + '">' + (i + 1) + '</button>';
    }).join('');

    grid.querySelectorAll('.bible-update-chapter-btn').forEach(btn => {
      btn.onclick = () => {
        this._chapterIdx = Number(btn.dataset.chapterIdx);
        this._editMode = null;
        this.render(container);
      };
    });
  },

  _renderVerseGrid(container) {
    const grid = container.querySelector('#bibleUpdateVerseGrid');
    const books = this._getCurrentBooks();
    const book = books[this._bookIdx];
    if (!book) { grid.innerHTML = ''; return; }
    const chapter = book.chapters[this._chapterIdx];
    if (!chapter) { grid.innerHTML = ''; return; }

    const maxVerses = Math.max(chapter.verses.length, 1);
    const displayCount = Math.min(maxVerses, 200);

    grid.innerHTML = Array.from({ length: displayCount }, (_, i) => {
      const vText = chapter.verses[i];
      const isMissing = !vText || !vText.trim();
      let cls = 'bible-update-verse-btn';
      if (isMissing) cls += ' missing';
      else cls += ' present';
      return '<button class="' + cls + '" data-verse-idx="' + i + '">'
        + '<span class="verse-num">' + (i + 1) + '</span>'
        + '<span class="verse-status">' + (isMissing ? '&#10005;' : '&#10003;') + '</span></button>';
    }).join('');

    grid.querySelectorAll('.bible-update-verse-btn').forEach(btn => {
      btn.onclick = () => {
        const verseIdx = Number(btn.dataset.verseIdx);
        this._openVerseEditor(container, verseIdx);
      };
    });

    const editChapterBtn = document.createElement('button');
    editChapterBtn.className = 'bible-update-edit-chapter-btn';
    editChapterBtn.textContent = 'Edit Full Chapter';
    editChapterBtn.onclick = () => this._openChapterEditor(container);
    grid.appendChild(editChapterBtn);
  },

  _openVerseEditor(container, verseIdx) {
    const books = this._getCurrentBooks();
    const book = books[this._bookIdx];
    const chapter = book.chapters[this._chapterIdx];
    const existingText = chapter.verses[verseIdx] || '';
    const bookNum = book.bookNum;
    const chapterNum = this._chapterIdx + 1;
    const verseNum = verseIdx + 1;

    this._editMode = { type: 'verse', book: bookNum, chapter: chapterNum, verse: verseNum, bookName: book.name };
    this._editText = existingText;
    this._editErrors = [];
    this._editPreview = null;
    this._renderEditor(container);
  },

  _openChapterEditor(container) {
    const books = this._getCurrentBooks();
    const book = books[this._bookIdx];
    const bookNum = book.bookNum;
    const chapterNum = this._chapterIdx + 1;

    this._editMode = { type: 'chapter', book: bookNum, chapter: chapterNum, bookName: book.name };
    this._editText = '';
    this._editErrors = [];
    this._editPreview = null;
    this._renderEditor(container);
  },

  _renderEditor(container) {
    const editor = container.querySelector('#bibleUpdateEditor');
    const versePanel = container.querySelector('#bibleUpdateVersePanel');
    const self = this;
    const mode = this._editMode;

    if (!mode) {
      if (versePanel) versePanel.style.display = '';
      editor.style.display = 'none';
      editor.innerHTML = ''
        + '<div class="bible-update-editor-placeholder">'
        + '<span class="icon" style="font-size:2rem;opacity:0.3;">' + (window.ICONS.edit || '&#9998;') + '</span>'
        + '<p>Select a verse or chapter to edit</p></div>';
      return;
    }

    if (versePanel) versePanel.style.display = 'none';
    editor.style.display = '';

    const isChapter = mode.type === 'chapter';
    const title = isChapter
      ? 'Editing ' + mode.bookName + ' ' + mode.chapter + ' (Full Chapter)'
      : 'Editing ' + mode.bookName + ' ' + mode.chapter + ':' + mode.verse;

    const previewHtml = this._editPreview && isChapter
      ? this._editPreview.map(v => '<div class="bible-update-preview-verse"><span class="preview-num">' + v.verse + '.</span> ' + this._escapeHtml(v.text) + '</div>').join('')
      : '';

    const errorsHtml = this._editErrors.length > 0
      ? '<div class="bible-update-errors">' + this._editErrors.map(e => '<div class="bible-update-error">&#9888; ' + this._escapeHtml(e) + '</div>').join('') + '</div>'
      : '';

    editor.innerHTML = ''
      + '<div class="bible-update-editor-panel">'
      + '<div class="bible-update-editor-header">'
      + '<h4>' + this._escapeHtml(title) + '</h4>'
      + '<button class="bible-update-close-btn" id="bibleUpdateEditorClose">&#10005;</button></div>'
      + errorsHtml
      + '<div class="bible-update-editor-body">'
      + '<label>' + (isChapter ? 'Paste the full chapter text with verse numbers:' : 'Verse text:') + '</label>'
      + '<textarea class="bible-update-textarea" id="bibleUpdateTextarea" rows="' + (isChapter ? 15 : 5) + '" placeholder="' + (isChapter ? '1 Verse one text...\n2 Verse two text...' : 'Enter verse text...') + '">' + this._escapeHtml(this._editText) + '</textarea>'
      + (isChapter && this._editPreview ? '<div class="bible-update-preview"><strong>Preview (' + this._editPreview.length + ' verses):</strong>' + previewHtml + '</div>' : '')
      + '<div class="bible-update-editor-actions">'
      + (isChapter ? '<button class="btn btn-ghost" id="bibleUpdatePreviewBtn">Preview</button>' : '')
      + '<button class="btn btn-primary" id="bibleUpdateSaveBtn">Save</button></div></div></div>';

    const textarea = editor.querySelector('#bibleUpdateTextarea');
    textarea.oninput = () => {
      this._editText = textarea.value;
      this._editErrors = [];
      this._editPreview = null;
    };

    editor.querySelector('#bibleUpdateEditorClose').onclick = () => {
      this._editMode = null;
      this._editText = '';
      this._editErrors = [];
      this._editPreview = null;
      this._renderEditor(container);
    };

    if (isChapter) {
      editor.querySelector('#bibleUpdatePreviewBtn').onclick = () => {
        const parsed = this._parseChapterText(this._editText);
        const errors = this._validateChapter(parsed, mode.chapter);
        this._editErrors = errors;
        this._editPreview = errors.length === 0 ? parsed : null;
        this._renderEditor(container);
        setTimeout(() => {
          const ta = container.querySelector('#bibleUpdateTextarea');
          if (ta) { ta.value = this._editText; ta.focus(); }
        }, 0);
      };
    }

    editor.querySelector('#bibleUpdateSaveBtn').onclick = async () => {
      if (isChapter) {
        const parsed = this._parseChapterText(this._editText);
        const errors = this._validateChapter(parsed, mode.chapter);
        if (errors.length > 0) {
          this._editErrors = errors;
          this._renderEditor(container);
          setTimeout(() => {
            const ta = container.querySelector('#bibleUpdateTextarea');
            if (ta) { ta.value = this._editText; ta.focus(); }
          }, 0);
          return;
        }
        await this._saveChapter(parsed, mode);
      } else {
        const errors = this._validateVerse(this._editText);
        if (errors.length > 0) {
          this._editErrors = errors;
          this._renderEditor(container);
          setTimeout(() => {
            const ta = container.querySelector('#bibleUpdateTextarea');
            if (ta) { ta.value = this._editText; ta.focus(); }
          }, 0);
          return;
        }
        await this._saveVerse(this._editText.trim(), mode);
      }
    };
  },

  async _saveVerse(text, mode) {
    try {
      const result = await window.Store.saveBibleVerse({
        version: this._version,
        book: mode.book,
        book_name: mode.bookName,
        chapter: mode.chapter,
        verse: mode.verse,
        text: text
      });
      if (result && result.success) {
        await this._loadData();
        this._editMode = null;
        this._editText = '';
        this._editErrors = [];
        const container = document.getElementById('bibleEditorContainer');
        if (container) this.render(container);
      } else {
        this._editErrors = [result && result.error ? result.error : 'Failed to save verse'];
        this._renderEditor(document.getElementById('bibleEditorContainer'));
      }
    } catch (err) {
      this._editErrors = ['Error saving: ' + err.message];
      this._renderEditor(document.getElementById('bibleEditorContainer'));
    }
  },

  async _saveChapter(parsedVerses, mode) {
    try {
      const result = await window.Store.saveBibleChapter({
        version: this._version,
        book: mode.book,
        book_name: mode.bookName,
        chapter: mode.chapter,
        verses: parsedVerses
      });
      if (result && result.success) {
        await this._loadData();
        this._editMode = null;
        this._editText = '';
        this._editErrors = [];
        this._editPreview = null;
        const container = document.getElementById('bibleEditorContainer');
        if (container) this.render(container);
      } else {
        this._editErrors = [result && result.error ? result.error : 'Failed to save chapter'];
        this._renderEditor(document.getElementById('bibleEditorContainer'));
      }
    } catch (err) {
      this._editErrors = ['Error saving: ' + err.message];
      this._renderEditor(document.getElementById('bibleEditorContainer'));
    }
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};