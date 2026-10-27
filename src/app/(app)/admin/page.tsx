import { redirect } from 'next/navigation';

/** `/admin` opens Mentors, first in the admin nav (PRD Q1). */
export default function AdminPage() {
  redirect('/admin/mentors');
}
