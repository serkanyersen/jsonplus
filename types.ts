/**
 * Options for parsing JSON+ strings
 */
export interface ParseOptions {
  /**
   * Base path for resolving external file references
   */
  basePath?: string;

  /**
   * Internal use: Tracks external references to prevent circular dependencies
   */
  _loadedFiles?: Set<string>;
}

/**
 * Any valid JSON value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

/**
 * Main interface for the jsonplus module
 */
export interface JsonPlus {
  /**
   * Takes a JSON string and returns back an object.
   * In JSON String values you can use `@self`
   * notation and reference the JSON itself. This will
   * replace the value with reference
   */
  parse(jsonString: string, options?: ParseOptions): JsonValue;

  /**
   * Resolves self references on an already parsed object
   * self here is where references will be resolved against
   */
  resolve(object: JsonValue, self?: JsonValue): JsonValue;

  /**
   * Resolves JS array notation in string to actual value
   */
  resolvePath(object: JsonValue, reference: string): JsonValue | undefined;

  /**
   * Parses template strings with {{expression}} syntax
   */
  parseTemplate(object: JsonValue, template: string): string;
}
