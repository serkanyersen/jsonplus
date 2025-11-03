import type { JsonPlus, JsonValue, ParseOptions } from "../types.ts";
import {
  stripJsonComments,
  getPropertyByPath,
  isPlainObject,
} from "./utils.ts";

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

  /** Current base path for resolving external files */
  readonly #basePath?: string;

  constructor() {
    this.#loadedFiles = new Set();
  }
  /**
   * Resolves a property path in a JSON object using dot notation
   * @example resolvePath(obj, "users.0.name") => obj.users[0].name
   */
  public resolvePath(
    object: JsonValue,
    reference: string
  ): JsonValue | undefined {
    return getPropertyByPath<Record<string, JsonValue>>(
      object as Record<string, JsonValue>,
      reference
    );
  }

  /**
   * Processes a template string, replacing {{expression}} with values from the object
   * @example parseTemplate(obj, "Hello {{user.name}}!") => "Hello John!"
   */
  public parseTemplate(object: JsonValue, template: string): string {
    const templateStr = template || "";
    return templateStr.replace(PATTERNS.TEMPLATE, (all, match) => {
      const value = this.resolvePath(
        object,
        match.replace(PATTERNS.SELF_TAG, "")
      );
      return value?.toString() || all;
    });
  }

  /**
   * Internal helper to recursively resolve references in an object
   * @private
   */
  #resolveInternal(obj: JsonValue, self: JsonValue, path: string[] = []): void {
    if (isPlainObject(obj)) {
      // If object, go through each value recursively
      for (const [key, value] of Object.entries(obj)) {
        this.#resolveInternal(value, self, [...path, key]);
      }
    } else if (Array.isArray(obj)) {
      // If array, go through each item recursively
      obj.forEach((item, index) => {
        this.#resolveInternal(item, self, [...path, index.toString()]);
      });
    } else if (typeof obj === "string") {
      const parent = path
        .slice(0, -1)
        .reduce(
          (acc: Record<string, JsonValue>, key) =>
            acc[key] as Record<string, JsonValue>,
          self as Record<string, JsonValue>
        );
      const lastKey = path[path.length - 1];
      const value = obj;

      // Process the value
      if (PATTERNS.ANY_TAG.test(value)) {
        // Handle direct references (@self and @ext)
        const isExternal = PATTERNS.EXTERNAL_TAG.test(value);
        const reference = value.replace(
          isExternal ? PATTERNS.EXTERNAL_TAG : PATTERNS.SELF_TAG,
          ""
        );
        const resolved = this.resolvePath(
          self,
          isExternal ? `ext.${reference}` : reference
        );

        if (resolved !== undefined) {
          parent[lastKey] = resolved;
          // If the resolved value is a string, it might contain more references
          if (
            typeof resolved === "string" &&
            (PATTERNS.ANY_TAG.test(resolved) || resolved.includes("{{"))
          ) {
            this.#resolveInternal(parent[lastKey], self, [...path]);
          }
        }
      } else if (value.includes("{{")) {
        // Handle template strings
        const templated = value.replace(PATTERNS.TEMPLATE, (all, match) => {
          const refMatch = match.match(PATTERNS.ANY_TAG);
          if (refMatch) {
            // Handle references inside templates
            const isExternal = PATTERNS.EXTERNAL_TAG.test(match);
            const reference = match.replace(
              isExternal ? PATTERNS.EXTERNAL_TAG : PATTERNS.SELF_TAG,
              ""
            );
            const resolved = this.resolvePath(
              self,
              isExternal ? `ext.${reference}` : reference
            );
            return resolved?.toString() || all;
          } else {
            // Handle regular template expressions
            const resolved = this.resolvePath(self, match);
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
    this.#resolveInternal(object, root);
    return object;
  }

  /**
   * Loads and parses an external file
   * @private
   */
  #loadExternalFile(filePath: string, options: ParseOptions): JsonValue {
    const currentDir = new URL("../v1/", import.meta.url).pathname;
    const fullPath = new URL(filePath, `file://${currentDir}`).pathname;

    if (this.#loadedFiles.has(fullPath)) {
      throw new Error(`Circular dependency detected: ${fullPath}`);
    }

    try {
      const content = Deno.readTextFileSync(fullPath);
      this.#loadedFiles.add(fullPath);

      return this.parse(content, {
        ...options,
        basePath: currentDir,
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
      if ("@ext" in objRecord && isPlainObject(objRecord["@ext"])) {
        const externalRefs = objRecord["@ext"] as Record<string, string>;
        const loadedFiles: Record<string, JsonValue> = {};

        // Load all external files
        for (const [key, path] of Object.entries(externalRefs)) {
          loadedFiles[key] = this.#loadExternalFile(path, options);
        }

        // Store loaded files under 'ext' for reference resolution
        objRecord.ext = loadedFiles;

        // Resolve any references in the object
        this.#resolveInternal(obj, obj, []);

        // Clean up by removing the @ext key and ext namespace after resolution
        delete objRecord["@ext"];
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

      // Then resolve self references
      return this.resolve(parsed);
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
const jsonPlus = new JsonPlusImpl();

// Bind methods to the instance
export const parse = jsonPlus.parse.bind(jsonPlus);
export const resolve = jsonPlus.resolve.bind(jsonPlus);
export const resolvePath = jsonPlus.resolvePath.bind(jsonPlus);
export const parseTemplate = jsonPlus.parseTemplate.bind(jsonPlus);

/**
 * Export the implementation class for users who want custom instances
 */
export { JsonPlusImpl as JsonPlus };
