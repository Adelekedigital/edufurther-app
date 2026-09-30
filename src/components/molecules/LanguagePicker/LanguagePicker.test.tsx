import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguagePicker } from './LanguagePicker';

const base = {
  label: 'Languages you mentor in',
  selected: [{ id: 'en', label: 'English' }],
  results: [
    { id: 'en', label: 'English' },
    { id: 'fr', label: 'French' },
  ],
  query: '',
  onQueryChange: vi.fn(),
  onToggle: vi.fn(),
  status: 'ready' as const,
  onRetry: vi.fn(),
};

describe('LanguagePicker', () => {
  it('pills remove, rows toggle and say whether they’re picked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<LanguagePicker {...base} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'French' }));
    expect(onToggle).toHaveBeenLastCalledWith({ id: 'fr', label: 'French' });
    await user.click(screen.getByRole('button', { name: 'Remove English' }));
    expect(onToggle).toHaveBeenLastCalledWith({ id: 'en', label: 'English' });
  });

  it('the search’s progress and outcome are announced (review of #85)', () => {
    const { rerender } = render(<LanguagePicker {...base} results={[]} status="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading languages…');
    rerender(<LanguagePicker {...base} results={[]} query="zz" />);
    expect(screen.getByRole('status')).toHaveTextContent('No languages match “zz”.');
    rerender(<LanguagePicker {...base} />);
    expect(screen.getByRole('status')).toHaveTextContent('2 languages');
  });

  it('the error is read on the search field, where focus goes (review of #85)', () => {
    render(<LanguagePicker {...base} selected={[]} error="Add a language you mentor in." />);
    expect(screen.getByRole('searchbox', { name: 'Search languages' })).toHaveAccessibleDescription(
      'Add a language you mentor in.',
    );
  });

  it('a failed search offers Try again', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<LanguagePicker {...base} results={[]} status="error" onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
