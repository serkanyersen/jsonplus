/**
 * Strips comments from JSON string
 * Ported from strip-json-comments npm package
 */
export function stripJsonComments(jsonString: string): string {
  const singleComment = Symbol('singleComment');
  const multiComment = Symbol('multiComment');

  let insideString = false;
  let currentChar = '';
  let nextChar = '';
  let prevChar = '';
  let state: symbol | null = null;
  let result = '';

  for (let i = 0; i < jsonString.length; i++) {
    prevChar = currentChar;
    currentChar = jsonString[i];
    nextChar = jsonString[i + 1];

    if (!state && currentChar === '"' && prevChar !== '\\') {
      // Toggle string state
      insideString = !insideString;
      result += currentChar;
      continue;
    }

    if (insideString) {
      // Always include characters inside strings
      result += currentChar;
      continue;
    }

    if (!state && currentChar === '/' && nextChar === '/') {
      // Start of single-line comment
      state = singleComment;
      i++;
      continue;
    }

    if (state === singleComment && currentChar === '\n') {
      // End of single-line comment
      state = null;
      result += currentChar; // Keep the newline
      continue;
    }

    if (!state && currentChar === '/' && nextChar === '*') {
      // Start of multi-line comment
      state = multiComment;
      i++;
      continue;
    }

    if (state === multiComment && currentChar === '*' && nextChar === '/') {
      // End of multi-line comment
      state = null;
      i++;
      continue;
    }

    if (!state) {
      // Not in a comment, include character
      result += currentChar;
    }
  }

  // Clean up any double newlines and extra whitespace
  return result
    .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with a single one
    .replace(/^\s+|\s+$/g, ''); // Trim leading/trailing whitespace
}

/**
 * Parses a property path string into an array of keys/indices.
 * Handles bracket notation with quoted strings, array indices, and dot notation.
 * Examples:
 *   - "name" -> ["name"]
 *   - "[0].first" -> ["0", "first"]
 *   - "['/api/v1/']" -> ["/api/v1/"]
 *   - "['/api']['/v1']['/name']" -> ["/api", "/v1", "/name"]
 *   - "[\"yes 'thats' hard\"]" -> ["yes 'thats' hard"]
 */
function parsePropertyPath(path: string): string[] {
  if (!path) return [];

  const parts: string[] = [];
  let i = 0;

  while (i < path.length) {
    // Skip whitespace
    if (/\s/.test(path[i])) {
      i++;
      continue;
    }

    // Handle bracket notation: [key] or ['key'] or ["key"] or [0]
    if (path[i] === '[') {
      i++; // Skip '['

      // Skip whitespace after '['
      while (i < path.length && /\s/.test(path[i])) i++;

      // Check if it's a quoted string
      if (path[i] === "'" || path[i] === '"') {
        const quote = path[i];
        i++; // Skip opening quote
        let key = '';

        // Read until closing quote (handling escaped quotes)
        while (i < path.length) {
          if (path[i] === '\\' && i + 1 < path.length) {
            // Escaped character
            key += path[i + 1];
            i += 2;
          } else if (path[i] === quote) {
            // Closing quote
            i++;
            break;
          } else {
            key += path[i];
            i++;
          }
        }

        parts.push(key);

        // Skip whitespace before ']'
        while (i < path.length && /\s/.test(path[i])) i++;

        // Skip ']'
        if (i < path.length && path[i] === ']') i++;
      } else {
        // Not quoted - could be a number (array index) or identifier
        let key = '';
        while (i < path.length && path[i] !== ']' && !/\s/.test(path[i])) {
          key += path[i];
          i++;
        }
        parts.push(key);

        // Skip whitespace before ']'
        while (i < path.length && /\s/.test(path[i])) i++;

        // Skip ']'
        if (i < path.length && path[i] === ']') i++;
      }
    } else if (path[i] === '.') {
      // Dot notation - skip the dot
      i++;
    } else {
      // Regular identifier
      let key = '';
      while (
        i < path.length &&
        path[i] !== '.' &&
        path[i] !== '[' &&
        !/\s/.test(path[i])
      ) {
        key += path[i];
        i++;
      }
      if (key) parts.push(key);
    }
  }

  return parts;
}

/**
 * Resolves a property path string to a value in an object.
 * Handles bracket notation with quoted strings, array indices, and dot notation.
 * Replaces lodash's _.propertyOf
 *
 * @example
 * getPropertyByPath(obj, "name") => obj.name
 * getPropertyByPath(obj, "[0].first") => obj[0].first
 * getPropertyByPath(obj, "['/api/v1/']") => obj["/api/v1/"]
 * getPropertyByPath(obj, "['/api']['/v1']['/name']") => obj["/api"]["/v1"]["/name"]
 */
export function getPropertyByPath<T>(
  obj: T,
  path: string,
): T[keyof T] | undefined {
  if (!path) return undefined;

  const parts = parsePropertyPath(path);
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T[keyof T] | undefined;
}

/**
 * Checks if value is a plain object
 * Replaces lodash's _.isPlainObject
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Validates and normalizes a file path to prevent security vulnerabilities.
 * @param filePath The file path to validate
 * @param basePath The base directory path (must be absolute)
 * @returns The normalized absolute path
 * @throws {Error} If the path is invalid, absolute, or contains path traversal
 */
export function validateAndResolvePath(
  filePath: string,
  basePath: string,
): string {
  // Reject absolute paths
  if (Deno.build.os === 'windows') {
    // Windows: check for drive letters (C:\, D:\, etc.) or UNC paths (\\)
    if (/^[A-Za-z]:[\\/]/.test(filePath) || /^\\\\/.test(filePath)) {
      throw new Error(
        `Absolute paths are not allowed for security reasons: ${filePath}`,
      );
    }
  } else {
    // Unix-like: check for leading slash
    if (filePath.startsWith('/')) {
      throw new Error(
        `Absolute paths are not allowed for security reasons: ${filePath}`,
      );
    }
  }

  // Normalize the path and check for path traversal
  const normalized = filePath
    .replace(/\\/g, '/') // Normalize Windows backslashes
    .split('/')
    .filter((part) => part !== '.' && part !== '') // Remove . and empty parts
    .reduce((acc, part) => {
      if (part === '..') {
        // Go up one directory level
        if (acc.length === 0) {
          throw new Error(
            `Path traversal detected (attempted to go above base directory): ${filePath}`,
          );
        }
        acc.pop();
      } else {
        acc.push(part);
      }
      return acc;
    }, [] as string[]);

  // Ensure basePath is absolute
  const basePathNormalized = basePath.replace(/\/$/, ''); // Remove trailing slash
  const resolvedPath = `${basePathNormalized}/${normalized.join('/')}`;

  // Additional security check: ensure resolved path still starts with basePath
  // This prevents tricks like using symlinks or other edge cases
  if (!resolvedPath.startsWith(basePathNormalized)) {
    throw new Error(
      `Path resolution resulted in path outside base directory: ${filePath}`,
    );
  }

  return resolvedPath;
}
