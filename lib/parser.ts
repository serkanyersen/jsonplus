import type { JsonPlus, JsonValue, ParseOptions } from '../types.ts';
import {
  getPropertyByPath,
  isPlainObject,
  stripJsonComments,
  validateAndResolvePath,
} from './utils.ts';

/**
 * Regular expressions for matching JSON+ tags and templates
 */
const PATTERNS = {
  SELF_TAG: /^@self[.[]/,
  EXTERNAL_TAG: /^@ext[.[]/,
  ANY_TAG: /^@(self|ext)[.[]/,
  TEMPLATE: /\{\{\s*(.*?)\s*\}\}/gim,
} as const;

/**
 * Implementation class for parsing and processing JSON with comments,
 * self-references, external file imports, and template strings.
 * @implements {JsonPlus}
 */
class JsonPlusImpl implements JsonPlus {
  /** Set of files that have been loaded to prevent circular dependencies */
  readonly #loadedFiles: Set<string>;

  /** Default maximum depth for recursive resolution */
  readonly #DEFAULT_MAX_DEPTH = 100;

  constructor() {
    this.#loadedFiles = new Set();
  }
  /**
   * Resolves a property path in a JSON object using dot notation
   * @example resolvePath(obj, "users.0.name") => obj.users[0].name
   */
  public resolvePath(
    object: JsonValue,
    reference: string,
  ): JsonValue | undefined {
    return getPropertyByPath<Record<string, JsonValue>>(
      object as Record<string, JsonValue>,
      reference,
    );
  }

  /**
   * Processes a template string, replacing {{expression}} with values from the object
   * @example parseTemplate(obj, "Hello {{user.name}}!") => "Hello John!"
   */
  public parseTemplate(object: JsonValue, template: string): string {
    const templateStr = template || '';
    return templateStr.replace(PATTERNS.TEMPLATE, (all, match) => {
      const value = this.resolvePath(
        object,
        match.replace(PATTERNS.SELF_TAG, ''),
      );
      return value?.toString() || all;
    });
  }

  /**
   * Internal helper to recursively resolve references in an object
   * @private
   * @param obj The object/value to resolve
   * @param self The root object for reference resolution
   * @param path Current path in the object tree
   * @param depth Current recursion depth (for preventing infinite loops)
   * @param maxDepth Maximum allowed recursion depth
   */
  #resolveInternal(
    obj: JsonValue,
    self: JsonValue,
    path: string[] = [],
    depth = 0,
    maxDepth = this.#DEFAULT_MAX_DEPTH,
  ): void {
    // Check recursion depth limit
    if (depth > maxDepth) {
      throw new Error(
        `Maximum recursion depth (${maxDepth}) exceeded. Possible circular reference.`,
      );
    }

    const nextDepth = depth + 1;
    if (isPlainObject(obj)) {
      // If object, go through each value recursively
      for (const [key, value] of Object.entries(obj)) {
        this.#resolveInternal(value, self, [...path, key], nextDepth, maxDepth);
      }
    } else if (Array.isArray(obj)) {
      // If array, go through each item recursively
      obj.forEach((item, index) => {
        this.#resolveInternal(
          item,
          self,
          [...path, index.toString()],
          nextDepth,
          maxDepth,
        );
      });
    } else if (typeof obj === 'string') {
      const parent = path
        .slice(0, -1)
        .reduce(
          (acc: Record<string, JsonValue>, key) => acc[key] as Record<string, JsonValue>,
          self as Record<string, JsonValue>,
        );
      const lastKey = path[path.length - 1];
      const value = obj;

      // Process the value
      if (PATTERNS.ANY_TAG.test(value)) {
        // Handle direct references (@self and @ext)
        const isExternal = PATTERNS.EXTERNAL_TAG.test(value);
        let reference: string;
        if (isExternal) {
          // For @ext, remove @ext prefix while preserving bracket
          if (value.startsWith('@ext[')) {
            reference = value.substring(4); // Remove "@ext" to get "[0]..."
          } else if (value.startsWith('@ext.')) {
            reference = value.substring(5); // Remove "@ext." to get "users..."
          } else {
            reference = value.replace(PATTERNS.EXTERNAL_TAG, '');
          }
          reference = `ext.${reference}`;
        } else {
          // For @self, remove @self prefix while preserving bracket
          if (value.startsWith('@self[')) {
            reference = value.substring(5); // Remove "@self" to get "[0]..."
          } else if (value.startsWith('@self.')) {
            reference = value.substring(6); // Remove "@self." to get "foo..."
          } else {
            reference = value.replace(PATTERNS.SELF_TAG, '');
          }
        }
        const resolved = this.resolvePath(
          self,
          reference,
        );

        if (resolved !== undefined) {
          parent[lastKey] = resolved;
          // If the resolved value is a string, it might contain more references
          if (
            typeof resolved === 'string' &&
            (PATTERNS.ANY_TAG.test(resolved) || resolved.includes('{{'))
          ) {
            this.#resolveInternal(
              parent[lastKey],
              self,
              [...path],
              nextDepth,
              maxDepth,
            );
          }
        }
      } else if (value.includes('{{')) {
        // Handle template strings
        const templated = value.replace(PATTERNS.TEMPLATE, (all, match) => {
          const trimmedMatch = match.trim();
          const refMatch = trimmedMatch.match(PATTERNS.ANY_TAG);
          if (refMatch) {
            // Handle references inside templates (@self or @ext)
            const isExternal = PATTERNS.EXTERNAL_TAG.test(trimmedMatch);
            // Remove @self or @ext prefix, preserving the path
            // @self[0].last -> [0].last (need to preserve the bracket)
            // @self.foo -> foo
            // @ext.users -> ext.users
            let reference: string;
            if (isExternal) {
              // For @ext, remove @ext prefix (which matches @ext[ or @ext.)
              // @ext[0] -> [0], @ext.users -> users
              reference = trimmedMatch.replace(/^@ext[.[]/, '');
              reference = `ext.${reference}`;
            } else {
              // For @self, remove @self prefix (which matches @self[ or @self.)
              // @self[0].last -> [0].last, @self.foo -> foo
              // The regex /^@self[.[]/ matches @self[ or @self., so we need to preserve what comes after
              if (trimmedMatch.startsWith('@self[')) {
                // @self[0].last -> [0].last
                reference = trimmedMatch.substring(5); // Remove "@self"
              } else if (trimmedMatch.startsWith('@self.')) {
                // @self.foo -> foo
                reference = trimmedMatch.substring(6); // Remove "@self."
              } else {
                // Fallback: just remove the matched part
                reference = trimmedMatch.replace(PATTERNS.SELF_TAG, '');
              }
            }
            const resolved = this.resolvePath(self, reference);
            return resolved?.toString() || all;
          } else {
            // Handle regular template expressions (no @self/@ext prefix)
            // Could be [0].first, name, etc.
            const resolved = this.resolvePath(self, trimmedMatch);
            return resolved?.toString() || all;
          }
        });
        parent[lastKey] = templated;
      }
    }
  }

  /**
   * Resolves self references on an already parsed object
   */
  /**
   * Resolves self references on an already parsed object
   * @param object The object to resolve references in
   * @param self Optional object to resolve references against (defaults to object)
   */
  public resolve(object: JsonValue, self?: JsonValue): JsonValue {
    const root = self || object;
    // Use default maxDepth for standalone resolve calls
    // For custom maxDepth, use parse() with options.maxDepth
    this.#resolveInternal(object, root, [], 0, this.#DEFAULT_MAX_DEPTH);
    return object;
  }

  /**
   * Loads and parses an external file with security validation
   * @private
   * @throws {Error} If path traversal, absolute path, or circular dependency detected
   */
  #loadExternalFile(filePath: string, options: ParseOptions): JsonValue {
    // Determine base path: use options.basePath or default to current working directory
    let basePath: string;
    if (options.basePath) {
      basePath = options.basePath;
    } else {
      // Default to current working directory
      // Users should provide basePath explicitly for external file references
      basePath = Deno.cwd();
    }

    // Ensure basePath is absolute and normalized
    if (!basePath.startsWith('/')) {
      // If relative, resolve it relative to current working directory
      basePath = new URL(basePath, `file://${Deno.cwd()}/`).pathname;
    }
    basePath = basePath.replace(/\/$/, ''); // Remove trailing slash

    // Validate and resolve the file path
    let fullPath: string;
    try {
      fullPath = validateAndResolvePath(filePath, basePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid external file path: ${message}`);
    }

    // Check for circular dependencies
    if (this.#loadedFiles.has(fullPath)) {
      throw new Error(`Circular dependency detected: ${fullPath}`);
    }

    try {
      const content = Deno.readTextFileSync(fullPath);
      this.#loadedFiles.add(fullPath);

      // Parse the external file with the same basePath to maintain context
      return this.parse(content, {
        ...options,
        basePath: basePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load external file ${fullPath}: ${message}`);
    }
  }

  /**
   * Resolves external file references in the object
   * @private
   */
  #resolveExternals(obj: JsonValue, options: ParseOptions): void {
    if (isPlainObject(obj)) {
      const objRecord = obj as Record<string, JsonValue>;

      // Handle @ext declaration at root level
      if ('@ext' in objRecord && isPlainObject(objRecord['@ext'])) {
        const externalRefs = objRecord['@ext'] as Record<string, string>;
        const loadedFiles: Record<string, JsonValue> = {};

        // Load all external files
        for (const [key, path] of Object.entries(externalRefs)) {
          loadedFiles[key] = this.#loadExternalFile(path, options);
        }

        // Store loaded files under 'ext' for reference resolution
        objRecord.ext = loadedFiles;

        // Resolve any references in the object with maxDepth from options
        const maxDepth = options.maxDepth ?? this.#DEFAULT_MAX_DEPTH;
        this.#resolveInternal(obj, obj, [], 0, maxDepth);

        // Clean up by removing the @ext key and ext namespace after resolution
        delete objRecord['@ext'];
        delete objRecord.ext;
      }

      // Recursively process all values
      for (const value of Object.values(objRecord)) {
        this.#resolveExternals(value, options);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => this.#resolveExternals(item, options));
    }
  }

  /**
   * Parses a JSON string with comments and self-references
   * @throws {Error} If the JSON is invalid or contains circular dependencies
   */
  public parse(jsonString: string, options: ParseOptions = {}): JsonValue {
    // Reset loaded files for new parse operation
    this.#loadedFiles.clear();

    // Strip comments from JSON
    const cleaned = stripJsonComments(jsonString);

    try {
      // Parse the JSON
      const parsed = JSON.parse(cleaned);

      // Handle external references first
      this.#resolveExternals(parsed, options);

      // Then resolve self references with maxDepth from options
      const maxDepth = options.maxDepth ?? this.#DEFAULT_MAX_DEPTH;
      this.#resolveInternal(parsed, parsed, [], 0, maxDepth);
      return parsed;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Singleton instance for backward compatibility
 */
const jsonPlus: JsonPlusImpl = new JsonPlusImpl();

// Bind methods to the instance with explicit types
export const parse: (
  jsonString: string,
  options?: ParseOptions,
) => JsonValue = jsonPlus.parse.bind(jsonPlus);

export const resolve: (
  object: JsonValue,
  self?: JsonValue,
) => JsonValue = jsonPlus.resolve.bind(jsonPlus);

export const resolvePath: (
  object: JsonValue,
  reference: string,
) => JsonValue | undefined = jsonPlus.resolvePath.bind(jsonPlus);

export const parseTemplate: (
  object: JsonValue,
  template: string,
) => string = jsonPlus.parseTemplate.bind(jsonPlus);

/**
 * Export the implementation class for users who want custom instances
 */
export { JsonPlusImpl as JsonPlus };
