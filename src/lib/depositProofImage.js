/** Decode deposit / redemption proof blobs from Mongo (data URLs, raw base64, https). */

export function proofDataToImage(rawData) {
  if (rawData == null) return null;
  const s = String(rawData).trim();
  if (!s) return null;

  if (/^https?:\/\//i.test(s)) {
    return { kind: 'url', url: s };
  }

  const decodeBase64 = (b64, mime = 'image/png') => {
    let clean = String(b64 || '').replace(/\s/g, '');
    if (!clean) return null;
    while (clean.length % 4) clean += '=';
    try {
      const buffer = Buffer.from(clean, 'base64');
      if (!buffer.length || buffer.length < 24) return null;
      return { kind: 'buffer', buffer, mime };
    } catch {
      return null;
    }
  };

  if (s.startsWith('data:')) {
    const comma = s.indexOf(',');
    if (comma === -1) return null;
    const header = s.slice(0, comma);
    const mimeMatch = header.match(/^data:([^;,]+)/i);
    const mime = mimeMatch ? mimeMatch[1].trim() : 'image/png';
    return decodeBase64(s.slice(comma + 1), mime);
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 80) {
    return decodeBase64(s, 'image/jpeg');
  }

  return null;
}