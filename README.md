# Rich Room 🎰🌐

Next-generation cyber gaming destination and official sweeps management hub. Built with Next.js, Tailwind CSS, MongoDB, Capacitor, and Firebase Cloud Messaging.

---

## 🌟 Key Features

- **Cyber Gaming Hub**: Play catalog with Ultra Panda, Fire Kirin, Orion Stars, Game Vault, Milky Way, and Panda 777 Slots.
- **Dedicated Cash Management**:
  - `/deposit`: Multiple gateways (Cash App, Crypto, PayPal, Venmo, Zelle) with real-time verification and receipt uploads.
  - `/withdraw`: Instant cashout redemption requests with automated audit logging.
- **Daily Lucky Spin Wheel** (`/spin-wheel`):
  - 24-hour cooldown wheel with prizes up to $50, awarding real wallet balance.
- **Live Account Provisioning** (`/game-accounts/provisioning`):
  - 3-stage animated live terminal pipeline with automated credential delivery upon admin approval.
- **Immutable Transaction Ledger** (`/ledger`):
  - Audit trail of deposits, cashouts, daily spin bonuses, and coin allocations.
- **Push Notification Integration**:
  - Google Firebase Cloud Messaging (FCM) v14 service account integration for real-time mobile push notifications.
- **Android Mobile App**:
  - Capacitor Android integration ready for APK packaging (`com.richroom.app`).

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env.local

# 3. Run development server
npm run dev

# 4. Build for production
npm run build
npm start
```

---

## 🌐 Production Deployment (Hostinger VPS)

See deployment guidelines in project documentation or PM2 setup via `ecosystem.config.cjs`.
