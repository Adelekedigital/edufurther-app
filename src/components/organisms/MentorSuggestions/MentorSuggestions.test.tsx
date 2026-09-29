import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleMentors } from '../MentorResults/MentorResults.stories';
import { MentorSuggestions } from './MentorSuggestions';

const props = {
  title: 'Mentors with similar expertise',
  subtitle: 'They help with visa interview, and are taking bookings.',
  exploreHref: '/explore',
  onBook: vi.fn(),
  timeZone: 'UTC',
};

describe('MentorSuggestions', () => {
  it('lists compact cards under a titled section with a way to Explore', () => {
    render(<MentorSuggestions {...props} mentors={sampleMentors} loading={false} />);
    const section = screen.getByRole('region', { name: props.title });
    expect(section).toHaveTextContent(props.subtitle);
    expect(within(section).getAllByRole('article')).toHaveLength(sampleMentors.length);
    expect(within(section).getByRole('link', { name: 'Explore all mentors' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('compact card: a round photo beside the name, the label next to the name, one name link', () => {
    const top = sampleMentors[0]!;
    render(<MentorSuggestions {...props} mentors={[top]} loading={false} />);
    const card = screen.getByRole('article', { name: top.name });
    // One link to the profile by name (the round photo isn't a second stop).
    expect(within(card).getAllByRole('link', { name: top.name })).toHaveLength(1);
    const heading = within(card).getByRole('heading', { name: top.name });
    expect(heading.parentElement).toHaveTextContent('Top-rated');
    expect(within(card).getByText(top.initials)).toBeInTheDocument();
  });

  it('a new mentor says so once (the proof line), not again as a badge', () => {
    const fresh = {
      ...sampleMentors[0]!,
      label: 'new' as const,
      reviewCount: 0,
      rating: null,
      completedSessions: 0,
    };
    render(<MentorSuggestions {...props} mentors={[fresh]} loading={false} />);
    expect(screen.getAllByText('New mentor')).toHaveLength(1);
  });

  it('the compact photo loads lazily and keeps the face in the crop', () => {
    const withPhoto = {
      ...sampleMentors[0]!,
      photoUrl: '/p.jpg',
      photoFocus: { x: 0.3, y: 0.2 },
    };
    const { container } = render(
      <MentorSuggestions {...props} mentors={[withPhoto]} loading={false} />,
    );
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('loading', 'lazy');
    const circle = img.parentElement!;
    expect(circle.style.getPropertyValue('--avatar-x')).toBe('30.0%');
    expect(circle.style.getPropertyValue('--avatar-y')).toBe('20.0%');
  });

  it('Book hands over the mentor', async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    render(
      <MentorSuggestions {...props} onBook={onBook} mentors={sampleMentors} loading={false} />,
    );
    await user.click(screen.getAllByRole('button', { name: /^Book session with/ })[0]!);
    expect(onBook).toHaveBeenCalledWith(sampleMentors[0]);
  });

  it('loading holds the place: busy, no cards, no subtitle yet', () => {
    const { container } = render(<MentorSuggestions {...props} mentors={null} loading />);
    const section = screen.getByRole('region', { name: props.title });
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(section).not.toHaveTextContent(props.subtitle);
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('renders nothing when there is nobody to suggest', () => {
    const { container } = render(<MentorSuggestions {...props} mentors={[]} loading={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
