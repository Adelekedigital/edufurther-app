import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, replace, saveAbout, saveIntro, state } from './profileScreen.harness';
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
vi.mock('@/lib/api/data/avatar', async () =>
  (await import('./profileScreen.harness')).mocks.avatar(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);

const own = { ...fullProfile, owner: { approval: 'approved' as const, listed: true } };

describe('MentorProfileScreen — the owner edits their profile', () => {
  it('"Edit profile" opens the name and headline form in place of the intro, and Save sends it', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const form = screen.getByRole('form', { name: 'Edit your name and headline' });
    // The page keeps its title while the form is open.
    expect(screen.getByRole('heading', { level: 1, name: own.mentor.name })).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: 'First name' })).toHaveValue('Gbenga');
    expect(within(form).getByRole('textbox', { name: 'Last name' })).toHaveValue('Elufisan');
    const headline = within(form).getByRole('textbox', { name: 'Headline' });
    await user.clear(headline);
    await user.type(headline, 'MSc Sociology');
    await user.click(within(form).getByRole('button', { name: 'Save' }));
    expect(saveIntro).toHaveBeenCalledWith(
      { firstName: 'Gbenga', lastName: 'Elufisan', headline: own.headline },
      { firstName: 'Gbenga', lastName: 'Elufisan', headline: 'MSc Sociology' },
    );
    // Saved: the form closes and focus returns to "Edit profile".
    expect(screen.queryByRole('form', { name: 'Edit your name and headline' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toHaveFocus();
  });

  it('a failed save keeps the form open with its errors', async () => {
    h.profile = state({ data: own });
    h.editOk = false;
    h.introErrors = { general: 'That didn’t save. Try again.' };
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveIntro).toHaveBeenCalled();
    expect(screen.getByRole('form', { name: 'Edit your name and headline' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('That didn’t save. Try again.');
  });

  it('About: "Edit" opens the editor, Save sends the text, focus comes back', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    const box = screen.getByRole('textbox', { name: 'About' });
    await user.type(box, ' More.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveAbout).toHaveBeenCalledWith(`${own.about} More.`);
    expect(screen.queryByRole('textbox', { name: 'About' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit About' })).toHaveFocus();
  });

  it('a refetch while the form is open doesn’t change what the save compares against', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    // Another tab changed the headline meanwhile.
    h.profile = state({ data: { ...own, headline: 'Changed elsewhere' } });
    rerender(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const [beforeArg] = saveIntro.mock.calls[0]!;
    expect(beforeArg).toMatchObject({ headline: own.headline });
  });

  it('leaving Overview closes the About editor', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    expect(screen.getByRole('textbox', { name: 'About' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Sessions/ }));
    expect(screen.queryByRole('textbox', { name: 'About' })).toBeNull();
  });

  it('an empty About invites the owner to write one', () => {
    h.profile = state({ data: { ...own, about: null } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/Tell mentees about your path/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit About' })).toBeInTheDocument();
  });

  it('visitors get no edit controls', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit About' })).toBeNull();
  });

  describe('a tab switch with unsaved About text asks first (#134)', () => {
    const typeAndSwitch = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Edit About' }));
      await user.type(screen.getByRole('textbox', { name: 'About' }), ' More.');
      await user.click(screen.getByRole('tab', { name: /Sessions/ }));
      return screen.getByRole('dialog', { name: 'Discard your changes?' });
    };

    it('"Keep editing" stays on Overview with the text', async () => {
      h.profile = state({ data: own });
      const user = userEvent.setup();
      render(<MentorProfileScreen handle="gbenga" />);
      const dialog = await typeAndSwitch(user);
      expect(dialog).toHaveTextContent('Your changes to your About section won’t be saved.');
      expect(replace).not.toHaveBeenCalled();
      await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('textbox', { name: 'About' })).toHaveValue(`${own.about} More.`);
      expect(replace).not.toHaveBeenCalled();
    });

    it('"Discard" closes the editor and switches', async () => {
      h.profile = state({ data: own });
      const user = userEvent.setup();
      render(<MentorProfileScreen handle="gbenga" />);
      const dialog = await typeAndSwitch(user);
      await user.click(within(dialog).getByRole('button', { name: 'Discard' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByRole('textbox', { name: 'About' })).toBeNull();
      expect(replace).toHaveBeenCalled();
      expect(saveAbout).not.toHaveBeenCalled();
    });
  });
});
