import { render, screen } from '@testing-library/react';
import { LEGAL_LINKS } from '@/lib/config/auth';
import { LegalLine } from './LegalLine';

describe('LegalLine', () => {
  it('links the three documents from the one config, each in a new tab', () => {
    render(<LegalLine />);
    const links = [
      ['Terms of use', LEGAL_LINKS.terms],
      ['Privacy policy', LEGAL_LINKS.privacy],
      ['Community guide', LEGAL_LINKS.communityGuide],
    ] as const;
    for (const [name, href] of links) {
      const a = screen.getByRole('link', { name: new RegExp(`^${name}\\s*\\(opens in a new tab\\)$`) });
      expect(a).toHaveAttribute('href', href);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('reads as one sentence', () => {
    const { container } = render(<LegalLine />);
    expect(container.textContent).toMatch(
      /^By continuing, you agree to EduFurther’s Terms of use.*, Privacy policy.* and Community guide.*\.$/,
    );
  });
});
