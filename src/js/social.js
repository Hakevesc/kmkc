// Social Media follow feature. Manages social media accounts with @username and QR codes.
// Uses the same operator + external display pattern as bank accounts and bible.
window.Social = {
  accounts: [],
  editingId: null,
  QR_REDIRECT_URL: 'https://kebenamkc.vercel.app/',

  externalOpened: false,
  autoTimer: null,
  autoOn: false,
  liveStartTime: Date.now(),
  liveTimerInterval: null,
  pendingMode: 'overview',
  pendingIdx: 0,
  liveMode: 'overview',
  liveIdx: 0,

  PLATFORMS: [
    { id: 'youtube',   label: 'YouTube',           color: '#FF0000', icon: 'youtube' },
    { id: 'tiktok',    label: 'TikTok',             color: '#000000', icon: 'tiktok' },
    { id: 'facebook',  label: 'Facebook',           color: '#1877F2', icon: 'facebook' },
    { id: 'instagram', label: 'Instagram',          color: '#E4405F', icon: 'instagram' },
    { id: 'telegram',  label: 'Telegram',           color: '#0088cc', icon: 'telegram' },
    { id: 'x',         label: 'X (Twitter)',        color: '#000000', icon: 'x' },
    { id: 'whatsapp',  label: 'WhatsApp',           color: '#25D366', icon: 'whatsapp' },
    { id: 'threads',   label: 'Threads',            color: '#000000', icon: 'threads' },
    { id: 'snapchat',  label: 'Snapchat',           color: '#FFFC00', icon: 'snapchat' },
    { id: 'linkedin',  label: 'LinkedIn',           color: '#0A66C2', icon: 'linkedin' },
    { id: 'pinterest', label: 'Pinterest',          color: '#E60023', icon: 'pinterest' },
    { id: 'discord',   label: 'Discord',            color: '#5865F2', icon: 'discord' },
    { id: 'twitch',    label: 'Twitch',             color: '#9146FF', icon: 'twitch' },
    { id: 'rumble',    label: 'Rumble',             color: '#85C742', icon: 'rumble' },
    { id: 'spotify',   label: 'Spotify',            color: '#1DB954', icon: 'spotify' },
    { id: 'soundcloud',label: 'SoundCloud',         color: '#FF5500', icon: 'soundcloud' },
    { id: 'vimeo',     label: 'Vimeo',              color: '#1AB7EA', icon: 'vimeo' },
    { id: 'website',   label: 'Website / Linktree', color: '#10b981', icon: 'globe' }
  ],

  _PLATFORM_ABBR: { youtube:'YT', tiktok:'TK', facebook:'FB', instagram:'IG', telegram:'TG', x:'X', whatsapp:'WA', threads:'TH', snapchat:'SC', linkedin:'LI', pinterest:'PIN', discord:'DC', twitch:'TV', rumble:'RM', spotify:'SP', soundcloud:'SC', vimeo:'VI', website:'WEB' },
  _PLATFORM_BG: {
    youtube:   '#FF0000',
    tiktok:    '#000',
    facebook:  '#1877F2',
    instagram: 'linear-gradient(45deg,#f09433,#dc2743,#bc1888)',
    telegram:  '#0088cc',
    x:         '#000',
    whatsapp:  '#25D366',
    threads:   '#000',
    snapchat:  '#FFFC00',
    linkedin:  '#0A66C2',
    pinterest: '#E60023',
    discord:   '#5865F2',
    twitch:    '#9146FF',
    rumble:    '#85C742',
    spotify:   '#1DB954',
    soundcloud:'#FF5500',
    vimeo:     '#1AB7EA',
    website:   '#10b981'
  },

  async init() {
    try {
      // Register extra icons if not already present
      if (window.ICONS) {
        if (!window.ICONS.x) {
          window.ICONS.x = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
        }
        if (!window.ICONS.whatsapp) {
          window.ICONS.whatsapp = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
        }
        if (!window.ICONS.globe) {
          window.ICONS.globe = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
        }
        // Extended platform icons
        if (!window.ICONS.threads) {
          window.ICONS.threads = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.878-6.43 2.523-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.018 5.143.811 6.928 2.293 1.698 1.423 2.732 3.449 3.025 5.868l-2.789.44c-.457-3.597-2.981-5.592-7.172-5.62-2.747.018-4.814.782-6.145 2.271C4.782 6.682 4.116 8.85 4.095 12c.021 3.152.687 5.32 1.946 6.748 1.33 1.49 3.396 2.254 6.143 2.272 2.51-.017 4.077-.575 5.038-1.543.747-.75 1.222-1.81 1.374-2.965l-4.337.687a3.25 3.25 0 01-.482.036c-2.19 0-3.97-1.78-3.97-3.97 0-2.19 1.78-3.97 3.97-3.97 2.19 0 3.97 1.78 3.97 3.97 0 .348-.047.686-.133 1.009l2.738-.434c.195-.89.294-1.818.294-2.77 0-.3-.013-.597-.037-.893-.24-2.932-1.43-5.234-3.465-6.79C15.24.736 13.734.018 12.186 0z"/></svg>`;
        }
        if (!window.ICONS.snapchat) {
          window.ICONS.snapchat = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.065.001c.332-.005 3.415.076 5.123 3.074.55.967.633 2.104.608 3.076l-.006.195c-.005.195-.01.36-.01.556.24.121.513.168.79.168.374 0 .738-.1 1.002-.22a.77.77 0 0 1 .302-.067c.164 0 .326.049.46.145.243.17.377.44.356.716-.024.33-.247.596-.556.673-.042.011-.083.02-.124.028-.12.022-.306.056-.507.12-.39.125-.61.321-.708.626-.038.116-.024.224.044.343.277.483.956 1.547 2.105 2.364.356.252.72.444 1.085.573.275.097.374.398.266.677-.185.48-.762.781-1.647.862-.148.013-.274.147-.378.398-.12.29-.257.365-.428.365-.085 0-.18-.02-.292-.059a3.27 3.27 0 0 0-1.116-.217c-.284 0-.516.047-.726.088-.284.056-.53.104-.854.104-.164 0-.343-.017-.554-.054-.53-.093-.957-.31-1.343-.503-.344-.173-.673-.337-1.016-.4a2.32 2.32 0 0 0-.437-.04c-.247 0-.483.04-.723.08-.238.039-.481.08-.74.08-.174 0-.335-.02-.5-.06a2.74 2.74 0 0 1-.898-.396c-.39-.26-.747-.49-1.17-.566a3.3 3.3 0 0 0-.587-.054c-.42 0-.787.072-1.05.153-.165.052-.298.079-.41.079-.183 0-.316-.087-.41-.271-.074-.143-.197-.232-.383-.278-.887-.217-1.397-.554-1.52-.998a.567.567 0 0 1 .23-.601c.368-.243.74-.527 1.097-.85C3.9 11.83 4.5 10.75 4.724 10.37c.065-.113.079-.22.04-.338-.1-.305-.32-.501-.71-.626-.2-.064-.386-.098-.507-.12-.04-.008-.082-.017-.124-.028-.294-.067-.51-.317-.556-.636-.037-.266.085-.534.315-.703a.678.678 0 0 1 .407-.14c.106 0 .208.025.305.074.26.131.608.223.967.223.3 0 .573-.065.78-.174l-.012-.38-.003-.187c-.025-.969.058-2.1.607-3.064C7.774.066 10.987-.004 11.398 0l.667.001z"/></svg>`;
        }
        if (!window.ICONS.linkedin) {
          window.ICONS.linkedin = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
        }
        if (!window.ICONS.pinterest) {
          window.ICONS.pinterest = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>`;
        }
        if (!window.ICONS.discord) {
          window.ICONS.discord = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;
        }
        if (!window.ICONS.twitch) {
          window.ICONS.twitch = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`;
        }
        if (!window.ICONS.rumble) {
          window.ICONS.rumble = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.36 8.836c-.5-.288-1.056-.432-1.668-.432-.535 0-1.024.12-1.464.36l-2.22 1.236V7.008C10.996 6.336 10.46 6 9.828 6c-.348 0-.672.09-.972.27-.6.36-.9.888-.9 1.584v8.292c0 .696.3 1.224.9 1.584.3.18.624.27.972.27.636 0 1.176-.336 1.38-1.008l2.22 1.236c.444.24.93.36 1.464.36.612 0 1.168-.144 1.668-.432.996-.576 1.5-1.488 1.5-2.736V11.58c0-1.248-.504-2.16-1.5-2.736zM15.3 15.42c0 .504-.216.888-.648 1.152-.228.132-.48.198-.756.198-.252 0-.492-.06-.72-.18L11.1 15.216V8.784l2.076-1.176c.228-.12.468-.18.72-.18.276 0 .528.066.756.198.432.264.648.648.648 1.152v6.642z"/></svg>`;
        }
        if (!window.ICONS.spotify) {
          window.ICONS.spotify = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;
        }
        if (!window.ICONS.soundcloud) {
          window.ICONS.soundcloud = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1.175 12.225c-.017 0-.034.002-.051.004l-.079.016-.052.014-.053.018-.048.02-.05.025-.046.029-.045.031-.041.036-.042.04-.037.041-.038.049-.031.047-.03.053-.026.055-.023.06-.02.062-.018.065-.013.066-.012.071-.008.073-.006.075-.003.076.001.078.006.079.009.079.013.077.016.074.02.07.024.068.027.063.031.058.034.054.038.049.041.043.044.038.048.032.051.027.054.02.057.013.062.007.065.001.067-.005.071-.011.074-.019.076-.025.079-.034.079-.04.082-.048.082-.056.083-.063.084-.07.085-.079.084-.086.086-.095.085-.103.084-.112.085-.12.083-.129.082-.138.08-.146.08-.157.078-.165.075-.175.074-.184.071-.193.07-.203.066-.213.064-.221.061-.231.059-.241.056-.25.053-.26.05-.27.047-.28.043-.289.04-.299.037-.309.033-.32.029-.329.025-.339.021-.349.017-.359.013-.369.008-.38.004-.389 0-.399-.004-.409-.008-.419-.013-.43-.018-.439-.024-.45-.029-.46-.034-.469-.04-.48-.046-.49-.052-.499-.058-.509-.064-.518-.069-.527-.076-.537-.082-.546-.088-.555-.094-.563-.1-.572-.107-.58-.113-.588-.12-.595-.126-.603-.133-.61-.14-.617-.147-.624-.153-.63-.16-.636-.167-.642-.174-.648-.181-.653-.188-.658-.195-.663-.201-.667-.209-.671-.216-.675-.224-.678-.231-.681-.238-.684-.246-.687-.253-.689-.26-.691-.267-.693-.275-.694-.282-.695-.289-.696-.297-.697-.304-.697-.311-.697h-.004l.001-.001zm-.001-.001c-.008 0-.015 0-.023.001l-.017.001-.019.002-.017.002-.019.003-.016.003-.018.004-.016.005-.018.006-.016.006-.017.008-.015.008-.017.01-.014.009-.017.012-.013.011-.016.013-.013.013-.015.015-.012.014-.014.016-.012.016-.013.018-.011.018-.012.02-.01.02-.011.022-.01.022-.01.024-.009.024-.009.026-.008.026-.008.028-.007.028-.007.03-.006.03-.006.032-.005.032-.005.034-.004.034-.004.036-.003.036-.003.038-.002.038-.002.04-.001.04-.001.042.001.042.001.044.002.044.003.046.003.046.004.048.004.048.005.05.006.05.006.052.007.052.007.054.009.054.009.056.01.056.01.057.012.058.012.059.013.06.013.061.015.061.015.062.016.063.017.063.018.064.018.065.02.065.02.065.022.066.022.066.024.067.025.067.026.067.027.067.028.068.03.068.03.068.033.068.033.068.035.068.036.068.038.068.039.068.041.068.042.068.044.068.046.068.047.067.049.067.051.067.053.067.054.066.056.066.058.065.06.065.062.064.064.063.066.063.068.062.071.061.073.06.075.059.077.058.08.057.082.056.085.055.087.054.09.052.092.051.095.05.097.048.1.047.103.045.105.044.108.042.111.04.113.039.116.037.119.035.122.033.124.031.127.029.13.027.133.025.136.023.138.021.141.018.144.016.147.014.15.011.153.009.155.006.158.004.162.001.164-.001.167-.004.17-.006.173-.009.175-.012.178-.014.181-.017.184-.02.186-.022.189-.025.192-.027.195-.03.197-.033.2-.035.203-.038.206-.04.208-.043.211-.046.213-.048.216-.051.218-.054.22-.056.223-.059.225-.062.228-.064.23-.067.232-.07.234-.072.236-.075.239-.078.241-.08.242-.083.245-.086.247-.088.249-.091.25-.094.252-.096.254-.099.256-.101.257-.104.259-.107.26-.109.261-.112.262-.115.264-.117.265-.12.266-.122.267-.125.268-.127.269-.13.27-.132.27-.135.271-.137.271-.14.272-.142.272-.145.272-.147.272-.15.272-.152.272-.154.272-.157.272-.16.271-.162.271-.164.27-.167.27-.169.269-.171.269-.174.268-.176.267-.178.266-.181.265-.183.264-.185.263-.187.262-.19.26-.192.259-.194.258-.196.256-.198.255-.2.253-.202.251-.204.25-.206.248-.208.246-.21.244-.212.242-.214.24-.216.238-.217.235-.22.233-.221.23-.223.228-.225.225-.227.222-.228.22-.23.217-.232.214-.233.211-.235.208-.237.205-.238.202-.24.199-.241.196-.242.193-.244.19-.245.186-.246.183-.248.18-.249.177-.25.173-.251.17-.252.167-.253.163-.254.16-.255.156-.256.153-.256.149-.257.145-.258.142-.258.138-.259.135-.259.131-.26.127-.26.124-.26.12-.26.116-.261.113-.261.109-.261.105-.261.102-.261.098-.261.094-.261.09-.261.087-.261.083-.261.079-.261.076-.261.072-.26.068-.26.064-.26.061-.26.057-.259.053-.259.05-.259.046-.258.043-.258.039-.257.035-.257.032-.256.028-.256.025-.255.021-.254.018-.254.014-.253.011-.252.007-.251.004-.251.001-.25-.003-.249-.006-.248-.009-.247-.012-.246-.016-.245-.019-.244-.022-.242-.026-.241-.029-.24-.032-.238-.036-.237-.039-.235-.042-.234-.046-.232-.049-.23-.053-.229-.056-.227-.059-.225-.063-.223-.066-.221-.07-.219-.073-.217-.076-.215-.08-.212-.083-.21-.087-.208-.09-.205-.094-.203-.097-.2-.1-.198-.104-.195-.107-.193-.111-.19-.114-.188-.117-.185-.121-.182-.124-.179-.128-.176-.131-.173-.135-.17-.138-.167-.142-.164-.145-.161-.148-.158-.152-.154-.155-.151-.158-.148-.162-.145-.165-.142-.168-.138-.172-.135-.175-.131-.179-.128-.182-.124-.185-.121-.188-.117-.192-.114-.195-.11-.198-.107-.201-.103-.204-.1-.207-.096-.21-.093-.213-.089-.216-.085-.219-.082-.222-.078-.225-.074-.228-.071-.231-.067-.234-.063-.236-.06-.239-.056-.242-.052-.244-.049-.247-.045-.25-.041-.252-.038-.254-.034-.257-.031-.259-.027-.262-.023-.264-.02-.266-.016-.269-.013-.271-.009-.273-.006-.276-.002-.278.001-.28.005-.282.008-.285.012-.287.015-.289.019-.291.022-.293.026-.296.03-.298.033-.3.037-.302.04-.304.044-.306.048-.308.051-.31.055-.312.058-.314.062-.316.066-.318.069-.32.073-.322.076-.323.08-.325.084-.327.087-.329.091-.33.095-.332.098-.333.102-.335.105-.336.109-.338.113-.339.116-.341.12-.342.123-.343.127-.345.131-.346.134-.347.138-.348.141-.349.145-.35.149-.351.152-.352.156-.353.159-.354.163-.355.166-.356.17-.357.173-.358.177-.358.181-.359.184-.36.188-.36.191-.361.195-.361.198-.362.202-.362.206-.362.209-.363.213-.363.216-.363.22-.363.223-.363.227-.363.23-.363.234-.363.237-.363.241-.363.244-.362.248-.362.251-.362.255-.361.258-.361.261-.36.265-.36.268-.359.272-.358.275-.358.279-.357.282-.356.285-.355.289-.354.292-.354.295-.352.299-.351.302-.35.305-.349.309-.348.312-.346.315-.345.318-.344.322-.342.325-.341.328-.339.331-.338.334-.336.337-.334.34-.333.343-.331.346-.329.349-.327.352-.325.355-.323.358-.321.361-.319.364-.317.367-.315.369-.312.372-.31.375-.308.378-.305.381-.303.383-.3.386-.298.389-.295.391-.292.394-.289.397-.286.399-.284.402-.281.404-.278.407-.274.409-.271.412-.268.414-.265.416-.262.419-.258.421-.255.423-.252.425-.248.428-.245.43-.241.432-.238.434-.234.436-.23.438-.227.44-.223.442-.22.444-.216.446-.212.448-.208.45-.204.452-.2.453-.196.455-.192.457-.188.459-.184.461-.18.462-.176.464-.171.466-.167.467-.163.469-.159.471-.154.472-.15.474-.146.475-.141.477-.137.478-.132.48-.128.481-.123.483-.119.484-.114.485-.11.487-.105.488-.1.489-.096.491-.091.492-.086.493-.082.495-.077.496-.072.497-.067.498-.062.499-.058.5-.053.501-.048.502-.043.503-.038.504-.033.505-.028.506-.023.507-.018.508-.013.509-.008.51-.003.51.002.511.007.512.012.513.017.514.022.515.027.516.032.517.037.517.042.518.047.519.052.52.057.52.062.521.067.522.072.522.077.523.082.524.087.524.092.525.097.525.102.526.107.526.112.527.117.527.122.527.127.528.132.528.137.528.142.529.147.529.152.529.157.529.162.529.167.53.172.53.177.53.182.53.187.53.192.53.197.53.202.529.207.529.212.529.217.529.222.529.227.528.232.528.237.527.242.527.247.526.252.526.257.525.262.524.267.524.272.523.277.522.282.521.287.52.292.52.297.519.302.518.307.517.312.516.317.515.321.514.326.513.331.511.336.51.341.509.346.508.35.506.355.505.36.503.365.502.369.5.374.499.379.497.383.495.388.494.393.492.397.49.402.488.406.487.411.485.415.483.42.481.424.479.428.477.433.475.437.473.441.471.446.469.45.467.454.465.458.463.463.46.467.458.471.456.475.454.479.451.484.449.488.446.492.444.496.441.5.439.504.436.508.433.512.431.516.428.52.425.524.422.528.419.532.416.536.413.54.41.544.407.548.404.552.4.556.397.559.394.563.391.567.387.571.384.575.38.578.377.582.373.586.369.59.366.593.362.597.358.6.354.604.35.608.346.611.342.615.338.618.334.622.33.625.326.629.322.632.317.635.313.639.309.642.305.645.3.648.296.652.291.655.287.658.282.661.278.664.273.667.268.67.264.673.259.676.254.679.25.682.245.685.24.688.235.69.23.693.225.696.22.699.215.701.21.704.205.706.2.709.195.711.19.714.185.716.179.719.174.721.169.723.163.726.158.728.153.73.147.732.142.734.136.737.131.739.125.741.12.743.114.745.108.747.103.749.097.751.091.753.086.755.08.757.074.759.068.761.063.762.057.764.051.766.045.768.039.769.033.771.027.773.021.774.015.776.009.777.003.779-.003.78-.009.782-.015.783-.021.785-.027.786-.033.787-.04.789-.046.79-.052.791-.058.793-.064.794-.07.795-.077.797-.083.798-.089.799-.095.8-.101.801-.108.803-.114.804-.12.805-.126.806-.132.807-.139.808-.145.809-.151.81-.157.811-.163.812-.17.813-.176.814-.182.815-.188.816-.194.817-.2.817-.207.818-.213.819-.219.82-.225.82-.231.821-.238.822-.244.822-.25.823-.256.824-.262.824-.268.825-.274.825-.28.826-.286.826-.292.827-.298.827-.304.828-.31.828-.317.829-.323.829-.329.829-.335.83-.341.83-.347.83-.353.831-.359.831-.365.831-.371.831-.377.832-.383.832-.389.832-.395.832-.401.832-.407.832-.413.833-.419.833-.425.833-.431.833-.437.833-.443.833-.449.833-.455.833-.461.833-.467.833-.473.833-.479.833-.485.833-.491.833-.497.833-.503.833-.509.832-.515.832-.521.832-.527.832-.533.831-.539.831-.545.831-.551.83-.557.83-.563.83-.569.829-.575.829-.581.828-.587.828-.593.827-.599.826-.605.826-.611.825-.617.824-.623.824-.629.823-.635.822-.641.821-.647.82-.653.82-.659.819-.665.818-.671.817-.677.816-.683.815-.689.814-.695.813-.7.812-.706.811-.712.81-.718.809-.724.808-.73.806-.736.805-.742.804-.748.803-.753.801-.759.8-.765.799-.771.797-.777.796-.782.794-.788.793-.794.791-.8.79-.805.788-.811.787-.817.785-.823.784-.828.782-.834.78-.84.779-.846.777-.851.775-.857.773-.863.772-.868.77-.874.768-.88.766-.885.764-.891.762-.897.761-.902.759-.908.757-.913.755-.919.753-.925.751-.93.748-.936.746-.941.744-.947.742-.952.74-.958.738-.963.736-.969.733-.974.731-.98.729-.985.726-.991.724-.996.721-1.002.719-1.007.716-1.013.714-1.018.711-1.024.709-1.029.706-1.035.704-1.04.701-1.046.698-1.051.696-1.056.693-1.062.69-1.067.688-1.073.685-1.078.682-1.083.679-1.089.676-1.094.674-1.099.671-1.105.668-1.11.665-1.115.662-1.121.659-1.126.656-1.131.653-1.136.65-1.142.647-1.147.644-1.152.641-1.157.638-1.163.635-1.168.632-1.173.629-1.178.626-1.183.623-1.189.619-1.194.616-1.199.613-1.204.61-1.209.607-1.214.603-1.22.6-1.225.597-1.23.593-1.235.59-1.24.587-1.245.583-1.25.58-1.255.576-1.26.573-1.265.569-1.27.566-1.275.562-1.28.559-1.285.555-1.29.552-1.295.548-1.3.545-1.305.541-1.31.537-1.314.534-1.319.53-1.324.526-1.329.523-1.334.519-1.339.515-1.344.511-1.348.508-1.353.504-1.358.5-1.363.496-1.367.492-1.372.489-1.377.485-1.382.481-1.386.477-1.391.473-1.396.469-1.4.465-1.405.461-1.41.457-1.414.453-1.419.449-1.424.445-1.428.441-1.433.437-1.438.433-1.442.428-1.447.424-1.452.42-1.456.416-1.461.412-1.465.407-1.47.403-1.475.399-1.479.395-1.484.39-1.488.386-1.493.382-1.498.377-1.502.373-1.507.369-1.511.364-1.516.36-1.52.355-1.525.351-1.529.346-1.534.342-1.538.337-1.543.333-1.547.328-1.552.324-1.556.319-1.561.315-1.565.31-1.57.305-1.574.301-1.579.296-1.583.291-1.588.287-1.592.282-1.597.277-1.601.273-1.605.268-1.61.263-1.614.258-1.619.254-1.623.249-1.628.244-1.632.24-1.636.235-1.641.23-1.645.225-1.65.22-1.654.215-1.658.21-1.663.205-1.667.201-1.671.196-1.676.191-1.68.186-1.684.181-1.689.176-1.693.171-1.697.166-1.702.161-1.706.156-1.71.151-1.714.146-1.719.141-1.723.136-1.727.131-1.732.126-1.736.121-1.74.116-1.745.111-1.749.106-1.753.1-1.757.095-1.762.09-1.766.085-1.77.08-1.774.075-1.779.069-1.783.064-1.787.059-1.791.054-1.796.049-1.8.043-1.804.038-1.808.033-1.813.028-1.817.022-1.821.017-1.825.012-1.83.006-1.834.001z"/></svg>`;
        }
        if (!window.ICONS.vimeo) {
          window.ICONS.vimeo = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.612-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.478 4.807z"/></svg>`;
        }
      }

      this.QR_REDIRECT_URL = await window.Store.get('social_qr_redirect_url') || 'https://kebenamkc.vercel.app/';
      const overviewSettings = await window.Store.get('social_overview_settings') || {};
      this.overviewPretitle = overviewSettings.pretitle || 'Kebena MKC';
      this.overviewTitle = overviewSettings.title || 'Social Media';
      this.overviewSubtitle = overviewSettings.subtitle || 'Scan the QR code or follow our social media pages to stay up to date with teachings, prayer programs, and new updates.';
      this.overviewQrLabel = overviewSettings.qrLabel || '@KebenaMKC';
      this.slideDurationSeconds = await window.Store.get('social_slide_duration_seconds') || 8;

      this.accounts = await window.Store.get('social') || [];
      // Seed default accounts if none exist
      if (this.accounts.length === 0) {
        this.accounts = [
          { id: window.Store.newId(), platform: 'youtube',   username: '@KebenaMesereteKristosChurch', url: 'https://www.youtube.com/@KebenaMesereteKristosChurch', order: 0 },
          { id: window.Store.newId(), platform: 'tiktok',    username: '@kebena.mkc',  url: 'https://www.tiktok.com/@kebena.mkc', order: 1 },
          { id: window.Store.newId(), platform: 'facebook',  username: '@KebenaMKC',   url: 'https://web.facebook.com/p/%E1%89%80%E1%89%A0%E1%8A%93-%E1%88%98%E1%88%B0%E1%88%A8%E1%89%B0-%E1%8A%AD%E1%88%AD%E1%88%B5%E1%89%B6%E1%88%B5-%E1%89%A4%E1%89%B0-%E1%8A%AD%E1%88%AD%E1%88%B5%E1%89%B2%E1%8B%AB%E1%8A%95-Kebena-Meserete-Kirstos-Church-100067138225935', order: 2 },
          { id: window.Store.newId(), platform: 'instagram', username: '@kebenamkc',   url: 'https://www.instagram.com/kebenamkc?igsh=aXJhaGEza3ZuZDEy', order: 3 },
          { id: window.Store.newId(), platform: 'telegram',  username: '@KebenaMKC_Channel', url: 'https://t.me/KebenaMKC_Channel', order: 4 }
        ];
        await window.Store.set('social', this.accounts);
      }
      this._iconCache = {};
      this.PLATFORMS.forEach(p => {
        this._iconCache[p.icon] = window.ICONS[p.icon] || '';
      });
      await this.generateAllQrCodes();
      this.renderOperatorInline();
    } catch (err) {
      console.error("Social media module initialization failed:", err);
    }
  },

  async refresh() {
    try {
      this.QR_REDIRECT_URL = await window.Store.get('social_qr_redirect_url') || 'https://kebenamkc.vercel.app/';
      const overviewSettings = await window.Store.get('social_overview_settings') || {};
      this.overviewPretitle = overviewSettings.pretitle || 'Kebena MKC';
      this.overviewTitle = overviewSettings.title || 'Social Media';
      this.overviewSubtitle = overviewSettings.subtitle || 'Scan the QR code or follow our social media pages to stay up to date with teachings, prayer programs, and new updates.';
      this.overviewQrLabel = overviewSettings.qrLabel || '@KebenaMKC';
      this.slideDurationSeconds = await window.Store.get('social_slide_duration_seconds') || 8;

      this.accounts = await window.Store.get('social') || [];
      this._iconCache = {};
      this.PLATFORMS.forEach(p => {
        this._iconCache[p.icon] = window.ICONS[p.icon] || '';
      });
      await this.generateAllQrCodes();
      this.renderOperatorInline();
    } catch (err) {
      console.error("Social media module refresh failed:", err);
    }
  },

  async generateAllQrCodes() {
    try {
      if (!this.generalQrDataUrl) {
        this.generalQrDataUrl = await window.api.generateQrCode(this.QR_REDIRECT_URL, { width: 400, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      }
      for (const a of this.accounts) {
        if (!a.qrDataUrl) {
          a.qrDataUrl = await window.api.generateQrCode(this.QR_REDIRECT_URL, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        }
        if (!a.qrSpotlightDataUrl) {
          a.qrSpotlightDataUrl = await window.api.generateQrCode(this.QR_REDIRECT_URL, { width: 400, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        }
      }
    } catch (err) {
      console.error("QR code generations failed:", err);
    }
  },

  renderOperatorInline() {
    try {
      const container = document.getElementById('socialOperatorContainer');
      if (!container) return;
      if (this._cleanupOperator) {
        this._cleanupOperator();
      }
      if (this._rafPending) return;
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        this._cleanupOperator = this._renderOperator(container, this.accounts);
      });
    } catch (err) {
      console.error("Failed to render inline social operator panel:", err);
    }
  },

  async present() {
    this.renderOperatorInline();
  },

  // Open a modal to edit the content (pretitle/title/subtitle) for a slide
  openSlideContentEditor(mode, idx) {
    const S = window.STRINGS;
    let pretitle, title, subtitle, qrLabel, heading;

    if (mode === 'overview') {
      pretitle = this.overviewPretitle || 'Kebena MKC';
      title    = this.overviewTitle    || 'Social Media';
      subtitle = this.overviewSubtitle || 'Scan the QR code or follow our social media pages to stay up to date with teachings, prayer programs, and new updates.';
      qrLabel  = this.overviewQrLabel  || '@KebenaMKC';
      heading  = 'Edit Overview Slide';
    } else {
      const a = this.accounts[idx];
      if (!a) return;
      const p = this._getPlatformInfo(a.platform);
      const defaultPretitle = (a.platform === 'youtube' || a.platform === 'telegram') ? 'JOIN US ON' : 'FOLLOW US ON';
      pretitle = a.pretitle || defaultPretitle;
      title    = a.title    || p.label;
      subtitle = a.subtitle || (window.STRINGS.social && window.STRINGS.social.followUs) || 'Scan the QR code to follow us!';
      qrLabel  = a.qrLabel  || 'Scan me';
      heading  = `Edit Slide — ${p.label}`;
    }

    const inputStyle = `width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px; font-weight:600; box-sizing:border-box;`;
    const labelStyle = `display:block; margin-bottom:6px; font-weight:700; font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.5px;`;

    const html = `
      <h3 style="margin:0 0 18px; font-size:16px; font-weight:800;">${heading}</h3>
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div>
          <label style="${labelStyle}">Pre-title (small text above)</label>
          <input type="text" id="slideEditorPretitle" value="${window.escapeAttr(pretitle)}" placeholder="e.g. FOLLOW OUR" style="${inputStyle}" />
        </div>
        <div>
          <label style="${labelStyle}">Title (large heading)</label>
          <input type="text" id="slideEditorTitle" value="${window.escapeAttr(title)}" placeholder="e.g. SOCIAL MEDIA" style="${inputStyle}" />
        </div>
        <div>
          <label style="${labelStyle}">Description / Subtitle</label>
          <textarea id="slideEditorSubtitle" rows="4" placeholder="Scan the QR code or follow us..." style="${inputStyle} resize:vertical; line-height:1.5;">${window.escapeHtml(subtitle)}</textarea>
        </div>
        <div>
          <label style="${labelStyle}">QR Code Label (text below QR)</label>
          <input type="text" id="slideEditorQrLabel" value="${window.escapeAttr(qrLabel)}" placeholder="e.g. Scan me" style="${inputStyle}" />
        </div>
      </div>
      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-ghost" id="slideEditorCancel">Cancel</button>
        <button class="btn btn-primary" id="slideEditorSave">Save Changes</button>
      </div>
    `;

    window.Modal.show('modalOverlay', html);
    document.getElementById('slideEditorCancel').onclick = () => window.Modal.hide('modalOverlay');
    document.getElementById('slideEditorSave').onclick = async () => {
      const newPretitle = document.getElementById('slideEditorPretitle').value.trim();
      const newTitle    = document.getElementById('slideEditorTitle').value.trim();
      const newSubtitle = document.getElementById('slideEditorSubtitle').value.trim();
      const newQrLabel  = document.getElementById('slideEditorQrLabel').value.trim();

      if (mode === 'overview') {
        this.overviewPretitle = newPretitle;
        this.overviewTitle    = newTitle;
        this.overviewSubtitle = newSubtitle;
        this.overviewQrLabel  = newQrLabel;
        await window.Store.set('social_overview_settings', {
          pretitle: newPretitle,
          title: newTitle,
          subtitle: newSubtitle,
          qrLabel: newQrLabel
        });
      } else {
        const a = this.accounts[idx];
        if (a) {
          a.pretitle = newPretitle;
          a.title    = newTitle;
          a.subtitle = newSubtitle;
          a.qrLabel  = newQrLabel;
          await window.Store.set('social', this.accounts);
        }
      }

      window.Modal.hide('modalOverlay');
      this.refresh();
    };
  },

  // Open a modal to update the QR Code redirect URL
  async openQrUrlEditor() {
    const currentUrl = this.QR_REDIRECT_URL || 'https://kebenamkc.vercel.app/';
    const inputStyle = `width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px; font-weight:600; box-sizing:border-box;`;
    const labelStyle = `display:block; margin-bottom:6px; font-weight:700; font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.5px;`;

    const html = `
      <h3 style="margin:0 0 6px; font-size:16px; font-weight:800;">Update QR Code Link</h3>
      <p style="margin:0 0 18px; font-size:12px; color:var(--color-text-muted);">This URL is encoded in the overview QR code displayed on screen. Update it to point to your website, Linktree, or social media page.</p>
      <div>
        <label style="${labelStyle}">QR Code URL</label>
        <input type="url" id="qrUrlInput" value="${window.escapeAttr(currentUrl)}" placeholder="https://..." style="${inputStyle}" />
      </div>
      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-ghost" id="qrUrlCancel">Cancel</button>
        <button class="btn btn-primary" id="qrUrlSave">Update QR Code</button>
      </div>
    `;

    window.Modal.show('modalOverlay', html);
    document.getElementById('qrUrlCancel').onclick = () => window.Modal.hide('modalOverlay');
    document.getElementById('qrUrlSave').onclick = async () => {
      const newUrl = document.getElementById('qrUrlInput').value.trim();
      if (!newUrl) { alert('Please enter a valid URL.'); return; }
      this.QR_REDIRECT_URL = newUrl;
      // Clear cached QR codes so they regenerate
      this.generalQrDataUrl = null;
      this.accounts.forEach(a => { a.qrDataUrl = null; a.qrSpotlightDataUrl = null; });
      await window.Store.set('social_qr_redirect_url', newUrl);
      window.Modal.hide('modalOverlay');
      await this.generateAllQrCodes();
      this.renderOperatorInline();
    };
  },

  async togglePresentation() {
    try {
      if (this.externalOpened) {
        await window.Store.presentClose();
        this.externalOpened = false;
        this.updatePresentButtonState();
        this._updateLiveBadge();
      } else {
        if (this.accounts.length === 0) return;

        await this.generateAllQrCodes();
        const html = this._buildSocialExternalHtml(this.accounts, this.liveMode, this.liveIdx);
        const result = await window.Store.presentOpen({ html, variant: 'social' });
        this.externalOpened = Boolean(result && result.opened);
        this.updatePresentButtonState();
        this._updateLiveBadge();
      }
    } catch (err) {
      console.error("Failed to toggle presentation mode:", err);
    }
  },

  _showScreenDetectionToast(message) {
    // Remove any existing toast
    const existing = document.getElementById('socialScreenToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'socialScreenToast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #1e293b; color: #f1f5f9; border-radius: 12px;
      padding: 12px 20px; font-size: 13px; font-weight: 600;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35); z-index: 99999;
      border: 1px solid rgba(255,200,0,0.3); max-width: 420px; text-align:center;
      animation: socialToastIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
  },

  _updateLiveBadge() {
    const badge = document.getElementById('socialLiveBadge');
    if (!badge) return;
    if (this.externalOpened) {
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  updatePresentButtonState() {
    window.Present.setPresentButton(
      document.getElementById('btnPresentSocial'), this.externalOpened);
    this._updateLiveBadge();
  },

  openForm(id) {
    const S = window.STRINGS;
    this.editingId = id;
    const account = this.accounts.find(a => a.id === id) || { platform: 'youtube', username: '', url: '' };

    const html = `
      <h3>${id ? 'Edit Social Account' : 'Add Social Account'}</h3>
      <div class="form-grid">
        <div class="form-row">
          <label style="display:block; margin-bottom:6px; font-weight:600; font-size:12px; color:var(--color-text-muted);">Platform</label>
          <select id="formPlatform" style="width:100%; padding:10px; border-radius:8px; border:1.5px solid var(--color-border); font-weight:600; background:var(--color-surface); color:var(--color-text);">
            ${this.PLATFORMS.map(p => `<option value="${p.id}" ${p.id === account.platform ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label style="display:block; margin-bottom:6px; font-weight:600; font-size:12px; color:var(--color-text-muted);">Username / Handle</label>
          <input type="text" id="formUsername" value="${window.escapeAttr(account.username)}" placeholder="@username" style="width:100%; padding:10px; border-radius:8px; border:1.5px solid var(--color-border); font-weight:600; background:var(--color-surface); color:var(--color-text);" />
        </div>
        <div class="form-row">
          <label style="display:block; margin-bottom:6px; font-weight:600; font-size:12px; color:var(--color-text-muted);">URL Link</label>
          <input type="text" id="formUrl" value="${window.escapeAttr(account.url)}" placeholder="https://..." style="width:100%; padding:10px; border-radius:8px; border:1.5px solid var(--color-border); font-weight:600; background:var(--color-surface); color:var(--color-text);" />
        </div>
      </div>
      <div class="form-actions" style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-ghost" id="formCancel">Cancel</button>
        <button class="btn btn-primary" id="formSave">Save</button>
      </div>
    `;

    window.Modal.show('modalOverlay', html);

    document.getElementById('formCancel').onclick = () => window.Modal.hide('modalOverlay');
    document.getElementById('formSave').onclick = async () => {
      const platform = document.getElementById('formPlatform').value;
      const username = document.getElementById('formUsername').value.trim();
      const url = document.getElementById('formUrl').value.trim();

      if (!username || !url) {
        alert("Username and URL are required.");
        return;
      }

      if (id) {
        const a = this.accounts.find(x => x.id === id);
        if (a) {
          a.platform = platform;
          a.username = username;
          a.url = url;
          a.qrDataUrl = null;
          a.qrSpotlightDataUrl = null;
        }
      } else {
        this.accounts.push({
          id: window.Store.newId(),
          platform,
          username,
          url,
          order: this.accounts.length
        });
      }

      await window.Store.set('social', this.accounts);
      window.Modal.hide('modalOverlay');
      this.refresh();
    };
  },

  async deleteAccount(id) {
    if (!confirm("Are you sure you want to delete this social account?")) return;
    this.accounts = this.accounts.filter(a => a.id !== id);
    // Recalculate order indices
    this.accounts.forEach((a, idx) => a.order = idx);
    await window.Store.set('social', this.accounts);
    
    // Safety boundaries for spotlight indices
    if (this.pendingIdx >= this.accounts.length) {
      this.pendingIdx = Math.max(0, this.accounts.length - 1);
      if (this.accounts.length === 0) this.pendingMode = 'overview';
    }
    if (this.liveIdx >= this.accounts.length) {
      this.liveIdx = Math.max(0, this.accounts.length - 1);
      if (this.accounts.length === 0) this.liveMode = 'overview';
    }

    this.refresh();
  },

  _getPlatformInfo(platformId) {
    return this.PLATFORMS.find(p => p.id === platformId) || { label: platformId, color: '#555', icon: 'share' };
  },

  _buildSocialExternalHtml(accounts, mode, spotlightIdx) {
    const S = window.STRINGS.social;
    if (mode === 'overview') {
      const qrUrl = this.generalQrDataUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(this.QR_REDIRECT_URL);
      const pretitle = this.overviewPretitle || 'Kebena MKC';
      const title = this.overviewTitle || 'Social Media';
      const subtitle = this.overviewSubtitle || 'Scan the QR code or follow our social media pages to stay up to date with teachings, prayer programs, and new updates.';
      
      let qrHandle = this.overviewQrLabel || '@KebenaMKC';

      return `
        <div class="social-stage" data-state="overview">
          <div class="social-overview">
            <div class="social-overview-2col">
              <div class="social-overview-qr-side">
                <div class="social-qr-frame">
                  <img src="${qrUrl}" alt="QR Code" class="social-qr-img" />
                  <div class="social-qr-handle">${window.escapeHtml(qrHandle)}</div>
                </div>
              </div>
              <div class="social-overview-content-side">
                <div class="social-pretitle">${window.escapeHtml(pretitle)}</div>
                <div class="social-title"><span class="social-title-gradient">${window.escapeHtml(title)}</span></div>
                <div class="social-subtitle">
                  ${window.escapeHtml(subtitle).replace(/\n/g, '<br>')}
                </div>
                <div class="social-overview-icons">
                  ${accounts.map((a) => {
                    const p = this._getPlatformInfo(a.platform);
                    const bg = this._PLATFORM_BG[a.platform] || p.color;
                    return `<div class="social-overview-icon" style="background:${bg};color:#fff;box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: none;">${this._iconCache[p.icon] || window.ICONS[p.icon] || ''}</div>`;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      const a = accounts[spotlightIdx];
      if (!a) return '';
      const p = this._getPlatformInfo(a.platform);
      const qrUrl = a.qrSpotlightDataUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(a.url);
      const brandClass = 'social-spotlight-brand-' + p.id;
      let defaultSubtitle = 'Connect with our ministry by following Kebena MKC on social media.';
      if (a.platform === 'youtube') {
        defaultSubtitle = 'Subscribe to watch our teachings, worship, and music ministry videos.';
      } else if (a.platform === 'telegram') {
        defaultSubtitle = 'Get daily messages, prayer topics, announcements, and weekly programs on our Telegram channel.';
      } else if (a.platform === 'facebook') {
        defaultSubtitle = 'Follow us for the latest church news, live broadcasts, and events.';
      } else if (a.platform === 'instagram') {
        defaultSubtitle = 'Follow us for ministry photos, short video testimonies, and spiritual verses.';
      } else if (a.platform === 'tiktok') {
        defaultSubtitle = 'Watch short spiritual messages, hymns, and spiritual advice.';
      } else if (a.platform === 'website') {
        defaultSubtitle = 'Find our church information, weekly programs, and services on our website.';
      }

      const defaultPretitle = (a.platform === 'youtube' || a.platform === 'telegram') ? 'JOIN US ON' : 'FOLLOW US ON';
      const pretitle = a.pretitle || defaultPretitle;
      const title = a.title || p.label;
      const subtitle = a.subtitle || defaultSubtitle;

      return `
        <div class="social-stage" data-state="spotlight">
          <div class="social-spotlight ${brandClass}">
            <div class="social-spotlight-2col">
              <div class="social-spotlight-qr-side">
                <div class="social-qr-frame">
                  <img src="${qrUrl}" alt="QR Code" class="social-qr-img" />
                  <div class="social-qr-handle">${window.escapeHtml(a.qrLabel || 'Scan me')}</div>
                </div>
              </div>
              <div class="social-spotlight-content-side">
                <div class="social-pretitle">${window.escapeHtml(pretitle)}</div>
                <div class="social-title">${window.escapeHtml(title)}</div>
                <div class="social-subtitle">
                  ${window.escapeHtml(subtitle).replace(/\n/g, '<br>')}
                </div>
                <div class="social-spotlight-badge" style="background:${this._PLATFORM_BG[a.platform] || p.color || '#555'};">
                  <div class="social-badge-icon" style="color:${p.color};">
                    ${this._iconCache[p.icon] || window.ICONS[p.icon] || ''}
                  </div>
                  <span>${escapeHtml(a.username)}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="social-spotlight-dots">
            ${accounts.map((_, i) => `<span class="social-dot ${i === spotlightIdx ? 'active' : ''}"></span>`).join('')}
          </div>
        </div>
      `;
    }
  },

  _renderOperator(body, accounts) {
    const self = this;
    self.liveStartTime = Date.now();
    let liveTimerInterval = null;

    const S = window.STRINGS.social;
    const intervalMs = (this.slideDurationSeconds || 8) * 1000;
    const churchName = (window.AppState && window.AppState.churchName) ? window.AppState.churchName : 'Kebena Meserete Kristos Church';

    const getPlatformAbbr = (id) => this._PLATFORM_ABBR[id] || id.substring(0, 2).toUpperCase();
    const getPlatformBg   = (id) => this._PLATFORM_BG[id]   || '#555';

    body.innerHTML = `
      <div class="soc-op-view">
        <!-- ═══ MAIN LAYOUT ═══ -->
        <div class="soc-op-main" style="padding-top: 0;">

          <!-- LEFT: Preview Area -->
          <div class="soc-op-preview-area">

            <!-- Side-by-side LIVE + PENDING -->
            <div class="soc-op-preview-row">

              <!-- LIVE card -->
              <div class="soc-op-preview-card soc-op-live-card">
                <div class="soc-op-preview-header">
                  <div class="soc-op-preview-label">
                    <span class="soc-op-dot soc-op-dot-live"></span>
                    Presented Screen (Live)
                  </div>
                  <div class="soc-op-preview-timer" id="socialLiveTimer">00:00:00</div>
                </div>
                <div class="soc-op-slide-progress">
                  <div class="soc-op-slide-progress-bar" id="socialProgressBar" style="width:0%"></div>
                </div>
                <div class="soc-op-desktop-wrap">
                  <div class="soc-op-desktop-screen" id="socialLivePreview"></div>
                </div>
              </div>

              <!-- PENDING card -->
              <div class="soc-op-preview-card">
                <div class="soc-op-preview-header">
                  <div class="soc-op-preview-label">
                    <span class="soc-op-dot soc-op-dot-next"></span>
                    Up Next — Pending
                  </div>
                  <div class="soc-op-preview-timer" id="socialPendingTimer">Select below</div>
                </div>
                <div class="soc-op-desktop-wrap">
                  <div class="soc-op-desktop-screen" id="socialPendingPreview"></div>
                </div>
              </div>

            </div><!-- /preview-row -->

            <!-- Upcoming slides grid -->
            <div class="soc-op-section">
              <div class="soc-op-section-label">Upcoming Slides</div>
              <div class="soc-op-upcoming-grid" id="socialSlideList"></div>
            </div>

          </div><!-- /preview-area -->

          <!-- RIGHT: Sidebar -->
          <div class="soc-op-sidebar">

            <!-- Screen Status Message -->
            <div id="socialScreenStatus" style="font-size:11px; font-weight:800; color:#5c6a8a; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:6px; margin-bottom:8px; padding:4px 8px; border-radius:6px; background:rgba(0,0,0,0.03); width:fit-content;">
               Detecting Screen...
            </div>

            <!-- ═══ SIDEBAR CONTROLS CARD ═══ -->
            <div class="soc-op-controls-card" style="background:rgba(31,68,151,0.05); padding:12px; border-radius:14px; display:flex; flex-direction:column; gap:10px; margin-bottom:4px; border: 1px solid rgba(31,68,151,0.12); flex-shrink:0;">

              <!-- First Row: Auto Play (white), Prev, Next -->
              <div style="display:flex; gap:8px;">
                <button class="soc-op-tab" id="socialAutoPlayBtn" style="flex:1; height:36px; border-radius:8px; border:1px solid rgba(31,68,151,0.25); background:#fff; color:#1f4497; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; padding:0 8px; transition: all 0.2s;">
                  <span class="soc-op-tab-icon" style="display:inline-flex; align-items:center; margin-right:4px;">${window.ICONS.play}</span> Auto Play
                </button>
                <button class="soc-op-tab" data-action="prev" style="flex:0 0 48px; height:36px; border-radius:8px; border:1px solid rgba(0,0,0,0.15); background:transparent; color:#333; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">
                  ${window.ICONS.arrowLeft}
                </button>
                <button class="soc-op-tab" data-action="next" style="flex:0 0 48px; height:36px; border-radius:8px; border:1px solid rgba(0,0,0,0.15); background:transparent; color:#333; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">
                  ${window.ICONS.arrowRight}
                </button>
              </div>
              <!-- Second Row: Present (full width) + LIVE badge -->
              <div style="position:relative;">
                <button id="btnPresentSocial" data-action="toggle-present" class="op-btn-present op-btn-block${self.externalOpened ? ' is-live' : ''}">
                  <span class="icon">${self.externalOpened ? window.ICONS.close : window.ICONS.play}</span>
                  ${self.externalOpened ? 'Stop Presenting' : 'Present'}
                </button>
                <!-- LIVE badge -->
                <div id="socialLiveBadge" style="display:${self.externalOpened ? 'flex' : 'none'}; position:absolute; top:-10px; right:-6px; align-items:center; gap:4px; background:#dc2626; color:#fff; border-radius:20px; padding:2px 8px 2px 5px; font-size:10px; font-weight:800; letter-spacing:0.5px; box-shadow:0 0 10px rgba(220,38,38,0.7), 0 0 20px rgba(220,38,38,0.4); animation: socialLivePulse 1.5s ease-in-out infinite;">
                  <span style="width:7px; height:7px; border-radius:50%; background:#fff; display:inline-block; box-shadow:0 0 6px #fff;"></span>
                  LIVE
                </div>
              </div>
              <!-- Third Row: QR Code URL update -->
              <button data-action="update-qr-url" style="width:100%; height:30px; border-radius:8px; border:1px solid rgba(31,68,151,0.25); background:transparent; color:#1f4497; font-size:10px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; transition: all 0.2s;">
                <svg style="width:12px;height:12px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Update QR Code Link
              </button>
            </div>

            <!-- Queue Manager header -->
            <div class="soc-op-sidebar-header">
              <span class="soc-op-sidebar-title">Queue Manager</span>
            </div>
 
            <!-- Queue selector / Current Details control -->
            <div class="soc-op-queue-select" style="flex-direction:column; align-items:stretch; gap:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex;align-items:center;gap:10px; font-weight:800;">
                  <span class="soc-op-queue-badge">INFO</span>
                  Selected Slide
                </span>
                <div style="display:flex; gap:6px;">
                  <button class="soc-op-nav-btn" data-action="edit-slide-content" title="Edit slide text (pretitle/title/description)" style="width:28px; height:28px; background:rgba(31,68,151,0.12); border-color:rgba(31,68,151,0.3);" title="Edit slide content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </button>
                  <button class="soc-op-nav-btn" data-action="edit-selected" title="Edit account (platform/username/url)" style="width:28px; height:28px;">${window.ICONS.edit}</button>
                  <button class="soc-op-nav-btn" data-action="delete-selected" title="Delete selected" style="width:28px; height:28px; background:rgba(239,68,68,0.2); border-color:rgba(239,68,68,0.4);">${window.ICONS.trash}</button>
                </div>
              </div>
              <div id="socialSidebarAccountDetail" style="font-size:11px; color:#5c6a8a; border-top:1px solid #dde3ef; padding-top:6px; margin-top:2px;">
                No account selected (Overview mode)
              </div>
            </div>
 
            <!-- Add Account button above Active Accounts -->
            <button class="btn btn-primary" data-action="add-social" style="width:100%; height:36px; border-radius:8px; border:none; background:#1e40af; color:#fff; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; padding:0; line-height:1; box-shadow:none; margin-bottom:4px;">
              <span class="icon" style="display:inline-flex; align-items:center; font-size:12px;">${window.ICONS.plus}</span> Add Account
            </button>
 
            <!-- Active Accounts list -->
            <div class="soc-op-section">
              <div class="soc-op-section-label">Active Accounts</div>
              <div class="soc-op-account-list" id="socialAccountList"></div>
            </div>
 
          </div><!-- /sidebar -->
        </div><!-- /main -->
      </div><!-- /soc-op-view -->
    `;

    const livePreview    = document.getElementById('socialLivePreview');
    const pendingPreview = document.getElementById('socialPendingPreview');
    const slideListEl    = document.getElementById('socialSlideList');
    const accountListEl  = document.getElementById('socialAccountList');
    const liveTimerEl    = document.getElementById('socialLiveTimer');
    const pendingTimerEl = document.getElementById('socialPendingTimer');
    const progressBar    = document.getElementById('socialProgressBar');
    const autoPlayStatus = document.getElementById('socialAutoPlayStatus');
    const autoPlayIcon   = document.getElementById('socialAutoPlayIcon');
    const autoPlayInfo   = document.getElementById('socialAutoPlayInfo');
    const sidebarDetail  = document.getElementById('socialSidebarAccountDetail');

    // Central UI updater for the controls card
    const updateControlsCardUI = () => {
      // 1. Auto Play Button
      const autoBtn = document.getElementById('socialAutoPlayBtn');
      if (autoBtn) {
        if (self.autoOn) {
          autoBtn.style.background = '#22c55e';
          autoBtn.style.color = '#fff';
          autoBtn.style.borderColor = '#22c55e';
          autoBtn.innerHTML = `<span class="soc-op-tab-icon" style="display:inline-flex; align-items:center; margin-right:4px;">${window.ICONS.pause}</span> Auto Playing`;
        } else {
          autoBtn.style.background = '#fff';
          autoBtn.style.color = '#1f4497';
          autoBtn.style.borderColor = 'rgba(31,68,151,0.25)';
          autoBtn.innerHTML = `<span class="soc-op-tab-icon" style="display:inline-flex; align-items:center; margin-right:4px;">${window.ICONS.play}</span> Auto Play`;
        }
      }

      // 2. Present Button
      window.Present.setPresentButton(
        document.getElementById('btnPresentSocial'), self.externalOpened);

      // 3. Sidebar auto-play status block
      if (autoPlayStatus) {
        if (self.autoOn) {
          autoPlayStatus.classList.add('soc-op-autoplay-status-active');
          if (autoPlayIcon) autoPlayIcon.classList.add('soc-op-autoplay-icon-spin');
          if (autoPlayInfo) autoPlayInfo.textContent = `Rotating every ${Math.round(intervalMs/1000)}s`;
        } else {
          autoPlayStatus.classList.remove('soc-op-autoplay-status-active');
          if (autoPlayIcon) autoPlayIcon.classList.remove('soc-op-autoplay-icon-spin');
          if (autoPlayInfo) autoPlayInfo.textContent = 'Click Auto Play to start';
        }
      }
    };

    // ── Live timer tick ──
    const padZ = (n) => String(n).padStart(2, '0');
    const formatTime = (ms) => {
      const s = Math.floor(ms / 1000);
      return `${padZ(Math.floor(s/3600))}:${padZ(Math.floor((s%3600)/60))}:${padZ(s%60)}`;
    };
    liveTimerInterval = setInterval(() => {
      if (liveTimerEl) liveTimerEl.textContent = formatTime(Date.now() - self.liveStartTime);
      if (self.autoOn && progressBar) {
        const pct = Math.min(((Date.now() - self.liveStartTime) / intervalMs) * 100, 100);
        progressBar.style.width = pct + '%';
      }
    }, 200);

    // ── High-fidelity scaling of preview content using CSS transforms ──
    const scalePreview = (container, scaleFactor) => {
      const stage = container.querySelector('.social-stage');
      if (!stage) return;
      
      const wrap = stage.closest('.soc-op-desktop-wrap') || container.querySelector('.soc-op-desktop-wrap') || container;
      const width = wrap.clientWidth;
      if (!width) return; // Skip scaling if container is currently hidden (0 width)

      const factor = scaleFactor || (width / 1920);
      Object.assign(stage.style, {
        width: '1920px',
        height: '1080px',
        transform: `scale(${factor})`,
        transformOrigin: 'top left',
        position: 'absolute',
        top: '0',
        left: '0'
      });
      // Force container height to match aspect ratio
      wrap.style.height = `${width * 9 / 16}px`;
    };

    // ── Render pending preview ──
    const renderPendingPreview = () => {
      const html = this._buildSocialExternalHtml(accounts, self.pendingMode, self.pendingIdx);
      pendingPreview.innerHTML = html;
      
      // Obtain container width for precise scale calculation (container is roughly 16:9 box)
      setTimeout(() => {
        const wrap = pendingPreview.closest('.soc-op-desktop-wrap');
        if (wrap) {
          const factor = wrap.clientWidth / 1920;
          scalePreview(pendingPreview, factor);
        }
      }, 0);

      if (pendingTimerEl) {
        pendingTimerEl.textContent = self.pendingMode === 'overview'
          ? 'Overview'
          : (accounts[self.pendingIdx] ? escapeHtml(accounts[self.pendingIdx].username) : '');
      }
      if (sidebarDetail) {
        if (self.pendingMode === 'overview') {
          sidebarDetail.innerHTML = `No account selected (Overview mode)`;
        } else {
          const a = accounts[self.pendingIdx];
          if (a) {
            const p = this._getPlatformInfo(a.platform);
            sidebarDetail.innerHTML = `
              <strong>Platform:</strong> ${p.label}<br>
              <strong>Username:</strong> ${escapeHtml(a.username)}<br>
              <strong>URL:</strong> <span style="word-break:break-all;">${escapeHtml(a.url)}</span>
            `;
          }
        }
      }
      updateControlsCardUI();
    };

    // ── Render live preview ──
    const renderLivePreview = () => {
      const html = this._buildSocialExternalHtml(accounts, self.liveMode, self.liveIdx);
      livePreview.innerHTML = html;
      
      setTimeout(() => {
        const wrap = livePreview.closest('.soc-op-desktop-wrap');
        if (wrap) {
          const factor = wrap.clientWidth / 1920;
          scalePreview(livePreview, factor);
        }
      }, 0);

      self.liveStartTime = Date.now();
      if (progressBar) progressBar.style.width = '0%';
      if (self.externalOpened) {
        sendToExternal().catch(() => {});
      }
    };

    const checkScreenDetection = async () => {
      let hasSecondScreen = false;
      try {
        const displays = await window.api.getDisplays();
        hasSecondScreen = displays && displays.some(d => d.isExternal);
      } catch (e) { /* ignore */ }
      
      const screenStatusMsg = document.getElementById('socialScreenStatus');
      if (screenStatusMsg) {
        if (hasSecondScreen) {
          screenStatusMsg.innerHTML = `<span style="color:#22c55e;">●</span> Secondary Screen Detected`;
        } else {
          screenStatusMsg.innerHTML = `<span style="color:#ef4444;">●</span> No Secondary Screen`;
        }
      }
    };

    const sendToExternal = async () => {
      const html = this._buildSocialExternalHtml(accounts, self.liveMode, self.liveIdx);
      const result = self.externalOpened
        ? await window.Store.presentUpdate({ html, variant: 'social' })
        : await window.Store.presentOpen({ html, variant: 'social' });
      self.externalOpened = Boolean(result && (result.opened || result.updated));
      
      await checkScreenDetection();
      
      updateControlsCardUI();
    };

    // ── Render slide grid (upcoming) with real preview snippets ──
    const renderSlideList = () => {
      const overviewActive = self.pendingMode === 'overview';
      const overviewHtml = this._buildSocialExternalHtml(accounts, 'overview', 0);
      const overviewCard = `
        <div class="soc-op-upcoming-card${overviewActive ? ' soc-op-upcoming-active' : ''}" data-action="select-overview">
          <div class="soc-op-upcoming-card-header">
            <div class="soc-op-upcoming-thumb" style="background:linear-gradient(90deg,#1e88e5,#42a5f5)">GEN</div>
            <div class="soc-op-upcoming-dur">${Math.round(intervalMs/1000)}s</div>
          </div>
          <div class="soc-op-desktop-wrap" style="position:relative; width:100%; overflow:hidden;">
            <div class="soc-op-snippet-stage" id="snippet-overview">${overviewHtml}</div>
          </div>
          <div class="soc-op-upcoming-card-body">
            <div class="soc-op-upcoming-name">General Overview</div>
          </div>
        </div>`;

      const acctCards = accounts.map((a, i) => {
        const p   = this._getPlatformInfo(a.platform);
        const sel = self.pendingMode === 'spotlight' && self.pendingIdx === i;
        const spotlightHtml = this._buildSocialExternalHtml(accounts, 'spotlight', i);
        return `
          <div class="soc-op-upcoming-card${sel ? ' soc-op-upcoming-active' : ''}" data-social-index="${i}">
            <div class="soc-op-upcoming-card-header">
              <div class="soc-op-upcoming-thumb" style="background:${getPlatformBg(a.platform)}">${getPlatformAbbr(a.platform)}</div>
              <div class="soc-op-upcoming-dur">${Math.round(intervalMs/1000)}s</div>
            </div>
            <div class="soc-op-desktop-wrap" style="position:relative; width:100%; overflow:hidden;">
              <div class="soc-op-snippet-stage" id="snippet-spotlight-${i}">${spotlightHtml}</div>
            </div>
            <div class="soc-op-upcoming-card-body">
              <div class="soc-op-upcoming-name">${p.label}</div>
            </div>
          </div>`;
      }).join('');

      slideListEl.innerHTML = overviewCard + acctCards;

      // Apply scaled transformations to each upcoming thumbnail card snippet
      setTimeout(() => {
        slideListEl.querySelectorAll('.soc-op-upcoming-card').forEach(card => {
          scalePreview(card);
        });
      }, 0);
    };

    // ── Render sidebar account list ──
    const renderAccountList = () => {
      const isOverviewLive = self.liveMode === 'overview';
      const overviewItem = `
        <div class="soc-op-account-item${isOverviewLive ? ' soc-op-account-active' : ''}" data-action="select-overview">
          <div class="soc-op-account-num${isOverviewLive ? ' soc-op-account-num-active' : ''}" style="background:linear-gradient(90deg,#1e88e5,#42a5f5); color:#fff;">*</div>
          <div class="soc-op-account-info">
            <div class="soc-op-account-handle">General Overview</div>
            <div class="soc-op-account-platform">All Platforms</div>
          </div>
          <div class="soc-op-account-status"></div>
        </div>`;

      const acctItems = accounts.map((a, i) => {
        const p      = this._getPlatformInfo(a.platform);
        const isLive = self.liveMode === 'spotlight' && self.liveIdx === i;
        return `
          <div class="soc-op-account-item${isLive ? ' soc-op-account-active' : ''}" data-social-index="${i}">
            <div class="soc-op-account-num${isLive ? ' soc-op-account-num-active' : ''}">${i + 1}</div>
            <div class="soc-op-account-info">
              <div class="soc-op-account-handle">${escapeHtml(a.username)}</div>
              <div class="soc-op-account-platform">${p.label}</div>
            </div>
            <div class="soc-op-account-status"></div>
          </div>`;
      }).join('');

      accountListEl.innerHTML = overviewItem + acctItems;
    };

    // ── Auto-play ──
    const advanceAuto = () => {
      if (self.liveMode === 'overview') { self.liveMode = 'spotlight'; self.liveIdx = 0; }
      else if (self.liveIdx + 1 < accounts.length) { self.liveIdx++; }
      else { self.liveMode = 'overview'; self.liveIdx = 0; }
      self.pendingMode = self.liveMode; self.pendingIdx = self.liveIdx;
      renderLivePreview(); renderPendingPreview(); renderSlideList(); renderAccountList();
      scheduleAuto();
    };

    const scheduleAuto = () => {
      if (self.autoTimer) clearTimeout(self.autoTimer);
      if (self.autoOn) self.autoTimer = setTimeout(advanceAuto, intervalMs);
    };

    const toggleAuto = () => {
      self.autoOn = !self.autoOn;
      updateControlsCardUI();
      if (self.autoOn) {
        advanceAuto();
      } else {
        if (self.autoTimer) { clearTimeout(self.autoTimer); self.autoTimer = null; }
        if (progressBar) progressBar.style.width = '0%';
      }
    };

    document.getElementById('socialAutoPlayBtn').addEventListener('click', toggleAuto);

    // Initial render & sync controls state
    renderLivePreview();
    renderPendingPreview();
    renderSlideList();
    renderAccountList();
    updateControlsCardUI();
    checkScreenDetection();

    const clickHandler = (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        if (action.dataset.action === 'prev') {
          if (self.autoOn) toggleAuto();
          if (self.pendingMode === 'overview') { self.pendingMode = 'spotlight'; self.pendingIdx = accounts.length - 1; }
          else if (self.pendingIdx > 0) { self.pendingIdx--; }
          else { self.pendingMode = 'overview'; self.pendingIdx = 0; }
          renderPendingPreview(); renderSlideList(); return;
        }
        if (action.dataset.action === 'next') {
          if (self.autoOn) toggleAuto();
          if (self.pendingMode === 'overview') { self.pendingMode = 'spotlight'; self.pendingIdx = 0; }
          else if (self.pendingIdx + 1 < accounts.length) { self.pendingIdx++; }
          else { self.pendingMode = 'overview'; self.pendingIdx = 0; }
          renderPendingPreview(); renderSlideList(); return;
        }
        if (action.dataset.action === 'select-overview') {
          if (self.autoOn) toggleAuto();
          self.pendingMode = 'overview'; self.pendingIdx = 0;
          self.liveMode = 'overview'; self.liveIdx = 0;
          renderLivePreview(); renderPendingPreview(); renderSlideList(); renderAccountList(); return;
        }
        if (action.dataset.action === 'toggle-present') {
          self.togglePresentation();
          return;
        }
        if (action.dataset.action === 'update-qr-url') {
          self.openQrUrlEditor();
          return;
        }
        if (action.dataset.action === 'add-social') {
          self.openForm(null);
          return;
        }
        if (action.dataset.action === 'edit-selected') {
          // Edit account info (platform/username/url)
          if (self.pendingMode === 'overview') {
            alert("Please select a specific slide account from the list to edit account info.");
          } else {
            const a = accounts[self.pendingIdx];
            if (a) self.openForm(a.id);
          }
          return;
        }
        if (action.dataset.action === 'edit-slide-content') {
          // Edit slide content (pretitle/title/subtitle)
          self.openSlideContentEditor(self.pendingMode, self.pendingIdx);
          return;
        }
        if (action.dataset.action === 'delete-selected') {
          if (self.pendingMode === 'overview') {
            alert("Overview slide cannot be deleted.");
          } else {
            const a = accounts[self.pendingIdx];
            if (a) self.deleteAccount(a.id);
          }
          return;
        }
        return;
      }
      const socialRow = e.target.closest('[data-social-index]');
      if (socialRow) {
        if (self.autoOn) toggleAuto();
        const idx = Number(socialRow.dataset.socialIndex);
        self.pendingMode = 'spotlight';
        self.pendingIdx = idx;
        self.liveMode = 'spotlight';
        self.liveIdx = idx;
        renderLivePreview(); renderPendingPreview(); renderSlideList(); renderAccountList(); return;
      }
    };

    const keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (self.autoOn) toggleAuto();
        if (self.pendingMode === 'overview') { self.pendingMode = 'spotlight'; self.pendingIdx = 0; }
        else if (self.pendingIdx + 1 < accounts.length) { self.pendingIdx++; }
        else { self.pendingMode = 'overview'; self.pendingIdx = 0; }
        renderPendingPreview(); renderSlideList();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (self.autoOn) toggleAuto();
        if (self.pendingMode === 'overview') { self.pendingMode = 'spotlight'; self.pendingIdx = accounts.length - 1; }
        else if (self.pendingIdx > 0) { self.pendingIdx--; }
        else { self.pendingMode = 'overview'; self.pendingIdx = 0; }
        renderPendingPreview(); renderSlideList();
      }
    };

    body.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);

    // Double-clicking on any preview card triggers presentation instantly
    const triggerPresent = () => {
      if (self.autoOn) toggleAuto();
      self.liveMode = self.pendingMode; self.liveIdx = self.pendingIdx;
      renderLivePreview(); renderAccountList();
    };
    body.querySelectorAll('.soc-op-preview-card').forEach(card => {
      card.addEventListener('dblclick', triggerPresent);
    });

    return () => {
      if (self.autoTimer) clearTimeout(self.autoTimer);
      if (liveTimerInterval) clearInterval(liveTimerInterval);
      body.removeEventListener('click', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }
};
