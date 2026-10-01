import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// A CSS module imported by more than one file: a class one of them still uses
// must stay defined in it. `.buttons` once moved out with the Session Types
// confirms and the form's popups lost their button row (PR 122). Tests can't
// see this (CSS modules return any name), so check the source.
const SRC = join(process.cwd(), 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\./.test(name) ? [path] : [];
  });
}

/** Class names a stylesheet defines: comments and :global() don't count. */
function definedClasses(css: string): Set<string> {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:global\([^)]*\)/g, '');
  return new Set([...code.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]!));
}

/** `import x from '….module.css'` → the binding name and the resolved path. */
function moduleImports(file: string, src: string) {
  return [...src.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)].map(
    ([, name, spec]) => ({
      name: name!,
      path: spec!.startsWith('@/') ? join(SRC, spec!.slice(2)) : resolve(dirname(file), spec!),
    }),
  );
}

it('every class used from a shared CSS module is defined in it', () => {
  const users = new Map<string, { file: string; used: string[] }[]>();
  for (const file of files(SRC)) {
    const src = readFileSync(file, 'utf8');
    for (const { name, path } of moduleImports(file, src)) {
      const used = [
        ...src.matchAll(new RegExp(String.raw`\b${name}\.([A-Za-z_]\w*)`, 'g')),
        ...src.matchAll(new RegExp(String.raw`\b${name}\['([^']+)'\]`, 'g')),
      ].map((m) => m[1]!);
      users.set(path, [...(users.get(path) ?? []), { file, used }]);
    }
  }
  const missing: string[] = [];
  for (const [path, importers] of users) {
    if (importers.length < 2) continue;
    const defined = definedClasses(readFileSync(path, 'utf8'));
    for (const { file, used } of importers)
      for (const cls of new Set(used))
        if (!defined.has(cls)) missing.push(`${file.slice(SRC.length + 1)}: .${cls}`);
  }
  expect(missing).toEqual([]);
});
