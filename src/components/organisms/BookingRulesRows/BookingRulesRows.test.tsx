import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BOOKING_COPY } from '@/lib/copy/mentorSettings';
import { BookingRulesRows } from './BookingRulesRows';
import { optionLabels, pickOption } from '@/test-utils/select';

describe('BookingRulesRows', () => {
  // A caller may pass a wider object (the session wizard passes its whole
  // draft); a change must patch only the four rules, or it rewrites the rest.
  it('a change sends only the four rules, the changed one updated', async () => {
    const onChange = vi.fn();
    const value = {
      durationMin: 60,
      noticeHours: 24,
      windowDays: 28,
      breakMin: 15,
      name: 'SOP review',
      days: [],
    };
    render(
      <BookingRulesRows
        value={value}
        copy={BOOKING_COPY.rules}
        onChange={onChange}
        classes={{}}
        selectWidth={150}
      />,
    );
    await pickOption(userEvent, screen.getByRole('combobox', { name: 'Minimum notice' }), '48');
    expect(onChange).toHaveBeenCalledWith({
      durationMin: 60,
      noticeHours: 48,
      windowDays: 28,
      breakMin: 15,
    });
  });

  describe('booking window: presets and Custom… (owner, 2026-11-21)', () => {
    const base = { durationMin: 60, noticeHours: 24, windowDays: 28, breakMin: 15 };
    const setup = (windowDays = 28, maxWindowDays?: number) => {
      const onChange = vi.fn();
      render(
        <BookingRulesRows
          value={{ ...base, windowDays }}
          maxWindowDays={maxWindowDays}
          copy={BOOKING_COPY.rules}
          onChange={onChange}
          classes={{}}
          selectWidth={150}
        />,
      );
      const select = screen.getByRole('combobox', { name: 'Booking window' });
      return { onChange, select };
    };
    const openCustom = async (select: HTMLElement) => {
      await pickOption(userEvent, select, 'custom');
      return screen.getByRole('spinbutton', { name: 'Days ahead' });
    };

    it('lists the four presets, then Custom…', async () => {
      const { select } = setup();
      expect(await optionLabels(userEvent, select)).toEqual([
        '1 week',
        '2 weeks',
        '4 weeks',
        '8 weeks',
        'Custom…',
      ]);
    });

    it('a saved 35 shows as 5 weeks, selected', () => {
      const { select } = setup(35);
      expect(select).toHaveTextContent('5 weeks');
    });

    it('Custom… opens Days ahead, prefilled; a valid number is the new window', async () => {
      const { onChange, select } = setup();
      const input = await openCustom(select);
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue(28);
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveAttribute('min', '7');
      expect(input).toHaveAttribute('max', '56');
      expect(screen.getByText('7 to 56 days.')).toBeInTheDocument();
      await userEvent.clear(input);
      await userEvent.type(input, '10');
      expect(onChange).toHaveBeenLastCalledWith({ ...base, windowDays: 10 });
    });

    it('typing a valid two-digit window shows no error on the way (1 → 14)', async () => {
      const { onChange, select } = setup();
      const input = await openCustom(select);
      await userEvent.clear(input);
      await userEvent.type(input, '1');
      // "1" can still become 14: no error, nothing announced (review of PR 697).
      expect(screen.queryByRole('alert')).toBeNull();
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
      await userEvent.type(input, '4');
      expect(onChange).toHaveBeenLastCalledWith({ ...base, windowDays: 14 });
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it.each(['6', '60'])(
      '%s can never be saved: the error shows as typed, nothing is sent',
      async (typed) => {
        const { onChange, select } = setup();
        const input = await openCustom(select);
        await userEvent.clear(input);
        await userEvent.type(input, typed);
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent('Enter 7 to 56 days.');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input.getAttribute('aria-describedby')).toContain(
          screen.getByRole('alert').getAttribute('id'),
        );
      },
    );

    it('leaving on an unsavable number puts the saved window back and says so', async () => {
      const { onChange, select } = setup();
      const input = await openCustom(select);
      await userEvent.clear(input);
      await userEvent.type(input, '5');
      // "5" could still become 50: no error yet.
      expect(screen.queryByRole('alert')).toBeNull();
      await userEvent.tab();
      expect(input).toHaveValue(28);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent('Enter 7 to 56 days. Kept 4 weeks.');
    });

    it('Enter on an unsavable number puts the saved window back too', async () => {
      const { onChange, select } = setup();
      const input = await openCustom(select);
      await userEvent.clear(input);
      await userEvent.type(input, '60{Enter}');
      expect(input).toHaveValue(28);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('a platform cap under 56 narrows the custom range', async () => {
      const { onChange, select } = setup(14, 21);
      const input = await openCustom(select);
      expect(input).toHaveAttribute('max', '21');
      expect(screen.getByText('7 to 21 days.')).toBeInTheDocument();
      await userEvent.clear(input);
      await userEvent.type(input, '22');
      expect(screen.getByRole('alert')).toHaveTextContent('Enter 7 to 21 days.');
      await userEvent.tab();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('picking a preset again closes the custom field', async () => {
      const { onChange, select } = setup();
      await openCustom(select);
      await pickOption(userEvent, select, '14');
      expect(screen.queryByRole('spinbutton', { name: 'Days ahead' })).not.toBeInTheDocument();
      expect(onChange).toHaveBeenLastCalledWith({ ...base, windowDays: 14 });
    });

    it('a window reset from outside closes the custom field', async () => {
      const props = {
        copy: BOOKING_COPY.rules,
        onChange: vi.fn(),
        classes: {},
        selectWidth: 150,
      };
      const { rerender } = render(<BookingRulesRows {...props} value={base} />);
      const select = screen.getByRole('combobox', { name: 'Booking window' });
      const input = await openCustom(select);
      await userEvent.clear(input);
      await userEvent.type(input, '10');
      // The parent took 10, then discarded it back to 28.
      rerender(<BookingRulesRows {...props} value={{ ...base, windowDays: 10 }} />);
      expect(screen.getByRole('spinbutton', { name: 'Days ahead' })).toHaveValue(10);
      rerender(<BookingRulesRows {...props} value={base} />);
      expect(screen.queryByRole('spinbutton', { name: 'Days ahead' })).not.toBeInTheDocument();
      expect(select).toHaveTextContent('4 weeks');
    });
  });
});
