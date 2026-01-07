/**
 * Centralized UUID generation utility
 * Provides cross-browser compatible UUID generation
 */

/**
 * Generates a UUID v4 string
 * Uses crypto.randomUUID() if available, falls back to manual generation
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Alias for backward compatibility
export const uuid = generateUUID;

export default generateUUID;
