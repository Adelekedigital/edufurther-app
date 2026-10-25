import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft } from '@/lib/utils/sessionTypeDraft';
import { CoreDetailsStep } from './CoreDetailsStep';

describe('CoreDetailsStep: a stage the API sent that isn’t a chip yet', () => {
  it('shows it picked, so it can be seen and unpicked (GitHub review, PR 390)', async () => {
    const update = vi.fn();
    render(
      <CoreDetailsStep
        draft={{ ...blankDraft(), stages: ['exploring', 'revisions'] }}
        update={update}
        errors={{}}
        topics={[]}
      />,
    );
    const group = screen.getByRole('group', { name: 'Best for mentees who are' });
    // "Exploring" is both an old chip's words and a new stage's: the new one is the picked one.
    const picked = within(group)
      .getAllByRole('button', { pressed: true })
      .map((b) => b.textContent);
    expect(picked).toEqual(['Revising', 'Exploring']);
    await userEvent.click(within(group).getAllByRole('button', { name: 'Exploring' })[1]!);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ stages: ['revisions'] }));
  });
});
