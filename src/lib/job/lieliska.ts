import type { ExcelPreviewData } from "../excel/lieliska";

export type LieliskaJobResult = {
  rows: string[][];
  unmatchedRows: string[][];
  unmatchedSvitrkods: string[][];
  sourceRowCount: number;
};

const getLastFourDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
};

export const runLieliskaJob = (preview: ExcelPreviewData): LieliskaJobResult => {
  const columnCount = preview.headers.length;
  const veidlapasIndex = columnCount - 3;
  const svitrkodsIndex = columnCount - 2;
  const summaIndex = columnCount - 1;
  const sourceRows = preview.rows.slice(0, preview.sourceRowCount);
  const baseRows = sourceRows.map((row) => row.slice());
  const usedTargets = new Set<number>();
  const unmatchedSourceRows: string[][] = [];
  const tempPairs = Array.from({ length: sourceRows.length }, () => ({
    svitrkods: "",
    summa: "",
  }));

  sourceRows.forEach((row) => {
    const svitrkods = row[svitrkodsIndex] ?? "";
    const summa = row[summaIndex] ?? "";
    const lastFour = getLastFourDigits(svitrkods);
    if (!lastFour) {
      unmatchedSourceRows.push([svitrkods, summa]);
      return;
    }

    const matches = sourceRows
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
    const chosen = availableSumMatch ?? available ?? sumMatches[0] ?? matches[0];
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
