import { render, screen } from '@testing-library/react';
import { TabPanel } from './TabPanel';

describe('TabPanel', () => {
  it('selected: a tabpanel labelled by its tab', () => {
    render(
      <>
        <button id="p-tab">Tab</button>
        <TabPanel id="p" active>
          Body
        </TabPanel>
      </>,
    );
    expect(screen.getByRole('tabpanel', { name: 'Tab' })).toHaveTextContent('Body');
  });

  it('not selected: gone, unless kept, then hidden with what it holds', () => {
    const { rerender } = render(
      <TabPanel id="p" active={false}>
        <input aria-label="Draft" defaultValue="half-written" />
      </TabPanel>,
    );
    expect(document.getElementById('p')).toBeNull();
    rerender(
      <TabPanel id="p" active={false} keepMounted>
        <input aria-label="Draft" defaultValue="half-written" />
      </TabPanel>,
    );
    expect(document.getElementById('p')).toHaveAttribute('hidden');
    expect(screen.queryByRole('tabpanel')).toBeNull();
    rerender(
      <TabPanel id="p" active keepMounted>
        <input aria-label="Draft" defaultValue="half-written" />
      </TabPanel>,
    );
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('half-written');
  });
});
