import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import {
  addEducation,
  editEducation,
  h,
  ownEducation,
  removeEducation,
  state,
} from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./profileScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./profileScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/reviews', async () =>
  (await import('./profileScreen.harness')).mocks.reviews(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./profileScreen.harness')).mocks.reviewWrite(),
);
vi.mock('@/lib/api/data/similar', async () =>
  (await import('./profileScreen.harness')).mocks.similar(),
);
vi.mock('@/lib/api/data/profile', async () =>
  (await import('./profileScreen.harness')).mocks.profile(),
);
vi.mock('@/lib/api/data/cover', async () =>
  (await import('./profileScreen.harness')).mocks.cover(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);
vi.mock('@/lib/api/data/profileEntries', async () =>
  (await import('./profileScreen.harness')).mocks.profileEntries(),
);
vi.mock('@/lib/api/data/catalog', async () =>
  (await import('./profileScreen.harness')).mocks.catalog(),
);

const owner = { approval: 'approved' as const, listed: true };
const own = { ...fullProfile, owner };

describe('MentorProfileScreen — education', () => {
  it('a mentee sees the degrees and no controls', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    const section = screen.getByRole('region', { name: 'Education' });
    expect(within(section).getByText('PhD, Sociology')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).toBeNull();
  });

  it('the owner adds one: the level is derived, the years sent as dates, not current', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Add education' }));
    const dialog = screen.getByRole('dialog', { name: 'Add education' });
    // Another degree is already current: a new one isn't, by default.
    expect(
      within(dialog).getByRole('checkbox', { name: 'This is my current or most recent education' }),
    ).not.toBeChecked();
    await user.type(within(dialog).getByRole('textbox', { name: 'School' }), 'Unilag');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Degree' }), 'BSc');
    await user.type(within(dialog).getByRole('textbox', { name: 'Course of study' }), 'Sociology');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Start year' }), '2015');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'End year (or expected)' }),
      '2019',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add education' }));
    expect(addEducation).toHaveBeenCalledWith({
      school_name_raw: 'Unilag',
      degree_abbreviation: 'BSc',
      degree_level_id: 'dl-undergraduate',
      study_course: 'Sociology',
      date_start: '2015-01-01',
      date_end: '2019-01-01',
      is_most_recent: false,
    });
    expect(screen.getByText('Education added.')).toBeInTheDocument();
  });

  it('the owner edits one from its row: prefilled from their own list; only changes are sent', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /^Edit MSc, Sociology/ }));
    const dialog = screen.getByRole('dialog', { name: 'Edit education' });
    expect(within(dialog).getByRole('combobox', { name: 'Degree' })).toHaveValue('MSc');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'End year (or expected)' }),
      '2024',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    // The start keeps its saved month and day; the new end year is Jan 1.
    expect(editEducation).toHaveBeenCalledWith('e2', { date_end: '2024-01-01' });
    expect(screen.getByText('Education saved.')).toBeInTheDocument();
  });

  it('Delete on the row asks first, then says so and moves focus to "Add education"', async () => {
    h.profile = state({ data: own });

    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /^Delete MSc, Sociology/ }));
    const confirm = screen.getByRole('dialog', { name: 'Delete this education?' });
    expect(confirm).toHaveAccessibleDescription('This can’t be undone.');
    await user.click(within(confirm).getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(removeEducation).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /^Delete MSc, Sociology/ }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete this education?' })).getByRole('button', {
        name: 'Delete education',
      }),
    );
    expect(removeEducation).toHaveBeenCalledWith('e2');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Education deleted.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add education' })[0]).toHaveFocus();
  });
});

describe('MentorProfileScreen — education, review of #93', () => {
  it('editing only the school leaves the saved degree level alone (2)', async () => {
    const saved = ownEducation[1]!.levelId;
    ownEducation[1]!.levelId = 'dl-legacy';
    try {
      h.profile = state({
        data: { ...fullProfile, owner: { approval: 'approved', listed: true } },
      });
      const user = userEvent.setup();
      render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: /^Edit MSc, Sociology/ }));
      const dialog = screen.getByRole('dialog', { name: 'Edit education' });
      const school = within(dialog).getByRole('textbox', { name: 'School' });
      await user.clear(school);
      await user.type(school, 'Mississippi State');
      await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      expect(editEducation).toHaveBeenCalledWith('e2', { school_name_raw: 'Mississippi State' });
    } finally {
      ownEducation[1]!.levelId = saved;
    }
  });
});
