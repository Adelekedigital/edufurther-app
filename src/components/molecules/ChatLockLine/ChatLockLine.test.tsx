import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatLockLine } from './ChatLockLine';

describe('ChatLockLine', () => {
  it('a paused mentor', () => {
    render(<ChatLockLine lock="paused" firstName="Amara" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Amara isn’t taking messages right now. You can still read your chat.',
    );
  });
  it('a closed account', () => {
    render(<ChatLockLine lock="closed" firstName="Amara" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Amara closed their account. You can still read your past messages.',
    );
  });
});
