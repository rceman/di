import ExcelJS from "exceljs";
import type { QuarterlyXmlData, QuarterlyXmlPreview, QuarterlyXmlRow } from "./quarterly_types";

const META_LABELS = {
  registrationNumber: "reģistrācijas numurs",
  companyName: "nosaukums",
  address: "adrese",
  periodFrom: "taksācijas periods no",
  periodTo: "līdz",
  submitterInfo: "informācija par iesniedzēju",
  receiptType: "kvīšu numuru reģistrēšanas",
} as const;

export const TABLE_HEADERS = [
  "Izlietots vai anulēts",
  "Kvīšu reģistrēšanas datums",
  "Sērija",
  "No",
  "Līdz",
  "Kvīšu skaits",
  "Darījumu summa",
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const META_LOOKUP = Object.entries(META_LABELS).reduce<Record<string, keyof typeof META_LABELS>>(
  (acc, [metaKey, label]) => {
    acc[normalizeText(label)] = metaKey as keyof typeof META_LABELS;
    return acc;
  },
  {}
);

const asText = (cell: ExcelJS.Cell) => (cell.text ?? "").trim();

const asIsoDate = (cell: ExcelJS.Cell): string | null => {
  const value = cell.value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = asText(cell);
  if (!text) return null;
  const ddmmyyyy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    return `${ddmmyyyy[3]}-${month}-${day}`;
  }
  const isoPrefix = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) {
    return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const parseAmount = (value: string): string | null => {
  const compact = value.replace(/\s/g, "").replace(",", ".");
  if (!compact) return null;
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
};

const inferQuarter = (periodFromIso: string): { year: string; quarter: string } => {
  const month = Number(periodFromIso.slice(5, 7));
  const quarter = Math.max(1, Math.min(4, Math.floor((month - 1) / 3) + 1));
  return { year: periodFromIso.slice(0, 4), quarter: String(quarter) };
};

const mapSubmitterType = (value: string) =>
  normalizeText(value).startsWith("cits") ? "C" : "C";

const mapReceiptType = (value: string) =>
  normalizeText(value).includes("vid registre") ? "P" : "P";

const mapGroupCode = (value: string): "I" | "A" | null => {
  const normalized = normalizeText(value);
  if (normalized.startsWith("izlietots")) return "I";
  if (normalized.startsWith("anulets")) return "A";
  return null;
};

const readMeta = (worksheet: ExcelJS.Worksheet) => {
  const values = new Map<string, string>();
  const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
  for (let rowIndex = 1; rowIndex <= maxRows; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const key = normalizeText(asText(row.getCell(1)));
    const metaKey = META_LOOKUP[key];
    if (!metaKey) continue;
    const valueCell = row.getCell(3);
    const dateValue =
      metaKey === "periodFrom" || metaKey === "periodTo" ? asIsoDate(valueCell) : null;
    values.set(metaKey, dateValue ?? asText(valueCell));
  }
  return {
    registrationNumber: values.get("registrationNumber") ?? "",
    companyName: values.get("companyName") ?? "",
    address: values.get("address") ?? "",
    periodFrom: values.get("periodFrom") ?? "",
    periodTo: values.get("periodTo") ?? "",
    submitterInfo: values.get("submitterInfo") ?? "",
    receiptTypeInfo: values.get("receiptType") ?? "",
  };
};

const findTableStartRow = (worksheet: ExcelJS.Worksheet) => {
  const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
  for (let rowIndex = 1; rowIndex <= maxRows; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const c1 = normalizeText(asText(row.getCell(1)));
    const c2 = normalizeText(asText(row.getCell(2)));
    const c3 = normalizeText(asText(row.getCell(3)));
    if (c1.includes("izlietots vai anulets") && c2.includes("registr") && c3.includes("serija")) {
      return rowIndex;
    }
  }
  return -1;
};

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const buildDeclarationId = (registrationNumber: string, periodTo: string) =>
  `${(periodTo.replace(/\D/g, "").slice(0, 8) || "00000000")}${digitsOnly(registrationNumber).slice(-6) || "000000"}`;

const makeUid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
};

export const parseQuarterlyXmlWorkbook = async (file: File): Promise<QuarterlyXmlPreview> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheets found in this file.");

  const warnings: string[] = [];
  const meta = readMeta(worksheet);
  if (!meta.registrationNumber) warnings.push("Missing registration number.");
  if (!meta.companyName) warnings.push("Missing company name.");
  if (!meta.periodFrom || !meta.periodTo) warnings.push("Missing report period.");

  const tableHeaderRow = findTableStartRow(worksheet);
  if (tableHeaderRow < 0) {
    throw new Error("Table header row was not found in the worksheet.");
  }

  let tableDataStart = tableHeaderRow + 1;
  const markerCell = asText(worksheet.getRow(tableHeaderRow + 2).getCell(1));
  if (/^\d+$/.test(markerCell)) {
    tableDataStart = tableHeaderRow + 3;
  } else if (normalizeText(asText(worksheet.getRow(tableHeaderRow + 1).getCell(1))).includes("izlietots vai anulets")) {
    tableDataStart = tableHeaderRow + 2;
  }

  const rows: QuarterlyXmlRow[] = [];
  const previewRows: string[][] = [];
  const maxRows = Math.max(worksheet.rowCount, worksheet.actualRowCount ?? 0);
  for (let rowIndex = tableDataStart; rowIndex <= maxRows; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const status = asText(row.getCell(1));
    const date = asIsoDate(row.getCell(2));
    const series = asText(row.getCell(3));
    const numberFrom = asText(row.getCell(4));
    const numberTo = asText(row.getCell(5));
    const amount = parseAmount(asText(row.getCell(7)));

    const isBlank = [status, series, numberFrom, numberTo, asText(row.getCell(7))]
      .every((value) => !value.trim());
    if (isBlank) continue;

    const groupCode = mapGroupCode(status);
    if (!groupCode) {
      warnings.push(`Row ${rowIndex}: unknown status "${status}", row skipped.`);
      continue;
    }
    if (!date) {
      warnings.push(`Row ${rowIndex}: missing registration date, row skipped.`);
      continue;
    }
    if (!series || !numberFrom || !numberTo) {
      warnings.push(`Row ${rowIndex}: missing series or number range, row skipped.`);
      continue;
    }

    rows.push({
      groupCode,
      registrationDate: date,
      series,
      numberFrom,
      numberTo,
      amount: groupCode === "A" ? null : amount,
    });
    previewRows.push([status, date, series, numberFrom, numberTo, asText(row.getCell(6)), amount ?? ""]);
  }

  const periodFrom = meta.periodFrom || new Date().toISOString().slice(0, 10);
  const periodTo = meta.periodTo || periodFrom;
  const inferred = inferQuarter(periodFrom);
  const xmlData: QuarterlyXmlData = {
    declarationId: buildDeclarationId(meta.registrationNumber, periodTo),
    declarationUid: makeUid(),
    registrationNumber: meta.registrationNumber,
    companyName: meta.companyName,
    address: meta.address,
    periodFrom,
    periodTo,
    year: inferred.year,
    quarter: inferred.quarter,
    submitterType: mapSubmitterType(meta.submitterInfo),
    receiptType: mapReceiptType(meta.receiptTypeInfo),
    preparer: meta.companyName,
    phone: "",
    email: "",
    rows,
  };

  return {
    fileName: file.name,
    headers: TABLE_HEADERS,
    rows: previewRows,
    xmlData,
    warnings,
  };
};
