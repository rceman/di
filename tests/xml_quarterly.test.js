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
  ws.getCell("A10").value = "Sagatavoja vārds, uzvārds";
  ws.getCell("C10").value = "JULIJA CEVERDENKO";
  ws.getCell("A11").value = "Sagatavoja E-pasts";
  ws.getCell("C11").value = "julija@example.com";
  ws.getCell("A12").value = "Sagatavoja Tālrunis";
  ws.getCell("C12").value = "+37120000000";
  ws.getCell("A13").value = "Parakstītāja vārds, uzvārds";
  ws.getCell("C13").value = "LILIJA ADEJEVA";
  ws.getCell("A14").value = "Parakstītāja personas kods";
  ws.getCell("C14").value = "12017312050";
  ws.getCell("A15").value = "Parakstītāja prof.";
  ws.getCell("C15").value = "Galvenā grāmatvede";
  ws.getCell("A16").value = "Parakstītāja E-pasts";
  ws.getCell("C16").value = "lilija@example.com";

  ws.getCell("A18").value = "Izlietots vai anulēts";
  ws.getCell("B18").value = "Kvīšu reģistrēšanas datums";
  ws.getCell("C18").value = "Sērija";
  ws.getCell("D18").value = "Numurs";
  ws.getCell("E18").value = "Numurs";
  ws.getCell("A19").value = "Izlietots vai anulēts";
  ws.getCell("B19").value = "Kvīšu reģistrēšanas datums";
  ws.getCell("C19").value = "Sērija";
  ws.getCell("D19").value = "No";
  ws.getCell("E19").value = "Līdz";
  ws.getCell("A20").value = "1";

  ws.getCell("A21").value = "Izlietots";
  ws.getCell("B21").value = new Date("2026-01-15T00:00:00Z");
  ws.getCell("C21").value = "PA";
  ws.getCell("D21").value = "100";
  ws.getCell("E21").value = "102";
  ws.getCell("G21").value = "120,4";

  ws.getCell("A22").value = "Anulēts";
  ws.getCell("B22").value = new Date("2026-02-01T00:00:00Z");
  ws.getCell("C22").value = "PA";
  ws.getCell("D22").value = "200";
  ws.getCell("E22").value = "200";
  ws.getCell("G22").value = "0";

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
    expect(preview.xmlData.preparer).toBe("JULIJA CEVERDENKO");
    expect(preview.xmlData.phone).toBe("+37120000000");
    expect(preview.xmlData.email).toBe("julija@example.com");
    expect(preview.xmlData.signer).toBe("LILIJA ADEJEVA");
    expect(preview.xmlData.signerIdentityNo).toBe("12017312050");
    expect(preview.xmlData.signerRole).toBe("Galvenā grāmatvede");
    expect(preview.xmlData.signerEmail).toBe("lilija@example.com");
    expect(preview.rows.length).toBe(2);
    expect(preview.xmlData.rows[0]).toMatchObject({
      groupCode: "I",
      registrationDate: "2026-01-15",
      series: "PA",
      numberFrom: "100",
      numberTo: "102",
      amount: "120.40",
    });
    expect(preview.xmlData.isCorrection).toBe(false);
    expect(preview.xmlData.rows[1]).toMatchObject({
      groupCode: "A",
      amount: null,
    });
  });

  it("builds xml with escaped values and annulled nil amount", () => {
    const xml = buildQuarterlyXml({
      isCorrection: false,
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
      signer: "Signer Name",
      signerIdentityNo: "010101-12345",
      signerRole: "Role",
      signerEmail: "signer@example.com",
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
    expect(xml).toContain("<Signer>Signer Name</Signer>");
    expect(xml).toContain("<SignerIdentityNo>010101-12345</SignerIdentityNo>");
    expect(xml).toContain("<SignerRole>Role</SignerRole>");
    expect(xml).toContain("<EmailForResponse>signer@example.com</EmailForResponse>");
    expect(xml).toContain("<Precizejums>false</Precizejums>");
    expect(xml).toContain("<IsCorrectionDocument>false</IsCorrectionDocument>");
    expect(xml).toMatch(/<Timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}<\/Timestamp>/);
    expect(xml).toContain("<Summa>50.00</Summa>");
    expect(xml).toContain("<Summa xsi:nil=\"true\" />");
  });
});
