import { at, booking } from './bookingsScreen.harness';
import { withUnsettled } from './withUnsettled';

describe('withUnsettled', () => {
  const unsettled = booking({ id: 'u', startsAt: at(-1), endsAt: at(-0.1) });
  const done = booking({ id: 'd', status: 'completed', startsAt: at(-5), endsAt: at(-4) });
  it('adds them, newest first, unfiltered or under Completed, never twice', () => {
    expect(withUnsettled([done], [unsettled], []).map((b) => b.id)).toEqual(['u', 'd']);
    expect(withUnsettled([done], [unsettled], ['completed']).map((b) => b.id)).toEqual(['u', 'd']);
    expect(withUnsettled([unsettled], [unsettled], []).map((b) => b.id)).toEqual(['u']);
  });
  it('leaves them out under a filter they cannot belong to', () => {
    expect(withUnsettled([done], [unsettled], ['noShow']).map((b) => b.id)).toEqual(['d']);
  });
});
