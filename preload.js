const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  storeGet: (name) => ipcRenderer.invoke('store:get', name),
  storeSet: (name, data) => ipcRenderer.invoke('store:set', name, data),
  openDocxDialog: () => ipcRenderer.invoke('dialog:openDocx'),
  parseDocx: (filePath) => ipcRenderer.invoke('docx:parse', filePath),
  loadBible: (version) => ipcRenderer.invoke('bible:load', version),
  setFullScreen: (value) => ipcRenderer.invoke('app:setFullScreen', value),
  generateQrCode: (url, opts) => ipcRenderer.invoke('qrcode:generate', url, opts),
  // Slideshow
  slidesPickAndCopy: () => ipcRenderer.invoke('slides:pickAndCopy'),
  slidesList: () => ipcRenderer.invoke('slides:list'),
  slidesDelete: (name) => ipcRenderer.invoke('slides:delete', name),
  // Dual-monitor presentation
  presentOpen: (payload) => ipcRenderer.invoke('present:open', payload),
  presentUpdate: (payload) => ipcRenderer.invoke('present:update', payload),
  presentNavigate: (url) => ipcRenderer.invoke('present:navigate', url),
  presentClose: () => ipcRenderer.invoke('present:close'),
  presentIsOpen: () => ipcRenderer.invoke('present:isOpen'),
  // Auto-update
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateGetState: () => ipcRenderer.invoke('update:getState'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateState: (callback) => {
    ipcRenderer.on('update:state', (event, state) => callback(state));
  },
  onPresentClosed: (callback) => {
    ipcRenderer.on('present:closed', () => callback());
  },
  getDisplays: () => ipcRenderer.invoke('app:getDisplays'),
  // Video file support
  openVideoDialog: () => ipcRenderer.invoke('dialog:openVideo'),
  // YouTube login
  youtubeLogin: () => ipcRenderer.invoke('youtube:login'),
  youtubeLogout: () => ipcRenderer.invoke('youtube:logout'),
  youtubeIsLoggedIn: () => ipcRenderer.invoke('youtube:isLoggedIn'),
  onYouTubeLoginState: (callback) => {
    ipcRenderer.on('youtube:loginState', (event, state) => callback(state));
  },
  // Bible content update
  saveBibleVerse: (payload) => ipcRenderer.invoke('bible:saveVerse', payload),
  saveBibleChapter: (payload) => ipcRenderer.invoke('bible:saveChapter', payload),
  // Online Bible Sync
  getBibleVersions: () => ipcRenderer.invoke('bible:getVersions'),
  fetchBibleBook: (params) => ipcRenderer.invoke('bible:fetchBook', params),
  fetchBibleVerses: (params) => ipcRenderer.invoke('bible:fetchVerses', params),
  checkBibleUpdates: (params) => ipcRenderer.invoke('bible:checkUpdates', params),
  getLocalBooks: (versionId) => ipcRenderer.invoke('bible:getLocalBooks', versionId),
  onBibleFetchProgress: (callback) => {
    ipcRenderer.on('bible:fetch-progress', (event, data) => callback(data));
  }
});

