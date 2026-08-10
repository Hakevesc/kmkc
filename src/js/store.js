// Thin wrapper around the preload-exposed IPC API.
window.Store = {
  get(name) { return window.api.storeGet(name); },
  set(name, data) { return window.api.storeSet(name, data); },
  openDocxDialog() { return window.api.openDocxDialog(); },
  parseDocx(filePath) { return window.api.parseDocx(filePath); },
  loadBible(version) { return window.api.loadBible(version); },
  setFullScreen(value) { return window.api.setFullScreen(value); },
  newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  // Slideshow
  slidesPickAndCopy() { return window.api.slidesPickAndCopy(); },
  slidesList() { return window.api.slidesList(); },
  slidesDelete(name) { return window.api.slidesDelete(name); },
  // Dual-monitor presentation
  presentOpen(payload) { return window.api.presentOpen(payload); },
  presentUpdate(payload) { return window.api.presentUpdate(payload); },
  presentNavigate(url) { return window.api.presentNavigate(url); },
  presentClose() { return window.api.presentClose(); },
  presentIsOpen() { return window.api.presentIsOpen(); },
  // Auto-update
  updateCheck() { return window.api.updateCheck(); },
  updateGetState() { return window.api.updateGetState(); },
  updateInstall() { return window.api.updateInstall(); },
  onUpdateState(callback) { return window.api.onUpdateState(callback); },
  onPresentClosed(callback) { return window.api.onPresentClosed(callback); },
  // Bible content update
  saveBibleVerse(payload) { return window.api.saveBibleVerse(payload); },
  saveBibleChapter(payload) { return window.api.saveBibleChapter(payload); },
  // Online Bible Sync
  getBibleVersions() { return window.api.getBibleVersions(); },
  fetchBibleBook(params) { return window.api.fetchBibleBook(params); },
  fetchBibleVerses(params) { return window.api.fetchBibleVerses(params); },
  checkBibleUpdates(params) { return window.api.checkBibleUpdates(params); },
  getLocalBooks(versionId) { return window.api.getLocalBooks(versionId); },
  onBibleFetchProgress(callback) { return window.api.onBibleFetchProgress(callback); }
};

