import { render, screen } from '@testing-library/react';
import { Input } from '@/components/atoms/Input/Input';
import { FormField } from './FormField';

describe('FormField', () => {
  it('labels the control and describes it by the hint', () => {
    render(
      <FormField label="Session name" hint="Be specific.">
        {(f) => <Input {...f} />}
      </FormField>,
    );
    const input = screen.getByRole('textbox', { name: 'Session name' });
    expect(input).toHaveAccessibleDescription('Be specific.');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('an error marks the control invalid and is read before the hint', () => {
    render(
      <FormField label="Session name" hint="Be specific." error="Give your session a name.">
        {(f) => <Input {...f} />}
      </FormField>,
    );
    const input = screen.getByRole('textbox', { name: 'Session name' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Give your session a name. Be specific.');
  });
});
