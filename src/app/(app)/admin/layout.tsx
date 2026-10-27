'use client';

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { RoleLoading } from '@/app/_shell/RoleRedirect';
import { useViewer } from '@/lib/api/data/viewer';
import styles from './layout.module.css';

/**
 * The admin app (Admin PRD, Access): platform admins only. Anyone else, a
 * guest included, gets the not-found page, as the API answers 404 to them.
 * While /me loads nothing admin shows.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  if (viewer.kind === 'loading') return <RoleLoading />;
  if (viewer.kind !== 'member' || !viewer.isAdmin) notFound();
  return <div className={styles.page}>{children}</div>;
}
