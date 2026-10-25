import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft } from '@/lib/utils/sessionTypeDraft';
import { CoreDetailsStep } from './CoreDetailsStep';

const group = () => screen.getByRole('group', { name: 'Best for mentees who are' });
const chips = () =>
  within(group())
    .getAllByRole('button')
    .map((b) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? ' ✓' : ''}`);

describe('CoreDetailsStep: a stage the API sent that isn’t a chip yet', () => {
  it('shows it picked, so it can be seen and unpicked (GitHub review, PR 390)', async () => {
    const update = vi.fn();
    render(
      <CoreDetailsStep
        draft={{ ...blankDraft(), stages: ['applying', 'revisions'] }}
        update={update}
        errors={{}}
        topics={[]}
      />,
    );
    expect(chips()).toEqual([
      'Exploring',
      'Drafting',
      'Submitted, waiting',
      'Revising ✓',
      'Interviewing',
      'Applying ✓',
    ]);
    await userEvent.click(within(group()).getByRole('button', { name: 'Applying' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ stages: ['revisions'] }));
  });

  it('one with the same words as an old chip replaces it: never two alike (review r2)', () => {
    render(
      <CoreDetailsStep
        draft={{ ...blankDraft(), stages: ['exploring'] }}
        update={vi.fn()}
        errors={{}}
        topics={[]}
      />,
    );
    expect(chips()).toEqual([
      'Drafting',
      'Submitted, waiting',
      'Revising',
      'Interviewing',
      'Exploring ✓',
    ]);
    expect(within(group()).getAllByRole('button', { name: 'Exploring' })).toHaveLength(1);
  });

  it('old and new with the same words both saved: one chip, and unpicking it clears both (review r3)', async () => {
    const update = vi.fn();
    render(
      <CoreDetailsStep
        draft={{ ...blankDraft(), stages: ['early_exploration', 'revisions', 'exploring'] }}
        update={update}
        errors={{}}
        topics={[]}
      />,
    );
    expect(chips()).toEqual([
      'Drafting',
      'Submitted, waiting',
      'Revising ✓',
      'Interviewing',
      'Exploring ✓',
    ]);
    await userEvent.click(within(group()).getByRole('button', { name: 'Exploring' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ stages: ['revisions'] }));
  });
});
