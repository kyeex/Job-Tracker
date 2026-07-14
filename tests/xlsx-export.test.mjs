import assert from "node:assert/strict";
import test from "node:test";
import { makeXlsx } from "../app/lib/xlsx-export.ts";

const decoder = new TextDecoder();

async function readStoredZipEntries(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const entries = new Map();
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const signature =
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24);

    if (signature !== 0x04034b50) {
      break;
    }

    const compressedSize =
      bytes[offset + 18] |
      (bytes[offset + 19] << 8) |
      (bytes[offset + 20] << 16) |
      (bytes[offset + 21] << 24);
    const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    const dataStart = fileNameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;

    entries.set(decoder.decode(bytes.slice(fileNameStart, fileNameEnd)), decoder.decode(bytes.slice(dataStart, dataEnd)));
    offset = dataEnd;
  }

  return entries;
}

const baseJob = {
  id: "job-1",
  date: "2026-07-14",
  title: "Product Designer",
  company: "Acme",
  url: "https://example.com/jobs/product-designer",
  status: "Applied",
  notes: "Follow up next week",
};

test("XLSX export returns the Excel MIME type", () => {
  const blob = makeXlsx([baseJob]);

  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
});

test("XLSX export XML-escapes cell values", async () => {
  const blob = makeXlsx([
    {
      ...baseJob,
      title: `R&D <Lead> "Growth" 'Ops'`,
      company: "A&B <Co>",
      notes: `Use "care" & verify <tags> plus 'quotes'`,
    },
  ]);
  const sheet = (await readStoredZipEntries(blob)).get("xl/worksheets/sheet1.xml");

  assert.match(sheet, /R&amp;D &lt;Lead&gt; &quot;Growth&quot; &apos;Ops&apos;/);
  assert.match(sheet, /A&amp;B &lt;Co&gt;/);
  assert.match(sheet, /Use &quot;care&quot; &amp; verify &lt;tags&gt; plus &apos;quotes&apos;/);
});

test("XLSX export preserves blank notes as an empty cell", async () => {
  const blob = makeXlsx([{ ...baseJob, notes: "" }]);
  const sheet = (await readStoredZipEntries(blob)).get("xl/worksheets/sheet1.xml");

  assert.match(sheet, /<row r="2">.*<c t="inlineStr"><is><t><\/t><\/is><\/c><\/row>/);
});

test("XLSX export includes job URLs", async () => {
  const blob = makeXlsx([
    {
      ...baseJob,
      url: "https://example.com/jobs?role=designer&level=senior",
    },
  ]);
  const sheet = (await readStoredZipEntries(blob)).get("xl/worksheets/sheet1.xml");

  assert.match(sheet, /https:\/\/example\.com\/jobs\?role=designer&amp;level=senior/);
});

test("XLSX export writes only the rows supplied by the filtered grid", async () => {
  const filteredJobs = [
    {
      ...baseJob,
      id: "job-2",
      title: "Frontend Engineer",
      company: "Filtered Co",
    },
  ];
  const blob = makeXlsx(filteredJobs);
  const sheet = (await readStoredZipEntries(blob)).get("xl/worksheets/sheet1.xml");

  assert.match(sheet, /Frontend Engineer/);
  assert.match(sheet, /Filtered Co/);
  assert.doesNotMatch(sheet, /Product Designer/);
  assert.match(sheet, /<autoFilter ref="A1:F2"\/>/);
});
