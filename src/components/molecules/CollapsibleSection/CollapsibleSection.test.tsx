import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from './CollapsibleSection';

const section = (props: Partial<Parameters<typeof CollapsibleSection>[0]> = {}) => (
  <CollapsibleSection
    title="Weekly availability"
    summary="Mon–Fri · 9 am–5 pm. Tap to view"
    chip="40 hrs a week"
    {...props}
  >
    <input aria-label="Draft" defaultValue="kept" />
  </CollapsibleSection>
);

describe('CollapsibleSection', () => {
  it('starts closed: the header names the section, the chip and summary describe it', () => {
    render(section());
    const header = screen.getByRole('button', { name: 'Weekly availability' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(header).toHaveAccessibleDescription('40 hrs a week Mon–Fri · 9 am–5 pm. Tap to view');
    expect(screen.getByRole('heading', { level: 2, name: 'Weekly availability' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Draft' })).toBeNull();
  });

  it('opens on a click, drops the summary, and keeps the body’s state across a close', async () => {
    render(section());
    const header = screen.getByRole('button', { name: 'Weekly availability' });
    await userEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Mon–Fri · 9 am–5 pm. Tap to view')).toBeNull();
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    expect(header).toHaveAttribute('aria-controls', draft.parentElement!.id);
    await userEvent.clear(draft);
    await userEvent.type(draft, 'edited');
    await userEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(header);
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('edited');
  });

  it('opens again by itself when defaultOpen turns on', async () => {
    const { rerender } = render(section());
    rerender(section({ defaultOpen: true }));
    expect(screen.getByRole('button', { name: 'Weekly availability' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('draws the chip in its tone as a rounded rectangle', () => {
    render(section({ chip: 'Fix hours', chipTone: 'danger' }));
    expect(screen.getByText('Fix hours')).toHaveClass('danger', 'rect');
  });
});
