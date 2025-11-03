import type { JsonPlus, JsonValue, ParseOptions } from '../types.ts';
import { stripJsonComments, getPropertyByPath, isPlainObject } from './utils.ts';

const selfTagPattern = /^@self[.[]/;
const externalTagPattern = /^@ext[.[]/;
const tagPattern = /^@(self|ext)[.[]/;

class JsonPlusImpl implements JsonPlus {
  /**
   * Resolves JS array notation in string to actual value
   */
  resolvePath = (object: JsonValue, reference: string): JsonValue | undefined => {
    return getPropertyByPath<Record<string, JsonValue>>(object as Record<string, JsonValue>, reference);
  };

  /**
   * Simple template tag matcher, finds tags and evaluates values
   */
  parseTemplate = (object: JsonValue, template: string): string => {
    const templateStr = template || '';
    return templateStr.replace(/\{\{\s*(.*?)\s*\}\}/gim, (all, match) => {
      const value = this.resolvePath(object, match.replace(selfTagPattern, ''));
      return value?.toString() || all;
    });
  };

  /**
   * Recursively resolves references in an object
   */
  private resolveInternal = (obj: JsonValue, self: JsonValue, path: string[] = []): void => {
    if (isPlainObject(obj)) {
      // If object, go through each value recursively
      for (const [key, value] of Object.entries(obj)) {
        this.resolveInternal(value, self, [...path, key]);
      }
    } else if (Array.isArray(obj)) {
      // If array, go through each item recursively
      obj.forEach((item, index) => {
        this.resolveInternal(item, self, [...path, index.toString()]);
      });
    } else if (typeof obj === 'string') {
      const parent = path.slice(0, -1).reduce((acc: Record<string, JsonValue>, key) => acc[key] as Record<string, JsonValue>, self as Record<string, JsonValue>);
      const lastKey = path[path.length - 1];
      const value = obj;

      // Process the value
      if (tagPattern.test(value)) {
        // Handle direct references (@self and @ext)
        const isExternal = externalTagPattern.test(value);
        const reference = value.replace(isExternal ? externalTagPattern : selfTagPattern, '');
        const resolved = this.resolvePath(self, isExternal ? `ext.${reference}` : reference);
        if (resolved !== undefined) {
          parent[lastKey] = resolved;
          // If the resolved value is a string, it might contain more references
          if (typeof resolved === 'string' && (tagPattern.test(resolved) || resolved.includes('{{'))) {
            this.resolveInternal(parent[lastKey], self, [...path]);
          }
        }
      } else if (value.includes('{{')) {
        // Handle template strings
        const templated = value.replace(/\{\{\s*(.*?)\s*\}\}/gim, (all, match) => {
          const refMatch = match.match(tagPattern);
          if (refMatch) {
            // Handle references inside templates
            const isExternal = externalTagPattern.test(match);
            const reference = match.replace(isExternal ? externalTagPattern : selfTagPattern, '');
            const resolved = this.resolvePath(self, isExternal ? `ext.${reference}` : reference);
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
  };

  /**
   * Resolves self references on an already parsed object
   */
  resolve = (object: JsonValue, self?: JsonValue): JsonValue => {
    const root = self || object;
    this.resolveInternal(object, root);
    return object;
  };

  /**
   * Loads and parses an external file
   */
  private loadExternalFile = (filePath: string, options: ParseOptions): JsonValue => {
    const { _loadedFiles = new Set() } = options;
    
    // Convert relative path to absolute path using import.meta.url
    const currentDir = new URL('../v1/', import.meta.url).pathname;
    const fullPath = new URL(filePath, `file://${currentDir}`).pathname;

    if (_loadedFiles.has(fullPath)) {
      throw new Error(`Circular dependency detected: ${fullPath}`);
    }

    try {
      const content = Deno.readTextFileSync(fullPath);
      return this.parse(content, {
        ...options,
        basePath: currentDir,
        _loadedFiles: new Set([..._loadedFiles, fullPath])
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load external file ${fullPath}: ${message}`);
    }
  };

  /**
   * Resolves external file references in the object
   */
  private resolveExternals = (obj: JsonValue, options: ParseOptions): void => {
    if (isPlainObject(obj)) {
      const objRecord = obj as Record<string, JsonValue>;
      
      // Handle @ext declaration at root level
      if ('@ext' in objRecord && isPlainObject(objRecord['@ext'])) {
        const externalRefs = objRecord['@ext'] as Record<string, string>;
        const loadedFiles: Record<string, JsonValue> = {};

        // Load all external files
        for (const [key, path] of Object.entries(externalRefs)) {
          loadedFiles[key] = this.loadExternalFile(path, options);
        }

        // Store loaded files under 'ext' for reference resolution
        objRecord.ext = loadedFiles;

        // Resolve any references in the object
        this.resolveInternal(obj, obj, []);

        // Clean up by removing the @ext key and ext namespace after resolution
        delete objRecord['@ext'];
        delete objRecord.ext;
      }

      // Recursively process all values
      for (const value of Object.values(objRecord)) {
        this.resolveExternals(value, options);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => this.resolveExternals(item, options));
    }
  };

  /**
   * Parses a JSON string with comments and self-references
   */
  parse = (jsonString: string, options: ParseOptions = {}): JsonValue => {
    // Strip comments from JSON
    const cleaned = stripJsonComments(jsonString);
    
    try {
      // Parse the JSON
      const parsed = JSON.parse(cleaned);
      
      // Handle external references first
      this.resolveExternals(parsed, options);

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

// Create singleton instance and bind methods
const jsonPlus = new JsonPlusImpl();

// Export instance methods (no binding needed with arrow functions)
export const {
  parse,
  resolve,
  resolvePath,
  parseTemplate,
} = jsonPlus;