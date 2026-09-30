import { groupTopics } from './topicGroups';

const t = (slug: string) => ({ id: `id-${slug}`, slug, label: slug });

describe('groupTopics', () => {
  it('puts the six catalog topics under the design’s four headings, in order', () => {
    const groups = groupTopics(
      [
        'test-preparation',
        'document-preparation',
        'school-selection',
        'program-selection',
        'scholarships-financial-aid',
        'interview-preparation',
      ].map(t),
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.slug)])).toEqual([
      ['Applications', ['document-preparation']],
      ['Choosing where to go', ['school-selection', 'program-selection']],
      ['Funding', ['scholarships-financial-aid']],
      ['Interviews and tests', ['test-preparation', 'interview-preparation']],
    ]);
  });

  it('a topic it doesn’t know joins the last group instead of vanishing', () => {
    const groups = groupTopics([t('school-selection'), t('new-thing')]);
    expect(groups.map((g) => g.label)).toEqual(['Choosing where to go', 'Interviews and tests']);
    expect(groups[1]!.items[0]!.slug).toBe('new-thing');
  });

  it('leaves out empty groups', () => {
    expect(groupTopics([])).toEqual([]);
  });
});
