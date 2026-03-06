import type { DavanuExcelPreview } from "../excel/davanu";
import type { PdfPreview } from "../pdf/davanu";
import type { DavanuJobResult } from "./davanu";
import {
  getDavanuExcelDateIndex,
  getDavanuExcelReservationIndex,
  getDavanuExcelSaleSumIndex,
  getDavanuExcelVeidlapasIndex,
  getDavanuPdfCodeIndex,
  getDavanuPdfDateIndex,
  getDavanuPdfSumIndex,
} from "./davanu_columns";

export type TableSlice = {
  headers: string[];
  rows: string[][];
};

export const getUnmatchedVeidlapas = (
  excel: DavanuExcelPreview | null
): TableSlice => {
  if (!excel) {
    return { headers: [], rows: [] };
  }
  const veidlapasIndex = getDavanuExcelVeidlapasIndex(excel.headers);
  const svitrkodsIndex = getDavanuExcelReservationIndex(excel.headers);
  if (veidlapasIndex < 0) {
    return { headers: [], rows: [] };
  }
  const headers = excel.headers.slice(0, veidlapasIndex + 1);
  const rows = excel.rows
    .filter((row) => {
      const veidlapasValue = row[veidlapasIndex] ?? "";
      const reservationValue = svitrkodsIndex >= 0 ? row[svitrkodsIndex] ?? "" : "";
      return Boolean(veidlapasValue) && !reservationValue;
    })
    .map((row) => row.slice(0, veidlapasIndex + 1));
  return { headers, rows };
};

export const getUnmatchedRezervacijas = (
  pdf: PdfPreview | null,
  jobResult: DavanuJobResult | null
): TableSlice => {
  if (!pdf) {
    return { headers: [], rows: [] };
  }
  const codeIndex = getDavanuPdfCodeIndex(pdf.headers);
  const dateIndex = getDavanuPdfDateIndex(pdf.headers);
  const sumIndex = getDavanuPdfSumIndex(pdf.headers);
  const ordered = Array.from(
    new Set([codeIndex, dateIndex, sumIndex].filter((index) => index >= 0))
  );
  const headers = ordered.map((index) => pdf.headers[index] ?? `Column ${index + 1}`);
  const rows = (jobResult?.unmatchedPdfRows ?? pdf.rows).map((row) =>
    ordered.map((index) => row[index] ?? "")
  );
  return { headers, rows };
};

export const getApproxRezervacijas = (
  excel: DavanuExcelPreview | null,
  jobResult: DavanuJobResult | null
): TableSlice => {
  const preview = jobResult?.excel ?? excel;
  if (!preview) {
    return { headers: [], rows: [] };
  }
  const veidlapasIndex = getDavanuExcelVeidlapasIndex(preview.headers);
  const svitrkodsIndex = getDavanuExcelReservationIndex(preview.headers);
  const summaIndex = getDavanuExcelSaleSumIndex(preview.headers);
  const excelDateIndex = getDavanuExcelDateIndex(preview.headers);
  if (veidlapasIndex < 0 || svitrkodsIndex < 0 || summaIndex < 0) {
    return { headers: [], rows: [] };
  }
  const pdfCodeIndex = getDavanuPdfCodeIndex(jobResult?.pdf?.headers ?? []);
  const pdfDateIndex = getDavanuPdfDateIndex(jobResult?.pdf?.headers ?? []);
  const headers = [
    preview.headers[excelDateIndex] ?? "Dok. datums",
    "Sistema atzimets",
    preview.headers[veidlapasIndex] ?? "Veidlapas Nr.",
    preview.headers[svitrkodsIndex] ?? "Rezervacijas kods",
    preview.headers[summaIndex] ?? "Pardosanas cena",
  ];
  const matchedRows = jobResult?.excel?.dateSumMatchRows ?? [];
  const rows = matchedRows.map((rowIndex) => {
    const row = preview.rows[rowIndex] ?? [];
    const excelDate = row[excelDateIndex] ?? "";
    const code = row[svitrkodsIndex] ?? "";
    const sum = row[summaIndex] ?? "";
    const pdfRow =
      jobResult?.pdf?.rows.find((pdfRow) => (pdfRow[pdfCodeIndex] ?? "") === code) ??
      null;
    const pdfDate = pdfRow?.[pdfDateIndex] ?? "";
    return [excelDate, pdfDate, row[veidlapasIndex] ?? "", code, sum];
  });
  return { headers, rows };
};

export const getExcelCellClass = (
  preview: DavanuExcelPreview | null,
  jobResult: DavanuJobResult | null,
  rowIndex: number,
  cellIndex: number
) => {
  if (!preview) return "";
  const veidlapasIndex = getDavanuExcelVeidlapasIndex(preview.headers);
  const svitrkodsIndex = getDavanuExcelReservationIndex(preview.headers);
  const summaIndex = getDavanuExcelSaleSumIndex(preview.headers);
  if (veidlapasIndex < 0 || svitrkodsIndex < 0 || summaIndex < 0) {
    return "";
  }
  if (![veidlapasIndex, svitrkodsIndex, summaIndex].includes(cellIndex)) {
    return "";
  }
  if (jobResult?.excel?.dateSumMatchRows?.includes(rowIndex)) {
    return "bg-blue-100";
  }
  const row = preview.rows[rowIndex];
  if (!row) return "";
  const veidlapasValue = row[veidlapasIndex] ?? "";
  const svitrkodsValue = row[svitrkodsIndex] ?? "";
  if (!veidlapasValue && cellIndex !== veidlapasIndex) {
    return "bg-yellow-100";
  }
  if (veidlapasValue && !svitrkodsValue) {
    return "bg-red-100";
  }
  return "";
};
