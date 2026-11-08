import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { signToken, ROLES } from '@/lib/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';
import { ensureDbInitialized } from '@/lib/initDb';
import { getDeviceIdFromRequest } from '@/lib/deviceServer';

export async function POST(req) {
  try {
    await ensureDbInitialized();

    const body = await req.json();
    const {
      username,
      email,
      password,
      otp,
      referralCode: inputRef,
      state = 'US',
      ageVerified = true,
      deviceId: rawDeviceId,
    } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'Email verification code (OTP) is required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanOtp = String(otp).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (cleanUsername.length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters.' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const db = await getDb();
    const otpsCol = db.collection('otps');
    const usersCol = db.collection('users');

    // 1. Verify OTP code
    const otpRecord = await otpsCol.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'No verification code found for this email. Please request a new code.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await otpsCol.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (otpRecord.code !== cleanOtp) {
      await otpsCol.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return NextResponse.json(
        { success: false, error: 'Invalid verification code. Please check your email and try again.' },
        { status: 400 }
      );
    }

    // OTP verified! Delete record to prevent replay
    await otpsCol.deleteOne({ _id: otpRecord._id });

    // 2. Check duplicate username or email in database
    const safeEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const existing = await usersCol.findOne({
      $or: [
        { email: cleanEmail },
        { username: cleanUsername },
        { email: { $regex: new RegExp(`^${safeEmail}$`, 'i') } },
        { username: { $regex: new RegExp(`^${safeUsername}$`, 'i') } },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username or email is already registered. Please log in instead.' },
        { status: 409 }
      );
    }

    // 3. Check referrer if provided
    let referrer = null;
    let fallbackRefCode = null;
    if (inputRef && typeof inputRef === 'string') {
      const cleanRef = inputRef.trim();
      if (cleanRef) {
        fallbackRefCode = cleanRef.toUpperCase();
        const safeRef = cleanRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        referrer = await usersCol.findOne({
          $or: [
            { referralCode: cleanRef.toUpperCase() },
            { referralCode: { $regex: new RegExp(`^${safeRef}$`, 'i') } },
            { username: cleanRef.toLowerCase() },
            { username: cleanRef },
            { username: { $regex: new RegExp(`^${safeRef}$`, 'i') } },
          ],
        });
      }
    }

    const deviceId = getDeviceIdFromRequest(req, rawDeviceId);

    // Hardware / Device Restriction: Only 1 account per device
    if (deviceId) {
      const boundUser = await usersCol.findOne({
        role: ROLES.PLAYER,
        $or: [
          { deviceId: deviceId },
          { boundDevices: deviceId },
          { lastLoginDevice: deviceId },
        ],
      });

      if (boundUser) {
        return NextResponse.json(
          {
            success: false,
            error: `Device restriction: This device is already linked to ${boundUser.email}. Only one player account is allowed per device. Log in with that account or contact support.`,
          },
          { status: 403 }
        );
      }
    }

    // Generate unique referral code for this new player
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const myReferralCode = `PP-${randomSuffix}`;

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const initialBonusSC = 0; // Freeplay is claimed manually via lobby button, signup starts at 0 SC
    const initialBonusGC = 10000; // 10,000 Gold Coins

    const sessionVersion = Date.now().toString();

    const newUser = {
      username: cleanUsername,
      email: cleanEmail,
      emailVerified: true,
      passwordHash,
      role: ROLES.PLAYER,
      balanceSC: initialBonusSC,
      balanceGC: initialBonusGC,
      availableSpins: 0,
      kycStatus: 'none',
      state: (state || 'CA').toUpperCase(),
      country: 'US',
      referralCode: myReferralCode,
      referredBy: referrer ? referrer.username : (fallbackRefCode || null),
      referredByCode: referrer?.referralCode || fallbackRefCode || null,
      referrerId: referrer?._id ? referrer._id.toString() : null,
      deviceId: deviceId,
      boundDevices: deviceId ? [deviceId] : [],
      sessionVersion,
      lastLoginDevice: deviceId,
      lastLoginAt: new Date(),
      affiliateCommissionsEarned: 0,
      affiliateCommissionsUnpaid: 0,
      totalDeposited: 0,
      totalRedeemed: 0,
      isBanned: false,
      createdAt: new Date(),
    };

    const insertRes = await usersCol.insertOne(newUser);
    const userId = insertRes.insertedId ? insertRes.insertedId.toString() : newUser._id;

    // Record welcome bonus into Ledger if any
    if (initialBonusSC > 0) {
      try {
        const ledgerCol = db.collection('ledger');
        await ledgerCol.insertOne({
          userId,
          username: cleanUsername,
          type: 'welcome_bonus',
          currency: 'USD',
          amount: initialBonusSC,
          balanceBefore: 0,
          balanceAfter: initialBonusSC,
          performedBy: 'system',
          notes: 'Sign-up welcome bonus',
          createdAt: new Date(),
        });
      } catch {}
    }

    // Send welcome email in background
    sendEmail({
      to: cleanEmail,
      subject: 'Welcome to Rich Room!',
      html: getWelcomeEmailTemplate(cleanUsername),
    }).catch(() => {});

    // Sign session token with sessionVersion
    const token = signToken({
      userId,
      username: cleanUsername,
      email: cleanEmail,
      role: ROLES.PLAYER,
      sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account registered & verified! Welcome to Rich Room.',
      user: {
        userId,
        username: cleanUsername,
        email: cleanEmail,
        role: ROLES.PLAYER,
        balanceSC: initialBonusSC,
        balanceGC: initialBonusGC,
        balance: initialBonusSC,
        kycStatus: 'none',
        referralCode: myReferralCode,
      },
    });

    response.cookies.set('vegas_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });
    response.cookies.set('players_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    if (deviceId) {
      response.cookies.set('v1_device_id', deviceId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 315360000,
      });
    }

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed: ' + error.message }, { status: 500 });
  }
}
