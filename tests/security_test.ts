import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertThrows } from 'std/assert/assert_throws.ts';
import { parse } from '../mod.ts';

Deno.test('security: path traversal prevention', () => {
  const json = `{
    "@ext": {
      "malicious": "../../../etc/passwd"
    },
    "data": "@ext.malicious"
  }`;

  assertThrows(
    () => parse(json),
    Error,
    'Path traversal detected',
  );
});

Deno.test('security: absolute path prevention (Unix)', () => {
  const json = `{
    "@ext": {
      "malicious": "/etc/passwd"
    },
    "data": "@ext.malicious"
  }`;

  assertThrows(
    () => parse(json),
    Error,
    'Absolute paths are not allowed',
  );
});

Deno.test('security: multiple path traversal attempts', () => {
  const json = `{
    "@ext": {
      "malicious": "../../../../../../etc/passwd"
    },
    "data": "@ext.malicious"
  }`;

  assertThrows(
    () => parse(json),
    Error,
    'Path traversal detected',
  );
});

Deno.test('security: max depth limit for recursion', () => {
  // Create a self-referential structure that will recurse deeply
  // Each resolution creates another level of recursion
  const json = `{
    "level1": "@self.level2",
    "level2": "@self.level3",
    "level3": "@self.level4",
    "level4": "@self.level5",
    "level5": "@self.level6",
    "level6": "@self.level7",
    "level7": "@self.level8",
    "level8": "@self.level9",
    "level9": "@self.level10",
    "level10": "@self.level1"
  }`;

  // This creates a circular reference that will recurse
  // The depth counter should catch it before stack overflow
  assertThrows(
    () => parse(json),
    Error,
    'Maximum recursion depth',
  );
});

Deno.test('security: max depth can be customized', () => {
  // Create a structure that will recurse but with lower depth limit
  const json = `{
    "a": "@self.b",
    "b": "@self.c",
    "c": "@self.d",
    "d": "@self.e",
    "e": "@self.f",
    "f": "@self.g",
    "g": "@self.h",
    "h": "@self.i",
    "i": "@self.j",
    "j": "@self.a"
  }`;

  // Should fail with custom maxDepth of 5 (circular reference will exceed it)
  assertThrows(
    () => parse(json, { maxDepth: 5 }),
    Error,
    'Maximum recursion depth',
  );
});

Deno.test('security: valid relative path within base directory', () => {
  // This should work - valid relative path
  const json = `{
    "@ext": {
      "valid": "fixtures/simple-self-reference.json"
    },
    "data": "@ext.valid"
  }`;

  const result = parse(json, {
    basePath: new URL('./', import.meta.url).pathname,
  });

  assertEquals(result, { data: { foo: 5, bar: 5 } });
});

Deno.test('security: path with .. in middle should normalize correctly', () => {
  // This should work - normalizes to valid path
  const json = `{
    "@ext": {
      "valid": "fixtures/../fixtures/simple-self-reference.json"
    },
    "data": "@ext.valid"
  }`;

  const result = parse(json, {
    basePath: new URL('./', import.meta.url).pathname,
  });

  assertEquals(result, { data: { foo: 5, bar: 5 } });
});
