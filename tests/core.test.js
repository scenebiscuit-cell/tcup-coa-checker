// Run with: npm test   (Node 18+, no dependencies)
const test = require("node:test");
const assert = require("node:assert/strict");
const CORE = require("../src/core.js");
const SAMPLES = require("../src/samples.js");

const run = (id) => {
  const s = SAMPLES.find((x) => x.id === id);
  const data = CORE.parseText(s.text);
  return { data, result: CORE.evaluate(data) };
};
const check = (result, id) => result.checks.find((c) => c.id === id);

test("tincture sample clears every check", () => {
  const { result } = run("tincture");
  assert.equal(result.verdict, "clear");
  assert.equal(result.counts.fail, 0);
  assert.equal(result.counts.warn, 0);
});

test("tincture THC per 1 mL dose is computed from mg/mL", () => {
  const { result } = run("tincture");
  // 9.40 mg/mL Δ9 + 0.20 × 0.877 THCA = 9.5754 mg
  assert.ok(Math.abs(result.math.perUnit - 9.5754) < 1e-6);
  assert.ok(Math.abs(result.math.perPkg - 287.262) < 1e-3);
});

test("gummy sample fails the 10 mg dose cap and the 1 g package cap", () => {
  const { result } = run("gummy");
  assert.equal(result.verdict, "hold");
  assert.equal(check(result, "dose").status, "fail");
  assert.equal(check(result, "pkg").status, "fail");
  assert.ok(result.math.perUnit > 10);
  assert.ok(result.math.perPkg > 1000);
});

test("gummy sample is missing a yeast and mold result", () => {
  const { result } = run("gummy");
  assert.equal(check(result, "panel").status, "fail");
  assert.match(check(result, "panel").title, /Mold/);
});

test("vape sample flags HHC, a lead failure, and inhalation conditions", () => {
  const { result } = run("vape");
  assert.equal(result.verdict, "hold");
  assert.equal(check(result, "phyto").status, "fail");
  assert.match(check(result, "phyto").detail, /HHC/);
  assert.equal(check(result, "results").status, "fail");
  assert.match(check(result, "results").detail, /Lead/);
  assert.equal(check(result, "form").status, "warn");
  assert.equal(check(result, "dose").status, "info");
});

test("total THC counts Δ8 even when the lab total leaves it out", () => {
  const data = CORE.sanitizeExtraction({
    product: { form: "Tincture", unit_size: 1, unit_size_unit: "mL" },
    cannabinoids: [
      { name: "Δ9-THC", value: 6, unit: "mg/mL" },
      { name: "Δ8-THC", value: 5, unit: "mg/mL" },
    ],
    reported_totals: { total_thc: { value: 6, unit: "mg/mL" } },
  });
  const r = CORE.evaluate(data);
  assert.equal(r.math.perUnit, 11);
  assert.equal(check(r, "dose").status, "fail");
});

test("percent potency converts to mg using the unit weight", () => {
  const data = CORE.sanitizeExtraction({
    product: { form: "Gummy", unit_size: 4, unit_size_unit: "g", units_per_package: 20 },
    cannabinoids: [{ name: "THC", value: 0.2, unit: "%" }],
  });
  const r = CORE.evaluate(data);
  assert.equal(r.math.perUnit, 8); // 0.2% = 2 mg/g × 4 g
  assert.equal(r.math.perPkg, 160);
});

test("missing dosage unit size gives a warning, not a pass", () => {
  const data = CORE.sanitizeExtraction({
    product: { form: "Gummy" },
    cannabinoids: [{ name: "Δ9-THC", value: 2, unit: "mg/g" }],
  });
  assert.equal(check(CORE.evaluate(data), "dose").status, "warn");
});

test("smokable flower fails the product form check", () => {
  const data = CORE.sanitizeExtraction({ product: { form: "Flower" } });
  assert.equal(check(CORE.evaluate(data), "form").status, "fail");
});

test("ND and <LOQ results read as zero", () => {
  assert.equal(CORE.num("ND"), 0);
  assert.equal(CORE.num("<LOQ"), 0);
  assert.equal(CORE.num("1,200"), 1200);
});

test("a result below a '<' reporting limit is not counted as over the limit", () => {
  const data = CORE.sanitizeExtraction({
    panels: [{ category: "microbials", name: "Microbials", status: "pass",
      analytes: [{ name: "Total yeast and mold", result: "<100", limit: "50", unit: "CFU/g" }] }],
  });
  assert.notEqual(check(CORE.evaluate(data), "results").status, "fail");
});

/* A fictional COA in the layout many real labs use: status on the line under each test name,
   a sideways cannabinoid table with a wrapped column name, and a table with its own column order. */
test("parses the sideways real-lab layout", () => {
  const text = require("node:fs").readFileSync(__dirname + "/fixtures/sideways-layout.txt", "utf8");
  const data = CORE.parseText(text);
  assert.equal(data.lab.name, "Mesquite Ridge Labs");
  assert.equal(data.product.name, "Sunset Drops 300");
  assert.equal(data.product.form, "Tincture");          // "Type:" wins over "Matrix:"
  assert.equal(data.product.unit_size, 1);
  assert.equal(data.product.unit_size_unit, "mL");
  assert.equal(data.product.units_per_package, 30);
  assert.equal(data.cannabinoids.length, 8);             // includes the wrapped "TOTAL 9(R/S)-HHC" column
  assert.equal(data.cannabinoids.find((c) => c.name === "D9-THC").unit, "mg/mL");
  const solvents = data.panels.find((p) => p.category === "residual_solvents");
  assert.equal(solvents.status, "pass");                 // name wrapped over two lines
  assert.equal(data.panels.find((p) => p.category === "terpenes").status, "not tested");

  const r = CORE.evaluate(data);
  assert.equal(r.verdict, "hold");
  assert.equal(check(r, "phyto").status, "fail");        // HHC detected
  assert.equal(check(r, "results").status, "fail");      // lead over the action level
  assert.match(check(r, "results").detail, /Lead 0\.9/);
  // 8.0 Δ9 + 1.5 Δ8 = 9.5 mg per 1 mL dose; Δ8 is 16% of THC
  assert.ok(Math.abs(r.math.perUnit - 9.5) < 1e-9);
  assert.equal(check(r, "dose").status, "pass");
});

test("self-check flags impossible values", () => {
  const data = CORE.sanitizeExtraction({
    product: { form: "Tincture", unit_size: 1, unit_size_unit: "mL" },
    cannabinoids: [{ name: "Δ9-THC", value: 850, unit: "%" }],
  });
  const c = check(CORE.evaluate(data), "read");
  assert.equal(c.status, "warn");
  assert.match(c.title, /can't be right/);
});

test("self-check warns when THC rows fall short of the lab's total", () => {
  const data = CORE.sanitizeExtraction({
    product: { form: "Tincture", unit_size: 1, unit_size_unit: "mL" },
    cannabinoids: [{ name: "Δ9-THC", value: 2, unit: "mg/mL" }],
    reported_totals: { total_thc: { value: 9.5, unit: "mg/mL" } },
  });
  assert.equal(check(CORE.evaluate(data), "read").status, "warn");
});

test("self-check notes a lab total that leaves out Δ8", () => {
  const { result } = run("vape");
  assert.equal(check(result, "read").status, "info");
  assert.equal(check(run("tincture").result, "read").status, "pass");
});

test("the local-model schema covers every top-level field the prompt asks for", () => {
  const schema = CORE.extractionSchema();
  for (const k of ["lab", "client", "product", "dates", "cannabinoids", "reported_totals", "panels"]) {
    assert.ok(schema.properties[k], k);
    assert.ok(schema.required.includes(k), k);
  }
});
