import type { DavanuExcelPreview } from "../excel/davanu";
import type { PdfPreview } from "../pdf/davanu";
import {
  getDavanuPdfCodeIndex,
  getDavanuPdfDateIndex,
  getDavanuPdfSumIndex,
} from "./davanu_columns";

export type DavanuJobInput = {
  excel: DavanuExcelPreview;
  pdf: PdfPreview;
};

export type DavanuJobResult = {
  excel: DavanuExcelPreview;
  pdf: PdfPreview;
  matches: Array<{
    pdfRowIndex: number;
    excelRowIndex: number;
  }>;
  unmatchedPdfRows: string[][];
  warnings: string[];
};

const normalizeCode = (value: string) => value.trim().toLowerCase();

const normalizeNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumberValue = (value: string) => {
  const parsed = normalizeNumber(value);
  if (parsed === null) return value;
  return parsed.toFixed(2).replace(".", ",");
};

const normalizePdfDate = (value: string) => {
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const normalizeExcelDate = (value: string) => {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
};

export const runDavanuJob = ({ excel, pdf }: DavanuJobInput): DavanuJobResult => {
  const warnings: string[] = [];
  const matches: Array<{ pdfRowIndex: number; excelRowIndex: number }> = [];
  const unmatchedPdfRows: string[][] = [];

  const excelCodeIndex = excel.headers.length - 3;
  const excelSumIndex = 5;
  const excelSvitrkodsIndex = excel.headers.length - 2;
  const excelSummaIndex = excel.headers.length - 1;
  const pdfCodeIndex = getDavanuPdfCodeIndex(pdf.headers);
  const pdfSumIndex = getDavanuPdfSumIndex(pdf.headers);
  const pdfDateIndex = getDavanuPdfDateIndex(pdf.headers);
  const excelDateIndex = 2;

  const excelRows = excel.rows.map((row, index) => ({
    index,
    code: normalizeCode(row[excelCodeIndex] ?? ""),
    sum: normalizeNumber(row[excelSumIndex] ?? ""),
  }));

  const pdfRows = pdf.rows.map((row, index) => ({
    index,
    code: normalizeCode(row[pdfCodeIndex] ?? ""),
    sum: normalizeNumber(row[pdfSumIndex] ?? ""),
    date: normalizePdfDate(row[pdfDateIndex] ?? ""),
    raw: row,
  }));

  const byCode = new Map<string, typeof pdfRows>();
  pdfRows.forEach((row) => {
    if (!row.code) return;
    const existing = byCode.get(row.code) ?? [];
    existing.push(row);
    byCode.set(row.code, existing);
  });

  const usedPdfRows = new Set<number>();
  const nextRows = excel.rows.map((row) => row.slice());
  const dateSumMatchRows: number[] = [];

  excelRows.forEach((excelRow) => {
    const code = excelRow.code;
    if (!code) {
      return;
    }

    const candidates = byCode.get(code);
    if (!candidates || candidates.length === 0) {
      return;
    }

    const sumMatches =
      excelRow.sum === null
        ? []
        : candidates.filter((candidate) => candidate.sum === excelRow.sum);
    const availableSumMatch = sumMatches.find(
      (candidate) => !usedPdfRows.has(candidate.index)
    );
    const available = candidates.find((candidate) => !usedPdfRows.has(candidate.index));
    const chosen = availableSumMatch ?? available;
    if (!chosen) {
      return;
    }

    usedPdfRows.add(chosen.index);
    matches.push({ pdfRowIndex: chosen.index, excelRowIndex: excelRow.index });

    const updated = nextRows[excelRow.index].slice();
    updated[excelSvitrkodsIndex] = chosen.raw[pdfCodeIndex] ?? "";
    updated[excelSummaIndex] = formatNumberValue(chosen.raw[pdfSumIndex] ?? "");
    nextRows[excelRow.index] = updated;
  });

  excelRows.forEach((excelRow) => {
    if (nextRows[excelRow.index]?.[excelSvitrkodsIndex]) return;
    const excelDate = normalizeExcelDate(
      excel.rows[excelRow.index]?.[excelDateIndex] ?? ""
    );
    if (!excelDate) return;
    if (excelRow.sum === null) return;

    const candidates = pdfRows.filter(
      (row) => row.date === excelDate && row.sum === excelRow.sum
    );
    const available = candidates.find((candidate) => !usedPdfRows.has(candidate.index));
    if (!available) return;

    usedPdfRows.add(available.index);
    matches.push({ pdfRowIndex: available.index, excelRowIndex: excelRow.index });
    dateSumMatchRows.push(excelRow.index);

    const updated = nextRows[excelRow.index].slice();
    updated[excelSvitrkodsIndex] = available.raw[pdfCodeIndex] ?? "";
    updated[excelSummaIndex] = formatNumberValue(available.raw[pdfSumIndex] ?? "");
    nextRows[excelRow.index] = updated;
  });

  pdfRows.forEach((row) => {
    if (!usedPdfRows.has(row.index)) {
      unmatchedPdfRows.push(row.raw);
    }
  });

  const appended = unmatchedPdfRows.map((row) => {
    const padded = Array.from({ length: excel.headers.length }, () => "");
    padded[excelSvitrkodsIndex] = row[pdfCodeIndex] ?? "";
    padded[excelSummaIndex] = formatNumberValue(row[pdfSumIndex] ?? "");
    return padded;
  });

  const nextExcel: DavanuExcelPreview = {
    ...excel,
    rows: nextRows.concat(appended),
    rowCount: nextRows.length + appended.length + 1,
    dateSumMatchRows,
  };

  return {
    excel: nextExcel,
    pdf,
    matches,
    unmatchedPdfRows,
    warnings,
  };
};
