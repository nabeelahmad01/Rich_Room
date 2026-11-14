/** Plain text only — strips markup so admin/player UIs never interpret HTML. */

export function containsHtmlLike(value) {
  if (value == null) return false;
  const s = String(value);
  return (
    /<[^>]+>/.test(s) ||
    /<\s*\/?\s*(script|svg|img|a|iframe|object|embed)\b/i.test(s) ||
    /on\w+\s*=/i.test(s) ||
    /\b(javascript|data|vbscript):/i.test(s)
  );
}

export function stripHtmlMarkup(value) {
  if (value == null) return '';
  let s = String(value);
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  let prev;
  let i = 0;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
    i += 1;
  } while (s !== prev && i < 32);
  s = s
    .replace(/&lt;/gi, '')
    .replace(/&gt;/gi, '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x?[0-9a-f]+;?/gi, '');
  s = s.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  s = s.replace(/\b(javascript|data|vbscript):[^\s]*/gi, '');
  return s.trim();
}

export function sanitizePlainText(value, maxLen = 256) {
  const stripped = stripHtmlMarkup(value);
  const flat = stripped.replace(/[\s"'>]+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.slice(0, maxLen);
}

/** Game login ids — reject poisoned values instead of showing fragments. */
export function sanitizeGameCredential(value) {
  if (value == null) return '';
  const original = String(value).trim();
  if (!original) return '';
  if (containsHtmlLike(original) || /[<>"'`]/.test(original)) return '';
  const strict = stripHtmlMarkup(original).replace(/[^A-Za-z0-9._-]/g, '');
  if (!strict || strict.length < 2) return '';
  return strict.slice(0, 64);
}

export function isSafeDisplayUsername(username) {
  const s = sanitizePlainText(username, 64);
  if (!s || s.length < 2) return false;
  if (containsHtmlLike(username)) return false;
  return /^[\w.@+-]+$/.test(s);
}