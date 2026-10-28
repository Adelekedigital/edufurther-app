import { render, screen } from '@testing-library/react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('ring: the DS CircleIconButton, a 24px glyph whatever the size', () => {
    render(<IconButton variant="ring" size="sm" icon="settings" aria-label="Message settings" />);
    const b = screen.getByRole('button', { name: 'Message settings' });
    expect(b.className).toMatch(/ring/);
    expect(b.className).not.toMatch(/\bsm\b|_sm/);
    expect(b.querySelector('[aria-hidden]')).toHaveStyle({ '--icon-size': '24px' });
  });

  it('glyph overrides the size’s own glyph', () => {
    render(<IconButton size="lg" glyph={24} icon="arrow_back" aria-label="Back" />);
    expect(screen.getByRole('button', { name: 'Back' }).querySelector('[aria-hidden]')).toHaveStyle(
      { '--icon-size': '24px' },
    );
  });
});
