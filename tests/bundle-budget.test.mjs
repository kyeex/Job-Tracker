import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const clientRoot = new URL("dist/client/", projectRoot);
const manifest = JSON.parse(await readFile(new URL(".vite/manifest.json", clientRoot), "utf8"));
const manifestEntries = Object.entries(manifest);

function findEntryKey(source) {
  const match = manifestEntries.find(([, entry]) => entry.src === source);
  assert.ok(match, `Production manifest is missing ${source}`);
  return match[0];
}

function collectStaticImports(entryKeys) {
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    const entry = manifest[key];
    assert.ok(entry, `Production manifest references missing entry ${key}`);
    visited.add(key);
    for (const dependency of entry.imports ?? []) visit(dependency);
  };
  entryKeys.forEach(visit);
  return visited;
}

async function assetSize(file) {
  const bytes = await readFile(new URL(file, clientRoot));
  return { raw: bytes.byteLength, gzip: gzipSync(bytes, { level: 9 }).byteLength };
}

const pageKey = findEntryKey("app/page.tsx");
const browserKey = findEntryKey("virtual:vinext-app-browser-entry");
const initialKeys = collectStaticImports([browserKey, pageKey]);
const initialAssets = await Promise.all(
  [...initialKeys].map(async (key) => ({ key, file: manifest[key].file, ...(await assetSize(manifest[key].file)) })),
);
const pageSize = await assetSize(manifest[pageKey].file);
const javascriptFiles = (await readdir(new URL("assets/", clientRoot))).filter((file) => file.endsWith(".js"));
const totalRaw = (
  await Promise.all(javascriptFiles.map((file) => assetSize(`assets/${file}`)))
).reduce((total, size) => total + size.raw, 0);

test("initial route stays within its production JavaScript budget", () => {
  const initialGzip = initialAssets.reduce((total, asset) => total + asset.gzip, 0);
  assert.ok(
    initialGzip <= 110 * 1024,
    `Initial route is ${(initialGzip / 1024).toFixed(1)} KiB gzip; budget is 110 KiB`,
  );
  assert.ok(
    pageSize.raw <= 40 * 1024,
    `Page chunk is ${(pageSize.raw / 1024).toFixed(1)} KiB; budget is 40 KiB`,
  );
});

test("Firebase and Excel remain deferred from the initial route", () => {
  const deferred = manifestEntries.filter(
    ([, entry]) => /firebase|firestore|xlsx/i.test(`${entry.name ?? ""} ${entry.src ?? ""}`),
  );
  assert.ok(deferred.length >= 3, "Expected separate Firebase, Firestore, and Excel production chunks");

  for (const [key, entry] of deferred) {
    assert.equal(initialKeys.has(key), false, `${entry.name ?? key} unexpectedly entered the initial route`);
  }

  for (const source of ["app/lib/firestore-jobs.ts", "app/lib/xlsx-export.ts"]) {
    assert.equal(manifest[findEntryKey(source)].isDynamicEntry, true, `${source} is no longer a dynamic entry`);
  }
});

test("deferred and total JavaScript stay within growth budgets", async () => {
  const xlsx = manifestEntries.find(([, entry]) => entry.src === "app/lib/xlsx-export.ts");
  assert.ok(xlsx, "Excel export chunk is missing from the production manifest");
  const xlsxSize = await assetSize(xlsx[1].file);

  assert.ok(xlsxSize.gzip <= 4 * 1024, `Excel chunk is ${(xlsxSize.gzip / 1024).toFixed(1)} KiB gzip`);
  assert.ok(totalRaw <= 900 * 1024, `Total JavaScript is ${(totalRaw / 1024).toFixed(1)} KiB; budget is 900 KiB`);
});
