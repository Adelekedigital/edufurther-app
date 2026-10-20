import { render, screen } from '@testing-library/react';
import { SignInContext } from './SignInContext';

describe('SignInContext', () => {
  it('says why, with the mentor’s avatar hidden beside the words that name them', () => {
    const { container } = render(
      <SignInContext initials="GE" tone="sand">
        Log in or sign up to finish booking Gbenga E.
      </SignInContext>,
    );
    expect(screen.getByText('Log in or sign up to finish booking Gbenga E.')).toBeVisible();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
