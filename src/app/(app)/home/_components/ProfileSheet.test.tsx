import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GOALS_HREF, ProfileSheet } from './ProfileSheet';
import type { ProfileField } from './newMentee';

const FIELDS: ProfileField[] = [
  {
    key: 'target',
    label: 'What you’re applying for',
    value: 'Master’s in Public Health, United Kingdom',
  },
  { key: 'help', label: 'What you need help with', value: 'Scholarships & funding' },
  { key: 'education', label: 'Education', value: null },
  { key: 'bio', label: 'Short bio', value: 'I want a funded Master’s.', drafted: true },
];

const render_ = (fields = FIELDS, onSaveBio = vi.fn().mockResolvedValue(null)) => {
  const props = {
    fields,
    onEducation: vi.fn(),
    onSaveBio,
    bioSaving: false,
    onChoose: vi.fn(),
    onClose: vi.fn(),
  };
  render(<ProfileSheet {...props} />);
  return props;
};

describe('ProfileSheet', () => {
  it('counts the four details and names the next one', () => {
    render_();
    expect(screen.getByRole('dialog', { name: 'Your profile' })).toBeInTheDocument();
    expect(screen.getByText('3 of 4 done')).toBeInTheDocument();
    expect(screen.getByText('Next: education')).toBeInTheDocument();
    expect(screen.getByText('Add your most recent education')).toBeInTheDocument();
    // The unedited draft says so.
    expect(screen.getByText('Short bio · drafted for you, review it')).toBeInTheDocument();
  });

  it('the goal rows open Settings › Goals; Education opens its editor', async () => {
    const p = render_();
    expect(screen.getByRole('link', { name: 'Edit what you’re applying for' })).toHaveAttribute(
      'href',
      GOALS_HREF,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add education' }));
    expect(p.onEducation).toHaveBeenCalled();
  });

  it('edits the bio in place with the shared editor; saving puts focus back on Edit', async () => {
    const p = render_();
    await userEvent.click(screen.getByRole('button', { name: 'Edit short bio' }));
    const box = screen.getByRole('textbox', { name: /Short bio/ });
    expect(box).toHaveFocus();
    await userEvent.clear(box);
    await userEvent.type(box, 'New bio');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    // Edited by hand: no longer the draft.
    expect(p.onSaveBio).toHaveBeenCalledWith('New bio', false);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit short bio' })).toHaveFocus();
  });

  it('a failed save keeps the text and says why', async () => {
    render_(FIELDS, vi.fn().mockResolvedValue('You’re offline. Your bio wasn’t saved.'));
    await userEvent.click(screen.getByRole('button', { name: 'Edit short bio' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You’re offline. Your bio wasn’t saved.',
    );
    expect(screen.getByRole('textbox', { name: /Short bio/ })).toHaveValue(
      'I want a funded Master’s.',
    );
  });

  it('all four done: Ready for your first session, and Choose your mentor', async () => {
    const done = FIELDS.map((f) => ({ ...f, value: f.value ?? 'BSc · Lagos · 2024' }));
    const p = render_(done);
    expect(screen.getByText('Ready for your first session')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choose your mentor' }));
    expect(p.onChoose).toHaveBeenCalled();
  });
});
