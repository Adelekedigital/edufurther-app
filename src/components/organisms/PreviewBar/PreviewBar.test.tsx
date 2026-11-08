import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import type { AppEnv } from '@/lib/copy/preview';
import { PreviewBar } from './PreviewBar';

const amara: PreviewUser = {
  id: 'u-1',
  email: 'amara.okafor@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee',
};

function setup(over: Partial<Parameters<typeof PreviewBar>[0]> = {}) {
  const props = {
    user: amara as PreviewUser | null,
    env: 'production' as AppEnv,
    pickerOpen: false,
    pickerId: 'picker',
    onTogglePicker: vi.fn(),
    onExit: vi.fn(),
    ...over,
  };
  const ref = createRef<HTMLButtonElement>();
  render(<PreviewBar ref={ref} {...props} />);
  return { props, ref, bar: screen.getByRole('region', { name: 'Preview as user' }) };
}

describe('PreviewBar', () => {
  it('nobody picked: "Choose a user", no "Name · Role"', () => {
    const { bar } = setup({ user: null });
    const pick = within(bar).getByRole('button', { name: 'Choose a user to preview as' });
    expect(pick).toHaveTextContent('Choose a user');
    expect(bar).not.toHaveTextContent('Mentee');
  });

  it('previewing: the email on the picker button, "Name · Role" beside it', () => {
    const { bar } = setup();
    const pick = within(bar).getByRole('button', {
      name: 'Previewing as amara.okafor@example.com. Switch user',
    });
    expect(pick).toHaveTextContent('amara.okafor@example.com');
    expect(bar).toHaveTextContent('Amara Okafor · Mentee');
  });

  it('the picker button: aria-expanded, and aria-controls only while open', () => {
    setup({ pickerOpen: true, picker: <div id="picker">Picker panel</div> });
    const pick = screen.getByRole('button', { name: /Switch user/ });
    expect(pick).toHaveAttribute('aria-expanded', 'true');
    expect(pick).toHaveAttribute('aria-controls', 'picker');
    expect(pick).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.getByText('Picker panel')).toBeInTheDocument();
  });

  it('closed: no picker, aria-expanded false, no aria-controls', () => {
    setup({ picker: <div>Picker panel</div> });
    const pick = screen.getByRole('button', { name: /Switch user/ });
    expect(pick).toHaveAttribute('aria-expanded', 'false');
    expect(pick).not.toHaveAttribute('aria-controls');
    expect(screen.queryByText('Picker panel')).toBeNull();
  });

  it.each([
    ['production', 'Production · Read only'],
    ['staging', 'Staging · Read only'],
    ['development', 'Development · Read only'],
  ] as const)('the chip names the deployment: %s', (env, text) => {
    const { bar } = setup({ env });
    expect(within(bar).getByText(text)).toBeInTheDocument();
    // Phones get the short label.
    expect(within(bar).getByText('Read only')).toBeInTheDocument();
  });

  it('the picker button toggles; Exit exits', async () => {
    const { props } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Switch user/ }));
    expect(props.onTogglePicker).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Exit preview' }));
    expect(props.onExit).toHaveBeenCalledOnce();
  });

  it('the ref is the picker button, so closing the picker can return focus', () => {
    const { ref } = setup();
    expect(ref.current).toBe(screen.getByRole('button', { name: /Switch user/ }));
  });
});
