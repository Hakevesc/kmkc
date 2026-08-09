// Offline Ethiopian <-> Gregorian calendar conversion (Amete Mihret).
// Uses the Dershowitz-Reingold "fixed day" (RD) algorithm; verified against the
// Ethiopian New Year and Pagume leap-day anchors. No internet required.
window.EthCal = {
  ETH_EPOCH: 2796, // RD of 1 Meskerem, 1 EC

  // --- Gregorian <-> Julian Day Number ---
  _gcToJDN(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  },
  _jdnToGc(j) {
    const a = j + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return {
      year: 100 * b + d - 4800 + Math.floor(m / 10),
      month: m + 3 - 12 * Math.floor(m / 10),
      day: e - Math.floor((153 * m + 2) / 5) + 1
    };
  },

  // RD <-> JDN
  _rd(j) { return j - 1721425; },
  _jdn(rd) { return rd + 1721425; },

  _fixedFromEth(y, m, d) {
    return this.ETH_EPOCH - 1 + 365 * (y - 1) + Math.floor(y / 4) + 30 * (m - 1) + d;
  },
  _ethFromFixed(date) {
    const year = Math.floor((4 * (date - this.ETH_EPOCH) + 1463) / 1461);
    const month = 1 + Math.floor((date - this._fixedFromEth(year, 1, 1)) / 30);
    const day = date + 1 - this._fixedFromEth(year, month, 1);
    return { year, month, day };
  },

  // --- Public API ---
  gcToEc(y, m, d) { return this._ethFromFixed(this._rd(this._gcToJDN(y, m, d))); },
  ecToGc(y, m, d) { return this._jdnToGc(this._jdn(this._fixedFromEth(y, m, d))); },

  // Ethiopian leap year: year % 4 === 3 (the year before a Gregorian leap year).
  isEthLeap(year) { return ((year % 4) + 4) % 4 === 3; },

  // Days in an Ethiopian month: 1-12 = 30 days; 13 (Pagume) = 5 or 6.
  daysInEthMonth(year, month) {
    if (month === 13) return this.isEthLeap(year) ? 6 : 5;
    return 30;
  },

  daysInGcMonth(year, month) { return new Date(year, month, 0).getDate(); },

  todayEc() {
    const t = new Date();
    return this.gcToEc(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }
};
