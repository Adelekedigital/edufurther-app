import { render, screen } from '@testing-library/react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { CoverBanner } from '@/components/molecules/CoverBanner/CoverBanner';
import { CoverHeader } from './CoverHeader';

const tones = { bg: 'var(--cover-sky-bg)', ink: 'var(--cover-sky-ink)' };

function header(props: Partial<Parameters<typeof CoverHeader>[0]> = {}) {
  return render(
    <CoverHeader
      cover={<CoverBanner tones={tones} art="icons" icons={['school']} />}
      photo={<Avatar size={72} initials="GE" tone="sky" alt="Grace Eze" />}
      overlap={32}
      {...props}
    >
      <h2>Grace Eze</h2>
    </CoverHeader>,
  );
}

describe('CoverHeader', () => {
  it('puts the text below the cover, never inside it', () => {
    const { container } = header();
    const [cover, body] = [...container.firstElementChild!.children];
    const title = screen.getByRole('heading', { name: 'Grace Eze' });
    expect(cover!.contains(title)).toBe(false);
    expect(body!.contains(title)).toBe(true);
    // The cover comes first, then the body: the text follows it in reading order.
    expect(cover!.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the photo in its own slot, apart from the text', () => {
    const { container } = header();
    const body = container.firstElementChild!.children[1]!;
    const [photoSlot, contentSlot] = [...body.children];
    expect(photoSlot).toContainElement(screen.getByRole('img', { name: 'Grace Eze' }));
    expect(photoSlot).not.toContainElement(screen.getByRole('heading', { name: 'Grace Eze' }));
    expect(contentSlot).toContainElement(screen.getByRole('heading', { name: 'Grace Eze' }));
  });

  it('carries the overlap, the phone overlap, the clearance and the basis to the body', () => {
    const { container } = header({ phoneOverlap: 36, clearance: 24, contentBasis: 200 });
    const body = container.firstElementChild!.children[1] as HTMLElement;
    expect(body.style.getPropertyValue('--ch-overlap')).toBe('32px');
    expect(body.style.getPropertyValue('--ch-overlap-phone')).toBe('36px');
    expect(body.style.getPropertyValue('--ch-clearance')).toBe('24px');
    expect(body.style.getPropertyValue('--ch-basis')).toBe('200px');
  });

  it('reads the footer before the aside', () => {
    header({ footer: <p>Topics</p>, aside: <button>Book</button> });
    const topics = screen.getByText('Topics');
    const book = screen.getByRole('button', { name: 'Book' });
    expect(topics.compareDocumentPosition(book) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders no empty aside or footer slot', () => {
    const { container } = header();
    expect(container.firstElementChild!.children[1]!.children).toHaveLength(2);
  });

  it('can be a named section with the caller’s class', () => {
    render(
      <CoverHeader
        as="section"
        aria-labelledby="t"
        className="mine"
        cover={<CoverBanner tones={tones} />}
        photo={<Avatar size={52} initials="GE" tone="sky" alt="" />}
        overlap={24}
        layout="stack"
      >
        <h2 id="t">Profile</h2>
      </CoverHeader>,
    );
    const region = screen.getByRole('region', { name: 'Profile' });
    expect(region).toHaveClass('mine');
  });
});
