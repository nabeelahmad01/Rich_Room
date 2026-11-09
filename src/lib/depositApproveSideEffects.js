import { sendEmail } from '@/lib/email';
import { notifyPlayer } from '@/lib/notify';
import { publishAccountRequestCreated } from '@/lib/realtimePublish';
import { findUserGameAccount } from '@/lib/gameAccounts';

/** Ledger, referral, email, and auto account-request — run after balance + SSE publish. */
export async function runDepositApproveSideEffects({
  db,
  depositsCol,
  usersCol,
  ledgerCol,
  deposit,
  user,
  session,
  depositId,
  creditedSC,
  creditedGC,
  oldSC,
  newSC,
}) {
  const baseDepositAmount = Number(deposit.amount || 0);
  const bonusAmount = Number(deposit.bonusSC || 0);
  const bonusTypeLabel = (deposit.bonusType || 'Welcome').trim();

  if (bonusAmount > 0) {
    const intermediateSC = Number((oldSC + baseDepositAmount).toFixed(2));
    await ledgerCol.insertOne({
      userId: user._id.toString(),
      username: user.username,
      type: 'deposit',
      currency: 'SC',
      amount: baseDepositAmount,
      balanceBefore: oldSC,
      balanceAfter: intermediateSC,
      performedBy: session.username,
      staffRole: session.role,
      referenceId: depositId,
      notes: `Deposit $${baseDepositAmount.toFixed(2)} approved via ${deposit.methodName}. TXID: ${deposit.txHash || 'N/A'}`,
      createdAt: new Date(),
    });

    await ledgerCol.insertOne({
      userId: user._id.toString(),
      username: user.username,
      type: bonusTypeLabel.toLowerCase().includes('welcome') ? 'welcome_bonus' : 'deposit_bonus',
      currency: 'SC',
      amount: bonusAmount,
      balanceBefore: intermediateSC,
      balanceAfter: newSC,
      performedBy: session.username,
      staffRole: session.role,
      referenceId: depositId,
      notes: `${bonusTypeLabel} Bonus: +$${bonusAmount.toFixed(2)} SC credited on deposit ($${baseDepositAmount.toFixed(2)})`,
      createdAt: new Date(Date.now() + 500),
    });
  } else {
    await ledgerCol.insertOne({
      userId: user._id.toString(),
      username: user.username,
      type: 'deposit',
      currency: 'SC',
      amount: creditedSC,
      balanceBefore: oldSC,
      balanceAfter: newSC,
      performedBy: session.username,
      staffRole: session.role,
      referenceId: depositId,
      notes: `Deposit $${deposit.amount} approved via ${deposit.methodName}. TXID: ${deposit.txHash || 'N/A'}`,
      createdAt: new Date(),
    });
  }

  const approvedCount = await depositsCol.countDocuments({
    userId: deposit.userId,
    status: 'approved',
  });

  const isFirstDeposit = approvedCount <= 1 && !user.referralRewardPaid;

  if (user.referredBy && isFirstDeposit) {
    const refIdentifier = String(user.referredBy).trim();
    const referrer = await usersCol.findOne({
      $or: [
        { username: refIdentifier.toLowerCase() },
        { username: refIdentifier },
        { referralCode: refIdentifier.toUpperCase() },
        { referralCode: refIdentifier },
      ],
    });

    if (referrer) {
      const settingsCol = db.collection('system_settings');
      const sysSettings = await settingsCol.findOne({ key: 'general' });
      const isReferralActive = sysSettings?.referralBonusActive !== false;
      const referralPercent = isReferralActive ? Number(sysSettings?.referralBonusPercent ?? 20) : 0;
      const bonusSC = Number(((deposit.amount * referralPercent) / 100).toFixed(2));

      if (bonusSC > 0) {
        const refOldSC = Number(referrer.balanceSC || 0);
        const refNewSC = Number((refOldSC + bonusSC).toFixed(2));

        await usersCol.updateOne(
          { _id: referrer._id },
          {
            $inc: {
              balanceSC: bonusSC,
              totalReferralRewards: bonusSC,
              affiliateCommissionsEarned: bonusSC,
            },
          }
        );

        await ledgerCol.insertOne({
          userId: referrer._id.toString(),
          username: referrer.username,
          type: 'referral_bonus',
          currency: 'SC',
          amount: bonusSC,
          balanceBefore: refOldSC,
          balanceAfter: refNewSC,
          performedBy: session.username,
          staffRole: session.role,
          referenceId: deposit._id.toString(),
          notes: `Referral Bonus: ${referralPercent}% bonus ($${bonusSC.toFixed(2)} SC) credited to wallet from @${user.username}'s first deposit ($${deposit.amount}).`,
          createdAt: new Date(),
        });

        const notifTitle = `🎁 Referral Bonus: +$${bonusSC.toFixed(2)} SC!`;
        const notifMessage = `Congratulations! Your referred friend @${user.username} made their first deposit ($${deposit.amount}). You received a ${referralPercent}% referral bonus of $${bonusSC.toFixed(2)} SC directly into your wallet!`;

        notifyPlayer({
          userId: referrer._id.toString(),
          userEmail: referrer.email,
          username: referrer.username,
          title: notifTitle,
          message: notifMessage,
          type: 'bonus',
          data: { amount: String(bonusSC), url: '/wallet' },
        });

        if (referrer.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://richroom.games';
          sendEmail({
            to: referrer.email,
            subject: `🎁 $${bonusSC.toFixed(2)} SC Referral Bonus Added to Your Rich Room Wallet!`,
            html: `
                  <div style="background-color: #070514; color: #FFFFFF; padding: 32px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: auto; border-radius: 16px; border: 1px solid rgba(255, 215, 0, 0.4); text-align: center;">
                    <img src="${appUrl}/logo.png" alt="Rich Room" style="height: 48px; margin-bottom: 12px;" />
                    <h1 style="color: #FFD700; margin: 0; font-size: 20px; font-weight: 900;">RICH ROOM</h1>
                    <p style="color: #00F0FF; font-size: 11px; margin: 4px 0 20px 0; text-transform: uppercase; letter-spacing: 2px;">Referral Reward Earned</p>
                    <div style="background: #0E0A24; border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 12px; padding: 20px; text-align: left; margin: 20px 0;">
                      <h2 style="font-size: 16px; margin: 0 0 10px 0; color: #10B981;">+$${bonusSC.toFixed(2)} SC Credited to Your Wallet</h2>
                      <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
                        Your referred friend <b>@${user.username}</b> made their first deposit of <b>$${deposit.amount}</b>. Based on our <b>${referralPercent}%</b> referral rate, your bonus has been credited straight into your wallet!
                      </p>
                    </div>
                    <a href="${appUrl}/wallet" style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #070514; font-weight: 900; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-size: 13px;">
                      VIEW WALLET &amp; PLAY
                    </a>
                  </div>
                `,
          }).catch(() => {});
        }

        await usersCol.updateOne(
          { _id: user._id },
          {
            $set: {
              referralRewardPaid: true,
              referralRewardAmount: bonusSC,
              referralRewardPaidAt: new Date(),
              referredByUserId: referrer._id.toString(),
            },
          }
        );
      }
    }
  }

  if (user.email) {
    sendEmail({
      to: user.email,
      subject: `Deposit Confirmed: ${creditedSC} SC credited to your Rich Room wallet!`,
      html: `<p>Hi ${user.username}, your deposit of $${deposit.amount} via ${deposit.methodName} was verified and ${creditedSC} SC (+ ${creditedGC.toLocaleString()} GC) was credited to your account. Best of luck at the tables!</p>`,
    }).catch(() => {});
  }

  if (deposit.gameTitle) {
    const cleanEmail = (user.email || deposit.playerPaymentEmail || '').toLowerCase().trim();
    const cleanGameTitle = deposit.gameTitle.trim();

    const accCheck = await findUserGameAccount(
      db,
      {
        userId: user._id,
        userEmail: cleanEmail,
        username: user.username,
      },
      cleanGameTitle
    );

    if (!accCheck.exists) {
      const existingPending = await db.collection('accountRequests').findOne({
        userEmail: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        gameTitle: { $regex: new RegExp(`^${cleanGameTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        status: 'PENDING',
        requestType: { $ne: 'COIN_LOAD' },
      });

      if (!existingPending) {
        await db.collection('accountRequests').insertOne({
          userEmail: cleanEmail,
          userName: user.username,
          gameTitle: cleanGameTitle,
          gameId: deposit.gameId || cleanGameTitle.toLowerCase().replace(/\s+/g, '-'),
          requestType: 'ACCOUNT_CREATION',
          transferAmount: 0,
          status: 'PENDING',
          sourceDepositId: deposit._id.toString(),
          depositAmount: deposit.amount,
          notes: `Auto-generated from approved deposit of $${deposit.amount.toFixed(2)} via ${deposit.methodName || 'Payment'}`,
          createdAt: new Date(),
        });

        notifyPlayer({
          userId: user._id,
          userEmail: cleanEmail,
          username: user.username,
          title: `Game Account Request Queued: ${cleanGameTitle}! 🎮`,
          message: `Deposit approved! Since you don't have a ${cleanGameTitle} account yet, an account creation request has been automatically sent to staff. Your login credentials will appear under My Game IDs shortly.`,
          type: 'account_request_created',
          data: { gameTitle: cleanGameTitle, depositId: deposit._id.toString() },
        });

        publishAccountRequestCreated({
          request: {
            userEmail: cleanEmail,
            userName: user.username,
            gameTitle: cleanGameTitle,
            status: 'PENDING',
          },
          userEmail: cleanEmail,
          userId: user._id.toString(),
        });
      }
    }
  }
}
