import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pagesFor, referenceFor } from './presentation.mjs';

// Real zard-doc + Rigor 0.4.5 namespace export, copied unchanged from rigortype/zard 42ae1d1
// (zard-doc-astro/test/fixtures/type-references-export.json). The site only builds namespace layout.
const fixture = () => JSON.parse(readFileSync(new URL('fixtures/type-references-export.json', import.meta.url), 'utf8'));
const pages = (data) => pagesFor(referenceFor({ source: { commit: 'a'.repeat(40) }, export: data }));
const routeOf = (file) => `/${file.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '/')}`;
const signatures = (built) => [...built.values()].flatMap((body) =>
  [...body.matchAll(/<pre class="api-lens-signature"><code>(.*?)<\/code><\/pre>/g)].map((match) => match[1]));
const linked = (html) => [...html.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((match) => ({ href: match[1], name: match[2] }));
const literal = (html) => html.replace(/<a href="[^"]+">([^<]+)<\/a>/g, '$1');
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('installed package links resolved signature type names to generated /apiref/ anchors', () => {
  const data = fixture();
  const built = pages(data);
  const routes = new Map([...built].map(([file, body]) => [routeOf(file), body]));
  const links = signatures(built).flatMap(linked);
  const resolved = data.lens.bindings.flatMap((binding) => binding.type_references).filter((item) => item.status === 'resolved');
  assert.equal(links.length, resolved.length);
  for (const { href } of links) {
    const [route, anchor] = href.split('#');
    assert.match(route, /^\/apiref\//);
    assert.ok(routes.has(route), `missing page ${route}`);
    assert.ok(routes.get(route).includes(`id="${anchor}"`), `missing anchor ${href}`);
  }
  const hrefs = (name) => new Set(links.filter((link) => link.name === name).map((link) => link.href.split('#')[0]));
  assert.deepEqual(hrefs('::App::Foo'), new Set(['/apiref/app/app/foo/']));
  assert.deepEqual(hrefs('App::Foo'), new Set(['/apiref/app/app/foo/']), 'inferred return');
  assert.deepEqual(hrefs('::Shared::Thing'), new Set(['/apiref/shared/shared/thing/']));
  assert.deepEqual(hrefs('::Far'), new Set(['/apiref/far/far/']), 'direct dependency of shared');
});

test('ambiguous and unresolved type names stay literal and signature text is unchanged', () => {
  const data = fixture();
  const rendered = signatures(pages(data));
  const texts = data.lens.members.flatMap((member) => member.overloads.map((overload) => overload.rbs)).filter((text) => text != null);
  assert.deepEqual(new Set(rendered.map(literal)), new Set(texts.map(escape)));
  const statuses = new Map(data.lens.bindings.flatMap((binding) => binding.type_references).map((item) => [item.name, item.status]));
  const names = rendered.flatMap(linked).map((link) => link.name);
  for (const name of ['::Twin', '::App::Hidden', '::Lonely', '::String', '::_ToS']) {
    assert.notEqual(statuses.get(name), 'resolved', name);
    assert.ok(rendered.some((html) => html.includes(escape(name))), `${name} is not rendered`);
    assert.ok(!names.includes(name), `${name} is linked`);
  }
  assert.equal(statuses.get('::Twin'), 'ambiguous');
});

test('legacy lens exports without type_references render literal signatures', () => {
  const data = fixture();
  for (const binding of data.lens.bindings) { delete binding.type_references; delete binding.type_reference_diagnostics; }
  const rendered = signatures(pages(data));
  assert.ok(rendered.length > 0);
  assert.ok(rendered.every((html) => !html.includes('<a ')));
});
