import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OwnSessionType } from '@/types/sessionType';
import {
  DeleteConfirm,
  FeatureConfirm,
  VisibilityConfirm,
  type ConfirmShell,
} from './SessionTypeConfirms';

// The page frames it in ModalShell; here a dialog with the title and subtitle.
const renderShell = (s: ConfirmShell, body: ReactNode) => (
  <div role="dialog" aria-label={s.title} data-tone={s.tone ?? ''} data-icon={s.icon}>
    <p>{s.subtitle}</p>
    <button type="button" onClick={s.onClose}>
      Close
    </button>
    {body}
  </div>
);

const T = (over: Partial<OwnSessionType> = {}): OwnSessionType => ({
  id: 'a',
  name: 'SOP draft review',
  description: '',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  stages: [],
  topics: [],
  icon: 'edit_document',
  iconChoice: null,
  questionCount: 0,
  isFeatured: false,
  pendingDeletion: null,
  booked: { count: 0, lastEndsAt: null },
  ...over,
});

describe('DeleteConfirm', () => {
  const props = { renderShell, busy: false, error: null, onKeep: vi.fn(), onDelete: vi.fn() };

  it('deletes outright when nothing is booked', async () => {
    const onDelete = vi.fn();
    render(<DeleteConfirm {...props} type={T()} onDelete={onDelete} />);
    expect(screen.getByRole('dialog', { name: 'Delete this session type?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('schedules the deletion after the last booked session, and says featuring stops', () => {
    render(
      <DeleteConfirm
        {...props}
        type={T({ isFeatured: true, booked: { count: 2, lastEndsAt: '2026-10-14T12:00:00Z' } })}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Schedule deletion for Oct 14?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The 2 booked sessions go ahead first\. It also stops being featured\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule deletion' })).toBeInTheDocument();
  });

  it('one booked session, and no end time yet: "Schedule deletion?"', () => {
    render(<DeleteConfirm {...props} type={T({ booked: { count: 1, lastEndsAt: null } })} />);
    expect(screen.getByRole('dialog', { name: 'Schedule deletion?' })).toBeInTheDocument();
    expect(screen.getByText(/The 1 booked session goes ahead first\.$/)).toBeInTheDocument();
  });

  it('marks the delete button busy while it runs', () => {
    render(<DeleteConfirm {...props} busy type={T()} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('aria-busy', 'true');
  });

  it('is framed as danger, and closing the frame keeps it', async () => {
    const onKeep = vi.fn();
    render(<DeleteConfirm {...props} type={T()} onKeep={onKeep} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-tone', 'danger');
    expect(screen.getByRole('dialog')).toHaveAttribute('data-icon', 'delete');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onKeep).toHaveBeenCalledOnce();
  });

  it('shows a refused delete as an alert, and Keep it closes', async () => {
    const onKeep = vi.fn();
    render(
      <DeleteConfirm
        {...props}
        type={T()}
        onKeep={onKeep}
        error={{ kind: 'validation', message: 'We couldn’t delete it. Try again.' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t delete it. Try again.');
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(onKeep).toHaveBeenCalledOnce();
  });
});

describe('FeatureConfirm', () => {
  it('names the type losing the feature', async () => {
    const onConfirm = vi.fn();
    render(
      <FeatureConfirm
        renderShell={renderShell}
        type={T()}
        current={T({ id: 'b', name: 'Visa interview prep' })}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Feature “SOP draft review” instead?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/“Visa interview prep” will no longer be featured/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Feature this instead' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('is not framed as danger, and closing the frame cancels', async () => {
    const onCancel = vi.fn();
    render(
      <FeatureConfirm
        renderShell={renderShell}
        type={T()}
        current={T({ id: 'b', name: 'Visa interview prep' })}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-tone', '');
    expect(screen.getByRole('dialog')).toHaveAttribute('data-icon', 'star');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('VisibilityConfirm', () => {
  const props = { renderShell, type: T(), onCancel: vi.fn(), onConfirm: vi.fn() };

  it('show, not framed as danger; closing the frame cancels', async () => {
    const onCancel = vi.fn();
    render(<VisibilityConfirm {...props} onCancel={onCancel} show last={false} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-tone', '');
    expect(screen.getByRole('dialog')).toHaveAttribute('data-icon', 'visibility');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('dialog', { name: 'Show “SOP draft review” to mentees?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show it' })).toBeInTheDocument();
  });

  it('hide, and hiding the last visible type warns about "Not taking bookings"', () => {
    const { unmount } = render(<VisibilityConfirm {...props} show={false} last={false} />);
    expect(
      screen.getByRole('dialog', { name: 'Hide “SOP draft review” from mentees?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep visible' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-icon', 'visibility_off');
    unmount();
    render(<VisibilityConfirm {...props} show={false} last />);
    expect(
      screen.getByRole('dialog', { name: 'Hide your last session type?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/“Not taking bookings”/)).toBeInTheDocument();
  });
});
