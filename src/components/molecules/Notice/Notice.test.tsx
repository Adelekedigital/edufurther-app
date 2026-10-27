import { render, screen } from '@testing-library/react';
import { Notice } from './Notice';

describe('Notice', () => {
  it('announces a danger notice as an alert, the others politely', () => {
    const { rerender } = render(<Notice tone="danger">We couldn’t send it.</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t send it.');
    rerender(<Notice tone="info">Saved.</Notice>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });
});
