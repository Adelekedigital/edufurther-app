import { fireEvent, render, screen } from '@testing-library/react';
import {
  noteProfileSource,
  profileLinkSource,
  resetProfileSourceForTests,
  takeProfileSource,
} from './profileSource';

const none = new URLSearchParams();

describe('profileSource: where a profile visit came from', () => {
  beforeEach(() => resetProfileSourceForTests());

  it('is direct when nothing was noted, invite_link when the URL carries an invite or ref', () => {
    expect(takeProfileSource('chidi', none)).toBe('direct');
    expect(takeProfileSource('chidi', new URLSearchParams('ref=share'))).toBe('invite_link');
    expect(takeProfileSource('chidi', new URLSearchParams('invite=abc'))).toBe('invite_link');
    expect(takeProfileSource('chidi', new URLSearchParams('tab=reviews'))).toBe('direct');
  });

  it('gives the noted source to that profile once, and to no other', () => {
    noteProfileSource('explore', '/mentors/chidi-n?tab=reviews');
    expect(takeProfileSource('chidi-n', none)).toBe('explore');
    expect(takeProfileSource('chidi-n', none)).toBe('direct');

    noteProfileSource('home', '/mentors/chidi-n');
    // Another profile clears it: a stale note never lands on a later visit.
    expect(takeProfileSource('ada', none)).toBe('direct');
    expect(takeProfileSource('chidi-n', none)).toBe('direct');
  });

  it('reads the handle decoded, and ignores links that are not a profile', () => {
    noteProfileSource('messages', `/mentors/${encodeURIComponent('ifẹ́')}`);
    expect(takeProfileSource('ifẹ́', none)).toBe('messages');
    noteProfileSource('messages', '/mentors/ada/reviews');
    noteProfileSource('messages', 'https://elsewhere.example/mentors/ada');
    noteProfileSource('messages', '/explore');
    expect(takeProfileSource('ada', none)).toBe('direct');
  });

  it('a region notes profile links clicked inside it, not new-tab clicks or other links', () => {
    render(
      <div onClickCapture={profileLinkSource('similar_mentors')}>
        {/* Plain anchors: the handler reads the DOM, whatever drew the link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/mentors/ada" onClick={(e) => e.preventDefault()}>
          <span>Ada</span>
        </a>
        <a href="/mentors/bo" target="_blank" onClick={(e) => e.preventDefault()}>
          Bo
        </a>
        <a href="/explore" onClick={(e) => e.preventDefault()}>
          Explore
        </a>
      </div>,
    );
    fireEvent.click(screen.getByText('Ada'), { ctrlKey: true });
    expect(takeProfileSource('ada', none)).toBe('direct');
    fireEvent.click(screen.getByText('Ada'));
    expect(takeProfileSource('ada', none)).toBe('similar_mentors');
    fireEvent.click(screen.getByText('Bo'));
    expect(takeProfileSource('bo', none)).toBe('direct');
  });
});
