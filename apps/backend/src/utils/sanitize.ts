const SENSITIVE_KEYS = new Set(['password', 'secret', 'pass']);

export const maskSensitive = (input: Record<string, unknown> | null | undefined) => {
  if (!input) return input;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key)) {
      output[key] = '***';
    } else {
      output[key] = value;
    }
  }
  return output;
};
