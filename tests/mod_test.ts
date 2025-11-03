import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertThrows } from 'std/assert/assert_throws.ts';
import { parse } from '../mod.ts';
import type { JsonValue } from '../types.ts';

interface TestResult {
  bar: number;
  list?: JsonValue[];
  full?: string;
  short?: string;
  detailed?: string;
  name?: string;
  read1?: string;
  read2?: string;
  read3?: string;
  andthis?: {
    will: Array<{
      find: {
        that: Array<Array<Array<{ link: string }>>>;
      };
    }>;
  };
  [key: string]: JsonValue | undefined;
}

// Helper function to load fixtures
async function loadFixture(name: string): Promise<string> {
  const path = new URL(`./fixtures/${name}.json`, import.meta.url).pathname;
  return await Deno.readTextFile(path);
}

Deno.test('simple self reference', async () => {
  const fixture = await loadFixture('simple-self-reference');
  const result = parse(fixture) as TestResult;
  assertEquals(result.bar, 5);
});

Deno.test('comments', async () => {
  const fixture = await loadFixture('comments');
  const result = parse(fixture) as TestResult;
  assertEquals(result.bar, 5);
  assertEquals(result.list?.[0], 5);
});

Deno.test('template tags', async () => {
  const fixture = await loadFixture('template-tags');
  const result = parse(fixture) as TestResult;
  assertEquals(result.full, 'john doe');
  assertEquals(result.short, 'john doe');
  assertEquals(result.detailed, 'hello world');
});

Deno.test('external file - simple', async () => {
  const fixture = await loadFixture('external-file');
  const result = parse(fixture) as TestResult;
  assertEquals(result.name, 'john');
  assertEquals((result as Record<string, unknown>)['@ext'], undefined);
});

Deno.test('external file - complex', async () => {
  const fixture = await loadFixture('external-file-complex');
  const result = parse(fixture) as TestResult;
  assertEquals(result.read1, 'john doe');
  assertEquals(result.read2, 'hello world');
  assertEquals(result.read3, 'yes');
});

Deno.test('external file - deep reference', async () => {
  const fixture = await loadFixture('deep-link');
  const result = parse(fixture) as TestResult;
  assertEquals(result.andthis?.will[0].find.that[0][0][0].link, 'yes');
});

Deno.test('external file - wrong path', async () => {
  const fixture = await loadFixture('external-file-wrong-path');
  assertThrows(() => parse(fixture));
});
