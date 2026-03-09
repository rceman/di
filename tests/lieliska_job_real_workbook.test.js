import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  ensureLieliskaRunSchema,
  runLieliskaJob,
} from "../src/lib/job/lieliska.ts";
import { parseLieliskaWorkbook } from "../src/lib/excel/lieliska.ts";

const loadPreview = async (fileName) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(fileName);

  return parseLieliskaWorkbook({
    name: fileName,
    arrayBuffer: async () => {
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer instanceof ArrayBuffer
        ? buffer
        : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  });
};

describe("runLieliskaJob real workbooks", () => {
  it("reads source pairs from the real 022026 workbook even when source sheet is not named Lieliska", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile("Lieliska DK 022026-1.xlsx");
    const firstSheet = workbook.worksheets[0];
    const secondSheet = workbook.worksheets[1];

    expect(firstSheet?.name).toBe("Sheet1");
    expect(secondSheet?.name).toBe("Sheet2");

    const preview = await loadPreview("Lieliska DK 022026-1.xlsx");
    expect(preview.sourcePairs?.length).toBeGreaterThan(0);

    const result = runLieliskaJob(preview);
    expect(result.rows[0][12]).toBe("000000000000002265");
    expect(result.rows[0][13]).toBe("50");
    expect(result.rows[1][12]).toBe("000000000000000178");
    expect(result.rows[1][13]).toBe("47.2");
  });

  it("fills Svitrkods and Summa for the original 022026 workbook that ends with Veidlapas Nr.", async () => {
    const preview = await loadPreview("Lieliska DK 022026.xlsx");

    const normalized = ensureLieliskaRunSchema(preview);
    expect(normalized.headers[12]).toBe("Svītrkods");
    expect(normalized.headers[13]).toBe("Summa, €");

    const result = runLieliskaJob(normalized);

    expect(result.rows[0][11]).toBe("981998909434442265");
    expect(result.rows[0][12]).toBe("000000000000002265");
    expect(result.rows[0][13]).toBe("50");
    expect(result.rows[1][12]).toBe("000000000000000178");
    expect(result.rows[1][13]).toBe("47.2");
    expect(result.unmatchedSvitrkods).toEqual([
      ["000000000000005121", "30"],
      ["000000000000006304", "50"],
    ]);
  });

  it("splits 000000000000009259 across GIV048804 and GIV048813 in the original workbook", async () => {
    const preview = await loadPreview("Lieliska DK 022026.xlsx");
    const normalized = ensureLieliskaRunSchema(preview);
    const result = runLieliskaJob(normalized);
    const rowByNumurs = new Map(result.rows.map((row) => [row[1], row]));

    expect(rowByNumurs.get("GIV048804")?.[12]).toBe("000000000000009259");
    expect(rowByNumurs.get("GIV048804")?.[13]).toBe("14.4");
    expect(rowByNumurs.get("GIV048813")?.[12]).toBe("000000000000009259");
    expect(rowByNumurs.get("GIV048813")?.[13]).toBe("30.8");
  });

  it("matches 000000000000003485 to the 11.02.2026 row in the original workbook", async () => {
    const preview = await loadPreview("Lieliska DK 022026.xlsx");
    const normalized = ensureLieliskaRunSchema(preview);
    const result = runLieliskaJob(normalized);
    const rowByNumurs = new Map(result.rows.map((row) => [row[1], row]));

    expect(rowByNumurs.get("Z-54189853-110226_01")?.[12]).toBe("000000000000003485");
    expect(rowByNumurs.get("Z-54189853-110226_01")?.[13]).toBe("50");
    expect(rowByNumurs.get("Z-73397919-150226")?.[12]).toBe("");
  });
});
