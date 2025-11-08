/**
 * Centralized UUID regex used across server and pages for validation.
 * Case-insensitive to accept uppercase/lowercase hex digits.
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
