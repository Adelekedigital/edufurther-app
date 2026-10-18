import { phoneChrome } from './BookingFlowPhone';

const base = {
  done: true,
  oneStep: false,
  at: 2,
  total: 3,
  stepName: 'Questions',
  subtitle: 'Step 3 of 3 · Questions',
  requestPending: false,
  onClose: () => {},
  onBack: () => {},
};

describe('phoneChrome: the sheet title once sent', () => {
  it('names the outcome: a request, or an instant booking', () => {
    expect(phoneChrome(base).heading).toBe('Request sent');
    expect(phoneChrome({ ...base, confirmed: true }).heading).toBe('Booking confirmed');
  });

  it('keeps the step name until it is sent', () => {
    expect(phoneChrome({ ...base, done: false }).heading).toBe('Questions');
  });
});
