import { render, screen } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ONBOARDING_ENABLED = 'true';
});
let viewer: Viewer = { kind: 'loading', signedIn: true };
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));
vi.mock('./MenteeHomeScreen', () => ({ MenteeHomeScreen: () => <p>Mentee home</p> }));
const { MenteeHomeGate } = await import('./MenteeHomeGate');

type Member = Extract<Viewer, { kind: 'member' }>;
const mentee = (over: Partial<Member>): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initial: 'A',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  ...over,
});

beforeEach(() => replace.mockClear());

describe('MenteeHomeGate: an unfinished mentee has no Home yet', () => {
  it('sends them to onboarding and shows nothing of Home', () => {
    viewer = mentee({ onboardingComplete: false });
    render(<MenteeHomeGate />);
    expect(replace).toHaveBeenCalledWith('/onboarding');
    expect(screen.queryByText('Mentee home')).toBeNull();
  });

  it('a finished mentee gets Home', () => {
    viewer = mentee({ onboardingComplete: true });
    render(<MenteeHomeGate />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('Mentee home')).toBeInTheDocument();
  });

  it('while /me loads, Home renders (its own skeleton) and nobody is sent anywhere', () => {
    viewer = { kind: 'loading', signedIn: true };
    render(<MenteeHomeGate />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('Mentee home')).toBeInTheDocument();
  });
});
