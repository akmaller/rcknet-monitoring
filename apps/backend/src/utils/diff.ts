export const diffObjects = (before: Record<string, unknown> | null, after: Record<string, unknown> | null) => {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set<string>([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach((key) => {
    const prev = before ? before[key] : undefined;
    const next = after ? after[key] : undefined;
    if (prev !== next) {
      diff[key] = { before: prev, after: next };
    }
  });
  return diff;
};
