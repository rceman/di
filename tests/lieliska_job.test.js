import { describe, expect, it } from "vitest";

import {
  ensureLieliskaRunSchema,
  runLieliskaJob,
} from "../src/lib/job/lieliska.ts";

const headers = [
  "DokT.Nosaukums",
  "Numurs",
  "Dok. datums",
  "Kl.Kods",
  "Kl.Nosaukums",
  "Dokumenta summa",
  "V.Kods",
  "Statuss",
  "References numurs",
  "Atb.Kods",
  "Atb.Strv.Nosaukums",
  "Veidlapas Nr.",
  "Svitrkods",
  "Summa",
];

const createPreview = (rows) => ({
  headers,
  rows,
  rowCount: rows.length + 1,
  colCount: headers.length,
  sheetName: "Horizon",
  fileName: "Lieliska.xlsx",
  columnWidths: [],
  columnNumFmts: [],
  sourceRowCount: rows.length,
  originalBuffer: new ArrayBuffer(0),
});

describe("runLieliskaJob", () => {
  it("matches by Veidlapas last 4 digits and prefers Dokumenta summa match", () => {
    const preview = createPreview([
      ["A", "1", "01.01.2026.", "D", "X", "20", "EUR", "G", "R1", "50", "Given", "9817000000001234", "0000000000001234", "20"],
      ["A", "2", "01.01.2026.", "D", "X", "50", "EUR", "G", "R2", "50", "Given", "9817000000001234", "0000000000001234", "50"],
    ]);

    const result = runLieliskaJob(preview);

    expect(result.rows[0][12]).toBe("0000000000001234");
    expect(result.rows[0][13]).toBe("20");
    expect(result.rows[1][12]).toBe("0000000000001234");
    expect(result.rows[1][13]).toBe("50");
    expect(result.unmatchedSvitrkods).toEqual([]);
  });

  it("appends duplicate Svitrkods as unmatched when only one Veidlapas target is available", () => {
    const preview = createPreview([
      ["A", "1", "01.01.2026.", "D", "X", "38,5", "EUR", "G", "R1", "50", "Given", "981539016662139265", "000000000000009265", "38,5"],
      ["A", "2", "01.01.2026.", "D", "X", "", "EUR", "G", "R2", "50", "Given", "981539016662130001", "000000000000009265", "57,75"],
    ]);

    const result = runLieliskaJob(preview);
    const baseRows = result.rows.slice(0, result.sourceRowCount);
    const appendedRows = result.rows.slice(result.sourceRowCount);

    expect(baseRows[0][12]).toBe("000000000000009265");
    expect(baseRows[0][13]).toBe("38,5");
    expect(baseRows[1][12]).toBe("");
    expect(baseRows[1][13]).toBe("");

    expect(result.unmatchedSvitrkods).toEqual([["000000000000009265", "57,75"]]);
    expect(appendedRows).toHaveLength(1);
    expect(appendedRows[0][12]).toBe("000000000000009265");
    expect(appendedRows[0][13]).toBe("57,75");
  });

  it("adds Svitrkods and Summa columns when file ends with Veidlapas Nr.", () => {
    const wrongHeaders = headers.slice(0, 12);
    const baseRows = [["A", "1", "01.01.2026.", "D", "X", "30", "EUR", "G", "R1", "50", "Given", "9815"]];
    const preview = {
      ...createPreview(baseRows),
      headers: wrongHeaders,
      colCount: wrongHeaders.length,
      rows: baseRows,
      sourceRowCount: 1,
    };

    const normalized = ensureLieliskaRunSchema(preview);
    expect(normalized.headers.at(-2)).toBe("Svitrkods");
    expect(normalized.headers.at(-1)).toBe("Summa");
    expect(normalized.rows[0].at(-2)).toBe("");
    expect(normalized.rows[0].at(-1)).toBe("");
  });

  it("throws when Veidlapas header is missing", () => {
    const badHeaders = headers.slice();
    badHeaders[11] = "Unknown";
    const preview = {
      ...createPreview([
        ["A", "1", "01.01.2026.", "D", "X", "30", "EUR", "G", "R1", "50", "Given", "9815", "", ""],
      ]),
      headers: badHeaders,
      colCount: badHeaders.length,
      sourceRowCount: 1,
    };

    expect(() => ensureLieliskaRunSchema(preview)).toThrow("Expected Veidlapas Nr. column.");
  });
});
