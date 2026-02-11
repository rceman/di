import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import TablePreview from "../components/TablePreview";
import DavanuSummaries from "../components/DavanuSummaries";
import DavanuMatchTables from "../components/DavanuMatchTables";
import {
  extractDavanuPdfTable,
  type PdfPreview,
} from "../lib/pdf/davanu";
import {
  downloadDavanuCombinedXlsx,
  parseDavanuExcel,
  type DavanuExcelPreview,
} from "../lib/excel/davanu";
import { runDavanuJob, type DavanuJobResult } from "../lib/job/davanu";
import {
  getApproxRezervacijas,
  getExcelCellClass,
  getUnmatchedRezervacijas,
  getUnmatchedVeidlapas,
} from "../lib/job/davanu_view";
import {
  getDavanuPdfCodeIndex,
  getDavanuPdfDateIndex,
  getDavanuPdfSumIndex,
} from "../lib/job/davanu_columns";

const RUN_JOB_LABEL = "Run Job";
const DOWNLOAD_LABEL = "Download Table";

export default function DavanuPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);
  const [basePdfPreview, setBasePdfPreview] = useState<PdfPreview | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<DavanuExcelPreview | null>(null);
  const [baseExcelPreview, setBaseExcelPreview] = useState<DavanuExcelPreview | null>(
    null
  );
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const [hasRunJob, setHasRunJob] = useState(false);
  const [jobResult, setJobResult] = useState<DavanuJobResult | null>(null);

  const canRunJob = useMemo(
    () => Boolean(pdfPreview && excelPreview) && !pdfLoading && !excelLoading,
    [pdfPreview, excelPreview, pdfLoading, excelLoading]
  );

  const unmatchedVeidlapas = useMemo(
    () => getUnmatchedVeidlapas(excelPreview),
    [excelPreview]
  );

  const unmatchedRezervacijas = useMemo(
    () => getUnmatchedRezervacijas(pdfPreview, jobResult),
    [jobResult, pdfPreview]
  );

  const approxRezervacijas = useMemo(
    () => getApproxRezervacijas(excelPreview, jobResult),
    [excelPreview, jobResult]
  );

  const pdfDebug = useMemo(() => {
    if (!pdfPreview) {
      return null;
    }
    const codeIndex = getDavanuPdfCodeIndex(pdfPreview.headers);
    const dateIndex = getDavanuPdfDateIndex(pdfPreview.headers);
    const sumIndex = getDavanuPdfSumIndex(pdfPreview.headers);
    return {
      codeIndex,
      dateIndex,
      sumIndex,
      codeHeader: pdfPreview.headers[codeIndex] ?? "",
      dateHeader: pdfPreview.headers[dateIndex] ?? "",
      sumHeader: pdfPreview.headers[sumIndex] ?? "",
    };
  }, [pdfPreview]);

  const handlePdfChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPdfFile(file);
    setPdfPreview(null);
    setBasePdfPreview(null);
    setPdfError(null);
    setHasRunJob(false);
    setJobResult(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Only .pdf files are supported.");
      return;
    }

    setPdfLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const preview = await extractDavanuPdfTable(buffer);
      setPdfPreview(preview);
      setBasePdfPreview(preview);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to read PDF.";
      setPdfError(message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExcelChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setExcelFile(file);
    setExcelPreview(null);
    setBaseExcelPreview(null);
    setExcelError(null);
    setHasRunJob(false);
    setJobResult(null);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setExcelError("Only .xlsx files are supported.");
      return;
    }

    setExcelLoading(true);
    try {
      const preview = await parseDavanuExcel(file);
      setExcelPreview(preview);
      setBaseExcelPreview(preview);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to read Excel.";
      setExcelError(message);
    } finally {
      setExcelLoading(false);
    }
  };

  const handleRunJob = () => {
    if (!canRunJob) return;
    if (!baseExcelPreview || !basePdfPreview) return;
    const result = runDavanuJob({ excel: baseExcelPreview, pdf: basePdfPreview });
    setJobResult(result);
    setExcelPreview(result.excel);
    setHasRunJob(true);
  };

  const excelCellClass = (rowIndex: number, cellIndex: number) =>
    getExcelCellClass(excelPreview, jobResult, rowIndex, cellIndex);

  const handleDownload = async () => {
    const sourceExcel = jobResult?.excel ?? excelPreview;
    const sourcePdf = jobResult?.pdf ?? pdfPreview;
    if (!sourceExcel || !sourcePdf) return;
    const baseName =
      sourceExcel.fileName ??
      pdfFile?.name ??
      "davanu-serviss.xlsx";
    const sanitized = baseName.replace(/\.(xlsx|xlsm|xls|pdf)$/i, "");
    const downloadName = `${sanitized}_with_akts.xlsx`;
    await downloadDavanuCombinedXlsx(sourceExcel, sourcePdf, downloadName);
  };

  return (
    <>
      <Card id="davanu-card" className="backdrop-blur-sm">
        <CardHeader id="davanu-card-header">
          <CardTitle>Upload Excel & PDF</CardTitle>
          <CardDescription>Upload both files to prepare the job.</CardDescription>
        </CardHeader>
        <CardContent id="davanu-card-content" className="flex flex-col gap-4">
          <div
            id="davanu-actions"
            className="flex flex-nowrap items-start justify-between gap-4"
          >
            <div
              id="davanu-inputs"
              className="flex w-3/5 flex-row items-start gap-4"
            >
              <label id="davanu-excel-label" className="flex w-1/2 flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Select Excel file
                </span>
                <Input
                  type="file"
                  accept=".xlsx"
                  onChange={handleExcelChange}
                  aria-label="Select Excel file"
                  className="w-full min-w-0"
                />
              </label>
              <label id="davanu-pdf-label" className="flex w-1/2 flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Select PDF file
                </span>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  aria-label="Select PDF file"
                  className="w-full min-w-0"
                />
              </label>
            </div>
            <div className="flex w-2/5 items-center gap-6">
              <label id="davanu-run-label" className="flex w-full flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Attach PDF data to Excel and find matches
                </span>
                <Button
                  type="button"
                  className="w-full whitespace-nowrap px-8"
                  onClick={handleRunJob}
                  disabled={!canRunJob}
                >
                  {RUN_JOB_LABEL}
                </Button>
              </label>
              {hasRunJob && (excelPreview || jobResult) ? (
                <label id="davanu-download-label" className="flex w-full flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Download combined Excel
                  </span>
                  <Button
                    id="davanu-download"
                    type="button"
                    variant="outline"
                    className="w-full whitespace-nowrap px-8"
                    onClick={handleDownload}
                  >
                    {DOWNLOAD_LABEL}
                  </Button>
                </label>
              ) : null}
            </div>
          </div>
          <DavanuSummaries
            excelFile={excelFile}
            excelPreview={excelPreview}
            pdfFile={pdfFile}
            pdfPreview={pdfPreview}
          />
          {excelError ? (
            <p
              id="davanu-excel-error"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {excelError}
            </p>
          ) : null}
          {pdfError ? (
            <p
              id="davanu-pdf-error"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {pdfError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card id="davanu-excel-preview-card" className="backdrop-blur-sm">
        <CardHeader
          id="davanu-excel-preview-header"
          className="flex flex-row items-start justify-between gap-4"
        >
          <div className="space-y-1.5">
            <CardTitle>Excel Preview</CardTitle>
            <CardDescription>First worksheet from the Excel file.</CardDescription>
          </div>
        </CardHeader>
        <CardContent id="davanu-excel-preview-content" className="pt-0">
          <TablePreview
            headers={excelPreview?.headers ?? []}
            rows={excelPreview?.rows ?? []}
            loading={excelLoading}
            loadingMessage="Parsing Excel..."
            emptyMessage="Upload an Excel file to see the preview."
            getCellClassName={excelCellClass}
          />
        </CardContent>
      </Card>

      <Card id="davanu-preview-card" className="backdrop-blur-sm">
        <CardHeader
          id="davanu-preview-header"
          className="flex flex-row items-start justify-between gap-4"
        >
          <div className="space-y-1.5">
            <CardTitle>PDF Preview</CardTitle>
            <CardDescription>Extracted table from the PDF.</CardDescription>
          </div>
        </CardHeader>
        <CardContent id="davanu-preview-content" className="pt-0">
          <TablePreview
            headers={pdfPreview?.headers ?? []}
            rows={pdfPreview?.rows ?? []}
            loading={pdfLoading}
            loadingMessage="Parsing PDF..."
            emptyMessage="Upload a PDF to see the preview."
          />
          {pdfDebug ? (
            <div
              id="davanu-debug"
              className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            >
              PDF debug: code[{pdfDebug.codeIndex}] "{pdfDebug.codeHeader}", date[
              {pdfDebug.dateIndex}] "{pdfDebug.dateHeader}", sum[{pdfDebug.sumIndex}]
              " {pdfDebug.sumHeader}"
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DavanuMatchTables
        unmatchedVeidlapas={unmatchedVeidlapas}
        unmatchedRezervacijas={unmatchedRezervacijas}
        approxRezervacijas={approxRezervacijas}
      />
    </>
  );
}
