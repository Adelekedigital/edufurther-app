import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SocialRow } from '@/types/mentorSettings';

const YOUTUBE: SocialRow = {
  id: 'l1',
  kind: 'youtube',
  value: 'gradpath',
  url: 'https://www.youtube.com/@gradpath',
  mark: 'youtube',
};
const LINKEDIN: SocialRow = {
  id: 'linkedin',
  kind: 'linkedin',
  value: 'ada-obi',
  url: 'https://www.linkedin.com/in/ada-obi',
  mark: 'linkedin',
};
const h = vi.hoisted(() => ({
  rows: [] as unknown[],
  save: vi.fn(),
  remove: vi.fn(),
  saveError: null as string | null,
  removeError: null as string | null,
}));
vi.mock('@/lib/api/data/links', () => ({
  useMyLinks: () => ({ rows: h.rows, status: 'ready', retry: vi.fn(), retrying: false }),
  useSaveSocial: () => ({
    save: h.save,
    isPending: false,
    error: h.saveError,
    reset: vi.fn(),
  }),
  useRemoveSocial: () => ({
    remove: h.remove,
    isPending: false,
    error: h.removeError,
    reset: vi.fn(),
  }),
}));

import { LinksPanel } from './LinksPanel';

beforeEach(() => {
  h.rows = [YOUTUBE];
  h.save.mockReset();
  h.remove.mockReset();
  h.saveError = null;
  h.removeError = null;
});

describe('LinksPanel', () => {
  it('a saved link: the form closes and “Link added” is said', async () => {
    h.save.mockResolvedValue(YOUTUBE);
    const user = userEvent.setup();
    render(<LinksPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('radio', { name: 'X' }));
    await user.type(screen.getByLabelText('X handle'), 'ada_l{Enter}');
    expect(h.save).toHaveBeenCalledWith({ kind: 'x', value: 'ada_l', id: null });
    expect(await screen.findByText('Link added')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    // Focus goes back to Add link, not the page.
    expect(screen.getByRole('button', { name: 'Add link' })).toHaveFocus();
  });

  it('a refused save keeps the form and its words', async () => {
    h.save.mockRejectedValue({ copy: 'x' });
    h.saveError = 'You’ve already added X. Edit that one instead.';
    const user = userEvent.setup();
    render(<LinksPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Edit YouTube' }));
    await user.click(screen.getByRole('button', { name: 'Save link' }));
    expect(screen.getByLabelText('YouTube handle')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('already added X');
  });

  it('LinkedIn edits and removes like any other link (no review lock)', async () => {
    h.rows = [LINKEDIN, YOUTUBE];
    h.save.mockResolvedValue(LINKEDIN);
    const user = userEvent.setup();
    render(<LinksPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Edit LinkedIn' }));
    await user.click(screen.getByRole('button', { name: 'Save link' }));
    expect(await screen.findByText('Link updated')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove LinkedIn' }));
    expect(screen.getByRole('alertdialog', { name: 'Remove this profile?' })).toBeInTheDocument();
  });

  it('Remove asks first: “Remove this profile?”, Keep it keeps it', async () => {
    const user = userEvent.setup();
    render(<LinksPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Remove YouTube' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Remove this profile?' });
    expect(dialog).toHaveTextContent('Your YouTube icon will be removed from your profile.');
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(h.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Remove removes it and says “Profile removed”', async () => {
    h.remove.mockResolvedValue('l1');
    const user = userEvent.setup();
    render(<LinksPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Remove YouTube' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(h.remove).toHaveBeenCalledWith(YOUTUBE);
    expect(await screen.findByText('Profile removed')).toBeInTheDocument();
  });
});
