import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
]);

function staffFromSession(session) {
  const role = session?.role;
  if (!role || !STAFF_ROLES.has(role)) return null;
  return {
    userId: session.userId,
    username: session.username,
    email: session.email,
    role,
    balanceSC: 0,
    balanceGC: 0,
    frozenBalance: 0,
    availableSC: 0,
    balance: 0,
    kycStatus: 'approved',
    referralCode: '',
    referredBy: null,
    totalDeposited: 0,
    welcomeBonusClaimed: false,
    affiliateCommissionsUnpaid: 0,
    affiliateCommissionsEarned: 0,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const referer = req.headers.get('referer') || '';
    const isAdminQuery = searchParams.get('admin') === 'true' || referer.includes('/admin');

    const session = await getSessionUser(isAdminQuery ? 'admin' : 'player');
    if (!session || !session.userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const staffFast = isAdminQuery ? staffFromSession(session) : null;
    if (staffFast) {
      return NextResponse.json({ authenticated: true, user: staffFast });
    }

    const db = await getDb();
    const usersCol = db.collection('users');

    let user = null;
    try {
      if (ObjectId.isValid(session.userId) && String(session.userId).length === 24) {
        user = await usersCol.findOne({ _id: new ObjectId(session.userId) });
      }
    } catch {}

    if (!user) {
      user = await usersCol.findOne({
        $or: [
          { _id: session.userId },
          { username: session.username },
          { email: session.email },
        ],
      });
    }

    // If user is banned, invalidate session
    if (user && user.isBanned) {
      const resp = NextResponse.json({ authenticated: false, user: null, error: 'Account suspended.' });
      resp.cookies.delete('vegas_session');
      resp.cookies.delete('players_session');
      return resp;
    }

    // User profile either from DB document or gracefully from verified session token
    const balanceSC = user ? Number((user.balanceSC || 0).toFixed(2)) : 0;
    const frozenBalance = user ? Math.max(0, Number((user.frozenBalance || 0).toFixed(2))) : 0;
    const availableSC = Math.max(0, Number((balanceSC - frozenBalance).toFixed(2)));

    const userData = {
      userId: user?._id ? user._id.toString() : session.userId,
      username: user?.username || session.username,
      email: user?.email || session.email,
      role: user?.role || session.role || ROLES.PLAYER,
      balanceSC,
      balanceGC: user ? Number(user.balanceGC || 0) : 50000,
      frozenBalance,
      availableSC,
      balance: balanceSC,
      kycStatus: user?.kycStatus || 'none',
      referralCode: user?.referralCode || '',
      referredBy: user?.referredBy || null,
      totalDeposited: user?.totalDeposited || 0,
      welcomeBonusClaimed: Boolean(user?.welcomeBonusClaimed || (user?.totalDeposited && user.totalDeposited > 0)),
      affiliateCommissionsUnpaid: user?.affiliateCommissionsUnpaid || 0,
      affiliateCommissionsEarned: user?.affiliateCommissionsEarned || 0,
    };

    return NextResponse.json({
      authenticated: true,
      user: userData,
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    // If an error happens, still preserve session if valid
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
