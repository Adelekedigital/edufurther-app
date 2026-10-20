import { render, screen } from '@testing-library/react';
import { Notice } from './Notice';

describe('Notice', () => {
  it('announces a danger notice as an alert, the others politely', () => {
    const { rerender } = render(<Notice tone="danger">We couldn’t send it.</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t send it.');
    rerender(<Notice tone="info">Saved.</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });

  it('subtle: the outlined grey notice, its icon and words (the review freeze banner)', () => {
    render(
      <Notice tone="subtle" icon="lock" title="We’re reviewing your application.">
        You can edit these once it’s reviewed.
      </Notice>,
    );
    const n = screen.getByRole('status');
    expect(n.className).toMatch(/subtle/);
    expect(n).toHaveTextContent('We’re reviewing your application. You can edit these');
    expect(n.querySelector('svg, [aria-hidden]')).not.toBeNull();
  });
});
