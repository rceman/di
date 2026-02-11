import type { DavanuExcelPreview } from "../excel/davanu";
import type { PdfPreview } from "../pdf/davanu";

export const clonePdfPreview = (preview: PdfPreview): PdfPreview => ({
  ...preview,
  headers: preview.headers.slice(),
  rows: preview.rows.map((row) => row.slice()),
});

export const cloneExcelPreview = (
  preview: DavanuExcelPreview
): DavanuExcelPreview => ({
  ...preview,
  headers: preview.headers.slice(),
  rows: preview.rows.map((row) => row.slice()),
  columnWidths: preview.columnWidths.slice(),
  columnNumFmts: preview.columnNumFmts.slice(),
  dateSumMatchRows: preview.dateSumMatchRows?.slice(),
});
