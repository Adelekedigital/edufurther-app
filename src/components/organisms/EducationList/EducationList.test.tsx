import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EDUCATION_COPY, SETTINGS_COPY } from '@/lib/copy/settings';
import type { EducationRow } from '@/lib/utils/educationLine';
import { EducationList } from './EducationList';

const rows: EducationRow[] = [
  {
    id: 'e1',
    degree: 'MSc',
    course: 'Public Health',
    school: 'UCL',
    start: '2023',
    end: '2024',
  },
  {
    id: 'e2',
    degree: 'BSc',
    course: 'Microbiology',
    school: 'University of Lagos',
    start: '2018',
    end: '2022',
  },
];

const setup = (props: Partial<Parameters<typeof EducationList>[0]> = {}) => {
  const handlers = { onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onRetry: vi.fn() };
  render(<EducationList status="ready" rows={rows} {...handlers} {...props} />);
  return { ...handlers, user: userEvent.setup() };
};

describe('EducationList', () => {
  it('a row per degree: title, school and years, and its own Edit and Delete', async () => {
    const { user, onEdit, onDelete } = setup();
    const section = screen.getByRole('region', { name: EDUCATION_COPY.title });
    const items = within(section).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent('BSc, Microbiology');
    expect(items[1]).toHaveTextContent('University of Lagos · 2018 – 2022');
    await user.click(screen.getByRole('button', { name: 'Edit BSc, Microbiology' }));
    expect(onEdit).toHaveBeenCalledWith('e2');
    await user.click(screen.getByRole('button', { name: 'Delete MSc, Public Health' }));
    expect(onDelete).toHaveBeenCalledWith('e1');
  });

  it('"Add education" sits in the header once there’s a degree', async () => {
    const { user, onAdd } = setup();
    const add = screen.getAllByRole('button', { name: EDUCATION_COPY.add });
    expect(add).toHaveLength(1);
    await user.click(add[0]!);
    expect(onAdd).toHaveBeenCalled();
    expect(screen.queryByText(EDUCATION_COPY.emptyTitle)).toBeNull();
  });

  it('empty: says what goes here, with the one Add', async () => {
    const { user, onAdd } = setup({ rows: [] });
    expect(screen.getByRole('heading', { name: EDUCATION_COPY.emptyTitle })).toBeInTheDocument();
    expect(screen.getByText(EDUCATION_COPY.emptyBody)).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    const add = screen.getAllByRole('button', { name: EDUCATION_COPY.add });
    expect(add).toHaveLength(1);
    await user.click(add[0]!);
    expect(onAdd).toHaveBeenCalled();
  });

  it('a failed load is an alert with Try again, never the empty state', async () => {
    const { user, onRetry } = setup({ status: 'error', rows: [] });
    expect(screen.getByRole('alert')).toHaveTextContent(SETTINGS_COPY.loadError);
    expect(screen.queryByText(EDUCATION_COPY.emptyTitle)).toBeNull();
    expect(screen.queryByRole('button', { name: EDUCATION_COPY.add })).toBeNull();
    await user.click(screen.getByRole('button', { name: SETTINGS_COPY.retry }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('Try again waits while a retry is out', () => {
    setup({ status: 'error', rows: [], retrying: true });
    expect(screen.getByRole('button', { name: SETTINGS_COPY.retry })).toBeDisabled();
  });

  it('loading: the rows’ shapes, announced busy, no Add yet', () => {
    setup({ status: 'loading', rows: [] });
    expect(screen.getByLabelText(EDUCATION_COPY.loading)).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button', { name: EDUCATION_COPY.add })).toBeNull();
    expect(screen.queryByText(EDUCATION_COPY.emptyTitle)).toBeNull();
  });
});
