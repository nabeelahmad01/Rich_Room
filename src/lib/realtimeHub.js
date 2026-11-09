/**
 * In-process pub/sub for Server-Sent Events (single Node instance).
 * Production multi-instance: replace with Redis pub/sub — same channel names.
 */

class RealtimeHub {
  constructor() {
    /** @type {Map<string, Set<{ send: (event: object) => void }>>} */
    this.channels = new Map();
  }

  subscribe(channelList, send) {
    const entry = { send };
    const normalized = [...new Set(channelList.filter(Boolean))];
    for (const ch of normalized) {
      if (!this.channels.has(ch)) this.channels.set(ch, new Set());
      this.channels.get(ch).add(entry);
    }
    return () => {
      for (const ch of normalized) {
        this.channels.get(ch)?.delete(entry);
      }
    };
  }

  publish(channelList, event) {
    const payload = { ...event, t: event.t ?? Date.now() };
    const delivered = new Set();
    for (const ch of [...new Set(channelList.filter(Boolean))]) {
      const subs = this.channels.get(ch);
      if (!subs) continue;
      for (const entry of subs) {
        if (delivered.has(entry)) continue;
        delivered.add(entry);
        try {
          entry.send(payload);
        } catch {
          /* connection closed */
        }
      }
    }
  }
}

export function getRealtimeHub() {
  if (!globalThis.__richroomRealtimeHub) {
    globalThis.__richroomRealtimeHub = new RealtimeHub();
  }
  return globalThis.__richroomRealtimeHub;
}

export function staffChannel() {
  return 'staff';
}

export function playerEmailChannel(email) {
  const clean = String(email || '')
    .toLowerCase()
    .trim();
  return clean ? `player:email:${clean}` : null;
}

export function playerIdChannel(userId) {
  const id = String(userId || '').trim();
  return id ? `player:id:${id}` : null;
}

export function guestChannel(guestId) {
  const id = String(guestId || '').trim();
  return id ? `guest:${id}` : null;
}

export function playerBroadcastChannel() {
  return 'player:broadcast';
}

export function conversationChannels(conversationId) {
  const cid = String(conversationId || '').trim();
  if (!cid) return [];
  if (cid.startsWith('guest_')) return [guestChannel(cid)];
  return [playerIdChannel(cid)];
}
