// Shared HTML escaping utilities. Available globally for all modules.
window.escapeHtml = function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(c) {
    if (c === '&') return '&' + 'amp;';
    if (c === '<') return '&' + 'lt;';
    if (c === '>') return '&' + 'gt;';
    if (c === '"') return '&' + 'quot;';
    if (c === "'") return '&#' + '39;';
    return c;
  });
};
window.escapeAttr = function escapeAttr(str) { return window.escapeHtml(str); };