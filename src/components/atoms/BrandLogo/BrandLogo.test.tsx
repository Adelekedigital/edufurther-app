import { render, screen } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('serves the pre-sized wordmark as-is, not through the image optimizer', () => {
    render(<BrandLogo width={180} height={24} alt="EduFurther" />);
    const img = screen.getByRole('img', { name: 'EduFurther' });
    expect(img).toHaveAttribute('src', '/brand/edufurther-logo-630.png');
    expect(img).not.toHaveAttribute('srcset');
    expect(img).toHaveAttribute('width', '180');
  });

  it('draws the swoosh mark, decorative by default', () => {
    const { container } = render(<BrandLogo variant="mark" width={48} height={20} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/brand/edufurther-mark-swoosh.png');
    expect(img).toHaveAttribute('alt', '');
  });
});
