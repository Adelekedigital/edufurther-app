import type { Mentor } from '@/types/mentor';
import { firstReasonsFor } from './ExploreScreen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(),
}));

const base = {
  label: 'new',
  completedSessions: 0,
  reviewCount: 0,
  originCountry: 'Nigeria',
  studyCountry: 'United States',
} as unknown as Mentor;

describe('firstReasonsFor (Explore → booking modal)', () => {
  it('a new mentor whose move is known gets "Made the move"', () => {
    expect(firstReasonsFor(base)).toEqual([
      {
        icon: 'flight_takeoff',
        k: 'Made the move you’re planning.',
        v: 'From Nigeria to the United States.',
      },
    ]);
  });
  it('nothing when the move is unknown or the same country', () => {
    expect(firstReasonsFor({ ...base, originCountry: null })).toEqual([]);
    expect(firstReasonsFor({ ...base, studyCountry: 'Nigeria' })).toEqual([]);
  });
  it('nothing for a mentor who is not new (label rule: 3+ sessions or any review)', () => {
    expect(firstReasonsFor({ ...base, label: null })).toEqual([]);
    expect(firstReasonsFor({ ...base, label: 'top-rated' })).toEqual([]);
  });
});
