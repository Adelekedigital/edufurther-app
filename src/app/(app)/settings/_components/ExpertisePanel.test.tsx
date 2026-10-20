import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GuideCountry } from '@/lib/api/data/mentorSettings';
import type { MentorProfile } from '@/types/mentor';
import { ExpertisePanel } from './ExpertisePanel';

const CATALOG = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Netherlands',
  'Ireland',
  'Australia',
  'France',
  'Japan',
].map((label) => ({ id: label.toLowerCase().replace(/ /g, '-'), label }));
const us = { id: 'united-states', label: 'United States' };

const profile = {
  mentor: {
    id: 'u1',
    topics: [{ slug: 'school-selection', label: 'School selection' }],
  },
  awards: [
    { id: 'a1', title: 'Chevening', meta: 'UK Government · 2019', funding: 'full', values: {} },
  ],
} as unknown as MentorProfile;

let settings: { status: string; profile: MentorProfile | null; retry: () => void };
let guide: { countries: GuideCountry[] | null; status: string; retry: () => void };
const saveGuide = vi.fn();

vi.mock('@/lib/api/data/mentorSettings', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/mentorSettings')>()),
  useMentorSettings: () => settings,
  useGuideCountries: () => guide,
  useSaveGuideCountries: () => ({
    mutateAsync: saveGuide,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/profileEntries', () => ({
  useOwnEducation: () => ({
    status: 'ready',
    entries: [],
    retry: vi.fn(),
    retrying: false,
    failures: 0,
  }),
}));
vi.mock('@/lib/api/data/catalog', () => ({
  useCountries: () => ({ countries: CATALOG, status: 'ready', retry: vi.fn() }),
}));
// The Mentor Profile's editors: stand-ins that report what opened and save at once.
vi.mock('@/app/_profile/OwnerItemEditor', () => ({
  OwnerItemEditor: ({
    target,
    onSaved,
  }: {
    target: { kind: string; id?: string | null };
    onSaved: (kind: string, outcome: string) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSaved(target.kind, target.kind === 'topics' || target.id ? 'saved' : 'added')
      }
    >
      editor:{target.kind}:{target.id ?? 'new'}
    </button>
  ),
  OwnerEntryDelete: ({
    target,
    onDeleted,
  }: {
    target: { kind: string; id: string };
    onDeleted: () => void;
  }) => (
    <button type="button" onClick={onDeleted}>
      confirm-delete:{target.kind}:{target.id}
    </button>
  ),
}));

beforeEach(() => {
  settings = { status: 'ready', profile, retry: vi.fn() };
  guide = { countries: [us], status: 'ready', retry: vi.fn() };
  saveGuide.mockReset();
  saveGuide.mockImplementation(async (v) => v);
});

const bar = () => screen.queryByRole('region', { name: 'Unsaved changes' });
const countries = () =>
  within(screen.getByRole('group', { name: 'Where can you guide mentees to?' }));

describe('ExpertisePanel', () => {
  it('topics as chips with Edit; Edit opens the topics editor and says "Topics updated"', async () => {
    const user = userEvent.setup();
    render(<ExpertisePanel userId="u1" />);
    expect(screen.getByText('School selection')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit topics' }));
    await user.click(screen.getByRole('button', { name: 'editor:topics:new' }));
    expect(await screen.findByText('Topics updated')).toBeInTheDocument();
  });

  it('no topics: the empty state and "Choose topics"', () => {
    settings = {
      ...settings,
      profile: { ...profile, mentor: { ...profile.mentor, topics: [] } } as MentorProfile,
    };
    render(<ExpertisePanel userId="u1" />);
    expect(screen.getByText('Mentees can’t find you by topic yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose topics' })).toBeInTheDocument();
  });

  it('countries save with the bar, in the order picked', async () => {
    const user = userEvent.setup();
    render(<ExpertisePanel userId="u1" />);
    expect(bar()).toBeNull();
    await user.click(countries().getByRole('button', { name: 'Canada' }));
    expect(bar()).toHaveTextContent('Unsaved changes to your countries');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saveGuide).toHaveBeenCalledWith([us, { id: 'canada', label: 'Canada' }]);
    expect(await screen.findByText('Countries saved')).toBeInTheDocument();
    expect(bar()).toBeNull();
  });

  it('at 8 countries the others can’t be picked', () => {
    guide = { ...guide, countries: CATALOG.slice(0, 8) };
    render(<ExpertisePanel userId="u1" />);
    expect(countries().getByRole('button', { name: 'Add another country' })).toBeDisabled();
  });

  it('awards: the row with its funding badge; Delete confirms, then says so', async () => {
    const user = userEvent.setup();
    render(<ExpertisePanel userId="u1" />);
    expect(screen.getByText('Chevening')).toBeInTheDocument();
    // Two in the DOM (beside the text, and under it on phones); CSS shows one.
    expect(screen.getAllByText('Fully funded').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Delete Chevening' }));
    await user.click(screen.getByRole('button', { name: 'confirm-delete:award:a1' }));
    expect(await screen.findByText('Award deleted')).toBeInTheDocument();
  });

  it('no awards: "Add your first award" opens a new award', async () => {
    const user = userEvent.setup();
    settings = { ...settings, profile: { ...profile, awards: [] } as MentorProfile };
    render(<ExpertisePanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Add your first award' }));
    await user.click(screen.getByRole('button', { name: 'editor:award:new' }));
    expect(await screen.findByText('Award added')).toBeInTheDocument();
  });

  it('error before content: a failed load offers Try again', async () => {
    settings = { ...settings, status: 'error', profile: null };
    render(<ExpertisePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(settings.retry).toHaveBeenCalled();
  });

  it('loading: the skeleton, announced', () => {
    settings = { ...settings, status: 'loading', profile: null };
    render(<ExpertisePanel userId="u1" />);
    expect(screen.getByRole('status', { name: 'Loading your expertise' })).toBeInTheDocument();
  });
});
