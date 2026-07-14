import type { Job } from "@/lib/jobs/types";

const xmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ||
      character,
  );

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

export function makeXlsx(rows: Job[]) {
  const encoder = new TextEncoder();
  const cell = (value: string, style = 0) =>
    `<c t="inlineStr"${style ? ` s="${style}"` : ""}><is><t>${xmlEscape(value)}</t></is></c>`;
  const header = ["Date Applied", "Job Title", "Company", "Job URL", "Status", "Notes"];
  const sheetRows = [
    `<row r="1">${header.map((value) => cell(value, 1)).join("")}</row>`,
    ...rows.map(
      (job, index) =>
        `<row r="${index + 2}">${cell(job.date, 2)}${cell(job.title)}${cell(job.company)}${cell(job.url)}${cell(job.status)}${cell(job.notes)}</row>`,
    ),
  ].join("");
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Job Applications" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF174F3D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="28" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="4" width="42" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/><col min="6" max="6" width="40" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:F${rows.length + 1}"/></worksheet>`,
  };
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (value: number) => [value & 255, (value >>> 8) & 255];
  const u32 = (value: number) => [
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255,
  ];

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const local = new Uint8Array([
      80, 75, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(checksum), ...u32(data.length),
      ...u32(data.length), ...u16(nameBytes.length), 0, 0, ...nameBytes,
    ]);
    parts.push(local, data);
    central.push(
      new Uint8Array([
        80, 75, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(checksum),
        ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, ...u32(offset), ...nameBytes,
      ]),
    );
    offset += local.length + data.length;
  });

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const count = central.length;
  const endOfCentralDirectory = new Uint8Array([
    80, 75, 5, 6, 0, 0, 0, 0, ...u16(count), ...u16(count), ...u32(centralSize), ...u32(offset), 0,
    0,
  ]);
  const blobParts = [...parts, ...central, endOfCentralDirectory].map((part) => {
    const buffer = new ArrayBuffer(part.byteLength);
    new Uint8Array(buffer).set(part);
    return buffer;
  });

  return new Blob(blobParts, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
