

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
