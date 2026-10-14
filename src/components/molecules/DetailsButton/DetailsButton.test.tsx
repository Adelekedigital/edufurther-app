import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailsButton } from './DetailsButton';

const button = () => screen.getByRole('button');

describe('DetailsButton', () => {
  it('is named by what it opens, not just "Details"', () => {
    render(<DetailsButton name="Visa practice with Amara" onClick={() => {}} />);
    expect(button()).toHaveAccessibleName('Details for Visa practice with Amara');
  });

  it('says whether the panel is open, because the label cannot', () => {
    // It is a toggle and the label is fixed at "Details", so this is the only
    // thing telling a screen-reader user that pressing it closes what they are
    // reading. The ⋯ it replaced said it in two places.
    const { rerender } = render(
      <DetailsButton name="x" controls="p" expanded={false} onClick={() => {}} />,
    );
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(button()).toHaveAttribute('aria-controls', 'p');
    rerender(<DetailsButton name="x" controls="p" expanded onClick={() => {}} />);
    expect(button()).toHaveAttribute('aria-expanded', 'true');
  });

  it('points at no panel when there is none on the page', () => {
    // A dangling `aria-controls` is worse than none: it promises an element
    // that is not there (failure mode #49).
    render(<DetailsButton name="x" onClick={() => {}} />);
    expect(button()).not.toHaveAttribute('aria-controls');
    expect(button()).not.toHaveAttribute('aria-expanded');
  });

  it('is reachable by keyboard, and presses either way', async () => {
    const onClick = vi.fn();
    render(<DetailsButton name="x" onClick={onClick} />);
    await userEvent.tab();
    expect(button()).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    await userEvent.click(button());
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('keeps a 44px target and a visible ring', () => {
    render(<DetailsButton name="x" onClick={() => {}} />);
    // jsdom computes no stylesheet, so this reads the rule the design sets —
    // the same approach CoverPicker's test takes.
    const css = readFileSync('src/components/molecules/DetailsButton/DetailsButton.module.css', 'utf8');
    expect(css).toMatch(/min-height:\s*var\(--touch-target-min\)/);
    expect(css).toMatch(/align-self:\s*flex-start/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*--focus-ring-color/);
  });
});
