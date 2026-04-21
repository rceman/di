import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  buildQuarterlyXml,
  parseQuarterlyXmlWorkbook,
} from "../src/lib/xml/quarterly.ts";

const workbookToFile = async (workbook, name = "quarterly.xlsx") => {
  const buffer = await workbook.xlsx.writeBuffer();
  const arrayBuffer = buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return {
    name,
    arrayBuffer: async () => arrayBuffer,
  };
};

const createWorkbook = async () => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Sheet1");

  ws.getCell("A2").value = "Reģistrācijas numurs";
  ws.getCell("C2").value = "40203166474";
  ws.getCell("A3").value = "Nosaukums";
  ws.getCell("C3").value = "GIVEN LATVIA SIA";
  ws.getCell("A4").value = "Adrese";
  ws.getCell("C4").value = "Dēļu iela 2, Rīga";
  ws.getCell("A5").value = "Taksācijas periods no";
  ws.getCell("C5").value = new Date("2026-01-01T00:00:00Z");
  ws.getCell("A6").value = "līdz";
  ws.getCell("C6").value = new Date("2026-03-31T00:00:00Z");
  ws.getCell("A7").value = "Informācija par iesniedzēju";
  ws.getCell("C7").value = "Cits";
  ws.getCell("A8").value = "Kvīšu numuru reģistrēšanas";
  ws.getCell("C8").value = "VID reģistrētās kvīšu grāmatiņas vai numuri";

  ws.getCell("A11").value = "Izlietots vai anulēts";
  ws.getCell("B11").value = "Kvīšu reģistrēšanas datums";
  ws.getCell("C11").value = "Sērija";
  ws.getCell("D11").value = "Numurs";
  ws.getCell("E11").value = "Numurs";
  ws.getCell("A12").value = "Izlietots vai anulēts";
  ws.getCell("B12").value = "Kvīšu reģistrēšanas datums";
  ws.getCell("C12").value = "Sērija";
  ws.getCell("D12").value = "No";
  ws.getCell("E12").value = "Līdz";
  ws.getCell("A13").value = "1";

  ws.getCell("A14").value = "Izlietots";
  ws.getCell("B14").value = new Date("2026-01-15T00:00:00Z");
  ws.getCell("C14").value = "PA";
  ws.getCell("D14").value = "100";
  ws.getCell("E14").value = "102";
  ws.getCell("G14").value = "120,4";

  ws.getCell("A15").value = "Anulēts";
  ws.getCell("B15").value = new Date("2026-02-01T00:00:00Z");
  ws.getCell("C15").value = "PA";
  ws.getCell("D15").value = "200";
  ws.getCell("E15").value = "200";
  ws.getCell("G15").value = "0";

  return workbook;
};

describe("quarterly xml conversion", () => {
  it("parses workbook metadata and rows", async () => {
    const workbook = await createWorkbook();
    const file = await workbookToFile(workbook);
    const preview = await parseQuarterlyXmlWorkbook(file);

    expect(preview.xmlData.registrationNumber).toBe("40203166474");
    expect(preview.xmlData.companyName).toBe("GIVEN LATVIA SIA");
    expect(preview.xmlData.year).toBe("2026");
    expect(preview.xmlData.quarter).toBe("1");
    expect(preview.rows.length).toBe(2);
    expect(preview.xmlData.rows[0]).toMatchObject({
      groupCode: "I",
      registrationDate: "2026-01-15",
      series: "PA",
      numberFrom: "100",
      numberTo: "102",
      amount: "120.40",
    });
    expect(preview.xmlData.rows[1]).toMatchObject({
      groupCode: "A",
      amount: null,
    });
  });

  it("builds xml with escaped values and annulled nil amount", () => {
    const xml = buildQuarterlyXml({
      declarationId: "2026033103166474",
      declarationUid: "uid-1",
      registrationNumber: "40203166474",
      companyName: "GIVEN & Co",
      address: "Street <1>",
      periodFrom: "2026-01-01",
      periodTo: "2026-03-31",
      year: "2026",
      quarter: "1",
      submitterType: "C",
      receiptType: "P",
      preparer: "Test User",
      phone: "",
      email: "",
      rows: [
        {
          groupCode: "I",
          registrationDate: "2026-01-10",
          series: "PA",
          numberFrom: "10",
          numberTo: "10",
          amount: "50.00",
        },
        {
          groupCode: "A",
          registrationDate: "2026-01-11",
          series: "PA",
          numberFrom: "11",
          numberTo: "11",
          amount: null,
        },
      ],
    });

    expect(xml).toContain("<TaxPayerName>GIVEN &amp; Co</TaxPayerName>");
    expect(xml).toContain("<AddressForResponse>Street &lt;1&gt;</AddressForResponse>");
    expect(xml).toContain("<Summa>50.00</Summa>");
    expect(xml).toContain("<Summa xsi:nil=\"true\" />");
  });
});
