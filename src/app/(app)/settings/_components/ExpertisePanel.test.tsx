import { render, screen, waitFor, within } from '@testing-library/react';
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
    error: saveError,
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
let catalog: { countries: typeof CATALOG; status: string; retry: () => void };
vi.mock('@/lib/api/data/catalog', () => ({
  useCountries: () => catalog,
}));
let saveError: { copy: string } | null = null;
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
  catalog = { countries: CATALOG, status: 'ready', retry: vi.fn() };
  saveError = null;
});

const bar = () => screen.queryByRole('region', { name: 'Unsaved changes' });
const countries = () => within(screen.getByRole('group', { name: 'Countries' }));

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

  it('the 8 limit holds while the adder is open, too', async () => {
    const user = userEvent.setup();
    guide = { ...guide, countries: CATALOG.slice(0, 7) };
    render(<ExpertisePanel userId="u1" />);
    await user.click(countries().getByRole('button', { name: 'Add another country' }));
    await user.click(countries().getByRole('button', { name: 'France' }));
    await user.type(screen.getByRole('combobox'), 'Jap{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saveGuide.mock.calls[0]![0]).toHaveLength(8);
    expect(saveGuide.mock.calls[0]![0].map((c: GuideCountry) => c.label)).not.toContain('Japan');
  });

  it('saves in the order the chips show, so the profile matches', async () => {
    const user = userEvent.setup();
    guide = { ...guide, countries: [] };
    render(<ExpertisePanel userId="u1" />);
    await user.click(countries().getByRole('button', { name: 'Canada' }));
    await user.click(countries().getByRole('button', { name: 'United States' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(saveGuide.mock.calls[0]![0].map((c: GuideCountry) => c.label)).toEqual([
      'United States',
      'Canada',
    ]);
  });

  it('search finds by part of a name, without the ones already picked', async () => {
    const user = userEvent.setup();
    render(<ExpertisePanel userId="u1" />);
    await user.click(countries().getByRole('button', { name: 'Add another country' }));
    await user.type(screen.getByRole('combobox'), 'unit');
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toContain('United Kingdom');
    expect(names).not.toContain('United States');
  });

  it('a failed country list says so and offers Try again', async () => {
    catalog = { countries: [], status: 'error', retry: vi.fn() };
    render(<ExpertisePanel userId="u1" />);
    expect(screen.getAllByText('We couldn’t load countries. Try again.').length).toBeGreaterThan(0);
    await userEvent.click(countries().getByRole('button', { name: 'Try again' }));
    expect(catalog.retry).toHaveBeenCalled();
  });

  it('a refetch while editing keeps the edit; a clean card takes new values', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExpertisePanel userId="u1" />);
    await user.click(countries().getByRole('button', { name: 'Canada' }));
    guide = { ...guide, countries: [{ id: 'germany', label: 'Germany' }] };
    rerender(<ExpertisePanel userId="u1" />);
    expect(countries().getByRole('button', { name: 'Canada' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(countries().getByRole('button', { name: 'Germany' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(countries().getByRole('button', { name: 'Canada' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('a failed save keeps the edit and says why', async () => {
    const user = userEvent.setup();
    saveError = {
      copy: 'We couldn’t save your countries. Your changes are still here. Try again.',
    };
    saveGuide.mockRejectedValue(saveError);
    render(<ExpertisePanel userId="u1" />);
    await user.click(countries().getByRole('button', { name: 'Canada' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t save your countries.');
    expect(bar()).not.toBeNull();
  });

  it('a second identical save failure is announced again', async () => {
    const user = userEvent.setup();
    saveError = {
      copy: 'We couldn’t save your countries. Your changes are still here. Try again.',
    };
    saveGuide.mockRejectedValue(saveError);
    render(<ExpertisePanel userId="u1" />);
    await user.click(countries().getByRole('button', { name: 'Canada' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const live = () => screen.getByRole('alert').firstElementChild;
    const first = live();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(live()).not.toBe(first);
    expect(live()).not.toBeNull();
  });

  it('a second catalog failure after Try again is announced again', async () => {
    const user = userEvent.setup();
    catalog = { countries: [], status: 'error', retry: vi.fn() };
    render(<ExpertisePanel userId="u1" />);
    const region = countries().getByRole('status');
    await waitFor(() => expect(region).toHaveTextContent('We couldn’t load countries.'));
    const first = region.firstElementChild;
    await user.click(countries().getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(region.firstElementChild).not.toBe(first));
    expect(region).toHaveTextContent('We couldn’t load countries.');
  });

  it('a failed countries read stays in its card; topics and awards still show', async () => {
    guide = { countries: null, status: 'error', retry: vi.fn() };
    render(<ExpertisePanel userId="u1" />);
    expect(screen.getByText('School selection')).toBeInTheDocument();
    expect(screen.getByText('Chevening')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(guide.retry).toHaveBeenCalled();
  });

  it('after the first award is added, focus lands on Add award, not the page', async () => {
    const user = userEvent.setup();
    settings = { ...settings, profile: { ...profile, awards: [] } as MentorProfile };
    const { rerender } = render(<ExpertisePanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Add your first award' }));
    // The award lands (the list refetched before the editor reports it).
    settings = { ...settings, profile };
    const editor = screen.getByRole('button', { name: 'editor:award:new' });
    rerender(<ExpertisePanel userId="u1" />);
    await user.click(editor);
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(<ExpertisePanel userId="u1" />);
    expect(await screen.findByRole('button', { name: 'Add award' })).toHaveFocus();
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
