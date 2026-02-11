import { describe, expect, it } from "vitest";

import { runDavanuJob } from "../src/lib/job/davanu.ts";

const excelHeaders = [
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
  "Rezervacijas kods",
  "Pardosanas cena",
];

const createExcelPreview = (rows) => ({
  headers: excelHeaders,
  rows,
  rowCount: rows.length + 1,
  colCount: excelHeaders.length,
  sheetName: "Horizon",
  fileName: "demo.xlsx",
  columnWidths: [],
  columnNumFmts: [],
  originalBuffer: new ArrayBuffer(0),
});

describe("runDavanuJob", () => {
  it("uses header-based PDF sum column and does not read Nr. as price", () => {
    const excel = createExcelPreview([
      [
        "Pardosana",
        "Z-1",
        "02.01.2026.",
        "D40",
        "Davanu",
        "70.00",
        "EUR",
        "Gramatots",
        "ref",
        "59",
        "Given",
        "ABC123",
        "",
        "",
      ],
    ]);
    const pdf = {
      headers: ["Nr.", "Rezervacijas kods", "Sistema atzimets", "Pardosanas cena", "Extra"],
      rows: [["1", "ABC123", "2026-01-02 11:00", "70 €", "x"]],
      pageCount: 1,
    };

    const result = runDavanuJob({ excel, pdf });
    expect(result.excel.rows[0][12]).toBe("ABC123");
    expect(result.excel.rows[0][13]).toBe("70,00");
  });

  it("keeps used code matches unique and applies date+sum fallback only to unused PDF rows", () => {
    const excel = createExcelPreview([
      [
        "Pardosana",
        "Z-1",
        "02.01.2026.",
        "D40",
        "Davanu",
        "70.00",
        "EUR",
        "Gramatots",
        "ref",
        "59",
        "Given",
        "ABC123",
        "",
        "",
      ],
      [
        "Pardosana",
        "Z-2",
        "02.01.2026.",
        "D40",
        "Davanu",
        "70.00",
        "EUR",
        "Gramatots",
        "ref",
        "59",
        "Given",
        "NO-CODE",
        "",
        "",
      ],
      [
        "Pardosana",
        "Z-3",
        "04.01.2026.",
        "D40",
        "Davanu",
        "49.00",
        "EUR",
        "Gramatots",
        "ref",
        "59",
        "Given",
        "NO-CODE-2",
        "",
        "",
      ],
    ]);
    const pdf = {
      headers: ["Nr.", "Rezervacijas kods", "Sistema atzimets", "Pardosanas cena"],
      rows: [
        ["1", "ABC123", "2026-01-02 09:00", "70,00"],
        ["2", "DATE49", "2026-01-04 13:00", "49,00"],
      ],
      pageCount: 1,
    };

    const result = runDavanuJob({ excel, pdf });

    expect(result.excel.rows[0][12]).toBe("ABC123");
    expect(result.excel.rows[0][13]).toBe("70,00");

    // p0 is already consumed by code match, so row 2 cannot reuse it via date+sum.
    expect(result.excel.rows[1][12]).toBe("");
    expect(result.excel.rows[1][13]).toBe("");

    // row 3 should match by date+sum with the remaining PDF row.
    expect(result.excel.rows[2][12]).toBe("DATE49");
    expect(result.excel.rows[2][13]).toBe("49,00");
    expect(result.excel.dateSumMatchRows).toEqual([2]);
    expect(result.unmatchedPdfRows).toEqual([]);
  });
});
