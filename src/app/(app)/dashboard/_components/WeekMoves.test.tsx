import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekMoves } from './WeekMoves';

const all = ['share', 'about', 'hours'] as const;

function setup(done: ('share' | 'about' | 'hours')[] = []) {
  const onMark = vi.fn();
  const onCopyLink = vi.fn();
  render(
    <WeekMoves
      moves={all}
      done={done}
      showCounter
      profileHref="/mentors/gbenga"
      onMark={onMark}
      onCopyLink={onCopyLink}
    />,
  );
  return { onMark, onCopyLink };
}

// Links in jsdom would navigate; the handler is what's under test.
const noNav = (e: MouseEvent) => e.preventDefault();
beforeEach(() => document.addEventListener('click', noNav));
afterEach(() => document.removeEventListener('click', noNav));

describe('WeekMoves', () => {
  it('Copy link copies (the screen marks Share done once it lands)', async () => {
    const { onCopyLink, onMark } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopyLink).toHaveBeenCalled();
    expect(onMark).not.toHaveBeenCalled();
  });

  it('Edit About marks the move and opens the profile', async () => {
    const { onMark } = setup();
    const link = screen.getByRole('link', { name: 'Edit About' });
    expect(link).toHaveAttribute('href', '/mentors/gbenga');
    await userEvent.click(link);
    expect(onMark).toHaveBeenCalledWith('about');
  });

  it('Add hours marks the move and opens Calendar', async () => {
    const { onMark } = setup();
    const link = screen.getByRole('link', { name: 'Add hours' });
    expect(link).toHaveAttribute('href', '/calendar');
    await userEvent.click(link);
    expect(onMark).toHaveBeenCalledWith('hours');
  });

  it('counts the moves done this week', () => {
    setup(['share', 'hours']);
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
    expect(screen.getAllByText('Done this week')).toHaveLength(2);
  });
});
