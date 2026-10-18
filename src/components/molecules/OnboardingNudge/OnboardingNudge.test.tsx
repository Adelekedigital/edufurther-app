import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingNudge } from './OnboardingNudge';

/** The nudge's region, named by whichever title it shows. */
const NUDGE = /^(Add your study plans|What do you need help with\?|Finish setting up)$/;

describe('OnboardingNudge', () => {
  it('words what is missing, and the button goes to onboarding', () => {
    const { rerender } = render(
      <OnboardingNudge missing={['plans']} href="/onboarding" onDismiss={vi.fn()} />,
    );
    expect(screen.getByRole('region', { name: NUDGE })).toHaveTextContent('Add your study plans');
    expect(screen.getByRole('link', { name: 'Add study plans' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
    rerender(<OnboardingNudge missing={['help']} href="/onboarding" onDismiss={vi.fn()} />);
    expect(screen.getByText('What do you need help with?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pick help areas' })).toBeInTheDocument();
    rerender(
      <OnboardingNudge missing={['help', 'plans']} href="/onboarding" onDismiss={vi.fn()} />,
    );
    expect(screen.getByRole('link', { name: 'Finish setting up' })).toBeInTheDocument();
  });

  it('hides for now on ×', async () => {
    const onDismiss = vi.fn();
    render(<OnboardingNudge missing={['plans']} href="/onboarding" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide for now' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders nothing when nothing is missing', () => {
    const { container } = render(
      <OnboardingNudge missing={[]} href="/onboarding" onDismiss={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
