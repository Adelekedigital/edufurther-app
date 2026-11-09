import type { SelectOption } from '@/components/atoms/Select/Select';
import { FilterBar, type FilterField } from '@/components/molecules/FilterBar/FilterBar';
import type { MentorTab } from '@/lib/api/data/adminMentors';
import { MENTOR_DATE_WORD, MENTOR_FILTERS as F } from '@/lib/copy/adminMentors';
import { defaultSort, NO_FILTERS, type MentorFilters } from './mentorList';

const opts = (o: Record<string, string>): SelectOption[] =>
  Object.entries(o).map(([value, label]) => ({ value, label }));

type Props = {
  tab: MentorTab;
  filters: MentorFilters;
  onChange: (f: MentorFilters) => void;
  /** Null until the tab has loaded: no "0 mentors" while it's on its way. */
  shown: number | null;
  total: number;
  active: boolean;
  onClear: () => void;
};

/**
 * The filter row (Admin.dc.html `mFilters`): the tab's date, waiting time on
 * Applications, show-up rate on Approved, and the sort, in the shared
 * FilterBar. A changed one wears Select's `changed` look.
 */
export function MentorFilterBar({ tab, filters, onChange, shown, total, active, onClear }: Props) {
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
  const fields: FilterField[] = [
    {
      key: 'date',
      label: F.date.label(word),
      options: opts(F.date.options),
      value: filters.date,
      changed: filters.date !== NO_FILTERS.date,
      onChange: (v: string) => onChange({ ...filters, date: v as MentorFilters['date'] }),
    },
    ...(tab === 'applications'
      ? [
          {
            key: 'wait',
            label: F.wait.label,
            options: opts(F.wait.options),
            value: filters.wait,
            changed: filters.wait !== NO_FILTERS.wait,
            onChange: (v: string) => onChange({ ...filters, wait: v as MentorFilters['wait'] }),
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
            onChange: (v: string) => onChange({ ...filters, showUp: v as MentorFilters['showUp'] }),
          },
        ]
      : []),
    {
      key: 'sort',
      label: F.sort.label,
      options: sorts,
      value: sort,
      changed: sort !== defaultSort(tab),
      onChange: (v: string) => onChange({ ...filters, sort: v as MentorFilters['sort'] }),
    },
  ];
  return (
    <FilterBar
      label={F.group}
      fields={fields}
      // Not a live region: the list's own count is announced by the screen.
      count={shown === null ? null : F.count(shown, total)}
      clearLabel={F.clear}
      active={active}
      onClear={onClear}
    />
  );
}
