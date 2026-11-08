import { appEnv } from './preview';
import { PREVIEW_COPY } from '@/lib/copy/preview';

describe('appEnv (PRD open question 2)', () => {
  it('names staging and development', () => {
    expect(appEnv('staging')).toBe('staging');
    expect(appEnv('development')).toBe('development');
  });
  it('unset or unknown reads as production, the strictest wording', () => {
    expect(appEnv('production')).toBe('production');
    expect(appEnv(undefined)).toBe('production');
    expect(appEnv('Staging')).toBe('production');
  });
});

describe('PREVIEW_COPY', () => {
  it('the chip names the deployment', () => {
    expect(PREVIEW_COPY.chip('staging')).toBe('Staging · Read only');
    expect(PREVIEW_COPY.chip('production')).toBe('Production · Read only');
  });
  it('"Preview ended" says why', () => {
    expect(PREVIEW_COPY.ended.body('Amara', 'max_length')).toMatch(/after 2 hours/);
    expect(PREVIEW_COPY.ended.body('Amara', 'idle')).toMatch(/30 minutes without activity/);
  });
  it('the Read only notice names the deployment in lower case', () => {
    expect(PREVIEW_COPY.readOnly.body('Staging').after).toContain(' in staging,');
  });
});
