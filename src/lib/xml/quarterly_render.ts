import type { QuarterlyXmlData, QuarterlyXmlPreview, QuarterlyXmlRow } from "./quarterly_types";

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderRowXml = (row: QuarterlyXmlRow) => {
  const amountXml = row.amount === null
    ? "          <Summa xsi:nil=\"true\" />"
    : `          <Summa>${xmlEscape(row.amount)}</Summa>`;

  return [
    "        <R>",
    `          <Grupa>${row.groupCode}</Grupa>`,
    `          <DatumsReg>${row.registrationDate}T00:00:00</DatumsReg>`,
    "          <DatumsIzrakstisanas xsi:nil=\"true\" />",
    `          <Serija>${xmlEscape(row.series)}</Serija>`,
    `          <NumursNo>${xmlEscape(row.numberFrom)}</NumursNo>`,
    `          <NumursLidz>${xmlEscape(row.numberTo)}</NumursLidz>`,
    amountXml,
    "          <VardsUzvards />",
    "          <PersonasKods />",
    "          <Hash />",
    "          <Detalizacija>",
    "            <RD>",
    "              <UzGID xsi:nil=\"true\" />",
    "              <Daudzums xsi:nil=\"true\" />",
    "              <Cena xsi:nil=\"true\" />",
    "              <Vertiba>0</Vertiba>",
    "              <Atlaides xsi:nil=\"true\" />",
    "              <PvnLikme xsi:nil=\"true\" />",
    "              <PvnSumma>0</PvnSumma>",
    "              <Summa>0</Summa>",
    "            </RD>",
    "          </Detalizacija>",
    "        </R>",
  ].join("\n");
};

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

const formatTimestampWithOffset = (value: Date) => {
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  const seconds = pad(value.getSeconds());
  const millis = pad(value.getMilliseconds(), 3);
  const tzMinutes = -value.getTimezoneOffset();
  const sign = tzMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(tzMinutes);
  const tzHours = pad(Math.floor(abs / 60));
  const tzMins = pad(abs % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${sign}${tzHours}:${tzMins}`;
};

export const buildQuarterlyXml = (data: QuarterlyXmlData) => {
  const rowsXml = data.rows.map((row) => renderRowXml(row)).join("\n");
  const timestamp = formatTimestampWithOffset(new Date());

  return [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    "<DeclarationFile>",
    "  <Declaration Id=\"DEC\">",
    "    <DokPKIv2 xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">",
    `      <Precizejums>${data.isCorrection ? "true" : "false"}</Precizejums>`,
    `      <Id>${xmlEscape(data.declarationId)}</Id>`,
    `      <UID>${xmlEscape(data.declarationUid)}</UID>`,
    `      <NmrKods>${xmlEscape(data.registrationNumber)}</NmrKods>`,
    `      <DatumsNo>${data.periodFrom}T00:00:00</DatumsNo>`,
    `      <DatumsLidz>${data.periodTo}T00:00:00</DatumsLidz>`,
    `      <Izpilditajs>${xmlEscape(data.preparer)}</Izpilditajs>`,
    `      <Talrunis>${xmlEscape(data.phone)}</Talrunis>`,
    `      <Epasts>${xmlEscape(data.email)}</Epasts>`,
    `      <Gads>${xmlEscape(data.year)}</Gads>`,
    `      <Ceturksnis>${xmlEscape(data.quarter)}</Ceturksnis>`,
    `      <IesniedzejaVeids>${xmlEscape(data.submitterType)}</IesniedzejaVeids>`,
    `      <KvisuVeids>${xmlEscape(data.receiptType)}</KvisuVeids>`,
    "      <Tab>",
    rowsXml,
    "      </Tab>",
    "    </DokPKIv2>",
    "  </Declaration>",
    "  <UserCredentials xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" Id=\"UC_1\">",
    `    <Drawer>${xmlEscape(data.preparer)}</Drawer>`,
    `    <Signer>${xmlEscape(data.signer || data.preparer)}</Signer>`,
    `    <SignerIdentityNo>${xmlEscape(data.signerIdentityNo)}</SignerIdentityNo>`,
    `    <SignerRole>${xmlEscape(data.signerRole)}</SignerRole>`,
    `    <EmailForResponse>${xmlEscape(data.signerEmail || data.email)}</EmailForResponse>`,
    `    <Timestamp>${timestamp}</Timestamp>`,
    `    <TaxPayerNo>${xmlEscape(data.registrationNumber)}</TaxPayerNo>`,
    `    <TaxPayerName>${xmlEscape(data.companyName)}</TaxPayerName>`,
    `    <AddressForResponse>${xmlEscape(data.address)}</AddressForResponse>`,
    `    <IsCorrectionDocument>${data.isCorrection ? "true" : "false"}</IsCorrectionDocument>`,
    "    <PrecDeclNum xsi:nil=\"true\" />",
    "  </UserCredentials>",
    "</DeclarationFile>",
  ].join("\n");
};

export const downloadQuarterlyXml = (preview: QuarterlyXmlPreview) => {
  const xml = buildQuarterlyXml(preview.xmlData);
  const baseName = preview.fileName.replace(/\.(xlsx|xlsm|xls)$/i, "");
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${baseName}.xml`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
