import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FindMenteeCard } from './FindMenteeCard';
import { AMARA, CHIAMAKA } from './fixtures';

const props = {
  query: '',
  onQuery: vi.fn(),
  mentees: [AMARA, CHIAMAKA],
  term: '',
  status: 'ready' as const,
  onRetry: vi.fn(),
  pickedId: null,
  onPick: vi.fn(),
};

beforeEach(() => {
  props.onQuery.mockClear();
  props.onPick.mockClear();
  props.onRetry.mockClear();
});

describe('FindMenteeCard', () => {
  it('lists the recent mentees before anyone types, each with its balance', () => {
    render(<FindMenteeCard {...props} />);
    expect(screen.getByRole('searchbox', { name: 'Find a mentee' })).toHaveAttribute(
      'placeholder',
      'Email, name or user ID',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Recent mentees');
    const amara = screen.getByRole('button', { name: /Amara Okafor/ });
    expect(amara).toHaveTextContent('amara.okafor@example.com');
    expect(amara).toHaveTextContent('1 of 3 left');
    expect(screen.getByRole('button', { name: /Chiamaka Eze/ })).toHaveTextContent('0 of 1 left');
  });

  it('counts the matches once a search answers', () => {
    render(<FindMenteeCard {...props} query="ama" term="ama" mentees={[AMARA]} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 match');
  });

  it('says why nothing matched', () => {
    render(<FindMenteeCard {...props} query="ibrahim" term="ibrahim" mentees={[]} />);
    expect(
      screen.getByText('No mentee with that email, name or ID. Mentors don’t have credits.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 matches');
  });

  it('typing reports the text; a pick reports the mentee and shows as pressed', async () => {
    const { rerender } = render(<FindMenteeCard {...props} />);
    await userEvent.type(screen.getByRole('searchbox'), 'a');
    expect(props.onQuery).toHaveBeenCalledWith('a');
    await userEvent.click(screen.getByRole('button', { name: /Amara Okafor/ }));
    expect(props.onPick).toHaveBeenCalledWith(AMARA);
    rerender(<FindMenteeCard {...props} pickedId={AMARA.id} />);
    expect(screen.getByRole('button', { name: /Amara Okafor/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Chiamaka Eze/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('loading: skeleton rows, named', () => {
    render(<FindMenteeCard {...props} status="loading" mentees={[]} />);
    expect(screen.getByRole('status', { name: 'Loading mentees' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('error: says so, with Try again', async () => {
    render(<FindMenteeCard {...props} status="error" mentees={[]} />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load credits' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalled();
  });
});
