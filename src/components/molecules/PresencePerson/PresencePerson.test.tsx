import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import { PresencePerson } from './PresencePerson';

describe('PresencePerson: “Message {First}” under the other person', () => {
  it('opens SendMessage', async () => {
    const onClick = vi.fn();
    render(
      <PresencePerson
        person={sampleParty()}
        name="Amara"
        presence="Here now"
        tone="here"
        message={{ label: 'Message Amara', onClick }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Message Amara' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('none without one (your own, or Messages off)', () => {
    render(<PresencePerson person={sampleParty()} name="You" presence="Here now" tone="here" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('PresencePerson: on a tinted ground', () => {
  const at = (onTint?: boolean) =>
    render(
      <PresencePerson
        person={sampleParty()}
        name="Amara"
        presence="Here now"
        tone="here"
        message={{ label: 'Message Amara', onClick: vi.fn() }}
        onTint={onTint}
      />,
    );

  it('passes onTint to the Message button', () => {
    at(true);
    expect(screen.getByRole('button', { name: 'Message Amara' })).toHaveClass('onTint');
  });

  it('keeps the ghost blue without it', () => {
    at();
    expect(screen.getByRole('button', { name: 'Message Amara' })).not.toHaveClass('onTint');
  });
});
