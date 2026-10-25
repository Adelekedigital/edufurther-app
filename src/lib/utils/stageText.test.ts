import { STAGE_CHIPS } from './sessionTypeDraft';
import { stageText } from './stageText';

describe('stageText', () => {
  it('says each stage in the wizard’s words, in order, once; none is null', () => {
    expect(stageText(['applying', 'exploring'])).toBe('Applying, Exploring');
    expect(
      stageText([
        'exploring',
        'researching',
        'preparing_documents',
        'applying',
        'interview_prep',
        'awaiting_decision',
      ]),
    ).toBe(
      'Exploring, Researching schools & scholarships, Preparing documents, Applying, Preparing for interview, Waiting for a decision',
    );
    expect(stageText([])).toBeNull();
  });
});

describe('STAGE_CHIPS', () => {
  it('offers the design’s six, in its order', () => {
    expect(STAGE_CHIPS).toEqual([
      'exploring',
      'researching',
      'preparing_documents',
      'applying',
      'interview_prep',
      'awaiting_decision',
    ]);
  });
});
