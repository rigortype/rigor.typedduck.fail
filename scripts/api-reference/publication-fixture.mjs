// Synthetic published export for integration tests and browser QA, never a production source.
export function publicationFixture() {
  const row = (id, name, visibility, publication, documentation = [], owner = 'Example') => ({
    id: `sdk:${id}`, kind: 'instance_method', name, display_name: `${owner}#${name}`,
    anchor: `zard-${id}`, visibility, publication, parameters: [], page: `sdk/${owner}.md`,
    span: { path: 'lib/example.rb', start_line: Number.parseInt(id, 16), end_line: Number.parseInt(id, 16) }, documentation,
  });
  const declarations = [
    row('01', 'call', 'public', 'public'),
    row('02', 'callPrivate', 'private', 'public'),
    row('03', 'callInternal', 'public', 'internal'),
    row('04', 'callDeprecated', 'public', 'public', [{ name: 'deprecated', description: 'Use **call** instead.', rendered_description: 'Use **call** instead.',
      span: { path: 'lib/example.rb', start_line: 4, end_line: 4 } }]),
    row('05', 'callNested', 'public', 'public', [], 'ExcludedContainer'),
    row('06', 'callInternalPrivate', 'private', 'internal', [], 'InternalOnly'),
  ];
  return { export: { schema: 'zard-doc/v0', revision: 2, layout: 'namespace', producer: { zard: '0.0.0', zard_doc: '0.0.0' },
    scopes: [{ name: 'sdk', destination: 'sdk', declarations,
      pages: ['Example', 'ExcludedContainer', 'InternalOnly'].map((owner) => ({ path: `sdk/${owner}.md`,
        declarations: declarations.filter((row) => row.page === `sdk/${owner}.md`).map((row) => row.id) })) }], links: {} } };
}
