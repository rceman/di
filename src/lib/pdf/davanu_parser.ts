import * as pdfjsLib from "pdfjs-dist";

export const CFG = {
  rowEps: 2.0,
  cellGap: 10.0,
  colClusterGap: 15.0,
};

const fixPdfText = (value: string) => {
  const raw = String(value ?? "");
  const normalized =
    typeof (pdfjsLib as { normalizeUnicode?: (v: string) => string })
      .normalizeUnicode === "function"
      ? (pdfjsLib as { normalizeUnicode: (v: string) => string }).normalizeUnicode(
          raw
        )
      : raw;
  return normalized;
};

export const normStr = (value: string) =>
  fixPdfText(value).replace(/\s+/g, " ").trim();

const normalizeSearchText = (value: string) =>
  normStr(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const mergeCellText = (prev: string, next: string) => {
  if (!prev) return next;
  if (!next) return prev;
  return prev.endsWith("-") ? `${prev}${next}` : `${prev} ${next}`;
};

export const normalizeMoneyText = (value: string) => {
  const stripped = normStr(value).replaceAll("˘'ż", "");
  if (!stripped) return null;
  const normalized = stripped.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const formatMoneyValue = (value: number) => value.toFixed(2).replace(".", ",");

export const getDavanuMoneyColumns = (count: number) =>
  count >= 3 ? [count - 3, count - 1] : [];

export const applyDavanuColumnRules = (rows: string[][], headers: string[]) => {
  const moneyCols = getDavanuMoneyColumns(headers.length);
  return rows.map((row) => {
    const next = row.slice();
    moneyCols.forEach((index) => {
      if (index < 0 || index >= next.length) return;
      const parsed = normalizeMoneyText(next[index]);
      if (parsed !== null) {
        next[index] = formatMoneyValue(parsed);
      }
    });
    return next;
  });
};

export const toTopY = (viewportHeight: number, yBottom: number) =>
  viewportHeight - yBottom;

const cluster1D = (values: number[], gap: number) => {
  const xs = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const x of xs) {
    if (clusters.length === 0) {
      clusters.push([x]);
      continue;
    }
    const last = clusters[clusters.length - 1];
    const lastMean = last.reduce((a, b) => a + b, 0) / last.length;
    if (Math.abs(x - lastMean) <= gap) {
      last.push(x);
    } else {
      clusters.push([x]);
    }
  }
  return clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
};

const splitLineIntoCells = (
  lineItems: { str: string; x: number }[],
  cellGap: number
) => {
  const cells: { x: number; text: string }[] = [];
  let cur = { x0: null as number | null, text: "" };
  let prevX: number | null = null;
  for (const it of lineItems) {
    const text = normStr(it.str);
    if (!text) continue;
    if (prevX !== null && it.x - prevX > cellGap) {
      if (cur.text.trim()) cells.push({ x: cur.x0 ?? 0, text: cur.text.trim() });
      cur = { x0: null, text: "" };
    }
    if (cur.x0 === null) cur.x0 = it.x;
    cur.text = mergeCellText(cur.text, text);
    prevX = it.x;
  }
  if (cur.text.trim()) cells.push({ x: cur.x0 ?? 0, text: cur.text.trim() });
  return cells;
};

export const groupIntoLines = (
  items: { str: string; x: number; yTop: number }[],
  rowEps: number
) => {
  const sorted = [...items].sort((a, b) => a.yTop - b.yTop || a.x - b.x);
  const lines: { yTop: number; items: typeof items }[] = [];
  for (const it of sorted) {
    let placed = false;
    for (const line of lines) {
      if (Math.abs(line.yTop - it.yTop) <= rowEps) {
        line.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) lines.push({ yTop: it.yTop, items: [it] });
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.yTop = line.items.reduce((s, t) => s + t.yTop, 0) / line.items.length;
  }
  lines.sort((a, b) => a.yTop - b.yTop);
  return lines;
};

const findHeaderLineIndex = (lines: { items: { str: string }[] }[]) => {
  for (let i = 0; i < lines.length; i++) {
    const text = normalizeSearchText(
      lines[i].items.map((x) => x.str).join(" ")
    );
    if (text.includes("nr") && (text.includes("rezerv") || text.includes("pakalpoj"))) {
      return i;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const text = normalizeSearchText(
      lines[i].items.map((x) => x.str).join(" ")
    );
    if (text.includes("rezerv") && text.includes("kods")) return i;
  }
  return -1;
};

const buildRowsFromLines = (
  lines: { items: { str: string; x: number }[] }[],
  anchors: number[],
  startIndex: number
) => {
  const rows: string[][] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const lineText = normalizeSearchText(
      lines[i].items.map((x) => x.str).join(" ")
    );
    if (lineText.startsWith("summa") || lineText.startsWith("starpiba")) {
      break;
    }
    if (lineText.includes("juridiskaadrese")) {
      break;
    }

    const cells = splitLineIntoCells(lines[i].items, CFG.cellGap);
    if (!cells.length) continue;

    const row = Array(anchors.length).fill("");
    for (const c of cells) {
      let best = 0;
      let bestDist = Infinity;
      for (let k = 0; k < anchors.length; k++) {
        const d = Math.abs(anchors[k] - c.x);
        if (d < bestDist) {
          bestDist = d;
          best = k;
        }
      }
      row[best] = mergeCellText(row[best], c.text);
    }

    const nr = normStr(row[0]);
    if (nr && /^\d+/.test(nr)) {
      rows.push(row.map((x) => normStr(x)));
      continue;
    }

    if (!nr && rows.length > 0) {
      const last = rows[rows.length - 1];
      for (let c = 1; c < row.length; c++) {
        const value = normStr(row[c]);
        if (value) {
          last[c] = mergeCellText(last[c], value);
        }
      }
    }
  }
  return rows;
};

export const extractTableFromLines = (
  lines: { items: { str: string; x: number }[] }[],
  previous: { header: string[]; anchors: number[] } | null
) => {
  const headerIdx = findHeaderLineIndex(lines);
  if (headerIdx >= 0) {
    const headerBlock: typeof lines = [];
    for (let i = headerIdx; i < lines.length; i++) {
      const cells = splitLineIntoCells(lines[i].items, CFG.cellGap);
      const first = normStr(cells[0]?.text ?? "");
      if (i > headerIdx && first && /^\d+/.test(first)) break;
      headerBlock.push(lines[i]);
      if (headerBlock.length >= 4) break;
    }
    const headerCells = headerBlock.flatMap((l) =>
      splitLineIntoCells(l.items, CFG.cellGap)
    );
    const anchors = cluster1D(
      headerCells.map((c) => c.x),
      CFG.colClusterGap
    );
    const header = Array(anchors.length).fill("");
    for (const c of headerCells) {
      let best = 0;
      let bestDist = Infinity;
      for (let k = 0; k < anchors.length; k++) {
        const d = Math.abs(anchors[k] - c.x);
        if (d < bestDist) {
          bestDist = d;
          best = k;
        }
      }
      header[best] = header[best] ? `${header[best]} ${c.text}` : c.text;
    }
    const headerClean = header.map((h) => normStr(h));
    const dataStart = headerIdx + headerBlock.length;
    const rows = buildRowsFromLines(lines, anchors, dataStart);
    return { header: headerClean, anchors, rows };
  }

  if (!previous) {
    const firstDataIndex = lines.findIndex((line) => {
      const cells = splitLineIntoCells(line.items, CFG.cellGap);
      const first = normStr(cells[0]?.text ?? "");
      return first && /^\d+/.test(first);
    });
    if (firstDataIndex >= 0) {
      const cells = splitLineIntoCells(lines[firstDataIndex].items, CFG.cellGap);
      const anchors = cluster1D(cells.map((c) => c.x), CFG.colClusterGap);
      const header = Array.from({ length: anchors.length }, (_, index) =>
        `Column ${index + 1}`
      );
      const rows = buildRowsFromLines(lines, anchors, firstDataIndex);
      return { header, anchors, rows };
    }
    throw new Error("Header line not found (could be scanned PDF or different layout).");
  }

  const rows = buildRowsFromLines(lines, previous.anchors, 0);
  if (!rows.length) {
    throw new Error("Header line not found (could be scanned PDF or different layout).");
  }
  return { header: previous.header, anchors: previous.anchors, rows };
};
