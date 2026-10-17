import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

// The backend's list (#482), in the owner's order.
const NAMES = [
  'Business and Management',
  'Economics and Econometrics',
  'Law',
  'Government and Political Science',
  'Computer and Information Science',
  'Mathematics and Statistics',
  'Engineering',
  'Physical Sciences',
  'Biological and Biomedical Sciences',
  'Health Science',
  'Psychology',
  'Social Sciences and History',
  'Education',
  'Communication and Journalism',
  'Visual and Performing Arts',
  'Public Health',
  'Data Science',
  'Arts and Humanities',
  'Architecture and Urban Planning',
  'Agriculture and Environmental Science',
];

/** MOCK of GET /api/v1/catalog/fields-of-study. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return ok('/api/v1/catalog/fields-of-study', 'get', {
    data: NAMES.map((name) => ({ name })),
    next_cursor: null,
  });
}
