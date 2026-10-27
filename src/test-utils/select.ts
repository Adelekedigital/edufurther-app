/**
 * Driving the shared Select (atoms/Select) in tests, as a person does: open
 * it, then click a row. It draws its own list, so `userEvent.selectOptions`
 * no longer applies.
 */
import { within } from '@testing-library/react';

type Clicker = { click: (el: Element) => Promise<void> };

function openList(combobox: HTMLElement): HTMLElement {
  const list = document.getElementById(combobox.getAttribute('aria-controls') ?? '');
  if (!list) throw new Error('Select: the list did not open');
  return list;
}

async function open(user: Clicker, combobox: HTMLElement) {
  if (combobox.getAttribute('aria-expanded') !== 'true') await user.click(combobox);
  return openList(combobox);
}

/** Opens the Select and clicks the row with this value (else this label). */
export async function pickOption(user: Clicker, combobox: HTMLElement, choice: string) {
  const list = await open(user, combobox);
  const row =
    list.querySelector(`[data-value="${CSS.escape(choice)}"]`) ??
    within(list).getByRole('option', { name: choice });
  await user.click(row);
}

/** The rows' labels, read from the opened list (left open). */
export async function optionLabels(user: Clicker, combobox: HTMLElement): Promise<string[]> {
  const list = await open(user, combobox);
  return within(list)
    .getAllByRole('option')
    .map((o) => o.querySelector('span')?.textContent ?? '');
}

/** The rows' values, read from the opened list (left open). */
export async function optionValues(user: Clicker, combobox: HTMLElement): Promise<string[]> {
  const list = await open(user, combobox);
  return within(list)
    .getAllByRole('option')
    .map((o) => o.getAttribute('data-value') ?? '');
}
