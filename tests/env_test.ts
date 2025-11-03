import { assertEquals } from 'std/assert/assert_equals.ts';
import { assertThrows } from 'std/assert/assert_throws.ts';
import { parse } from '../mod.ts';
import type { JsonValue } from '../types.ts';

Deno.test('env: direct environment variable reference', () => {
  Deno.env.set('API_KEY', 'secret-key-123');
  Deno.env.set('API_URL', 'https://api.example.com');

  const json = `{
    "apiKey": "@env.API_KEY",
    "apiUrl": "@env.API_URL"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.apiKey, 'secret-key-123');
  assertEquals(result.apiUrl, 'https://api.example.com');
});

Deno.test('env: environment variable in template', () => {
  Deno.env.set('USER_NAME', 'john');
  Deno.env.set('USER_EMAIL', 'john@example.com');

  const json = `{
    "name": "@env.USER_NAME",
    "greeting": "Hello, {{ @env.USER_NAME }}!",
    "email": "{{ @env.USER_EMAIL }}"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.name, 'john');
  assertEquals(result.greeting, 'Hello, john!');
  assertEquals(result.email, 'john@example.com');
});

Deno.test('env: missing environment variable throws error', () => {
  const json = `{
    "apiKey": "@env.NON_EXISTENT_VAR"
  }`;

  assertThrows(
    () => parse(json),
    Error,
    'Environment variable "NON_EXISTENT_VAR" is not defined',
  );
});

Deno.test('env: missing environment variable in template throws error', () => {
  const json = `{
    "message": "{{ @env.MISSING_VAR }}"
  }`;

  assertThrows(
    () => parse(json),
    Error,
    'Environment variable "MISSING_VAR" is not defined',
  );
});

Deno.test('env: environment variable with numbers and underscores', () => {
  Deno.env.set('API_KEY_123', 'key-with-numbers');
  Deno.env.set('MY_VAR_2', 'value-2');

  const json = `{
    "key1": "@env.API_KEY_123",
    "key2": "@env.MY_VAR_2"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.key1, 'key-with-numbers');
  assertEquals(result.key2, 'value-2');
});

Deno.test('env: mixed with self references', () => {
  Deno.env.set('BASE_URL', 'https://api.example.com');

  const json = `{
    "baseUrl": "@env.BASE_URL",
    "usersEndpoint": "{{ @self.baseUrl }}/users",
    "fullUrl": "{{ @env.BASE_URL }}/api/v1"
  }`;

  const result = parse(json) as Record<string, JsonValue>;
  assertEquals(result.baseUrl, 'https://api.example.com');
  assertEquals(result.usersEndpoint, 'https://api.example.com/users');
  assertEquals(result.fullUrl, 'https://api.example.com/api/v1');
});

Deno.test('env: environment variable in array', () => {
  Deno.env.set('ITEM_1', 'first');
  Deno.env.set('ITEM_2', 'second');

  const json = `[
    "@env.ITEM_1",
    "@env.ITEM_2",
    "third"
  ]`;

  const result = parse(json) as JsonValue[];
  assertEquals(result[0], 'first');
  assertEquals(result[1], 'second');
  assertEquals(result[2], 'third');
});
