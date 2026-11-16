import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingPill } from './FloatingPill';

const box = () => screen.getByRole('button', { name: 'Act' }).parentElement!;

describe('FloatingPill', () => {
  it('places what it holds at the bottom it is given, centred by default', () => {
    render(
      <FloatingPill bottom="calc(72px + env(safe-area-inset-bottom))">
        <button type="button">Act</button>
      </FloatingPill>,
    );
    expect(box()).toHaveClass('float');
    expect(box()).not.toHaveClass('corner');
    expect(box().style.getPropertyValue('--pill-bottom')).toBe(
      'calc(72px + env(safe-area-inset-bottom))',
    );
  });

  it('docks to the corner, and drops the bottom transition while tracking', () => {
    render(
      <FloatingPill bottom="24px" dock="corner" tracking className="extra">
        <button type="button">Act</button>
      </FloatingPill>,
    );
    expect(box()).toHaveClass('float', 'corner', 'tracking', 'extra');
  });

  it('adds no role or name of its own: the control inside is what is heard', () => {
    render(
      <FloatingPill bottom="24px">
        <button type="button">Act</button>
      </FloatingPill>,
    );
    expect(box()).not.toHaveAttribute('role');
    expect(box()).not.toHaveAttribute('aria-label');
    // Its stable hook for tests and page checks.
    expect(box()).toHaveAttribute('data-floating-pill');
  });

  it('a swap inside that drops the focused control carries focus to its replacement', () => {
    const { rerender } = render(
      <FloatingPill bottom="24px">
        <button type="button">Full</button>
      </FloatingPill>,
    );
    screen.getByRole('button', { name: 'Full' }).focus();
    rerender(
      <FloatingPill bottom="24px">
        <button type="button">Mini</button>
      </FloatingPill>,
    );
    expect(screen.getByRole('button', { name: 'Mini' })).toHaveFocus();
  });

  it('leaving while it holds focus hands focus to onFocusLost, never to body', () => {
    const Page = ({ shown }: { shown: boolean }) => (
      <>
        <button type="button">Card</button>
        {shown && (
          <FloatingPill
            bottom="24px"
            onFocusLost={() => screen.getByRole('button', { name: 'Card' }).focus()}
          >
            <button type="button">Act</button>
          </FloatingPill>
        )}
      </>
    );
    const { rerender } = render(<Page shown />);
    screen.getByRole('button', { name: 'Act' }).focus();
    rerender(<Page shown={false} />);
    expect(screen.getByRole('button', { name: 'Card' })).toHaveFocus();
  });

  it('leaving without focus moves nothing', async () => {
    const onFocusLost = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        <FloatingPill bottom="24px" onFocusLost={onFocusLost}>
          <button type="button">Act</button>
        </FloatingPill>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    rerender(<button type="button">Elsewhere</button>);
    expect(onFocusLost).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });
});
