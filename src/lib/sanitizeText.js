/** Plain text only — strips markup so admin/player UIs never interpret HTML. */

export function stripHtmlMarkup(value) {
  if (value == null) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/gi, '')
    .replace(/&gt;/gi, '')
    .trim();
}

export function sanitizePlainText(value, maxLen = 256) {
  const stripped = stripHtmlMarkup(value);
  return stripped.slice(0, maxLen);
}

export function containsHtmlLike(value) {
  if (value == null) return false;
  const s = String(value);
  return /<[^>]+>/.test(s) || /<\s*\/?\s*(script|svg|img|a|iframe|object|embed)\b/i.test(s);
}

export function isSafeDisplayUsername(username) {
  const s = sanitizePlainText(username, 64);
  if (!s || s.length < 2) return false;
  if (containsHtmlLike(username)) return false;
  return /^[\w.@+-]+$/.test(s);
}