import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mentor } from '@/types/mentor';
import { MoreTopics } from './MoreTopics';

const phone = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/utils/useMediaQuery', () => ({ useMediaQuery: () => phone.value }));

const mentor = {
  id: 'm1',
  firstName: 'Ada',
  profileHref: '/mentors/ada',
  topics: ['a', 'b', 'c', 'd'].map((x) => ({ slug: x, label: `Topic ${x}` })),
} as Mentor;

const renderIt = (onOpenSheet?: (m: Mentor) => void) =>
  render(
    <div>
      <ul>
        <MoreTopics mentor={mentor} hidden={1} onOpenSheet={onOpenSheet} />
      </ul>
      <p>Outside</p>
    </div>,
  );

describe('MoreTopics', () => {
  afterEach(() => {
    phone.value = false;
  });

  it('on phones, asks the page for its sheet instead of opening the popover', async () => {
    phone.value = true;
    const onOpenSheet = vi.fn();
    renderIt(onOpenSheet);
    const more = screen.getByRole('button', { name: /^\+1: show all 4 areas Ada helps with/ });
    expect(more).toHaveAttribute('aria-haspopup', 'dialog');
    expect(more).not.toHaveAttribute('aria-expanded');
    await userEvent.click(more);
    expect(onOpenSheet).toHaveBeenCalledWith(mentor);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('on phones without a sheet, falls back to the popover', async () => {
    phone.value = true;
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: /show all/ }));
    expect(screen.getByRole('region', { name: 'Ada can help with' })).toBeInTheDocument();
  });

  it('closes on a click outside', async () => {
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: /show all/ }));
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(screen.queryByRole('region')).toBeNull();
  });
});
