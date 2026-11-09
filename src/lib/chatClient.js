/** Player/guest chat send — retries + long timeout (avoids false "Request timed out" on slow DB). */

export async function postChatMessage(payload, { timeoutMs = 45000, retries = 2 } = {}) {
  let lastErr = new Error('Send failed');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Send failed (${res.status})`);
      }
      return data;
    } catch (err) {
      if (err?.name === 'AbortError') {
        lastErr = Object.assign(new Error('SLOW_CONNECTION'), { code: 'SLOW_CONNECTION' });
      } else {
        lastErr = err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}
