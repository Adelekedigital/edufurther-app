import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

const circleOf = (el: HTMLElement) => el.parentElement!;

describe('Avatar', () => {
  it('shows the photo, named, cropped at the face', () => {
    render(
      <Avatar
        size={72}
        initials="EG"
        tone="sky"
        src="/me.webp"
        alt="Elufisan"
        focus={{ x: 0.3, y: 0.2 }}
      />,
    );
    const img = screen.getByRole('img', { name: 'Elufisan' });
    expect(img.tagName).toBe('IMG');
    expect(circleOf(img).style.getPropertyValue('--avatar-x')).toBe('30.0%');
    expect(circleOf(img).style.getPropertyValue('--avatar-y')).toBe('20.0%');
  });

  it('without a photo: the initials, named, on the cover deep tone', () => {
    render(<Avatar size={88} initials="EG" tone="mint" alt="Elufisan" />);
    const face = screen.getByRole('img', { name: 'Elufisan' });
    expect(face).toHaveTextContent('EG');
    expect(circleOf(face).style.getPropertyValue('--avatar-bg')).toBe('var(--cover-mint-ink)');
  });

  it('with alt "", the initials are hidden (a visible name sits beside them)', () => {
    const { container } = render(<Avatar size={52} initials="EG" tone="sky" alt="" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('EG');
  });

  it('a photo that fails to load shows the initials; a new photo gets its own try', () => {
    const { rerender } = render(
      <Avatar size={112} initials="EG" tone="sky" src="/broken.webp" alt="Elufisan" />,
    );
    fireEvent.error(screen.getByRole('img', { name: 'Elufisan' }));
    expect(screen.getByRole('img', { name: 'Elufisan' }).tagName).toBe('SPAN');
    expect(screen.getByText('EG')).toBeInTheDocument();
    rerender(<Avatar size={112} initials="EG" tone="sky" src="/new.webp" alt="Elufisan" />);
    expect(screen.getByRole('img', { name: 'Elufisan' }).tagName).toBe('IMG');
  });

  it('the default crop sits where asked when the face is not known', () => {
    render(<Avatar size={112} initials="EG" tone="sky" src="/me.webp" alt="E" objectY={0.25} />);
    const circle = circleOf(screen.getByRole('img'));
    expect(circle.style.getPropertyValue('--avatar-x')).toBe('50.0%');
    expect(circle.style.getPropertyValue('--avatar-y')).toBe('25.0%');
  });

  it('the saved focus wins over the default crop', () => {
    render(
      <Avatar
        size={112}
        initials="EG"
        tone="sky"
        src="/me.webp"
        alt="E"
        objectY={0.25}
        focus={{ x: 0.5, y: 0.6 }}
      />,
    );
    expect(circleOf(screen.getByRole('img')).style.getPropertyValue('--avatar-y')).toBe('60.0%');
  });

  it('a white ring and the photo size classes go on the circle', () => {
    render(<Avatar size={112} initials="EG" tone="sky" alt="E" ring="white" />);
    const circle = circleOf(screen.getByRole('img', { name: 'E' }));
    expect(circle.className).toMatch(/ringWhite/);
    expect(circle.className).toMatch(/s112/);
    expect(circle.className).toMatch(/v112/);
  });

  it('children sit in a frame around the circle, which takes the className', () => {
    const { container } = render(
      <Avatar size={72} initials="EG" tone="sky" alt="E" className="spot">
        <button type="button">Badge</button>
      </Avatar>,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame).toHaveClass('spot');
    expect(frame.tagName).toBe('DIV');
    expect(frame.className).toMatch(/v72/);
    expect(frame).toContainElement(screen.getByRole('button', { name: 'Badge' }));
    expect(frame).toContainElement(screen.getByRole('img', { name: 'E' }));
    expect(circleOf(screen.getByRole('img', { name: 'E' }))).not.toHaveClass('spot');
  });

  it('without children it is the one circle, as before', () => {
    const { container } = render(<Avatar initials="OS" tone="sky" alt="" className="x" />);
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild!.tagName).toBe('SPAN');
    expect(container.firstElementChild).toHaveClass('x');
  });

  it('plain with no initials is the DS icon avatar', () => {
    const { container } = render(<Avatar tone="plain" initials="" alt="Deleted user" />);
    expect(screen.getByRole('img', { name: 'Deleted user' })).toBeInTheDocument();
    expect(container.firstElementChild!.className).toMatch(/blank/);
  });
});
