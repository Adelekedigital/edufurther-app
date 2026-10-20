import { render, screen } from '@testing-library/react';
import { Snackbar } from './Snackbar';

describe('Snackbar', () => {
  it('the region is there first; the same words again are put in afresh', () => {
    const { rerender } = render(<Snackbar message={null} />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    rerender(<Snackbar message="Education updated" stamp={1} />);
    const first = region.firstElementChild;
    expect(region).toHaveTextContent('Education updated');
    rerender(<Snackbar message="Education updated" stamp={2} />);
    expect(screen.getByRole('status')).toBe(region);
    expect(region.firstElementChild).not.toBe(first);
  });
});
