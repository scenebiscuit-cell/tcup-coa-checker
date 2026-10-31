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

/* A potency-only plant report: field labels in a row with their values in the row under them, the product
   name alone under the title, a potency table with no section title above it (LOD, LOQ, an uncertainty
   range, and an empty Notes column), and the lab named only in the fine print. */
test("layout: label grid, untitled potency table, lab in the fine print", () => {
  const d = fixture("grid-labels-dry-weight.txt");
  assert.equal(d.product.name, "Marigold Haze");
  assert.equal(d.product.batch, "MH-0412");                      // "Batch ID or Lot Number:" over "MH-0412"
  assert.equal(d.product.form, "Plant");
  assert.equal(d.dates.reported, "14Oct2026");
  assert.equal(d.lab.name, "Bluebird Laboratories, Inc");
  assert.deepEqual([can(d, "thca").value, can(d, "thca").unit], [18.42, "%"]);   // not the LOQ or the range
  assert.deepEqual([can(d, "d9").value, can(d, "cbga").value], [0.31, 0.987]);
  assert.deepEqual(d.reported_totals.total_thc, { value: 16.464, unit: "%" });
});

/* A hemp beverage report: totals printed over their labels, a pie-chart legend beside the potency rows,
   "THC^9" for Δ9-THC, "Batch/Lot#" with no colon, an unlabeled name over a line that describes the product,
   a microbial table whose "Units" column holds the results, and the lab's address after each table. */
test("layout: chart beside the table, totals over labels, results in a Units column", () => {
  const d = fixture("chart-beside-table.txt");
  assert.equal(d.product.name, "Prickly Pear Fizz");
  assert.equal(d.product.form, "Edible, Beverage, Hemp Cannabis");
  assert.equal(d.product.batch, "PPF-0926");
  assert.equal(d.lab.name, "Lone Star Example Testing, LLC");
  assert.deepEqual(d.reported_totals.total_thc, { value: 4.8, unit: "mg/unit" });
  assert.deepEqual([can(d, "d9").value, can(d, "d9").unit], [0.02, "mg/g"]);   // the chart's "0%" isn't read
  assert.ok(can(d, "thcv") && can(d, "d8"), "THC-V and THC^8 are recognized");
  assert.equal(can(d, "thcv").value, 0);                         // not the legend's "100%"
  assert.deepEqual([analyte(d, "microbials", "E. Coli").result, analyte(d, "microbials", "E. Coli").limit], ["ND", "1"]);
  assert.equal(analyte(d, "microbials", "Yeast & Mold").unit, "CFU/g");
  assert.ok(!panel(d, "microbials").analytes.some((a) => /street|TX|555/.test(a.name)), "the address isn't a result");
});

/* A two-column page read in drawing order: the potency header stacked one word per line, LOD/LOQ as one
   "0.004 / 0.011" cell, a ± uncertainty column, per-unit and per-serving rows after the table, and dates
   written without a colon ("DATE ISSUED 10/20/2026", "TEST RESULTS - 10/19/2026"). */
test("layout: header stacked one word per line", () => {
  const d = fixture("stacked-header.txt");
  assert.equal(d.product.name, "Meadowlark Calm Chews 300 mg");
  assert.equal(d.product.batch, "MC-2610-77");
  assert.deepEqual([d.dates.tested, d.dates.reported], ["10/19/2026", "10/20/2026"]);
  assert.deepEqual([can(d, "cbd").value, can(d, "cbd").unit], [5.96, "mg/g"]);   // RESULT (mg/g), not LOD/LOQ or ±
  assert.deepEqual([can(d, "d9").value, can(d, "cbg").value], [0.042, 0.11]);
  assert.equal(d.cannabinoids.length, 5, "per-unit and per-serving rows aren't extra cannabinoids");
  assert.deepEqual(d.reported_totals.total_thc, { value: 2.1, unit: "mg/unit" });
  assert.equal(d.lab.name, "Riverbend Laboratories California LLC");
});

/* Two potency tables side by side on each line, with a units row for both, and totals printed over
   their labels one per line. */
test("layout: two tables side by side", () => {
  const d = fixture("side-by-side-tables.txt");
  assert.equal(d.product.name, "Mango Haze");                    // "Strain:"
  assert.deepEqual([can(d, "thca").value, can(d, "thca").unit], [875.7, "mg/unit"]);   // from the right-hand table
  assert.deepEqual([can(d, "cbga").value, can(d, "d9").value], [11, 13]);
  assert.equal(d.cannabinoids.length, 9);
  assert.deepEqual(d.reported_totals.total_thc, { value: 78.1, unit: "%" });   // 78.10% over "Total THC"
  assert.deepEqual(d.reported_totals.total_cbd, { value: 0.42, unit: "%" });
});

/* Rebuilding lines from PDF text pieces (pdf.js items) */
const piece = (str, x, y, h = 8, w = str.length * h * 0.5) => ({ str, x, y, h, w });
test("pdf lines: reading order, superscripts, letter spacing, and choosing a reading", () => {
  // a header drawn after its rows still reads above them
  const page = [piece("CBD", 10, 500), piece("5.1", 120, 500), piece("Analyte", 10, 520), piece("Result (mg/g)", 120, 520)];
  assert.deepEqual(CORE.pdfLines(page), ["Analyte   Result (mg/g)", "CBD   5.1"]);
  // the 9 in "∆9-THC" sits higher and smaller, but stays on its line
  assert.equal(CORE.pdfLines([piece("∆", 10, 400), piece("9", 14.5, 402.5, 5, 2.5), piece("-THC", 17, 400)])[0], "∆9-THC");
  // a large title beside smaller lines doesn't swallow them
  const big = [piece("Certificate of Analysis", 10, 708, 30), piece("Lot ID: 33", 400, 717), piece("Batch#: A-1", 400, 706)];
  assert.deepEqual(CORE.pdfLines(big), ["Lot ID: 33", "Certificate of Analysis   Batch#: A-1"]);
  // letter-spaced text comes back as words without the spaces between letters
  assert.equal(CORE.pdfLines([piece("T H C A", 10, 300), piece("1 9 . 3 8 %", 120, 300)])[0], "THCA   19.38%");
  // rotated text (a watermark) is left out
  assert.deepEqual(CORE.pdfLines([{ ...piece("DRAFT", 10, 300), rot: true }, piece("CBD", 10, 200)]), ["CBD"]);
  // pdfText keeps whichever reading the parser gets more from
  const header = [piece("Analyte", 10, 520), piece("Result (%)", 120, 520)];
  const rows = [piece("THCA", 10, 500), piece("19.38", 120, 500), piece("CBD", 10, 480), piece("0.40", 120, 480)];
  assert.match(CORE.pdfText([[...rows, ...header]]), /^Analyte   Result \(%\)\nTHCA   19\.38/);
});

/* Package size when the COA states it in passing: mg/unit and mg/package columns side by side, or
   "SERVING/PACKAGE SIZE: 1 G / 1 G". */
test("layout: package size from mg/unit and mg/package columns, or one serving/package field", () => {
  const cols = CORE.parseText([
    "Order Name: Example Balm", "Cannabinoid Potency",
    "ANALYTE   LOD/LOQ (mg/g)   MG/G   MG/UNIT   MG/PACKAGE",
    "CBD   0.06/0.19   9.50   47.50   190.00",
    "d9-THC   0.06/0.19   0.40   2.00   8.00",
  ].join("\n"));
  assert.equal(cols.product.units_per_package, 4);                // 190 mg per package / 47.5 mg per unit
  assert.deepEqual([can(cols, "d9").value, can(cols, "d9").unit], [2, "mg/unit"]);
  const one = CORE.parseText("SAMPLE: Example Flower\nSERVING/PACKAGE SIZE: 1 G / 3.5 G\nBatch #: EF-1\n");
  assert.deepEqual([one.product.unit_size, one.product.unit_size_unit, one.product.net_content, one.product.net_content_unit], [1, "g", 3.5, "g"]);
});
