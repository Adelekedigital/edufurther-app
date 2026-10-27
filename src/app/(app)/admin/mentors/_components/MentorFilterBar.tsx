import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Select, type SelectOption } from '@/components/atoms/Select/Select';
import type { MentorTab } from '@/lib/api/data/adminMentors';
import { MENTOR_DATE_WORD, MENTOR_FILTERS as F } from '@/lib/copy/adminMentors';
import { defaultSort, NO_FILTERS, type MentorFilters } from './mentorList';
import styles from './MentorFilterBar.module.css';

const opts = (o: Record<string, string>): SelectOption[] =>
  Object.entries(o).map(([value, label]) => ({ value, label }));

type Props = {
  tab: MentorTab;
  filters: MentorFilters;
  onChange: (f: MentorFilters) => void;
  shown: number;
  total: number;
  active: boolean;
  onClear: () => void;
};

/**
 * The filter row (Admin.dc.html `mFilters`): the tab's date, waiting time on
 * Applications, show-up rate on Approved, and the sort. A changed one wears
 * Select's `changed` look. The count and Clear filters sit on the right.
 */
export function MentorFilterBar({ tab, filters, onChange, shown, total, active, onClear }: Props) {
  const base = useId();
  const word = MENTOR_DATE_WORD[tab];
  const sort = filters.sort ?? defaultSort(tab);
  const sorts: SelectOption[] = [
    ...(tab === 'applications'
      ? [
          { value: 'longest', label: F.sort.longest },
          { value: 'shortest', label: F.sort.shortest },
        ]
      : []),
    { value: 'newest', label: F.sort.newest(word) },
    { value: 'oldest', label: F.sort.oldest(word) },
    { value: 'az', label: F.sort.az },
    { value: 'za', label: F.sort.za },
  ];
  const fields = [
    {
      key: 'date',
      label: F.date.label(word),
      options: opts(F.date.options),
      value: filters.date,
      changed: filters.date !== NO_FILTERS.date,
      set: (v: string) => onChange({ ...filters, date: v as MentorFilters['date'] }),
    },
    ...(tab === 'applications'
      ? [
          {
            key: 'wait',
            label: F.wait.label,
            options: opts(F.wait.options),
            value: filters.wait,
            changed: filters.wait !== NO_FILTERS.wait,
            set: (v: string) => onChange({ ...filters, wait: v as MentorFilters['wait'] }),
          },
        ]
      : []),
    ...(tab === 'approved'
      ? [
          {
            key: 'showUp',
            label: F.showUp.label,
            options: opts(F.showUp.options),
            value: filters.showUp,
            changed: filters.showUp !== NO_FILTERS.showUp,
            set: (v: string) => onChange({ ...filters, showUp: v as MentorFilters['showUp'] }),
          },
        ]
      : []),
    {
      key: 'sort',
      label: F.sort.label,
      options: sorts,
      value: sort,
      changed: sort !== defaultSort(tab),
      set: (v: string) => onChange({ ...filters, sort: v as MentorFilters['sort'] }),
    },
  ];
  return (
    <div role="group" aria-label={F.group} className={styles.bar}>
      {fields.map((f) => (
        <div key={f.key} className={styles.field}>
          <span id={`${base}-${f.key}`} className={styles.label}>
            {f.label}
          </span>
          <Select
            aria-labelledby={`${base}-${f.key}`}
            density="md"
            text="sm"
            changed={f.changed}
            options={f.options}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className={styles.select}
          />
        </div>
      ))}
      <div className={styles.end}>
        {/* Not a live region: the list's own count is announced by the screen. */}
        <span className={styles.count}>{F.count(shown, total)}</span>
        {active && (
          <Button variant="text" size="small" onClick={onClear}>
            {F.clear}
          </Button>
        )}
      </div>
    </div>
  );
}
