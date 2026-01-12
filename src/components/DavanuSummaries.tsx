import type { DavanuExcelPreview } from "../lib/excel/davanu";
import type { PdfPreview } from "../lib/pdf/davanu";

type DavanuSummariesProps = {
  excelFile: File | null;
  excelPreview: DavanuExcelPreview | null;
  pdfFile: File | null;
  pdfPreview: PdfPreview | null;
};

export default function DavanuSummaries({
  excelFile,
  excelPreview,
  pdfFile,
  pdfPreview,
}: DavanuSummariesProps) {
  return (
    <div id="davanu-summaries" className="flex flex-wrap gap-4">
      {excelFile ? (
        <div
          id="davanu-excel-summary"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-muted/40 px-4 py-3"
        >
          <p className="text-sm font-medium text-foreground">{excelFile.name}</p>
          {excelPreview ? (
            <p className="text-xs text-muted-foreground">
              Sheet: {excelPreview.sheetName} - Rows: {excelPreview.rowCount} -
              Columns: {excelPreview.colCount}
            </p>
          ) : null}
        </div>
      ) : null}
      {pdfFile ? (
        <div
          id="davanu-pdf-summary"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-muted/40 px-4 py-3"
        >
          <p className="text-sm font-medium text-foreground">{pdfFile.name}</p>
          {pdfPreview ? (
            <p className="text-xs text-muted-foreground">
              Pages: {pdfPreview.pageCount} - Rows: {pdfPreview.rows.length} -
              Columns: {pdfPreview.headers.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
