import { endPreview, startPreview, switchPreview } from './previewSessions';

describe('mock preview sessions (the backend contract)', () => {
  it('a switch on a session that ended answers like the backend 409, not a 404', () => {
    const s = startPreview({ email: 'amara.okafor@gmail.com' })!;
    const tunde = startPreview({ email: 'tunde.bakare@gmail.com' })!.user.user_id;
    expect(switchPreview(s.id, tunde)).toMatchObject({ user: { user_id: tunde } });
    endPreview(s.id, 'exit');
    expect(switchPreview(s.id, tunde)).toBe('ended');
    expect(switchPreview('nope', tunde)).toBeUndefined();
  });
});
