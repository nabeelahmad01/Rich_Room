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
      data = await res.json();
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
