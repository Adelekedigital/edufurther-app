import { render, screen } from '@testing-library/react';
import { ErrorPage } from './ErrorPage';

describe('ErrorPage (Error Page.dc.html)', () => {
  it('404: the code, the title as the page’s h1, the actions and the support line', () => {
    render(<ErrorPage type="notFound" actions={<button type="button">Go to Home</button>} />);
    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'We can’t find that page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
    expect(screen.getByText(/Followed a link from us\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support@edufurther.org' })).toHaveAttribute(
      'href',
      'mailto:support@edufurther.org',
    );
  });

  it('500: quotes the reference when there is one, and only then', () => {
    const { unmount } = render(
      <ErrorPage type="serverError" actions={null} reference="EF-7Q2K9X" />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong on our side' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/If it keeps happening, email/)).toHaveTextContent(
      'If it keeps happening, email support@edufurther.org and quote EF-7Q2K9X.',
    );
    unmount();
    render(<ErrorPage type="serverError" actions={null} />);
    expect(screen.queryByText(/quote/)).toBeNull();
    expect(screen.getByText(/If it keeps happening, email/)).toHaveTextContent(
      'If it keeps happening, email support@edufurther.org.',
    );
  });

  it('never promises the work was saved (a crash loses a form’s unsent input)', () => {
    render(<ErrorPage type="serverError" actions={null} />);
    expect(screen.queryByText(/saved/i)).toBeNull();
  });

  it('standalone: the logo bar above, only when given', () => {
    render(
      <ErrorPage type="serverError" actions={null} header={<header>Logo bar</header>} landmark />,
    );
    expect(screen.getByRole('banner')).toHaveTextContent('Logo bar');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});
