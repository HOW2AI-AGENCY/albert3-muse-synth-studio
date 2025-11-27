/**
 * Type conversion utilities to handle null/undefined differences
 * between database types and UI component types
 */

/**
 * Converts null to undefined for optional string fields
 */
export const nullToUndefined = <T>(value: T | null): T | undefined => {
  return value === null ? undefined : value;
};

/**
 * Converts undefined to null for database fields
 */
export const undefinedToNull = <T>(value: T | undefined): T | null => {
  return value === undefined ? null : value;
};

/**
 * Safely converts a value that might be null or undefined
 */
export const toOptional = <T>(value: T | null | undefined): T | undefined => {
  return value ?? undefined;
};
