'use client';

/** Shown while admin session resolves — pure CSS classes (no styled-jsx) for stable hydration. */
export default function AdminBootShell({ label = 'Opening staff desk…' }) {
  return (
    <div className="admin-boot-root">
      <div className="admin-boot-sidebar" aria-hidden />
      <div className="admin-boot-main">
        <div className="admin-boot-shimmer" />
        <div className="admin-boot-cards">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-boot-card" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <p className="admin-boot-label">{label}</p>
      </div>
    </div>
  );
}
