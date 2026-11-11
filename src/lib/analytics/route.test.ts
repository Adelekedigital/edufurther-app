import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { OTHER_ROUTE, ROUTE_TEMPLATES, routeTemplate } from './route';

/** Every page under src/app as its URL: route groups `(x)` and private `_x` folders left out. */
function pages(dir: string, url: string[] = []): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) {
      if (name === 'page.tsx') out.push('/' + url.join('/'));
      continue;
    }
    if (name.startsWith('_') || name === 'api') continue;
    out.push(...pages(full, name.startsWith('(') ? url : [...url, name]));
  }
  return out;
}

describe('routeTemplate', () => {
  it('lists every page in src/app, and nothing else', () => {
    const app = join(__dirname, '..', '..', 'app');
    expect([...ROUTE_TEMPLATES].sort()).toEqual(pages(app).sort());
  });

  it('collapses handles, ids, codes and keys', () => {
    expect(routeTemplate('/mentors/ada-lovelace')).toBe('/mentors/[handle]');
    expect(routeTemplate('/sessions/3f2a9c1e-77aa-4bb0-9f00-0a1b2c3d4e5f')).toBe('/sessions/[id]');
    expect(routeTemplate('/invite/AB12CD')).toBe('/invite/[code]');
    expect(routeTemplate('/session-types/st-9/edit')).toBe('/session-types/[id]/edit');
    expect(routeTemplate('/admin/emails/welcome')).toBe('/admin/emails/[key]');
    expect(routeTemplate('/settings/notifications')).toBe('/settings/[tab]');
  });

  it('keeps static pages, preferring a static segment over a dynamic one', () => {
    expect(routeTemplate('/')).toBe('/');
    expect(routeTemplate('/messages')).toBe('/messages');
    expect(routeTemplate('/messages/')).toBe('/messages');
    expect(routeTemplate('/session-types/new')).toBe('/session-types/new');
  });

  it('drops a query and a hash', () => {
    expect(routeTemplate('/messages?with=u-1#x')).toBe('/messages');
  });

  it('an unknown path is (other), never the path itself', () => {
    expect(routeTemplate('/someone@example.com')).toBe(OTHER_ROUTE);
    expect(routeTemplate('/mentors/ada/extra')).toBe(OTHER_ROUTE);
  });
});
