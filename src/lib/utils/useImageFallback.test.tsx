import { fireEvent, render, screen } from '@testing-library/react';
import { useImageFallback } from './useImageFallback';

function Img({ src }: { src: string | null }) {
  const { photo, onError, ref } = useImageFallback(src);
  return photo ? <img src={photo} alt="" onError={onError} ref={ref} /> : <span>initials</span>;
}

describe('useImageFallback', () => {
  it('draws the photo; on an error, the fallback; a new src tries again', () => {
    const { rerender } = render(<Img src="/a.jpg" />);
    fireEvent.error(document.querySelector('img')!);
    expect(screen.getByText('initials')).toBeInTheDocument();
    rerender(<Img src="/b.jpg" />);
    expect(document.querySelector('img')).toHaveAttribute('src', '/b.jpg');
  });

  it('catches an image that broke before hydration', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    render(<Img src="/early.jpg" />);
    expect(screen.getByText('initials')).toBeInTheDocument();
    complete.mockRestore();
    width.mockRestore();
  });

  it('no src: the fallback', () => {
    render(<Img src={null} />);
    expect(screen.getByText('initials')).toBeInTheDocument();
  });
});
