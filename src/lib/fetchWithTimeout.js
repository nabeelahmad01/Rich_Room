/** Parse JSON only when the response is actually JSON (avoids "<!DOCTYPE" SyntaxError overlays). */
export async function parseResponseJson(res) {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return res.json();
  }
  const preview = (await res.text()).slice(0, 120).replace(/\s+/g, ' ');
  const err = new Error(
    res.ok
      ? 'Expected JSON but received an HTML or plain-text response.'
      : `HTTP ${res.status}: non-JSON response.`
  );
  err.status = res.status;
  err.preview = preview;
  throw err;
}

/** Fast player-tab fetches — never leave "Loading…" forever. */
export async function fetchJsonQuick(url, options = {}, timeoutMs = 8000) {
  return fetchJsonWithTimeout(url, options, timeoutMs);
}

/** JSON fetch with abort timeout so UI never sticks on "Submitting…". */
export async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 28000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let data = {};
    try {
      data = await parseResponseJson(res);
    } catch {
      data = {};
    }
    return { res, data };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
