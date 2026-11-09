import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from '../SearchField/SearchField';
import { FilterBar, type FilterField } from './FilterBar';

function Host({ lead = false, liveCount = false }: { lead?: boolean; liveCount?: boolean }) {
  const [q, setQ] = useState('');
  const [to, setTo] = useState('all');
  const fields: FilterField[] = [
    {
      key: 'to',
      label: 'Goes to',
      options: [
        { value: 'all', label: 'Everyone' },
        { value: 'admins', label: 'Admins' },
      ],
      value: to,
      changed: to !== 'all',
      onChange: setTo,
    },
  ];
  return (
    <FilterBar
      label="Search and filter emails"
      layout={lead ? 'fill' : 'fixed'}
      lead={
        lead ? (
          <SearchField
            labelled="filter"
            label="Search"
            value={q}
            onChange={setQ}
            onClear={() => setQ('')}
          />
        ) : undefined
      }
      fields={fields}
      count={to === 'all' ? 'Showing 3 of 3' : 'Showing 1 of 3'}
      liveCount={liveCount}
      clearLabel="Clear filters"
      active={!!q || to !== 'all'}
      onClear={() => {
        setQ('');
        setTo('all');
      }}
    />
  );
}

async function pickAdmins() {
  await userEvent.click(screen.getByRole('combobox', { name: 'Goes to' }));
  await userEvent.click(screen.getByRole('option', { name: 'Admins' }));
}

describe('FilterBar', () => {
  it('is a named group of labelled filters with the count', () => {
    render(<Host />);
    expect(screen.getByRole('group', { name: 'Search and filter emails' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Goes to' })).toBeInTheDocument();
    expect(screen.getByText('Showing 3 of 3')).not.toHaveAttribute('aria-live');
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('liveCount announces the count', () => {
    render(<Host liveCount />);
    expect(screen.getByText('Showing 3 of 3')).toHaveAttribute('aria-live', 'polite');
  });

  it('no count while there is none (null): nothing shows', () => {
    render(
      <FilterBar
        label="Filters"
        fields={[]}
        count={null}
        clearLabel="Clear filters"
        active={false}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it('Clear filters, with no lead: focus goes to the first filter', async () => {
    render(<Host />);
    await pickAdmins();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    await new Promise((r) => requestAnimationFrame(r));
    expect(screen.getByRole('combobox', { name: 'Goes to' })).toHaveFocus();
  });

  it('Clear filters, with a search lead: it clears too, and focus goes to the search', async () => {
    render(<Host lead />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'credits');
    await pickAdmins();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await new Promise((r) => requestAnimationFrame(r));
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus();
  });
});
