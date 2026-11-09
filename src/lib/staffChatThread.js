/** Admin concierge — consistent thread URLs (conversation + player ids). */

export function buildStaffChatThreadUrl(conv) {
  if (!conv?._id) return '/api/chat?conversationId=';
  const params = new URLSearchParams();
  params.set('conversationId', String(conv._id));
  const uid = conv.userId || conv.customerUserId;
  if (uid && String(uid) !== String(conv._id)) {
    params.set('customerUserId', String(uid));
  }
  if (conv.username && conv.username !== 'Player') {
    params.set('customerUsername', String(conv.username));
  }
  params.set('lightweightImages', 'true');
  return `/api/chat?${params.toString()}`;
}
