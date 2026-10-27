import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { flags, viewers } from '@/app/_shell/lockedPage.harness';
import { SettingsScreen } from './SettingsScreen';

const replace = vi.fn();
const push = vi.fn();
let segment: string | null = 'profile';
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSelectedLayoutSegment: () => segment,
  notFound: () => notFound(),
}));

const skipFocus = vi.fn();
vi.mock('@/app/_shell/RouteFocusManager', () => ({
  skipNextRouteFocus: (path: string) => skipFocus(path),
}));

let viewer: Viewer;
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

// The setup lock's flags, switchable per test (lockedPage.harness). Off by
// default here; the setup lock's tests switch them on.
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);

const panel = {
  dirty: true,
  save: vi.fn<() => Promise<boolean>>(),
  discard: vi.fn(),
};
vi.mock('./ProfilePanel', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    ProfilePanel: forwardRef(function ProfilePanel(_props, ref) {
      useImperativeHandle(ref, () => ({
        dirty: () => panel.dirty,
        save: () => panel.save(),
        discard: () => panel.discard(),
      }));
      return <div data-testid="profile-panel" />;
    }),
  };
});
const goals = vi.hoisted(() => ({
  dirty: false,
  save: vi.fn<() => Promise<boolean>>(),
  discard: vi.fn(),
}));
vi.mock('./GoalsPanel', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    GoalsPanel: forwardRef(function GoalsPanel(_props, ref) {
      useImperativeHandle(ref, () => ({
        dirty: () => goals.dirty,
        save: () => goals.save(),
        discard: () => goals.discard(),
      }));
      return <div data-testid="goals-panel" />;
    }),
  };
});

vi.mock('./EducationPanel', () => ({
  EducationPanel: () => <div data-testid="education-panel" />,
}));
vi.mock('./LinksPanel', () => ({
  LinksPanel: () => <div data-testid="links-panel" />,
}));
vi.mock('./SecurityPanel', () => ({
  SecurityPanel: ({ role = 'mentee' }: { role?: string }) => (
    <div data-testid="security-panel" data-role={role} />
  ),
}));

vi.mock('./ExpertisePanel', async () => {
  const { forwardRef } = await import('react');
  return {
    ExpertisePanel: forwardRef((_props, _ref) => <div data-testid="expertise-panel" />),
  };
});

vi.mock('./MentorProfilePanel', async () => {
  const { forwardRef } = await import('react');
  return {
    MentorProfilePanel: forwardRef((_props, _ref) => <div data-testid="mentor-profile-panel" />),
  };
});

vi.mock('./BookingPanel', async () => {
  const { forwardRef } = await import('react');
  return { BookingPanel: forwardRef(() => <div data-testid="booking-panel" />) };
});

const member = (isMentor = false) => ({ kind: 'member', id: 'u1', isMentor }) as unknown as Viewer;
const dialog = () => screen.queryByRole('alertdialog', { name: 'Save your changes?' });

beforeEach(() => {
  replace.mockReset();
  skipFocus.mockReset();
  push.mockReset();
  panel.save.mockReset();
  panel.discard.mockReset();
  panel.dirty = true;
  goals.save.mockReset();
  goals.discard.mockReset();
  goals.dirty = false;
  segment = 'profile';
  flags.onboarding = false;
  flags.mentor = false;
});

describe('SettingsScreen', () => {
  it('a mentee: the title, the tabs and the Profile panel', () => {
    viewer = member();
    render(<SettingsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-panel')).toBeInTheDocument();
  });

  it('choosing a tab keeps focus on it: the URL changes, the heading doesn’t take focus', async () => {
    viewer = member();
    segment = 'profile';
    panel.dirty = false;
    render(<SettingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: 'Education' }));
    expect(push).toHaveBeenCalledWith('/settings/education');
    expect(skipFocus).toHaveBeenCalledExactlyOnceWith('/settings/education');
  });

  it('the Education tab shows its panel', () => {
    viewer = member();
    segment = 'education';
    render(<SettingsScreen />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Profile',
      'Goals',
      'Education',
      'Login & security',
    ]);
    expect(screen.getByRole('tab', { name: 'Education' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('education-panel')).toBeInTheDocument();
  });

  it('Login and security: its tab, after Profile, and its panel', () => {
    viewer = member();
    segment = 'security';
    render(<SettingsScreen />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Profile',
      'Goals',
      'Education',
      'Login & security',
    ]);
    expect(screen.getByRole('tab', { name: 'Login & security' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('security-panel')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a tab this mentee doesn’t have goes to Profile', () => {
    viewer = member();
    segment = 'booking';
    render(<SettingsScreen />);
    expect(replace).toHaveBeenCalledWith('/settings/profile');
  });

  it('a mentor: their subline, the Booking rules tab and its panel', () => {
    viewer = member(true);
    segment = 'booking';
    render(<SettingsScreen />);
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.getByText('Manage how mentees book you and what they see on your profile.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Booking rules' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('booking-panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByTestId('profile-panel')).toBeNull();
  });

  it('a mentor’s Expertise tab, after Profile', () => {
    viewer = member(true);
    segment = 'expertise';
    render(<SettingsScreen />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Booking rules',
      'Profile',
      'Expertise',
      'Social links',
      'Login & security',
    ]);
    expect(screen.getByRole('tab', { name: 'Expertise' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('expertise-panel')).toBeInTheDocument();
  });

  it('a mentor’s Social links tab, after Expertise, with its panel', () => {
    viewer = member(true);
    segment = 'links';
    render(<SettingsScreen />);
    expect(screen.getByRole('tab', { name: 'Social links' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('links-panel')).toBeInTheDocument();
  });

  it('a mentor’s Profile tab is the mentor profile panel, not the mentee one', () => {
    viewer = member(true);
    segment = 'profile';
    render(<SettingsScreen />);
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mentor-profile-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-panel')).toBeNull();
  });

  it('a tab this mentor doesn’t have (a mentee one) goes to Booking rules', () => {
    viewer = member(true);
    segment = 'education';
    render(<SettingsScreen />);
    expect(replace).toHaveBeenCalledWith('/settings/booking');
    // A link to that tab is a navigation: focus moves as usual.
    expect(skipFocus).not.toHaveBeenCalled();
  });

  it('/settings itself opens the role’s first tab: Booking rules for a mentor', () => {
    viewer = member(true);
    segment = null;
    render(<SettingsScreen />);
    expect(replace).toHaveBeenCalledWith('/settings/booking');
    // A redirect, not a navigation: the heading doesn't take focus.
    expect(skipFocus).toHaveBeenCalledWith('/settings/booking');
  });

  it('a guest on /settings is asked to log in and brought back to Profile', () => {
    viewer = { kind: 'guest' };
    segment = null;
    render(<SettingsScreen />);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/settings/profile')}`,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('…and Profile for a mentee', () => {
    viewer = member();
    segment = null;
    render(<SettingsScreen />);
    expect(replace).toHaveBeenCalledWith('/settings/profile');
  });

  it('while the account loads: the title and a neutral skeleton, no role’s tabs or panel', () => {
    viewer = { kind: 'loading', signedIn: true } as Viewer;
    render(<SettingsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByText(/Manage how mentees book you/)).toBeNull();
    expect(screen.queryByText(/Your details, what you’re working toward/)).toBeNull();
    expect(screen.queryByTestId('profile-panel')).toBeNull();
    expect(screen.queryByTestId('booking-panel')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your settings');
    expect(replace).not.toHaveBeenCalled();
  });

  it('a guest: asked to log in, and brought back to this tab', () => {
    viewer = { kind: 'guest' };
    render(<SettingsScreen />);
    expect(screen.getByText('Log in to see your settings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/settings/profile')}`,
    );
  });

  describe('switching tabs with unsaved changes', () => {
    beforeEach(() => {
      viewer = member();
    });
    const toEducation = () => userEvent.click(screen.getByRole('tab', { name: 'Education' }));

    it('nothing unsaved: switches straight away', async () => {
      panel.dirty = false;
      render(<SettingsScreen />);
      await toEducation();
      expect(dialog()).toBeNull();
      expect(push).toHaveBeenCalledWith('/settings/education');
    });

    it('asks first; Keep editing stays', async () => {
      render(<SettingsScreen />);
      await toEducation();
      expect(dialog()).toHaveTextContent('Your changes on Profile haven’t been saved yet.');
      await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
      expect(dialog()).toBeNull();
      expect(push).not.toHaveBeenCalled();
    });

    it('Discard drops the edit and switches', async () => {
      render(<SettingsScreen />);
      await toEducation();
      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
      expect(panel.discard).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledWith('/settings/education');
      // The tab switch through the dialog keeps focus on the tab too.
      expect(skipFocus).toHaveBeenCalledWith('/settings/education');
    });

    it('Save and continue saves, then switches; a save that couldn’t go through stays', async () => {
      panel.save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      render(<SettingsScreen />);
      await toEducation();
      await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
      expect(dialog()).toBeNull();
      expect(push).not.toHaveBeenCalled();
      await toEducation();
      await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
      expect(push).toHaveBeenCalledWith('/settings/education');
      // The tab switch through the dialog keeps focus on the tab too.
      expect(skipFocus).toHaveBeenCalledWith('/settings/education');
    });

    it('from a tab with nothing to save, switching never asks', async () => {
      segment = 'education';
      render(<SettingsScreen />);
      await userEvent.click(screen.getByRole('tab', { name: 'Profile' }));
      expect(dialog()).toBeNull();
      expect(push).toHaveBeenCalledWith('/settings/profile');
    });

    it('Escape while the save runs doesn’t close it, so the switch can’t surprise anyone', async () => {
      let finish: (v: boolean) => void = () => {};
      panel.save.mockReturnValue(new Promise<boolean>((r) => (finish = r)));
      render(<SettingsScreen />);
      await toEducation();
      await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
      await userEvent.keyboard('{Escape}');
      expect(dialog()).not.toBeNull();
      await act(async () => finish(true));
      expect(push).toHaveBeenCalledWith('/settings/education');
    });
  });

  describe('the Goals tab', () => {
    beforeEach(() => {
      viewer = member();
    });

    it('sits after Profile, its panel kept in the page', () => {
      panel.dirty = false;
      render(<SettingsScreen />);
      const names = screen.getAllByRole('tab').map((t) => t.textContent);
      expect(names.slice(0, 2)).toEqual(['Profile', 'Goals']);
      expect(screen.getByTestId('goals-panel')).toBeInTheDocument();
    });

    it('leaving Goals with unsaved changes asks about Goals, and saves that panel', async () => {
      segment = 'goals';
      goals.dirty = true;
      goals.save.mockResolvedValue(true);
      render(<SettingsScreen />);
      await userEvent.click(screen.getByRole('tab', { name: 'Profile' }));
      expect(dialog()).toHaveTextContent('Your changes on Goals haven’t been saved yet.');
      await userEvent.click(within(dialog()!).getByRole('button', { name: 'Save and continue' }));
      expect(goals.save).toHaveBeenCalledOnce();
      expect(panel.save).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/settings/profile');
    });

    it('an unsaved edit on a hidden tab doesn’t stop a switch from a clean one', async () => {
      segment = 'goals';
      goals.dirty = false;
      panel.dirty = true;
      render(<SettingsScreen />);
      await userEvent.click(screen.getByRole('tab', { name: 'Education' }));
      expect(dialog()).toBeNull();
      expect(push).toHaveBeenCalledWith('/settings/education');
    });
  });
});

describe('the mentee’s tabs as shipped', () => {
  it('the PRD order: Profile, Goals, Education, Login and security', async () => {
    const real = await vi.importActual<typeof import('./tabs')>('./tabs');
    expect(real.MENTEE_TABS).toEqual(['profile', 'goals', 'education', 'security']);
  });

  it('a mentor’s Login and security: the last tab, its panel in mentor words', () => {
    viewer = member(true);
    segment = 'security';
    render(<SettingsScreen />);
    expect(screen.getAllByRole('tab').at(-1)).toHaveTextContent('Login & security');
    expect(screen.getByTestId('security-panel')).toHaveAttribute('data-role', 'mentor');
  });

  it('in review, Profile, Expertise and Social links are all there to edit (no review lock)', () => {
    viewer = { ...member(true), mentorStage: 'pending' } as Viewer;
    segment = 'profile';
    const { unmount } = render(<SettingsScreen />);
    expect(screen.getByTestId('mentor-profile-panel')).toBeInTheDocument();
    expect(screen.getByTestId('expertise-panel')).toBeInTheDocument();
    unmount();
    segment = 'links';
    render(<SettingsScreen />);
    expect(screen.getByTestId('links-panel')).toBeInTheDocument();
  });
});

describe('the setup lock in Settings (owner, 2026-10-20)', () => {
  beforeEach(() => {
    flags.onboarding = true;
    flags.mentor = true;
  });
  const tabs = () => screen.getAllByRole('tab').map((t) => t.getAttribute('aria-controls'));

  it.each([
    ['an unfinished mentee', viewers.menteeUnfinished, 'mentee'],
    ['a mentor who never sent their application', viewers.mentorUnfinished, 'mentor'],
    ['a mentor sign-up, not started', viewers.mentorSignup, 'mentor'],
  ] as const)('%s: Login and security only, nothing else mounted', (_who, v, role) => {
    viewer = v;
    segment = 'security';
    render(<SettingsScreen />);
    expect(tabs()).toEqual(['settings-security']);
    expect(screen.getByTestId('security-panel')).toHaveAttribute('data-role', role);
    expect(
      screen.getByText('Finish setting up to see the rest of your settings.'),
    ).toBeInTheDocument();
    for (const id of [
      'profile-panel',
      'goals-panel',
      'education-panel',
      'mentor-profile-panel',
      'expertise-panel',
      'links-panel',
      'booking-panel',
    ])
      expect(screen.queryByTestId(id)).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([null, 'profile', 'booking', 'goals'])(
    'an unfinished account opening %s goes to Login and security',
    (seg) => {
      for (const v of [viewers.menteeUnfinished, viewers.mentorUnfinished]) {
        replace.mockReset();
        viewer = v;
        segment = seg;
        const { unmount } = render(<SettingsScreen />);
        expect(replace).toHaveBeenCalledWith('/settings/security');
        unmount();
      }
    },
  );

  it('a declined mentor keeps Profile, Expertise, Social links, Login and security; no Booking rules', () => {
    viewer = viewers.mentorDeclined;
    segment = 'profile';
    render(<SettingsScreen />);
    expect(tabs()).toEqual([
      'settings-profile',
      'settings-expertise',
      'settings-links',
      'settings-security',
    ]);
    expect(screen.queryByTestId('booking-panel')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a declined mentor opening /settings or Booking rules lands on Profile', () => {
    for (const seg of [null, 'booking']) {
      replace.mockReset();
      viewer = viewers.mentorDeclined;
      segment = seg;
      const { unmount } = render(<SettingsScreen />);
      expect(replace).toHaveBeenCalledWith('/settings/profile');
      unmount();
    }
  });

  it.each([
    ['a mentor in review', viewers.mentorReview],
    ['an approved mentor', viewers.mentorApproved],
  ])('%s keeps every mentor tab, Booking rules first', (_who, v) => {
    viewer = v;
    segment = null;
    render(<SettingsScreen />);
    expect(tabs()).toEqual([
      'settings-booking',
      'settings-profile',
      'settings-expertise',
      'settings-links',
      'settings-security',
    ]);
    expect(replace).toHaveBeenCalledWith('/settings/booking');
  });

  it('a finished mentee keeps every mentee tab', () => {
    viewer = viewers.menteeFinished;
    render(<SettingsScreen />);
    expect(tabs()).toEqual([
      'settings-profile',
      'settings-goals',
      'settings-education',
      'settings-security',
    ]);
    expect(replace).not.toHaveBeenCalled();
  });
});
