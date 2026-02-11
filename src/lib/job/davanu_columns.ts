const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const containsAllTokens = (header: string, candidate: string) => {
  const tokens = normalizeHeader(candidate).match(/[a-z0-9]+/g) ?? [];
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every((token) => header.includes(token));
};

const findColumnIndex = (
  headers: string[],
  candidates: string[],
  fallback: number
) => {
  const normalized = headers.map((header) => normalizeHeader(header));
  for (const candidate of candidates) {
    const target = normalizeHeader(candidate);
    const index = normalized.findIndex(
      (header) => header.includes(target) || containsAllTokens(header, candidate)
    );
    if (index >= 0) {
      return index;
    }
  }
  return fallback;
};

export const getDavanuPdfCodeIndex = (headers: string[]) =>
  findColumnIndex(headers, ["Rezervacijas kods", "Rezervacijas"], 1);

export const getDavanuPdfDateIndex = (headers: string[]) =>
  findColumnIndex(headers, ["Sistema atzimets", "Starpnieka atzimets"], 3);

export const getDavanuPdfSumIndex = (headers: string[]) =>
  findColumnIndex(headers, ["Pardosanas cena", "Cena"], Math.max(headers.length - 1, 0));
