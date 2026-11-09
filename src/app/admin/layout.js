/** Admin shell is client-only (sessionStorage, badges) — skip SSR to avoid hydration drift. */
export default function AdminLayout({ children }) {
  return children;
}
