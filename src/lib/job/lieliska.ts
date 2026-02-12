import type { ExcelPreviewData } from "../excel/lieliska";

export type LieliskaJobResult = {
  rows: string[][];
  unmatchedRows: string[][];
  unmatchedSvitrkods: string[][];
  sourceRowCount: number;
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const isVeidlapasHeader = (value: string) => normalizeHeader(value).includes("veidlapas");

const isSvitrkodsHeader = (value: string) => {
  const header = normalizeHeader(value);
  return header.includes("svitrkods") || header.includes("rezervacijaskods");
};

const isSummaHeader = (value: string) => {
  const header = normalizeHeader(value);
  return header.includes("summa") || header.includes("pardosanascena");
};

export const ensureLieliskaRunSchema = (
  preview: ExcelPreviewData
): ExcelPreviewData => {
  const headers = preview.headers.slice();
  const rows = preview.rows.map((row) => row.slice());
  const veidlapasIndex = headers.findIndex((header) => isVeidlapasHeader(header));
  if (veidlapasIndex < 0) {
    throw new Error("Expected Veidlapas Nr. column.");
  }

  // Compatibility mode for files that end with Veidlapas Nr. and miss tail columns.
  if (veidlapasIndex === headers.length - 1) {
    const nextHeaders = [...headers, "Svītrkods", "Summa, €"];
    const nextRows = rows.map((row) => [...row, "", ""]);
    const nextColumnWidths = [...preview.columnWidths, undefined, undefined];
    const nextColumnNumFmts = [...preview.columnNumFmts, undefined, undefined];
    return {
      ...preview,
      headers: nextHeaders,
      rows: nextRows,
      colCount: nextHeaders.length,
      columnWidths: nextColumnWidths,
      columnNumFmts: nextColumnNumFmts,
      sourceRowCount: nextRows.length,
      autoAddedSvitrkodsColumn: true,
    };
  }

  return preview;
};

const validateExpectedColumns = (headers: string[]) => {
  if (headers.length < 3) {
    throw new Error("Need at least 3 columns to run this job.");
  }
  const veidlapasHeader = normalizeHeader(headers[headers.length - 3] ?? "");
  const svitrkodsHeader = normalizeHeader(headers[headers.length - 2] ?? "");
  const summaHeader = normalizeHeader(headers[headers.length - 1] ?? "");

  if (!veidlapasHeader.includes("veidlapas")) {
    throw new Error("Expected Veidlapas Nr. as column -3.");
  }
  if (!isSvitrkodsHeader(svitrkodsHeader)) {
    throw new Error("Expected Svitrkods as column -2.");
  }
  if (!isSummaHeader(summaHeader)) {
    throw new Error("Expected Summa as column -1.");
  }
};

const getLastFourDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
};

export const runLieliskaJob = (preview: ExcelPreviewData): LieliskaJobResult => {
  validateExpectedColumns(preview.headers);
  const columnCount = preview.headers.length;
  const veidlapasIndex = columnCount - 3;
  const svitrkodsIndex = columnCount - 2;
  const summaIndex = columnCount - 1;
  const targetRows = preview.rows.slice(0, preview.sourceRowCount);
  const baseRows = targetRows.map((row) => row.slice());
  const hasInlineSource = targetRows.some(
    (row) => (row[svitrkodsIndex] ?? "").trim() || (row[summaIndex] ?? "").trim()
  );
  const sourcePairs = hasInlineSource
    ? targetRows.map((row) => [row[svitrkodsIndex] ?? "", row[summaIndex] ?? ""])
    : (preview.sourcePairs ?? []);
  const usedTargets = new Set<number>();
  const unmatchedSourceRows: string[][] = [];
  const tempPairs = Array.from({ length: targetRows.length }, () => ({
    svitrkods: "",
    summa: "",
  }));

  sourcePairs.forEach(([sourceSvitrkods, sourceSumma]) => {
    const svitrkods = sourceSvitrkods ?? "";
    const summa = sourceSumma ?? "";
    const lastFour = getLastFourDigits(svitrkods);
    if (!lastFour) {
      if (!svitrkods.trim() && !summa.trim()) {
        return;
      }
      unmatchedSourceRows.push([svitrkods, summa]);
      return;
    }

    const matches = targetRows
      .map((targetRow, targetIndex) => ({
        targetIndex,
        veidlapas: targetRow[veidlapasIndex] ?? "",
        dokumentaSumma: targetRow[5] ?? "",
      }))
      .filter(({ veidlapas }) => getLastFourDigits(veidlapas).endsWith(lastFour));

    if (matches.length === 0) {
      unmatchedSourceRows.push([svitrkods, summa]);
      return;
    }

    const hasSumColumn = columnCount > 5;
    const sumMatches = hasSumColumn
      ? matches.filter((match) => match.dokumentaSumma === summa)
      : [];
    const availableSumMatch = sumMatches.find(
      (match) => !usedTargets.has(match.targetIndex)
    );
    const available = matches.find((match) => !usedTargets.has(match.targetIndex));
    const chosen = availableSumMatch ?? available;
    if (!chosen) {
      unmatchedSourceRows.push([svitrkods, summa]);
      return;
    }
    usedTargets.add(chosen.targetIndex);
    tempPairs[chosen.targetIndex] = { svitrkods, summa };
  });

  const mergedRows = baseRows.map((row, index) => {
    const next = row.slice();
    next[svitrkodsIndex] = tempPairs[index].svitrkods;
    next[summaIndex] = tempPairs[index].summa;
    return next;
  });

  const unmatchedVeidlapas = mergedRows.filter(
    (row) => !row[svitrkodsIndex] && !row[summaIndex]
  );
  const trimmedRows = mergedRows.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );

  const appendedRows = unmatchedSourceRows.map((pair) => {
    const padded = Array.from({ length: columnCount }, () => "");
    padded[svitrkodsIndex] = pair[0] ?? "";
    padded[summaIndex] = pair[1] ?? "";
    return padded;
  });

  return {
    rows: trimmedRows.concat(appendedRows),
    unmatchedRows: unmatchedVeidlapas.map((row) =>
      row.slice(0, Math.max(columnCount - 2, 0))
    ),
    unmatchedSvitrkods: unmatchedSourceRows,
    sourceRowCount: trimmedRows.length,
  };
};

