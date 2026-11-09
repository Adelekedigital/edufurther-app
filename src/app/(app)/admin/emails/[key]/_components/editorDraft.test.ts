import { toEmailDetail, type EmailVariant } from '@/lib/api/data/adminEmails';
import { mockEmailDetail, resetMockEmails } from '@/lib/api/mock/adminEmails';
import {
  asSent,
  draftLine,
  errorText,
  isDirty,
  lineErrors,
  linesOf,
  savePayload,
  textOf,
  warningText,
  type Draft,
} from './editorDraft';

beforeEach(() => resetMockEmails());

const email = () => toEmailDetail(mockEmailDetail('session_booked')!);
const KNOWN = ['mentorName', 'menteeName', 'sessionTopic', 'code', 'recipientName'];
const at = (
  v: EmailVariant,
  l: 'subject' | 'heading' | 'button',
  text: string,
  draft: Draft = {},
) => draftLine(v, draft, l, text);

it('a variant has its three lines; the draft overrides what is saved', () => {
  const v = email().variants[0]!;
  expect(linesOf(v)).toEqual(['subject', 'heading', 'button']);
  expect(textOf(v, {}, 'subject')).toBe('Your session with {mentorName} is confirmed');
  expect(textOf(v, { subject: at(v, 'subject', 'New') }, 'subject')).toBe('New');
});

it('a drafted line keeps the version it was first read at', () => {
  const v = email().variants[0]!;
  const first = { subject: at(v, 'subject', 'A') };
  expect(first.subject.version).toBe(2);
  // The line has since moved on the server (a refetch): the draft still says 2.
  const moved = { ...v, lines: { ...v.lines, subject: { ...v.lines.subject!, version: 5 } } };
  expect(draftLine(moved, first, 'subject', 'AB').version).toBe(2);
  expect(
    savePayload(moved, { subject: draftLine(moved, first, 'subject', 'AB') }, []).lines.subject,
  ).toEqual({ text: 'AB', version: 2 });
});

it('dirty: a moved line or a Keep my edit; the saved text typed back is clean', () => {
  const v = email().variants[0]!;
  expect(isDirty(v, {}, [])).toBe(false);
  expect(isDirty(v, { subject: at(v, 'subject', 'New') }, [])).toBe(true);
  expect(isDirty(v, { subject: at(v, 'subject', v.lines.subject!.text) }, [])).toBe(false);
  expect(isDirty(v, {}, ['subject'])).toBe(true);
});

it('errors: unknown, not sent, empty; worded with the email', () => {
  const e = email();
  const v = e.variants[0]!;
  const draft = {
    subject: at(v, 'subject', 'Hi {mentorname}'),
    heading: at(v, 'heading', 'For {code}'),
    button: at(v, 'button', ''),
  };
  const errs = lineErrors(e, v, draft, KNOWN);
  expect(errorText(errs.subject!, 'subject', e.name)).toBe(
    '{mentorname} isn’t a value we know. Did you mean {mentorName}?',
  );
  expect(errorText(errs.heading!, 'heading', e.name)).toBe(
    '{code} isn’t sent with Session booked, so it would show up empty. Pick one from Insert a value.',
  );
  expect(errorText(errs.button!, 'button', e.name)).toBe(
    'Add a button label. To go back to the default, use Reset to default.',
  );
});

it('before the catalogue loads, a value the email does not carry reads "isn’t sent with"', () => {
  const e = email();
  const v = e.variants[0]!;
  const errs = lineErrors(e, v, { heading: at(v, 'heading', 'For {code}') }, null);
  expect(errs.heading).toEqual({ code: 'value_not_sent', value: 'code' });
});

it('as sent: values filled from the variant sample; length warnings', () => {
  const v = email().variants[0]!;
  expect(asSent(v, 'With {mentorName}')).toBe(`With ${v.sample.mentorName}`);
  expect(warningText('subject', 'Short')).toBe('Under 20 characters can be too vague to open.');
  expect(warningText('button', 'x'.repeat(26))).toBe(
    'Over 25 characters wraps on phones. Aim for 2 to 4 words.',
  );
  expect(warningText('heading', 'Fine')).toBeNull();
});

it('Save sends every line of the variant with the version read, and Keep my edit', () => {
  const v = email().variants[0]!;
  expect(savePayload(v, { heading: at(v, 'heading', 'New heading') }, ['subject'])).toEqual({
    variant: 'mentee',
    lines: {
      subject: { text: 'Your session with {mentorName} is confirmed', version: 2 },
      heading: { text: 'New heading', version: 0 },
      button: { text: 'View session', version: 0 },
    },
    keepEdit: ['subject'],
  });
});
