// Parser tests for lab layouts beyond the samples. Every fixture is a fictional COA written in a layout
// real labs use. Add a fixture and a test here whenever you find a COA the parser misreads.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const CORE = require("../src/core.js");

const fixture = (f) => CORE.parseText(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));
const check = (r, id) => r.checks.find((c) => c.id === id);
const can = (data, key) => data.cannabinoids.find((c) => CORE.canonCannabinoid(c.name)?.key === key);
const panel = (data, cat) => data.panels.find((p) => p.category === cat);
const analyte = (data, cat, name) => panel(data, cat)?.analytes.find((a) => a.name === name);

/* Text copied from a PDF viewer: single spaces only, two fields per line, values on the next line,
   a one-line summary, and a potency table with LOQ and two result columns. */
test("layout: single-spaced text copied from a PDF viewer", () => {
  const d = fixture("pasted-single-space.txt");
  assert.equal(d.lab.name, "Prairie Bloom Analytical");
  assert.equal(d.client, "Hill Country Edibles");             // "Client: ... Report Date: ..." on one line
  assert.equal(d.dates.reported, "10/12/26");
  assert.equal(d.product.name, "Peach Rings 100");
  assert.equal(d.product.form, "Edible");
  assert.equal(d.product.batch, "PR-2610-11");
  assert.equal(d.product.units_per_package, 10);
  assert.equal(d.product.unit_size, 4.5);                      // "1 gummy (4.5 g)" is 4.5 g, not 1
  assert.equal(d.dates.collected, "10/05/26");                 // value on the line after "Date Received:"
  assert.equal(d.dates.tested, "10/09/26");
  assert.equal(panel(d, "residual_solvents").status, "not tested"); // from the one-line summary
  // LOQ column skipped; mg/serving preferred over mg/g; "Delta 9 THC" keeps its 9
  assert.deepEqual([can(d, "d9").value, can(d, "d9").unit], [9.81, "mg/unit"]);
  assert.equal(can(d, "thca").name, "Tetrahydrocannabinolic Acid");
  assert.ok(can(d, "cbga"), "Cannabigerolic Acid reads as CBGA, not CBG");
  assert.deepEqual(d.reported_totals.total_thc, { value: 9.81, unit: "mg/unit" });
  assert.equal(analyte(d, "heavy_metals", "Arsenic").result, "Not Detected");
  assert.equal(analyte(d, "microbials", "Salmonella").result, "Not Detected in 1g");
  assert.equal(analyte(d, "microbials", "Total Yeast and Mold").result, "<100");
  assert.ok(!panel(d, "microbials").analytes.some((a) => /page/i.test(a.name)), "page footer isn't a result");

  const r = CORE.evaluate(d);
  assert.equal(check(r, "dose").status, "pass");              // 9.81 mg per gummy, under 10 mg
  assert.ok(Math.abs(r.math.perPkg - 98.1) < 1e-9);
  assert.equal(check(r, "results").status, "pass");
});

/* Wide-gap and tab tables: side-by-side fields, a summary grid, a potency table with Dilution/LOD/LOQ
   columns and a units row, and contaminant tables that put the unit in the column header. */
test("layout: column tables with units in the headers", () => {
  const d = fixture("column-table.txt");
  assert.equal(d.client, "Ozark Valley Manufacturing (fictional)");
  assert.equal(d.product.form, "Vape Cartridge");
  assert.equal(d.product.batch, "1A4050300000ABC000001234");   // METRC tag
  assert.equal(d.dates.tested, "10/06/26");
  assert.equal(d.dates.reported, "10/08/26");
  assert.equal(panel(d, "foreign_matter").status, "pass");    // summary grid
  assert.equal(panel(d, "moisture").status, "not tested");    // "Not Required"
  assert.deepEqual([can(d, "d9").value, can(d, "d9").unit], [824.1, "mg/g"]);
  assert.ok(can(d, "thcv") && can(d, "cbdv"), "chemical names for THCV and CBDV");
  assert.deepEqual(d.reported_totals.total_thc, { value: 834.6, unit: "mg/g" }); // "Total Δ9-THC"
  const propane = analyte(d, "residual_solvents", "Propane");
  assert.deepEqual([propane.result, propane.limit, propane.unit], ["112", "2100", "ppm"]);
  assert.equal(analyte(d, "heavy_metals", "Lead").unit, "µg/g");

  assert.equal(CORE.evaluate(d).checks.find((c) => c.id === "read").status, "pass"); // rows add up to the lab's total
});

/* A LIMS export: two-column field rows, then one row per result with the section in the first column. */
test("layout: CSV export with a section column", () => {
  const d = fixture("lims-export.csv");
  assert.equal(d.lab.name, "Golden Coast Testing (fictional)");
  assert.equal(d.product.form, "Flower");
  assert.equal(d.product.net_content, 3.5);
  assert.equal(d.cannabinoids.length, 5);
  assert.deepEqual([can(d, "thca").value, can(d, "thca").unit], [24.1, "%"]);
  assert.equal(panel(d, "pesticides").status, "fail");
  assert.equal(analyte(d, "foreign_matter", "Visual inspection").limit, null);   // blank cells stay blank

  const r = CORE.evaluate(d);
  assert.equal(r.verdict, "hold");                             // smokable flower, and a pesticide over its limit
  assert.match(check(r, "results").detail, /Myclobutanil 0\.31/);
});

test("layout: fields stay whole when a label contains another label", () => {
  const d = CORE.parseText("Sample Size Received: 90 gram\nDate Received: 10/01/26\nAnalyzed Date :   10/03/26 12:33:40");
  assert.equal(d.dates.collected, "10/01/26");                // not "90 gram"
  assert.equal(d.dates.tested, "10/03/26 12:33:40");          // the time's colons don't start a new field
});

test("layout: a section name followed by its status is a header, a result row is not", () => {
  const d = CORE.parseText("Microbials Pass\nTotal Yeast and Mold <100 CFU/g Pass\nAspergillus Not Detected in 1g Pass");
  const p = panel(d, "microbials");
  assert.equal(p.status, "pass");
  assert.deepEqual(p.analytes.map((a) => a.name), ["Total Yeast and Mold", "Aspergillus"]);
});

test("joinLine: touching pieces form a word, small gaps a space, wide gaps a column break", () => {
  const line = CORE.joinLine([
    { str: "Tot", x: 0, w: 15, h: 8 }, { str: "al THC", x: 15, w: 30, h: 8 },   // split mid-word
    { str: "0.95", x: 47, w: 16, h: 8 },                                        // 2 pt gap: a space
    { str: " ", x: 63, w: 37, h: 0 },                                           // pdf.js gap filler
    { str: "%", x: 100, w: 5, h: 8 },                                           // 37 pt gap: a column
  ]);
  assert.equal(line, "Total THC 0.95   %");
});
