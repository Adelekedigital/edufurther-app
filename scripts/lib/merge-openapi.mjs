/**
 * Lays an "ahead-of-backend" overlay onto the backend's published OpenAPI spec.
 *
 * The overlay holds only what the frontend builds before the backend ships it
 * (a new field, a new endpoint). Rules, deliberately small and predictable:
 *   paths.<path>.<method>        added, or replaced whole (overlay wins)
 *   components.<section>.<name>  added; for `schemas` present on both sides,
 *                                `properties` merge per property (overlay wins)
 *                                and `required` may only name properties the
 *                                overlay adds (the backend owns the rest); any other key the
 *                                overlay sets replaces the base's
 * Anything else at the overlay's top level is an error, never silently dropped.
 *
 * Returns the merged spec (inputs untouched) and a report. `redundant` lists
 * overlay entries the backend spec already matches exactly: time to delete them.
 */
export function assertOpenApi(doc) {
  if (!isObject(doc) || typeof doc.openapi !== 'string' || !isObject(doc.paths)) {
    throw new Error('Base spec is not an OpenAPI document (no "openapi" version or "paths").');
  }
}

export function mergeOpenApi(base, overlay) {
  assertOpenApi(base);
  if (!isObject(overlay)) throw new Error('Overlay must be a JSON object.');
  const unknown = Object.keys(overlay).filter((k) => k !== 'paths' && k !== 'components');
  if (unknown.length) {
    throw new Error(`Overlay may only set "paths" and "components"; found: ${unknown.join(', ')}.`);
  }

  const spec = structuredClone(base);
  const report = { added: [], replaced: [], redundant: [] };
  const note = (where, before, after) => {
    if (before === undefined) report.added.push(where);
    else if (same(before, after)) report.redundant.push(where);
    else report.replaced.push(where);
  };

  for (const [path, ops] of Object.entries(overlay.paths ?? {})) {
    if (!isObject(ops)) throw new Error(`Overlay paths["${path}"] must be an object.`);
    spec.paths[path] ??= {};
    for (const [method, op] of Object.entries(ops)) {
      note(`paths ${method.toUpperCase()} ${path}`, spec.paths[path][method], op);
      spec.paths[path][method] = structuredClone(op);
    }
  }

  for (const [section, entries] of Object.entries(overlay.components ?? {})) {
    if (!isObject(entries)) throw new Error(`Overlay components.${section} must be an object.`);
    spec.components ??= {};
    spec.components[section] ??= {};
    for (const [name, value] of Object.entries(entries)) {
      const where = `components.${section}.${name}`;
      const before = spec.components[section][name];
      if (section === 'schemas' && isObject(before) && isObject(value)) {
        spec.components[section][name] = mergeSchema(before, value, where, note);
      } else if (section === 'schemas' && before === undefined && !isWholeSchema(value)) {
        // A partial schema (just properties) for a name the backend doesn't have is a
        // typo or a backend rename; adding it would leave an orphan nothing references.
        throw new Error(
          `${where} is not in the backend spec. To add a new schema, give its "type" (or $ref/allOf/oneOf/anyOf/enum).`,
        );
      } else {
        note(where, before, value);
        spec.components[section][name] = structuredClone(value);
      }
    }
  }

  return { spec, report };
}

function mergeSchema(before, value, where, note) {
  const out = structuredClone(before);
  for (const [key, v] of Object.entries(value)) {
    if (key === 'properties' && isObject(v)) {
      out.properties ??= {};
      for (const [prop, def] of Object.entries(v)) {
        note(`${where}.${prop}`, out.properties[prop], def);
        out.properties[prop] = structuredClone(def);
      }
    } else if (key === 'required' && Array.isArray(v)) {
      // The backend owns requiredness of the fields it already has: forcing one it
      // made optional would type as always-present a field that can be missing.
      // `required` only applies to properties the overlay itself adds.
      const had = new Set(before.required ?? []);
      out.required = [...(out.required ?? [])];
      for (const name of v) {
        if (had.has(name)) note(`${where} (required ${name})`, name, name);
        else if (before.properties && name in before.properties) {
          throw new Error(
            `${where}: the backend defines "${name}" as optional; the overlay may not make it required.`,
          );
        } else out.required.push(name);
      }
    } else {
      note(`${where} (${key})`, out[key], v);
      out[key] = structuredClone(v);
    }
  }
  return out;
}

function isWholeSchema(v) {
  return isObject(v) && ['type', '$ref', 'allOf', 'oneOf', 'anyOf', 'enum'].some((k) => k in v);
}

function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function same(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (!isObject(v)) return v;
  return Object.fromEntries(
    Object.keys(v)
      .sort()
      .map((k) => [k, sortKeys(v[k])]),
  );
}
