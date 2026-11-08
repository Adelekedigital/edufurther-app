import { useId, type ReactNode, type Ref } from 'react';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Switch } from '@/components/atoms/Switch/Switch';
import styles from './SwitchRow.module.css';

export type SwitchRowClasses = Partial<
  Record<'row' | 'text' | 'label' | 'hint' | 'switch', string>
>;

export type SwitchRowProps = {
  /** The switch's name, shown. */
  label: ReactNode;
  /** The line under it: the switch's description. */
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** A change is on its way: the switch waits, and says it's busy. */
  busy?: boolean;
  /** The value isn't known yet: a switch-sized skeleton in its place. */
  loading?: boolean;
  /** No switch at all (it can't be changed here); the text says why. */
  noSwitch?: boolean;
  /** The label as a heading, when the row is its own card's title. */
  labelAs?: 'span' | 'h2' | 'h3';
  labelRef?: Ref<HTMLElement>;
  /** Focusable label (tabIndex -1), for moving focus to it when the switch goes. */
  labelFocusable?: boolean;
  /** Announce hint changes (a hint that says why the switch went). */
  hintLive?: boolean;
  /** Before the text, e.g. an icon tile. */
  leading?: ReactNode;
  /** Under the hint, e.g. an error line. */
  after?: ReactNode;
  switchRef?: Ref<HTMLButtonElement>;
  /**
   * Each design's own frame and type, in place of the DS default for that part
   * (replaced, not layered: two modules' order on the page is not ours to pick).
   */
  classes?: SwitchRowClasses;
};

/**
 * A setting that's on or off: its name, a line about it, and the switch
 * (Message emails, the cover's topic art, Visible to mentees, approval,
 * Notifications on this device). One place for the wiring every one of them
 * needs: the switch is named by the label and described by the hint, a
 * skeleton while the value loads, busy while a change is on its way. Each
 * screen keeps its design's look through `classes`.
 */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
  busy,
  loading,
  noSwitch,
  labelAs: Label = 'span',
  labelRef,
  labelFocusable,
  hintLive,
  leading,
  after,
  switchRef,
  classes = {},
}: SwitchRowProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  return (
    <div className={classes.row ?? styles.row}>
      {leading}
      <span className={classes.text ?? styles.text}>
        <Label
          id={labelId}
          ref={labelRef as Ref<HTMLHeadingElement & HTMLSpanElement>}
          tabIndex={labelFocusable ? -1 : undefined}
          className={classes.label ?? styles.label}
        >
          {label}
        </Label>
        {hint !== undefined && (
          <span
            id={hintId}
            className={classes.hint ?? styles.hint}
            aria-live={hintLive ? 'polite' : undefined}
          >
            {hint}
          </span>
        )}
        {after}
      </span>
      {noSwitch ? null : loading ? (
        <Skeleton width="39px" height="24px" radius="full" />
      ) : (
        <Switch
          ref={switchRef}
          checked={checked}
          onChange={onChange}
          disabled={disabled || busy}
          aria-busy={busy || undefined}
          aria-labelledby={labelId}
          aria-describedby={hint !== undefined ? hintId : undefined}
          className={classes.switch}
        />
      )}
    </div>
  );
}
