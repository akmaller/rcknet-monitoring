const RATE_LIMIT_REGEX =
  /^\s*(\d+(?:\.\d+)?)\s*([KMGkmg])\s*\/\s*(\d+(?:\.\d+)?)\s*([KMGkmg])\s*$/;

export const isValidRateLimit = (value: string) => {
  const match = RATE_LIMIT_REGEX.exec(value);
  if (!match) return false;
  const download = Number.parseFloat(match[1]);
  const upload = Number.parseFloat(match[3]);
  if (!Number.isFinite(download) || !Number.isFinite(upload)) return false;
  return download > 0 && upload > 0;
};

export const normalizeRateLimit = (value?: string | null) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === '') return '';
  const match = RATE_LIMIT_REGEX.exec(trimmed);
  if (!match) return trimmed;
  const download = match[1];
  const downloadUnit = match[2].toUpperCase();
  const upload = match[3];
  const uploadUnit = match[4].toUpperCase();
  return `${download}${downloadUnit}/${upload}${uploadUnit}`;
};
