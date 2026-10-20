import { fireEvent, render, screen } from '@testing-library/react';
import { PhotoFrame } from './PhotoFrame';

describe('PhotoFrame', () => {
  it('shows the photo, anchored on the face', () => {
    const { container } = render(
      <PhotoFrame
        src="/a.jpg"
        alt="Grace Eze"
        initials="GE"
        cover="rose"
        focus={{ x: 0.3, y: 0.6 }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Grace Eze' })).toHaveAttribute('src', '/a.jpg');
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.getPropertyValue('--avatar-x')).toBe('30.0%');
    expect(frame.style.getPropertyValue('--avatar-y')).toBe('60.0%');
    expect(screen.queryByText('GE')).toBeNull();
  });

  it('without a photo, the initials sit on the cover deep tone', () => {
    const { container } = render(<PhotoFrame alt="Grace Eze" initials="GE" cover="rose" />);
    expect(screen.getByRole('img', { name: 'Grace Eze' })).toHaveTextContent('GE');
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--frame-bg')).toBe(
      'var(--cover-rose-ink)',
    );
  });

  it('a photo that fails to load falls back to the initials, and a new src tries again', () => {
    const { rerender } = render(<PhotoFrame src="/broken.jpg" alt="" initials="GE" cover="sky" />);
    fireEvent.error(document.querySelector('img')!);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('GE')).toHaveAttribute('aria-hidden', 'true');

    rerender(<PhotoFrame src="/fixed.jpg" alt="" initials="GE" cover="sky" />);
    expect(document.querySelector('img')).toHaveAttribute('src', '/fixed.jpg');
  });

  it('a photo that broke before the page was interactive shows the initials too', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    render(<PhotoFrame src="/broken-early.jpg" alt="" initials="GE" cover="sky" />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('GE')).toBeInTheDocument();
    complete.mockRestore();
    width.mockRestore();
  });

  it('the scrim is drawn only over a photo', () => {
    const { container, rerender } = render(
      <PhotoFrame src="/a.jpg" alt="" initials="GE" cover="sky" scrim />,
    );
    expect(container.querySelectorAll('img + span')).toHaveLength(1);
    rerender(<PhotoFrame alt="" initials="GE" cover="sky" scrim />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstElementChild!.children).toHaveLength(1);
  });

  it('as a link, it is a mouse-only duplicate of the name link, with its overlay', () => {
    render(
      <PhotoFrame href="/mentors/grace" alt="" initials="GE" cover="sky" lazy>
        <span>Top-rated</span>
      </PhotoFrame>,
    );
    const link = document.querySelector('a')!;
    expect(link).toHaveAttribute('href', '/mentors/grace');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveTextContent('Top-rated');
  });

  it('lazy loads below the fold when asked', () => {
    render(<PhotoFrame src="/a.jpg" alt="" initials="GE" cover="sky" lazy />);
    expect(document.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });
});
