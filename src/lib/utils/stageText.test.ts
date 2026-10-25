import { STAGE_CHIPS } from './sessionTypeDraft';
import { stageText } from './stageText';

describe('stageText', () => {
  it('says each stage in the wizard’s words, in order, once', () => {
    expect(stageText(['drafting_stage', 'revisions'], null)).toBe('Drafting, Revising');
    expect(stageText(['early_exploration', 'exploring'], null)).toBe('Exploring');
  });

  it('reads the six PRD stages the backend now sends (backend PR 1)', () => {
    expect(
      stageText(
        [
          'exploring',
          'researching',
          'preparing_documents',
          'applying',
          'interview_prep',
          'awaiting_decision',
        ],
        null,
      ),
    ).toBe(
      'Exploring, Researching schools & scholarships, Preparing documents, Applying, Preparing for interview, Waiting for a decision',
    );
  });

  it('`other` is the mentor’s own words; none at all is null', () => {
    expect(stageText(['other'], ' Deferred admission ')).toBe('Deferred admission');
    expect(stageText(['other'], null)).toBeNull();
    expect(stageText([], null)).toBeNull();
  });
});

describe('STAGE_CHIPS', () => {
  it('still offers the five chips the wizard draws today', () => {
    expect(STAGE_CHIPS).toEqual([
      'early_exploration',
      'drafting_stage',
      'post_submission',
      'revisions',
      'interviewing',
    ]);
  });
});
