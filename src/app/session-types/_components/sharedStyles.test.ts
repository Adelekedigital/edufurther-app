import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Several screens here share SessionTypesScreen.module.css. A class one of them
// still uses must stay in it: `.buttons` was moved out with the list's confirms
// and the form's popups (Published, Saved, Discard) lost their button row.
// Tests can't see this (CSS modules return any name), so check the source.
const dir = join(process.cwd(), 'src/app/session-types/_components');
const CSS = 'SessionTypesScreen.module.css';

it(`every class used from ${CSS} is defined in it`, () => {
  const css = readFileSync(join(dir, CSS), 'utf8');
  const defined = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));
  const missing: string[] = [];
  for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))) {
    const src = readFileSync(join(dir, file), 'utf8');
    if (!src.includes(`from './${CSS}'`)) continue;
    for (const [, name] of src.matchAll(/styles\.([A-Za-z]\w*)/g))
      if (!defined.has(name!)) missing.push(`${file}: styles.${name}`);
  }
  expect([...new Set(missing)]).toEqual([]);
});
