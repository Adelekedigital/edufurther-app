import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SupportLine } from './SupportLine';

describe('SupportLine', () => {
  it('says the lead and links to the given mail', () => {
    render(
      <SupportLine lead="Having a problem?" linkLabel="Contact support" href="mailto:a@b.c" />,
    );
    expect(screen.getByText(/Having a problem\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      'mailto:a@b.c',
    );
  });
});
