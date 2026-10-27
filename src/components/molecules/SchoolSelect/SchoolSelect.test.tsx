import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SchoolSelect, type SchoolSearch, type SchoolValue } from './SchoolSelect';

const lagos = {
  id: 'inst-lagos',
  name: 'University of Lagos',
  countryId: null,
  countryLabel: 'Nigeria',
};
const covenant = {
  id: 'inst-cov',
  name: 'Covenant University',
  countryId: null,
  countryLabel: 'Nigeria',
};

/** Each change the field reports; `seen()` is the latest. */
const report = vi.fn<(next: SchoolValue) => void>();
const seen = () => report.mock.lastCall![0];
beforeEach(() => report.mockClear());

function Harness({ start, search }: { start: SchoolValue; search: SchoolSearch }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <label htmlFor="school">School</label>
      <SchoolSelect
        id="school"
        placeholder="e.g. Mississippi State University"
        failedCopy="We couldn’t search schools."
        value={value}
        onChange={(next) => {
          report(next);
          setValue(next);
        }}
        search={search}
      />
      <button type="button">After</button>
    </>
  );
}

const search = (over: Partial<SchoolSearch> = {}): SchoolSearch => ({
  options: [],
  term: '',
  isLoading: false,
  isError: false,
  retry: () => undefined,
  ...over,
});
const saved = { name: 'University of Lagos', institutionId: 'inst-lagos' };
const box = () => screen.getByRole('combobox', { name: 'School' });

describe('SchoolSelect: the id follows the school, not the keystroke', () => {
  it('retyping the saved name keeps its id, even when the search doesn’t list it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness start={saved} search={search()} />);
    await user.clear(box());
    await user.type(box(), 'university of lagos');
    expect(seen().institutionId).toBe('inst-lagos');
    rerender(<Harness start={saved} search={search({ term: 'university of lagos' })} />);
    await user.click(screen.getByRole('button', { name: 'After' }));
    expect(seen()).toEqual({ name: 'university of lagos', institutionId: 'inst-lagos' });
  });

  it('a different listed name gets that school’s id once the search answers for it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness start={saved} search={search()} />);
    await user.clear(box());
    await user.type(box(), 'Covenant University');
    rerender(
      <Harness
        start={saved}
        search={search({ term: 'Covenant University', options: [covenant] })}
      />,
    );
    expect(seen()).toEqual({ name: 'Covenant University', institutionId: 'inst-cov' });
  });

  it('an unlisted name has no id once the search answers', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness start={saved} search={search()} />);
    await user.clear(box());
    await user.type(box(), 'Zaria Annex College');
    rerender(<Harness start={saved} search={search({ term: 'Zaria Annex College' })} />);
    expect(seen()).toEqual({ name: 'Zaria Annex College', institutionId: null });
  });

  it('a name two schools share links neither until a row is picked', async () => {
    const user = userEvent.setup();
    const covenantGhana = { ...covenant, id: 'inst-cov-gh', countryLabel: 'Ghana' };
    const { rerender } = render(<Harness start={saved} search={search()} />);
    await user.clear(box());
    await user.type(box(), 'Covenant University');
    rerender(
      <Harness
        start={saved}
        search={search({ term: 'Covenant University', options: [covenant, covenantGhana] })}
      />,
    );
    expect(seen()).toEqual({ name: 'Covenant University', institutionId: null });
  });

  it('stale results keep the id until the search answers for what’s typed', async () => {
    const user = userEvent.setup();
    // The last query's answer (it listed Lagos), and a fetch still running.
    const stale = search({ term: 'Uni', options: [lagos, covenant] });
    const { rerender } = render(<Harness start={saved} search={stale} />);
    await user.clear(box());
    await user.type(box(), 'Covenant University');
    rerender(<Harness start={saved} search={{ ...stale, isLoading: true }} />);
    expect(seen().institutionId).toBe('inst-lagos');
    rerender(
      <Harness
        start={saved}
        search={search({ term: 'Covenant University', options: [covenant] })}
      />,
    );
    expect(seen().institutionId).toBe('inst-cov');
  });

  it('a failed search changes nothing until the field is left; a new name then has no id', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness start={saved} search={search()} />);
    await user.clear(box());
    await user.type(box(), 'Zaria Annex College');
    rerender(
      <Harness start={saved} search={search({ term: 'Zaria Annex College', isError: true })} />,
    );
    expect(seen().institutionId).toBe('inst-lagos');
    await user.click(screen.getByRole('button', { name: 'After' }));
    expect(seen()).toEqual({ name: 'Zaria Annex College', institutionId: null });
  });

  it('picking a row always sets its id', async () => {
    const user = userEvent.setup();
    const listed = search({ term: 'Cov', options: [covenant] });
    render(<Harness start={saved} search={listed} />);
    await user.clear(box());
    await user.type(box(), 'Cov');
    await user.click(screen.getByRole('option', { name: /Covenant University/ }));
    expect(seen()).toEqual({ name: 'Covenant University', institutionId: 'inst-cov' });
  });
});
