'use client';

import { useParams } from 'next/navigation';
import AdminPortalView from '../AdminPortalView';

export default function AdminCatchAllPage() {
  const params = useParams();
  const slug = params?.slug;
  const initialTab = Array.isArray(slug) ? slug[0] : (slug || 'overview');

  return <AdminPortalView initialTab={initialTab} />;
}
