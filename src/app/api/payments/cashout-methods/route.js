import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedCashout = null;
let cacheTime = 0;
const CACHE_TTL_MS = 0; // Always fresh so admin payout toggles apply immediately

const DEFAULT_CASHOUT_METHODS = [
  { methodId: 'cashapp', name: 'Cash App', placeholder: 'e.g. $YourCashtag', isActive: true, minCashout: 1, order: 1 },
  { methodId: 'crypto-btc', name: 'Bitcoin (BTC)', placeholder: 'e.g. bc1q... wallet address', isActive: true, minCashout: 1, order: 2 },
  { methodId: 'crypto-usdt', name: 'USDT (TRC20)', placeholder: 'e.g. TX... TRC20 address', isActive: false, minCashout: 1, order: 3 },
  { methodId: 'venmo', name: 'Venmo', placeholder: 'e.g. @YourVenmoHandle', isActive: false, minCashout: 1, order: 4 },
  { methodId: 'paypal', name: 'PayPal', placeholder: 'e.g. your-paypal@domain.com', isActive: false, minCashout: 1, order: 5 },
  { methodId: 'zelle', name: 'Zelle Pay', placeholder: 'e.g. phone number or email', isActive: false, minCashout: 1, order: 6 },
];

async function ensureSeedCashout(col) {
  const count = await col.countDocuments();
  if (count === 0) {
    const seed = DEFAULT_CASHOUT_METHODS.map(m => ({
      ...m,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await col.insertMany(seed);
  }
}

// GET: Cashout methods (active for players, all for admin if ?all=true)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';

    const now = Date.now();
    if (!all && cachedCashout && (now - cacheTime < CACHE_TTL_MS)) {
      return NextResponse.json({ success: true, methods: cachedCashout, fromCache: true });
    }

    const db = await getDb();
    const col = db.collection('cashout_methods');
    await ensureSeedCashout(col);

    const query = all ? {} : { isActive: true };
    const list = await col.find(query).sort({ order: 1, createdAt: 1 }).toArray();

    const formatted = list.map(m => ({
      id: m._id.toString(),
      methodId: m.methodId || m._id.toString(),
      name: m.name,
      placeholder: m.placeholder || 'Enter your payout address or handle',
      isActive: m.isActive ?? true,
      minCashout: m.minCashout ?? 1,
      order: m.order ?? 99,
    }));

    if (!all) {
      cachedCashout = formatted;
      cacheTime = now;
    }

    return NextResponse.json(
      { success: true, methods: formatted },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new Cashout Method (Super Admin / Financial Manager)
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.FINANCIAL_MANAGER)) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, placeholder, minCashout = 1, isActive = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Method name is required.' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('cashout_methods');
    const methodId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36);

    const newMethod = {
      methodId,
      name: name.trim(),
      placeholder: (placeholder || '').trim() || 'Enter payout address or handle',
      minCashout: Number(minCashout) || 1,
      isActive: Boolean(isActive),
      order: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await col.insertOne(newMethod);
    cachedCashout = null;

    return NextResponse.json({
      success: true,
      method: { ...newMethod, id: res.insertedId.toString() },
      message: 'Cashout method created.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update or toggle Cashout Method
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.FINANCIAL_MANAGER)) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, methodId, name, placeholder, isActive, minCashout } = body;

    if (!id && !methodId) {
      return NextResponse.json({ success: false, error: 'ID or methodId is required.' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('cashout_methods');

    const updateFields = { updatedAt: new Date() };
    if (name !== undefined) updateFields.name = String(name).trim();
    if (placeholder !== undefined) updateFields.placeholder = String(placeholder).trim();
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);
    if (minCashout !== undefined) updateFields.minCashout = Number(minCashout);

    const filter = id && ObjectId.isValid(id) && String(id).length === 24
      ? { $or: [{ _id: new ObjectId(id) }, { methodId: id }] }
      : { methodId: methodId || id };

    await col.updateOne(filter, { $set: updateFields });
    cachedCashout = null;

    return NextResponse.json({ success: true, message: 'Cashout method updated.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete Cashout Method
export async function DELETE(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.FINANCIAL_MANAGER)) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Method ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('cashout_methods');

    const filter = ObjectId.isValid(id) && String(id).length === 24
      ? { $or: [{ _id: new ObjectId(id) }, { methodId: id }] }
      : { methodId: id };

    await col.deleteOne(filter);
    cachedCashout = null;

    return NextResponse.json({ success: true, message: 'Cashout method deleted.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
