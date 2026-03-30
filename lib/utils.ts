export function makeId(prefix = "id"): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${random}`;
}

export function truncate(input: string, maxLength = 280): string {
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength - 1)}…`;
}

export function parseJsonObject<T extends Record<string, unknown>>(
  raw: string
): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const candidate = raw.slice(start, end + 1);
        return JSON.parse(candidate) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
