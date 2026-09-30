/** A catalog topic (service offering) as the pickers show it. */
export type TopicOption = { id: string; slug: string; label: string };
export type TopicGroup = { label: string; items: TopicOption[] };

/**
 * The owner's topic picker groups (ProfileItemModal.dc.html `TOPICS`), in the
 * design's order. The catalog has no groups of its own, so each offering is
 * placed by its slug (backend: six closed, stable slugs).
 */
const GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'Applications', slugs: ['document-preparation'] },
  { label: 'Choosing where to go', slugs: ['school-selection', 'program-selection'] },
  { label: 'Funding', slugs: ['scholarships-financial-aid'] },
  { label: 'Interviews and tests', slugs: ['interview-preparation', 'test-preparation'] },
];

/**
 * Catalog topics under the design's four headings, in catalog order within
 * each. A topic the map doesn't know (added to the catalog later) joins the
 * last group rather than disappearing (design-divergence.md). Empty groups are
 * left out.
 */
export function groupTopics(topics: TopicOption[]): TopicGroup[] {
  const groups = GROUPS.map((g) => ({ label: g.label, items: [] as TopicOption[] }));
  for (const t of topics) {
    const i = GROUPS.findIndex((g) => g.slugs.includes(t.slug));
    groups[i === -1 ? groups.length - 1 : i]!.items.push(t);
  }
  return groups.filter((g) => g.items.length > 0);
}
