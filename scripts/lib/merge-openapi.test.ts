// @vitest-environment node
import { mergeOpenApi } from './merge-openapi.mjs';

const base = () => ({
  openapi: '3.1.0',
  info: { title: 'API', version: '1' },
  paths: {
    '/api/v1/mentors': { get: { operationId: 'list', responses: { '200': {} } } },
  },
  components: {
    schemas: {
      MentorListItem: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' }, next_available_at: { type: 'string' } },
      },
    },
  },
});

describe('mergeOpenApi', () => {
  it('adds a new path and leaves the inputs untouched', () => {
    const b = base();
    const overlay = { paths: { '/api/v1/featured-mentor': { get: { operationId: 'featured' } } } };
    const { spec, report } = mergeOpenApi(b, overlay);
    expect(spec.paths['/api/v1/featured-mentor'].get.operationId).toBe('featured');
    expect(spec.paths['/api/v1/mentors'].get.operationId).toBe('list');
    expect(report.added).toEqual(['paths GET /api/v1/featured-mentor']);
    expect(b.paths).not.toHaveProperty('/api/v1/featured-mentor');
  });

  it('adds a property to an existing schema and unions required', () => {
    const overlay = {
      components: {
        schemas: {
          MentorListItem: {
            required: ['next_available_state'],
            properties: { next_available_state: { enum: ['open', 'none', 'refreshing'] } },
          },
        },
      },
    };
    const { spec, report } = mergeOpenApi(base(), overlay);
    const s = spec.components.schemas.MentorListItem;
    expect(Object.keys(s.properties)).toEqual(['id', 'next_available_at', 'next_available_state']);
    expect(s.required).toEqual(['id', 'next_available_state']);
    expect(report.added).toEqual(['components.schemas.MentorListItem.next_available_state']);
  });

  it('reports a required name the backend already requires', () => {
    const overlay = { components: { schemas: { MentorListItem: { required: ['id'] } } } };
    expect(mergeOpenApi(base(), overlay).report.redundant).toEqual([
      'components.schemas.MentorListItem (required id)',
    ]);
  });

  it('refuses to make a field the backend has as optional required', () => {
    const overlay = {
      components: { schemas: { MentorListItem: { required: ['next_available_at'] } } },
    };
    expect(() => mergeOpenApi(base(), overlay)).toThrow(/defines "next_available_at" as optional/);
  });

  it('replaces an existing operation whole', () => {
    const overlay = { paths: { '/api/v1/mentors': { get: { operationId: 'list2' } } } };
    const { spec, report } = mergeOpenApi(base(), overlay);
    expect(spec.paths['/api/v1/mentors'].get).toEqual({ operationId: 'list2' });
    expect(report.replaced).toEqual(['paths GET /api/v1/mentors']);
  });

  it('reports overlay entries the backend already matches', () => {
    const overlay = {
      components: {
        schemas: { MentorListItem: { properties: { next_available_at: { type: 'string' } } } },
      },
    };
    expect(mergeOpenApi(base(), overlay).report.redundant).toEqual([
      'components.schemas.MentorListItem.next_available_at',
    ]);
  });

  it('adds a whole new schema but rejects a partial one for an unknown name', () => {
    const add = { components: { schemas: { FeaturedMentorRead: { type: 'object' } } } };
    expect(mergeOpenApi(base(), add).report.added).toEqual([
      'components.schemas.FeaturedMentorRead',
    ]);
    const typo = { components: { schemas: { MentorListItme: { properties: { x: {} } } } } };
    expect(() => mergeOpenApi(base(), typo)).toThrow(/MentorListItme is not in the backend spec/);
  });

  it('rejects a malformed overlay or base', () => {
    expect(() => mergeOpenApi(base(), [])).toThrow(/JSON object/);
    expect(() => mergeOpenApi(base(), { info: {} })).toThrow(/only set "paths" and "components"/);
    expect(() => mergeOpenApi(base(), { paths: { '/x': 1 } })).toThrow(/paths\["\/x"\]/);
    expect(() => mergeOpenApi({ paths: {} }, {})).toThrow(/not an OpenAPI document/);
  });
});
