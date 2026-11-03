import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionUser, ROLES } from '@/lib/auth';
import { ensureDbInitialized } from '@/lib/initDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedMethods = null;
let cacheTime = 0;
const CACHE_TTL_MS = 15000;

export function invalidatePaymentMethodsCache() {
  cachedMethods = null;
  cacheTime = 0;
}

// GET payment methods
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';

    // Serve from ultra-fast in-memory cache for active methods
    const now = Date.now();
    if (!all && cachedMethods && (now - cacheTime < CACHE_TTL_MS)) {
      return NextResponse.json(
        { success: true, methods: cachedMethods, fromCache: true },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const db = await getDb();
    const methodsCol = db.collection('payment_methods');

    const query = all ? {} : { isActive: true };
    const methods = await methodsCol.find(query).toArray();

    // Trigger non-blocking init in background only if empty
    if (methods.length === 0) {
      ensureDbInitialized().catch(() => {});
    }

    const formatted = methods.map(m => ({
      id: m._id.toString(),
      methodId: m.methodId,
      name: m.name,
      type: m.type || 'custom',
      tag: m.tag || 'Instant',
      tagName: m.tagName || m.accountDetails || m.cashtag || m.address || '',
      accountDetails: m.accountDetails || m.tagName || m.cashtag || m.address || '',
      cashtag: m.accountDetails || m.tagName || m.cashtag || '',
      details: m.accountDetails || m.tagName || m.details || '',
      instructions: m.instructions || '',
      paymentUrl: m.paymentUrl || '',
      qrCode: m.qrCode || '',
      minDeposit: m.minDeposit || 10,
      maxDeposit: m.maxDeposit || 5000,
      isActive: m.isActive ?? true,
    }));

    if (!all) {
      cachedMethods = formatted;
      cacheTime = now;
    }

    return NextResponse.json(
      { success: true, methods: formatted },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add Payment Method (Super Admin & Financial Manager)
export async function POST(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.FINANCIAL_MANAGER)) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      type = 'custom',
      accountDetails,
      tagName: rawTagName,
      instructions,
      paymentUrl = '',
      qrCode = '',
      minDeposit = 10,
      maxDeposit = 5000,
      tag = 'Instant',
    } = body;

    const finalTag = (rawTagName || accountDetails || '').trim();

    if (!name || !finalTag) {
      return NextResponse.json({ success: false, error: 'Name and Tag Name / Cashtag are required.' }, { status: 400 });
    }

    const db = await getDb();
    const methodsCol = db.collection('payment_methods');

    const methodId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString(36);
    const cleanQr = qrCode ? qrCode.trim() : '';
    const finalQr = cleanQr === '[Uploaded Image Attached]' ? '' : cleanQr;

    const newMethod = {
      methodId,
      name,
      type: type || 'custom',
      tag: tag || 'Instant',
      tagName: finalTag,
      accountDetails: finalTag,
      instructions: instructions || 'Send payment and upload proof.',
      paymentUrl: paymentUrl ? paymentUrl.trim() : '',
      qrCode: finalQr,
      minDeposit: Number(minDeposit) || 10,
      maxDeposit: Number(maxDeposit) || 5000,
      isActive: true,
      createdAt: new Date(),
    };

    const res = await methodsCol.insertOne(newMethod);
    invalidatePaymentMethodsCache();
    return NextResponse.json({
      success: true,
      id: res.insertedId.toString(),
      method: { ...newMethod, id: res.insertedId.toString() },
      message: 'Payment method created successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Edit Payment Method
export async function PUT(req) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== ROLES.SUPER_ADMIN && session.role !== ROLES.FINANCIAL_MANAGER)) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      type,
      accountDetails,
      tagName,
      instructions,
      paymentUrl,
      qrCode,
      minDeposit,
      maxDeposit,
      isActive,
      tag,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Method ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const methodsCol = db.collection('payment_methods');

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (type !== undefined) updateFields.type = type;
    if (accountDetails !== undefined || tagName !== undefined) {
      const val = (tagName !== undefined ? tagName : accountDetails).trim();
      updateFields.accountDetails = val;
      updateFields.tagName = val;
    }
    if (instructions !== undefined) updateFields.instructions = instructions;
    if (paymentUrl !== undefined) updateFields.paymentUrl = paymentUrl.trim();
    if (qrCode !== undefined) {
      const cleanQr = qrCode.trim();
      if (cleanQr !== '[Uploaded Image Attached]') {
        updateFields.qrCode = cleanQr;
      }
    }
    if (minDeposit !== undefined) updateFields.minDeposit = Number(minDeposit);
    if (maxDeposit !== undefined) updateFields.maxDeposit = Number(maxDeposit);
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);
    if (tag !== undefined) updateFields.tag = tag;
    updateFields.updatedAt = new Date();

    function getMethodFilter(targetId) {
      if (!targetId) return null;
      const is24Hex = typeof targetId === 'string' && targetId.length === 24 && /^[0-9a-fA-F]{24}$/.test(targetId);
      if (is24Hex && ObjectId.isValid(targetId)) {
        return { $or: [{ _id: new ObjectId(targetId) }, { _id: targetId }, { methodId: targetId }] };
      }
      return { $or: [{ _id: targetId }, { methodId: targetId }] };
    }

    const filter = getMethodFilter(id);
    await methodsCol.updateOne(filter, { $set: updateFields });
    invalidatePaymentMethodsCache();

    return NextResponse.json({ success: true, message: 'Payment method updated successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove Payment Method
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
    const methodsCol = db.collection('payment_methods');

    function getMethodFilter(targetId) {
      if (!targetId) return null;
      const is24Hex = typeof targetId === 'string' && targetId.length === 24 && /^[0-9a-fA-F]{24}$/.test(targetId);
      if (is24Hex && ObjectId.isValid(targetId)) {
        return { $or: [{ _id: new ObjectId(targetId) }, { _id: targetId }, { methodId: targetId }] };
      }
      return { $or: [{ _id: targetId }, { methodId: targetId }] };
    }

    await methodsCol.deleteOne(getMethodFilter(id));
    invalidatePaymentMethodsCache();
    return NextResponse.json({ success: true, message: 'Payment method deleted.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
