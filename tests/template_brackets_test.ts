import { assertEquals } from 'std/assert/assert_equals.ts';
import { parse } from '../mod.ts';
import type { JsonValue } from '../types.ts';

// Helper function to load fixtures
async function loadFixture(name: string): Promise<string> {
  const path = new URL(`./fixtures/${name}.json`, import.meta.url).pathname;
  return await Deno.readTextFile(path);
}

Deno.test('template: complex bracket notation', async () => {
  const fixture = await loadFixture('complex-tags');
  const result = parse(fixture) as Record<string, JsonValue>;

  assertEquals(result.nospaces, 'john');
  assertEquals(result.spaces, 'john');
  assertEquals(result.spacesontheside, 'john');
  assertEquals(result.nonkey, 'api');
  assertEquals(result.hard, 'meh');
  assertEquals(result.fullkeys, 'john');
});

Deno.test('template: first-level array with bracket notation', async () => {
  const fixture = await loadFixture('first-level-array');
  const result = parse(fixture) as JsonValue[];

  const first = result[0] as Record<string, JsonValue>;
  assertEquals(first.full, 'john doe');
  assertEquals(first.self, 'john');
});

Deno.test('template: first-level array templates', async () => {
  const fixture = await loadFixture('first-level-array-templates');
  const result = parse(fixture) as JsonValue[];

  const second = result[1] as Record<string, JsonValue>;
  assertEquals(second.fullName, 'Mr. john doe');
});

Deno.test('template: bracket notation with array index', () => {
  const json = `{
    "items": [
      { "name": "first" },
      { "name": "second" }
    ],
    "result": "{{ items[1].name }}"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.result, 'second');
});

Deno.test('template: chained bracket notation', () => {
  const json = `{
    "/api": {
      "/v1": {
        "/name": "test"
      }
    },
    "result": "{{ ['/api']['/v1']['/name'] }}"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.result, 'test');
});

Deno.test('template: bracket notation with special characters', () => {
  const json = `{
    "yes 'thats' hard": "meh",
    "result": "{{ [\\"yes 'thats' hard\\"] }}"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.result, 'meh');
});

Deno.test('template: bracket notation in first-level array context', () => {
  const json = `[{
    "first": "john",
    "last": "doe",
    "full": "{{ [0].first }} {{ [0].last }}"
  }]`;

  const result = parse(json) as JsonValue[];
  const first = result[0] as Record<string, JsonValue>;
  assertEquals(first.full, 'john doe');
});
