const normalizeSearchText = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

export const findDavanuHeaderLineIndex = (lines: { items: { str: string }[] }[]) => {
  for (let i = 0; i < lines.length; i++) {
    const text = normalizeSearchText(lines[i].items.map((x) => x.str).join(" "));
    const hasRezerv = text.includes("rezerv");
    const hasKods = text.includes("kods");
    const hasPakalpoj = text.includes("pakalpoj");
    if (hasRezerv && (hasKods || hasPakalpoj)) {
      return i;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const text = normalizeSearchText(lines[i].items.map((x) => x.str).join(" "));
    if (text.includes("rezerv") && text.includes("kods")) {
      return i;
    }
  }
  return -1;
};
