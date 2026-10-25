import { RULES_COPY } from './sessionTypes';

describe('RULES_COPY.defaultApprovalHint', () => {
  it('names the default mid-sentence', () => {
    expect(RULES_COPY.defaultApprovalHint('Confirmed straight away')).toBe(
      'Your default: confirmed straight away.',
    );
    expect(RULES_COPY.defaultApprovalHint('You approve each booking')).toBe(
      'Your default: you approve each booking.',
    );
  });

  it('before the defaults load, says what the choice is', () => {
    expect(RULES_COPY.defaultApprovalHint(null)).toBe('Choose how bookings are confirmed.');
  });
});
