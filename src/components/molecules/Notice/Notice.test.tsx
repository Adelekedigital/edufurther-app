import { render, screen } from '@testing-library/react';
import { Notice } from './Notice';

describe('Notice', () => {
  it('announces a danger notice as an alert, the others politely', () => {
    const { rerender } = render(<Notice tone="danger">We couldn’t send it.</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t send it.');
    rerender(<Notice tone="info">Saved.</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });

  it('brand: the DS Notice info tone (it replaced the retired amber warning), with its trailing icon', () => {
    const { container } = render(
      <Notice tone="brand" icon="cloud_off">
        PostHog isn’t answering.
      </Notice>,
    );
    const box = container.firstElementChild!;
    expect(box).toHaveClass('ds', 'brand');
    expect(box).not.toHaveClass('warning');
    // One trailing DS icon; the passed icon is ignored, as for danger.
    expect(box.querySelectorAll('.icon')).toHaveLength(1);
    expect(box.lastElementChild).toHaveClass('icon');
  });
});
