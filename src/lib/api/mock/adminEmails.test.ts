import { mockEmailDetail, mockSaveEmailVariant, resetMockEmails } from './adminEmails';

beforeEach(() => resetMockEmails());

const lines = (subject: string, version = 0) => ({
  lines: { subject: { text: subject, version } },
});

describe('mock email detail', () => {
  it('a shared email: its variants, samples and lines from the code defaults', () => {
    const e = mockEmailDetail('session_booked')!;
    expect(e.status).toBe('live');
    expect(e.siblings).toBe(1);
    expect(e.variants.map((v) => [v.id, v.label])).toEqual([
      ['mentee', 'To the mentee'],
      ['mentor', 'To the mentor'],
    ]);
    const mentee = e.variants[0]!;
    expect(mentee.sample_recipient.email).toBe('amara.okafor@example.com');
    expect(mentee.lines.subject).toMatchObject({
      edited: true,
      version: 2,
      default_changed: false,
    });
    expect(e.variants[1]!.lines.subject).toMatchObject({ edited: false, version: 0 });
  });

  it('a default moved since the edit: default_changed with the new default', () => {
    const subject = mockEmailDetail('credits_expiring')!.variants[0]!.lines.subject!;
    expect(subject).toMatchObject({
      edited: true,
      default_changed: true,
      new_default: 'Your credits expire soon',
    });
  });

  it('Not set up: one default variant, empty lines', () => {
    const e = mockEmailDetail('sign_in_code')!;
    expect(e.status).toBe('not_set_up');
    expect(e.variants).toHaveLength(1);
    expect(e.variants[0]!.lines.subject).toMatchObject({ default_text: '', text: '', version: 0 });
  });

  it('an unknown key is null', () => {
    expect(mockEmailDetail('nope')).toBeNull();
  });
});

describe('mock save', () => {
  it('writes, bumps the version and records who edited', () => {
    const r = mockSaveEmailVariant(
      'request_accepted',
      'default',
      lines('{mentorName} said yes to your request'),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.body.variants[0]!.lines.subject).toMatchObject({ edited: true, version: 1 });
    expect(r.body.last_edited?.admin_name).toBe('Ada Okeke');
  });

  it('a stale version is a 409 naming who saved first; nothing is written', () => {
    const r = mockSaveEmailVariant('session_booked', 'mentee', lines('New words', 1));
    expect(r).toMatchObject({ ok: false, status: 409, problem: { updated_by_name: 'Ada Okeke' } });
    expect(mockEmailDetail('session_booked')!.variants[0]!.lines.subject!.version).toBe(2);
  });

  it('the rules: a 422 with every bad line; nothing is written', () => {
    const r = mockSaveEmailVariant('request_accepted', 'default', {
      lines: {
        subject: { text: '{mentorname} said yes', version: 0 },
        button: { text: ' ', version: 0 },
      },
    });
    expect(r).toMatchObject({
      ok: false,
      status: 422,
      problem: {
        errors: [
          { line: 'subject', code: 'unknown_value', value: 'mentorname', suggestion: 'mentorName' },
          { line: 'button', code: 'empty' },
        ],
      },
    });
  });

  it('Not set up refuses with 423', () => {
    expect(mockSaveEmailVariant('sign_in_code', 'default', lines('x'))).toMatchObject({
      ok: false,
      status: 423,
    });
  });

  it('saving exactly the default removes the edit', () => {
    const r = mockSaveEmailVariant(
      'session_booked',
      'mentee',
      lines('Your session with {mentorName} is booked', 2),
    );
    expect(r.ok && r.body.variants[0]!.lines.subject).toMatchObject({ edited: false, version: 0 });
  });

  it('Keep my edit records that the new default was seen', () => {
    const r = mockSaveEmailVariant('credits_expiring', 'default', {
      lines: { subject: { text: 'Use your {creditCount} credits before they expire', version: 1 } },
      keep_edit: ['subject'],
    });
    expect(r.ok && r.body.variants[0]!.lines.subject).toMatchObject({
      default_changed: false,
      version: 2,
    });
  });
});
