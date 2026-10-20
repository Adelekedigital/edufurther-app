import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
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

let viewer: Viewer;
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

// A second tab, so the tab-switch guard can be reached before Goals ships.
vi.mock('./tabs', () => ({ MENTEE_TABS: ['profile', 'education'], DEFAULT_TAB: 'profile' }));

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

const member = (isMentor = false) => ({ kind: 'member', id: 'u1', isMentor }) as unknown as Viewer;
const dialog = () => screen.queryByRole('alertdialog', { name: 'Save your changes?' });

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  panel.save.mockReset();
  panel.discard.mockReset();
  panel.dirty = true;
  segment = 'profile';
});

describe('SettingsScreen', () => {
  it('a mentee: the title, the tabs and the Profile panel', () => {
    viewer = member();
    render(<SettingsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('profile-panel')).toBeInTheDocument();
  });

  it('a tab this mentee doesn’t have goes to Profile', () => {
    viewer = member();
    segment = 'booking';
    render(<SettingsScreen />);
    expect(replace).toHaveBeenCalledWith('/settings/profile');
  });

  it('a mentor: the 404 they get today, until Mentor Settings ships', () => {
    viewer = member(true);
    expect(() => render(<SettingsScreen />)).toThrow('NEXT_NOT_FOUND');
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
});
