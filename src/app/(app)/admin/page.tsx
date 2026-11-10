import { redirect } from 'next/navigation';

/** `/admin` opens Mentors, the admin start page (PRD Q1; PRD 31 keeps it when Analytics leads the nav). */
export default function AdminPage() {
  redirect('/admin/mentors');
}
