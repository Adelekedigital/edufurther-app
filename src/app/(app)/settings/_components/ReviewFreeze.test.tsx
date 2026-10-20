import { render, screen } from '@testing-library/react';

vi.mock('@/lib/api/data/settings', () => ({
  useMenteeProfile: () => ({ profile: { name: 'Ada Obi', email: 'ada@example.com' } }),
}));

import { ReviewFreeze } from './ReviewFreeze';

describe('ReviewFreeze', () => {
  it('frozen: the banner, then the content; Contact us is a ready request to support', () => {
    render(
      <ReviewFreeze frozen userId="u1" words="You can edit these once it’s reviewed.">
        <p>Topics</p>
      </ReviewFreeze>,
    );
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(
      'We’re reviewing your application. You can edit these once it’s reviewed. Spotted a mistake? Contact us',
    );
    const href = screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')!;
    expect(href.startsWith('mailto:support@edufurther.org?subject=')).toBe(true);
    const body = decodeURIComponent(href.split('&body=')[1]!);
    expect(decodeURIComponent(href)).toContain(
      'Mentor application: please change something (Ada Obi)',
    );
    expect(body).toContain('Account email: ada@example.com');
    expect(body).toContain('Thanks,\r\nAda');
    expect(screen.getByText('Topics')).toBeInTheDocument();
  });

  it('not frozen: only the content', () => {
    render(
      <ReviewFreeze frozen={false} userId="u1" words="x">
        <p>Topics</p>
      </ReviewFreeze>,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Topics')).toBeInTheDocument();
  });
});
