# JSONPlus

A JSON parser that supports comments, self-references, external file imports, and template strings. Built for Deno with TypeScript support.

[![JSR](https://jsr.io/badges/@serkan/jsonplus)](https://jsr.io/@serkan/jsonplus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **JSON with Comments** - Single-line (`//`) and multi-line (`/* */`) comments
- ✅ **Self-References** - Reference values within the same JSON using `@self` notation
- ✅ **Template Strings** - Use `{{expression}}` syntax for string interpolation
- ✅ **External File References** - Import and reference values from other JSON files
- ✅ **Environment Variables** - Reference environment variables using `@env.VAR_NAME`
- ✅ **Bracket Notation** - Support for complex keys and array indices
- ✅ **Security** - Path traversal protection, absolute path validation, and recursion depth limits
- ✅ **TypeScript** - Full type definitions included
- ✅ **Zero Dependencies** - Pure TypeScript implementation

## Installation

### JSR (Recommended)

```bash
deno add npm:@serkan/jsonplus
```

Or use directly:

```typescript
import { parse } from 'jsr:@serkan/jsonplus@^2.0.0';
```

### Deno

```typescript
import { parse } from 'https://deno.land/x/jsonplus@v2.0.0/mod.ts';
```

## Quick Start

```typescript
import { parse } from 'jsr:@serkan/jsonplus@^2.0.0';

// Basic usage with self-reference
const result = parse('{"foo": 5, "bar": "@self.foo"}');
console.log(result); // { foo: 5, bar: 5 }
```

## Usage

### Self-References

Values starting with `@self` are parsed as references to other parts of the JSON:

```typescript
import { parse } from 'jsr:@serkan/jsonplus@^2.0.0';

const json = `{
  "users": [
    { "name": "john", "id": 1 },
    { "name": "jane", "id": 2 }
  ],
  "firstUser": "@self.users[0]",
  "firstName": "@self.users[0].name"
}`;

const result = parse(json);
// result.firstUser = { name: "john", id: 1 }
// result.firstName = "john"
```

You can use dot notation (`@self.foo.bar`) or bracket notation (`@self['key']` or `@self[0]`) to navigate the object.

### Template Strings

Use `{{expression}}` syntax to interpolate values into strings:

```typescript
const json = `{
  "first": "john",
  "last": "doe",
  "full": "{{ first }} {{ last }}",
  "greeting": "Hello, {{ first }}!"
}`;

const result = parse(json);
// result.full = "john doe"
// result.greeting = "Hello, john!"
```

You can omit the `@self` prefix in templates:

```typescript
const json = `[{
  "first": "john",
  "last": "doe",
  "full": "{{ [0].first }} {{ [0].last }}"
}]`;

const result = parse(json);
// result[0].full = "john doe"
```

**Note:** Template strings always convert values to strings, while `@self` references preserve the original value type.

### Complex Keys

JSONPlus supports complex keys with special characters:

```typescript
const json = `{
  "/api/v1/users": "endpoint",
  "key with spaces": "value",
  "result": "{{ ['/api/v1/users'] }}"
}`;

const result = parse(json);
// result.result = "endpoint"
```

### Environment Variables

Reference environment variables using `@env.VAR_NAME`:

```typescript
// Set environment variables
Deno.env.set('API_KEY', 'secret-key-123');
Deno.env.set('API_URL', 'https://api.example.com');

const json = `{
  "apiKey": "@env.API_KEY",
  "apiUrl": "@env.API_URL",
  "endpoint": "{{ @env.API_URL }}/users"
}`;

const result = parse(json);
// result.apiKey = "secret-key-123"
// result.apiUrl = "https://api.example.com"
// result.endpoint = "https://api.example.com/users"
```

**Error Handling:**
If an environment variable is not defined, JSONPlus will throw an error with a clear message:

```typescript
const json = '{"key": "@env.MISSING_VAR"}';
// Throws: Error: Environment variable "MISSING_VAR" is not defined
```

**Note:** When running Deno, you need to grant environment variable access:

```bash
deno run --allow-env your-script.ts
```

### External File References

Reference values from other JSON files:

```typescript
// config.json
{
  "@ext": {
    "users": "data/users.json"
  },
  "firstUser": "@ext.users[0]"
}
```

**Security Notes:**

- External file paths are validated against path traversal attacks
- Absolute paths are not allowed
- File paths are relative to the `basePath` option (defaults to current working directory)

```typescript
import { parse } from 'jsr:@serkan/jsonplus@^2.0.0';

const result = parse(jsonString, {
  basePath: '/path/to/config/directory',
});
```

### Comments

Both single-line and multi-line comments are supported:

```typescript
const json = `{
  // This is a single-line comment
  "foo": 5,
  /* This is a
     multi-line comment */
  "bar": "@self.foo"
}`;
```

### Advanced Example

```typescript
// Set environment variables
Deno.env.set('BASE_URL', 'https://api.example.com');

const json = `{
  // API endpoints with shared data
  "/api/users": {
    "response": {
      "users": [
        { "name": "john doe", "id": 1 },
        { "name": "jane doe", "id": 2 }
      ]
    }
  },

  // Reference users from above
  "/api/user/1": {
    "response": "@self['/api/users'].response.users[0]"
  },

  "/api/user/2": {
    "response": "@self['/api/users'].response.users[1]"
  },

  // Use environment variable
  "baseUrl": "@env.BASE_URL",

  // Template with environment variable and complex reference
  "summary": "User 1: {{ ['/api/users'].response.users[0].name }}",
  "fullEndpoint": "{{ @env.BASE_URL }}/api/users"
}`;

const result = parse(json);
// result.baseUrl = "https://api.example.com"
// result.summary = "User 1: john doe"
// result.fullEndpoint = "https://api.example.com/api/users"
```

## API Reference

### `parse(jsonString: string, options?: ParseOptions): JsonValue`

Parses a JSON+ string and returns the resolved object.

**Parameters:**

- `jsonString`: The JSON+ string to parse
- `options`: Optional configuration

**Returns:** The parsed and resolved JSON value

**Options:**

```typescript
interface ParseOptions {
  /**
   * Base path for resolving external file references.
   * Defaults to current working directory.
   */
  basePath?: string;

  /**
   * Maximum recursion depth for reference resolution.
   * Defaults to 100.
   */
  maxDepth?: number;
}
```

### `resolve(object: JsonValue, self?: JsonValue): JsonValue`

Resolves self-references in an already parsed object.

**Parameters:**

- `object`: The object to resolve references in
- `self`: Optional root object for references (defaults to `object`)

**Returns:** The resolved object

**Example:**

```typescript
import { resolve } from 'jsr:@serkan/jsonplus@^2.0.0';

const obj = {
  first: 'john',
  last: 'doe',
  full: '{{ first }} {{ last }}',
};

const resolved = resolve(obj);
// resolved.full = "john doe"
```

### `resolvePath(object: JsonValue, reference: string): JsonValue | undefined`

Resolves a property path string to a value in an object.

**Parameters:**

- `object`: The object to resolve the path in
- `reference`: The path string (e.g., `"users[0].name"` or `"['/api/v1']"`)

**Returns:** The resolved value or `undefined` if not found

### `parseTemplate(object: JsonValue, template: string): string`

Parses a template string, replacing `{{expression}}` with values from the object.

**Parameters:**

- `object`: The object to resolve template expressions against
- `template`: The template string

**Returns:** The resolved template string

## Type Definitions

```typescript
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

interface ParseOptions {
  basePath?: string;
  maxDepth?: number;
}
```

## Security

JSONPlus includes several security features:

- **Path Traversal Prevention**: External file paths are validated to prevent `../` attacks
- **Absolute Path Blocking**: Absolute paths are not allowed for external file references
- **Recursion Depth Limits**: Maximum recursion depth prevents stack overflow from infinite loops
- **Circular Dependency Detection**: External file circular dependencies are detected and prevented

## Migration from v1 (Node.js)

This Deno version maintains 100% feature parity with the original Node.js version. The main differences:

- Installation: Use JSR or Deno instead of npm
- Import syntax: ES modules instead of CommonJS
- Type safety: Full TypeScript support with strict mode
- Security: Enhanced security features added

## Use Cases

- **Fixtures**: Create reusable test fixtures with references
- **Configuration Files**: Share values across configuration files with environment-specific settings
- **API Mocking**: Reference shared mock data in API responses
- **Development**: Simplify JSON editing with comments, references, and environment variables
- **Deployment**: Use environment variables for different deployment environments (dev, staging, prod)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

Run the test suite:

```bash
deno task test
```

## License

MIT License

Copyright (c) 2025 Serkan Yersen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING WITHOUT LIMITATION THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

This is a Deno port of the original [jsonplus](https://github.com/serkanyersen/jsonplus) npm package by Serkan Yersen.
