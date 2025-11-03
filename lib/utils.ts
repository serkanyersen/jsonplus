/**
 * Strips comments from JSON string
 * Ported from strip-json-comments npm package
 */
export function stripJsonComments(jsonString: string): string {
  const singleComment = Symbol("singleComment");
  const multiComment = Symbol("multiComment");

  let insideString = false;
  let currentChar = "";
  let nextChar = "";
  let prevChar = "";
  let state: symbol | null = null;
  let result = "";

  for (let i = 0; i < jsonString.length; i++) {
    prevChar = currentChar;
    currentChar = jsonString[i];
    nextChar = jsonString[i + 1];

    if (!state && currentChar === '"' && prevChar !== "\\") {
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

    if (!state && currentChar === "/" && nextChar === "/") {
      // Start of single-line comment
      state = singleComment;
      i++;
      continue;
    }

    if (state === singleComment && currentChar === "\n") {
      // End of single-line comment
      state = null;
      result += currentChar; // Keep the newline
      continue;
    }

    if (!state && currentChar === "/" && nextChar === "*") {
      // Start of multi-line comment
      state = multiComment;
      i++;
      continue;
    }

    if (state === multiComment && currentChar === "*" && nextChar === "/") {
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
    .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with a single one
    .replace(/^\s+|\s+$/g, ""); // Trim leading/trailing whitespace
}

/**
 * Resolves a property path string to a value in an object
 * Replaces lodash's _.propertyOf
 */
export function getPropertyByPath<T>(
  obj: T,
  path: string
): T[keyof T] | undefined {
  if (!path) return undefined;

  const parts = path.split(/[.[\]]+/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
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
  value: unknown
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
