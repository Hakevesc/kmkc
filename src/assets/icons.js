// Inline SVG icons (currentColor-based, no external/network requests).
window.ICONS = {
  calendar: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 9.5H21" stroke="currentColor" stroke-width="1.8"/><path d="M8 3V6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 3V6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  clock: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7V12L15.5 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  bank: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10L12 4L21 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 10V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 10V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 10V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 19H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  card: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="5.5" width="19" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9.5H21.5" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 14.5H10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  plus: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  edit: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20L4.6 16.5L16 5.1C16.6 4.5 17.5 4.5 18.1 5.1L19 6C19.6 6.6 19.6 7.5 19 8.1L7.6 19.4L4 20Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',

  trash: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 7V4.5H15V7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 7L7 20H17L18 7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',

  play: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4L20 12L6 20V4Z" fill="currentColor"/></svg>',

  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11 6L5 12L11 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  arrowRight: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13 6L19 12L13 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  close: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5L19 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  gear: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C13.1 2 14 2.9 14 4V4.5C14.9 4.8 15.7 5.2 16.4 5.7L16.8 5.3C17.6 4.5 18.9 4.5 19.7 5.3C20.5 6.1 20.5 7.4 19.7 8.2L19.3 8.6C19.8 9.3 20.2 10.1 20.5 11H21C22.1 11 23 11.9 23 13C23 14.1 22.1 15 21 15H20.5C20.2 15.9 19.8 16.7 19.3 17.4L19.7 17.8C20.5 18.6 20.5 19.9 19.7 20.7C18.9 21.5 17.6 21.5 16.8 20.7L16.4 20.3C15.7 20.8 14.9 21.2 14 21.5V22C14 23.1 13.1 24 12 24C10.9 24 10 23.1 10 22V21.5C9.1 21.2 8.3 20.8 7.6 20.3L7.2 20.7C6.4 21.5 5.1 21.5 4.3 20.7C3.5 19.9 3.5 18.6 4.3 17.8L4.7 17.4C4.2 16.7 3.8 15.9 3.5 15H3C1.9 15 1 14.1 1 13C1 11.9 1.9 11 3 11H3.5C3.8 10.1 4.2 9.3 4.7 8.6L4.3 8.2C3.5 7.4 3.5 6.1 4.3 5.3C5.1 4.5 6.4 4.5 7.2 5.3L7.6 5.7C8.3 5.2 9.1 4.8 10 4.5V4C10 2.9 10.9 2 12 2Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',

  minus: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  minimize: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  check: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  book: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6C10.5 4.5 8 4 5.5 4.5C4.6 4.7 4 5.5 4 6.4V17.5C4 18.6 4.9 19.4 6 19.3C8.2 19.1 10.4 19.5 12 21" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 6C13.5 4.5 16 4 18.5 4.5C19.4 4.7 20 5.5 20 6.4V17.5C20 18.6 19.1 19.4 18 19.3C15.8 19.1 13.6 19.5 12 21" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 6V21" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',

  image: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M3 16L8 11L12 15L15 12L21 17" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',

  video: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M17 10L22 7V17L17 14" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',

  timer: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 9V13L15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 2H14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 2V5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  pause: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor"/></svg>',

  repeat: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 2L21 6L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9C3 7.34 4.34 6 6 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 22L3 18L7 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13V15C21 16.66 19.66 18 18 18H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  pin: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 17V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 17H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 3L9 3L8 10L5 17H19L16 10L15 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',

  // Social media platform icons
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.5 6.2c-.3-1-1-1.8-2-2C19.8 3.5 12 3.5 12 3.5s-7.8 0-9.5.7c-1 .2-1.7 1-2 2C0 7.8 0 12 0 12s0 4.2.5 5.8c.3 1 1 1.8 2 2 1.7.7 9.5.7 9.5.7s7.8 0 9.5-.7c1-.2 1.7-1 2-2 .5-1.6.5-5.8.5-5.8s0-4.2-.5-5.8zM9.5 15.5V8.5l6.5 3.5-6.5 3.5z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',

  share: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 13.5L15.5 17.5M15.5 6.5L8.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  music: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18V6L21 4V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',

  cross: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3V21M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 8L16 16M16 8L8 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',

  megaphone: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10C3 8.89543 3.89543 8 5 8H6L11 4V20L6 16H5C3.89543 16 3 15.1046 3 14V10Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 8C15.5 9.5 15.5 14.5 14 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 5C20 8 20 16 17 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 4L7 12L15 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  menu: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  home: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5L12 3L21 9.5V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V9.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 21V12H15V21" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',

  download: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  refresh: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11A8 8 0 1 1 17.3 5.7L20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4V8H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
