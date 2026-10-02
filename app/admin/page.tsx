import type { Metadata } from 'next';

import Admin from '@/components/Admin';

/**
 * The guides, for Jonny and Tenzing: applications, every guide, and who is
 * on air. Nothing links here but an admin's own account page, crawlers are
 * told to leave it alone, and every action is checked on the server
 * (`app/api/admin`), so the page is only a view.
 */
export const metadata: Metadata = {
  title: 'Guides — Meditate With Me',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Admin />;
}
