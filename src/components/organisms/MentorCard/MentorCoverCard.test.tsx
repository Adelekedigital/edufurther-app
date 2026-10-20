import { render } from '@testing-library/react';
import type { CoverArt } from '@/lib/utils/cover';
import { MentorCoverCard } from './MentorCoverCard';

const card = (art: CoverArt, bannerUrl: string | null = null) =>
  render(
    <MentorCoverCard
      name="Grace Eze"
      headline="MSc at Imperial"
      initials="GE"
      photoUrl={null}
      cover="rose"
      bannerUrl={bannerUrl}
      artIcons={['payments', 'school']}
      art={art}
      rating={null}
      reviewCount={0}
      completedSessions={0}
      place="From Nigeria"
      tags={[]}
      copy={{ book: 'Book a session', message: 'Message' }}
    />,
  );

describe('MentorCoverCard', () => {
  it('draws the mentor’s own cover art, as the profile does', () => {
    const cover = (c: HTMLElement) => c.firstElementChild!.firstElementChild!;
    expect(cover(card('icons').container).querySelectorAll('[data-i]')).toHaveLength(2);
    expect(cover(card('single').container).querySelector('[aria-hidden]')).toHaveTextContent(
      /^payments$/,
    );
    expect(cover(card('pattern').container).querySelector('[aria-hidden]')).toBeEmptyDOMElement();
    expect(cover(card('none').container).querySelector('[aria-hidden]')).toBeNull();
  });

  it('draws no art over a banner image', () => {
    const { container } = card('pattern', '/b.jpg');
    expect(
      container.firstElementChild!.firstElementChild!.querySelector('[aria-hidden]'),
    ).toBeNull();
  });
});
