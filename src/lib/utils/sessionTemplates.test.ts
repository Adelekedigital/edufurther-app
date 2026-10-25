import { SESSION_TEMPLATES, templateHint } from './sessionTemplates';

describe('templateHint', () => {
  it('leads with what the template is for, then its length and questions (design copy)', () => {
    expect(SESSION_TEMPLATES.map(templateHint)).toEqual([
      'Line-by-line feedback on your statement of purpose. 60 min · 2 questions',
      'Practice the questions visa officers ask, and get feedback. 45 min · 1 question',
      'Narrow your list to programs that fit your goals. 30 min · 1 question',
    ]);
  });
});
