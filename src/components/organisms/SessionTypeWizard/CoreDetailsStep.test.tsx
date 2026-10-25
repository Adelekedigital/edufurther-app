import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft } from '@/lib/utils/sessionTypeDraft';
import { CoreDetailsStep } from './CoreDetailsStep';

const group = () => screen.getByRole('group', { name: 'Best for mentees who are' });
const chips = () =>
  within(group())
    .getAllByRole('button')
    .map((b) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? ' ✓' : ''}`);

describe('CoreDetailsStep: "Best for mentees who are…"', () => {
  it('the design’s six chips, a saved stage shown picked, each once', async () => {
    const update = vi.fn();
    render(
      <CoreDetailsStep
        draft={{ ...blankDraft(), stages: ['applying', 'exploring'] }}
        update={update}
        errors={{}}
        topics={[]}
      />,
    );
    expect(chips()).toEqual([
      'Exploring ✓',
      'Researching schools & scholarships',
      'Preparing documents',
      'Applying ✓',
      'Preparing for interview',
      'Waiting for a decision',
    ]);
    await userEvent.click(within(group()).getByRole('button', { name: 'Applying' }));
    expect(update).toHaveBeenCalledWith({ stages: ['exploring'] });
  });
});
