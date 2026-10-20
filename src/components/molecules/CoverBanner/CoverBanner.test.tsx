import { render, screen } from '@testing-library/react';
import { CoverBanner } from './CoverBanner';

const tones = { bg: 'var(--cover-rose-bg)', ink: 'var(--cover-rose-ink)' };

describe('CoverBanner', () => {
  it('paints the cover in its tones, at the given height', () => {
    const { container } = render(<CoverBanner tones={tones} height={64} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--cover-bg')).toBe('var(--cover-rose-bg)');
    expect(root.style.getPropertyValue('--cover-ink')).toBe('var(--cover-rose-ink)');
    expect(root.style.getPropertyValue('--cover-height')).toBe('64px');
  });

  it('leaves the height to the caller when none is given', () => {
    const { container } = render(<CoverBanner tones={tones} />);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--cover-height'),
    ).toBe('');
  });

  it('draws up to three topic icons, hidden from assistive tech', () => {
    const { container } = render(
      <CoverBanner tones={tones} art="icons" icons={['school', 'payments', 'work', 'label']} />,
    );
    const art = container.querySelector('[aria-hidden]')!;
    expect([...art.querySelectorAll('span')].map((s) => s.textContent)).toEqual([
      'school',
      'payments',
      'work',
    ]);
  });

  it('draws nothing for icons with no topics, or for none', () => {
    const { container, rerender } = render(<CoverBanner tones={tones} art="icons" icons={[]} />);
    expect(container.querySelector('[aria-hidden]')).toBeNull();
    rerender(<CoverBanner tones={tones} art="none" icons={['school']} />);
    expect(container.querySelector('[aria-hidden]')).toBeNull();
  });

  it('draws the dot pattern', () => {
    const { container } = render(<CoverBanner tones={tones} art="pattern" />);
    const art = container.querySelector('[aria-hidden]')!;
    expect(art).toBeEmptyDOMElement();
  });

  it('draws one large icon: the first topic, else a school', () => {
    const { container, rerender } = render(
      <CoverBanner tones={tones} art="single" icons={['payments', 'work']} />,
    );
    expect(container.querySelector('[aria-hidden]')).toHaveTextContent(/^payments$/);
    rerender(<CoverBanner tones={tones} art="single" />);
    expect(container.querySelector('[aria-hidden]')).toHaveTextContent(/^school$/);
  });

  it.each(['icons', 'pattern', 'single'] as const)('never draws %s art over an image', (art) => {
    const { container } = render(
      <CoverBanner tones={tones} bannerUrl="/b.jpg" art={art} icons={['school']} />,
    );
    expect(container.querySelector('[aria-hidden]')).toBeNull();
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/b.jpg');
    expect(img).toHaveAttribute('alt', '');
  });

  it('puts the tools over the cover but outside its clip', () => {
    const { container } = render(
      <CoverBanner tones={tones} bannerUrl="/b.jpg" tools={<button>Change cover</button>} />,
    );
    const button = screen.getByRole('button', { name: 'Change cover' });
    const root = container.firstElementChild!;
    const clip = container.querySelector('img')!.parentElement!;
    expect(root.contains(button)).toBe(true);
    expect(clip.contains(button)).toBe(false);
  });

  it('merges the caller’s class', () => {
    const { container } = render(<CoverBanner tones={tones} className="mine" />);
    expect(container.firstElementChild).toHaveClass('mine');
  });
});
