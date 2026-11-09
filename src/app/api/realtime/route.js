import {
  getRealtimeHub,
  staffChannel,
  playerEmailChannel,
  playerIdChannel,
  guestChannel,
  playerBroadcastChannel,
} from '@/lib/realtimeHub';
import { getAdminSessionUser, getPlayerSessionUser, ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STAFF_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.OPERATION_ADMIN,
  ROLES.FINANCIAL_MANAGER,
  ROLES.COIN_MANAGER,
  ROLES.CHAT_SUPPORT,
  'financial_admin',
  'coins_admin',
  'support_admin',
  'superadmin',
]);

function isStaff(session) {
  const role = session?.role;
  if (!role) return false;
  if (STAFF_ROLES.has(role)) return true;
  const r = String(role).toLowerCase();
  return r === 'superadmin' || r === 'super_admin';
}

function safeGuestId(raw) {
  const id = String(raw || '').trim();
  if (!id || id.length > 120) return null;
  if (!/^guest_[a-z0-9_]+$/i.test(id)) return null;
  return id;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const guestParam = safeGuestId(searchParams.get('guestId'));

  const adminSession = await getAdminSessionUser();
  const playerSession = await getPlayerSessionUser();

  const channels = [];

  if (adminSession && isStaff(adminSession)) {
    channels.push(staffChannel());
  }

  if (playerSession?.email) {
    const emailCh = playerEmailChannel(playerSession.email);
    if (emailCh) channels.push(emailCh);
    channels.push(playerBroadcastChannel());
  }
  if (playerSession?.userId) {
    const idCh = playerIdChannel(playerSession.userId);
    if (idCh) channels.push(idCh);
  }

  if (guestParam) {
    const gCh = guestChannel(guestParam);
    if (gCh) channels.push(gCh);
  }

  if (channels.length === 0) {
    return new Response('Unauthorized — sign in or pass guestId', { status: 401 });
  }

  const uniqueChannels = [...new Set(channels)];
  const encoder = new TextEncoder();
  const hub = getRealtimeHub();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* stream closed */
        }
      };

      send({ type: 'CONNECTED', channels: uniqueChannels, t: Date.now() });

      const unsubscribe = hub.subscribe(uniqueChannels, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      const onAbort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      if (req.signal.aborted) {
        onAbort();
        return;
      }
      req.signal.addEventListener('abort', onAbort, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
