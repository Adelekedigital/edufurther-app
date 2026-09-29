import { planHoursSave, toWeeklyHours } from './weeklyHours';

const rule = (id: string, day: number, start: string, end: string, active = true) => ({
  id,
  day_of_week: day,
  start_time: start,
  end_time: end,
  timezone: 'Africa/Lagos',
  is_active: active,
});

describe('toWeeklyHours', () => {
  it('groups active rules by day, sorted; midnight ends the day; paused rules are left out', () => {
    const w = toWeeklyHours(
      [
        rule('a', 1, '17:00:00', '20:00:00'),
        rule('b', 1, '09:00:00', '10:30:00'),
        rule('c', 6, '22:00:00', '00:00:00'),
        rule('d', 3, '09:00:00', '10:00:00', false),
      ],
      'Europe/London',
    );
    expect(w.days[1]).toEqual({
      on: true,
      slots: [
        [540, 630],
        [1020, 1200],
      ],
    });
    expect(w.days[6]).toEqual({ on: true, slots: [[1320, 1440]] });
    expect(w.days[3]!.on).toBe(false);
    expect(w.timeZone).toBe('Africa/Lagos');
    expect(w.rules.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('with no hours, the zone is this device’s', () => {
    expect(toWeeklyHours([], 'Europe/London').timeZone).toBe('Europe/London');
  });
});

describe('planHoursSave', () => {
  it('changes only what changed: removed hours deleted, new ones added, the rest kept', () => {
    const rules = [rule('a', 1, '17:00:00', '20:00:00'), rule('b', 2, '17:00:00', '20:00:00')];
    const days = toWeeklyHours(rules, 'Africa/Lagos').days.map((d) => ({
      ...d,
      slots: d.slots.map((s) => [...s] as [number, number]),
    }));
    days[2] = { on: false, slots: [[1020, 1200]] }; // Tuesday off
    days[5] = { on: true, slots: [[540, 600]] }; // Friday added
    const plan = planHoursSave(rules, days);
    expect(plan.remove.map((r) => r.id)).toEqual(['b']);
    expect(plan.add).toEqual([{ day: 5, slot: [540, 600] }]);
  });

  it('an edited slot is a delete and an add', () => {
    const rules = [rule('a', 1, '17:00:00', '20:00:00')];
    const days = toWeeklyHours(rules, 'Africa/Lagos').days;
    days[1] = { on: true, slots: [[1020, 1260]] };
    const plan = planHoursSave(rules, days);
    expect(plan.remove.map((r) => r.id)).toEqual(['a']);
    expect(plan.add).toEqual([{ day: 1, slot: [1020, 1260] }]);
  });
});
