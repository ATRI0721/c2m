export interface ParsedToolResult {
  formatted: string;
  raw: string;
  isJson: boolean;
}

/**
 * Best-effort tool result formatter for display.
 * - If result is JSON (or JSON string), pretty-print it
 * - Otherwise return as-is
 */
export function parseToolResult(result: string): ParsedToolResult {
  const raw = result ?? '';
  const trimmed = raw.trim();

  // Attempt 1: direct JSON
  try {
    const parsed = JSON.parse(trimmed);
    return {
      raw,
      isJson: true,
      formatted: JSON.stringify(parsed, null, 2),
    };
  } catch {
    // ignore
  }

  // Attempt 2: JSON embedded in a string (common: "\"{...}\"")
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const unquoted = trimmed.slice(1, -1);
    try {
      const parsed = JSON.parse(unquoted);
      return {
        raw,
        isJson: true,
        formatted: JSON.stringify(parsed, null, 2),
      };
    } catch {
      // ignore
    }
  }

  return { raw, isJson: false, formatted: raw };
}



