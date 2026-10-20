import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import type { SocialRow } from '@/types/mentorSettings';
import { SocialLinksCard } from './SocialLinksCard';

const LINKEDIN: SocialRow = {
  id: 'linkedin',
  kind: 'linkedin',
  value: 'ada-obi',
  url: 'https://www.linkedin.com/in/ada-obi',
  mark: 'linkedin',
};
const YOUTUBE: SocialRow = {
  id: 'l1',
  kind: 'youtube',
  value: 'gradpath',
  url: 'https://www.youtube.com/@gradpath',
  mark: 'youtube',
};
const site = (id: string, url: string): SocialRow => ({
  id,
  kind: 'website',
  value: url.replace('https://', ''),
  url,
  mark: 'website',
});

function setup(props: Partial<ComponentProps<typeof SocialLinksCard>> = {}) {
  const onSave = vi.fn(async () => true);
  const onRemove = vi.fn();
  const onRetry = vi.fn();
  render(
    <SocialLinksCard
      status="ready"
      rows={[LINKEDIN, YOUTUBE]}
      onRetry={onRetry}
      onSave={onSave}
      saving={false}
      saveError={null}
      onRemove={onRemove}
      {...props}
    />,
  );
  return { onSave, onRemove, onRetry, user: userEvent.setup() };
}

describe('SocialLinksCard', () => {
  it('a row per link: its mark’s name, the link without https://www., Edit and Remove', () => {
    setup();
    const card = screen.getByRole('region', { name: 'Social links' });
    const rows = within(card).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('LinkedIn');
    expect(rows[0]).toHaveTextContent('linkedin.com/in/ada-obi');
    expect(rows[1]).toHaveTextContent('youtube.com/@gradpath');
    expect(screen.getByRole('button', { name: 'Edit YouTube' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove LinkedIn' })).toBeInTheDocument();
  });

  it('no links: the design’s line, and Add link still in the header', () => {
    setup({ rows: [] });
    expect(
      screen.getByText('No links yet. Add LinkedIn so mentees can see your background.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add link' })).toBeInTheDocument();
  });

  it('a failed load says so with Try again, never "no links"', async () => {
    const { onRetry, user } = setup({ status: 'error', rows: [] });
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your links');
    expect(screen.queryByText(/No links yet/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('adding: pick a platform, paste the full link, and it saves the handle', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    const group = screen.getByRole('radiogroup', { name: 'Platform' });
    // One per platform: LinkedIn and YouTube are already there.
    expect(within(group).getByRole('radio', { name: 'LinkedIn' })).toBeDisabled();
    expect(within(group).getByRole('radio', { name: 'YouTube' })).toBeDisabled();
    // Focus lands on the first free platform.
    expect(within(group).getByRole('radio', { name: 'X' })).toHaveFocus();
    await user.click(within(group).getByRole('radio', { name: 'Instagram' }));
    const field = screen.getByLabelText('Instagram handle');
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription('You can paste the full link too');
    await user.paste('https://www.instagram.com/ada.l/');
    expect(field).toHaveValue('ada.l');
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    // While the form is open its own Add link is the only one.
    expect(onSave).toHaveBeenCalledWith({ kind: 'instagram', value: 'ada.l', id: null });
  });

  it('the arrow keys move through the free platforms and pick one', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Instagram' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Instagram' })).toHaveFocus();
  });

  it('a handle with a space or slash: the note says so and Add link stays off', async () => {
    const { user } = setup({ rows: [] });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('radio', { name: 'X' }));
    await user.type(screen.getByLabelText('X handle'), 'ada l');
    expect(screen.getByLabelText('X handle')).toHaveAccessibleDescription(
      'Enter the handle only, without spaces or slashes',
    );
    expect(screen.getByLabelText('X handle')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Add link' })).toBeDisabled();
  });

  it('a website on Medium: “Looks like Medium”, saved as a website', async () => {
    const { onSave, user } = setup({ rows: [] });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('radio', { name: 'Website' }));
    await user.type(screen.getByLabelText('Website address'), 'ada.medium.com');
    expect(screen.getByLabelText('Website address')).toHaveAccessibleDescription(
      'Looks like Medium. We’ll show its icon.',
    );
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith({ kind: 'website', value: 'ada.medium.com', id: null });
  });

  it('a website that is really X saves as X, when X is free', async () => {
    const { onSave, user } = setup({ rows: [] });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('radio', { name: 'Website' }));
    await user.type(screen.getByLabelText('Website address'), 'x.com/ada_l');
    expect(screen.getByText('Looks like X. We’ll show its icon.')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith({ kind: 'x', value: 'ada_l', id: null });
  });

  it('three websites: Website can’t be picked again', async () => {
    const { user } = setup({
      rows: [site('w1', 'https://a.dev'), site('w2', 'https://b.dev'), site('w3', 'https://c.dev')],
    });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    expect(screen.getByRole('radio', { name: 'Website' })).toBeDisabled();
    // Each website's controls say which one.
    expect(screen.getByRole('button', { name: 'Edit Website, b.dev' })).toBeInTheDocument();
  });

  it('editing: no picker, the field filled, Save link sends the change', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit YouTube' }));
    expect(screen.queryByRole('radiogroup')).toBeNull();
    const field = screen.getByLabelText('YouTube handle');
    expect(field).toHaveValue('gradpath');
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, 'gradpathwithada');
    await user.click(screen.getByRole('button', { name: 'Save link' }));
    expect(onSave).toHaveBeenCalledWith({ kind: 'youtube', value: 'gradpathwithada', id: 'l1' });
  });

  it('a refused save says why; Cancel and Escape close the form', async () => {
    const { user } = setup({ saveError: 'You can add up to 3 websites.' });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('You can add up to 3 websites.');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('radiogroup')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Edit LinkedIn' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('LinkedIn handle')).toBeNull();
  });

  it('a save that fails keeps the form open', async () => {
    const onSave = vi.fn(async () => false);
    const user = userEvent.setup();
    render(
      <SocialLinksCard
        status="ready"
        rows={[YOUTUBE]}
        onRetry={vi.fn()}
        onSave={onSave}
        saving={false}
        saveError={null}
        onRemove={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Edit YouTube' }));
    await user.click(screen.getByRole('button', { name: 'Save link' }));
    expect(screen.getByLabelText('YouTube handle')).toBeInTheDocument();
  });

  it('in review: LinkedIn’s Remove is locked and says why; Edit still works', async () => {
    const lock = 'You can edit LinkedIn, but not remove it, while we review your application.';
    const { onRemove, user } = setup({ linkedInLock: lock });
    const remove = screen.getByRole('button', { name: 'Remove LinkedIn' });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveAccessibleDescription(lock);
    await user.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
    // Other links aren't locked.
    await user.click(screen.getByRole('button', { name: 'Remove YouTube' }));
    expect(onRemove).toHaveBeenCalledWith(YOUTUBE);
    await user.click(screen.getByRole('button', { name: 'Edit LinkedIn' }));
    expect(screen.getByLabelText('LinkedIn handle')).toHaveValue('ada-obi');
  });

  it('Remove hands the row to the page (it confirms)', async () => {
    const { onRemove, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Remove YouTube' }));
    expect(onRemove).toHaveBeenCalledWith(YOUTUBE);
  });

  it('while it loads: a busy status, no rows and no Add link', () => {
    setup({ status: 'loading', rows: [] });
    expect(screen.getByRole('status', { name: 'Loading your links' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Add link' })).toBeNull();
  });

  it.each([
    'x.com/i/lists/1',
    'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv',
    'instagram.com/p/abc',
    'facebook.com/groups/foo',
  ])('a website on a platform that names no handle (%s) stays a website', async (url) => {
    const { onSave, user } = setup({ rows: [] });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('radio', { name: 'Website' }));
    await user.type(screen.getByLabelText('Website address'), url);
    expect(screen.queryByText(/Looks like/)).toBeNull();
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith({ kind: 'website', value: url, id: null });
  });

  it('Cancel and Escape put focus back on what opened the form', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Add link' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Edit YouTube' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Edit YouTube' })).toHaveFocus();
  });

  it('opening, closing or switching platform tells the page (an old error goes)', async () => {
    const onFormChange = vi.fn();
    const { user } = setup({ onFormChange });
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    expect(onFormChange).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('radio', { name: 'X' }));
    expect(onFormChange).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onFormChange).toHaveBeenCalledTimes(3);
  });

  it('after arrowing through the picker, Edit still focuses its field', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.keyboard('{ArrowRight}{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Edit YouTube' }));
    expect(screen.getByLabelText('YouTube handle')).toHaveFocus();
  });

  it('every platform used (and three websites): no Add link, nothing to pick', () => {
    const k = (kind: SocialRow['kind'], id: string): SocialRow => ({
      id,
      kind,
      value: 'ada',
      url: `https://${id}.dev`,
      mark: kind,
    });
    setup({
      rows: [
        LINKEDIN,
        YOUTUBE,
        k('x', 'x1'),
        k('instagram', 'i1'),
        k('facebook', 'f1'),
        k('tiktok', 't1'),
        site('w1', 'https://a.dev'),
        site('w2', 'https://b.dev'),
        site('w3', 'https://c.dev'),
      ],
    });
    expect(screen.queryByRole('button', { name: 'Add link' })).toBeNull();
    // Editing still works.
    expect(screen.getByRole('button', { name: 'Edit X' })).toBeInTheDocument();
  });
});
