/* Fictional sample COAs. Labs, clients and batches are invented for the demo. */
const SAMPLES = [
{ id: "tincture", label: "Tincture", hint: "Should clear",
text: `CERTIFICATE OF ANALYSIS
Pecan Bayou Analytical (fictional sample lab)
Accreditation: ISO/IEC 17025 · Cert. 9999.01 (sample)
Client: Bluebonnet Medical (fictional)
Sample Name: Relief Tincture 1:10 THC:CBD
Product Form: Tincture
Batch ID: RT-2610-014
Units per Package: 30
Dosage Unit Size: 1 mL
Net Contents: 30 mL
Date Collected: 2026-10-06
Date Tested: 2026-10-09
Date Reported: 2026-10-12

CANNABINOIDS (HPLC-DAD)
Analyte   Result   Unit
Δ9-THC   9.40   mg/mL
THCA   0.20   mg/mL
Δ8-THC   ND   mg/mL
CBD   92.10   mg/mL
CBDA   0.80   mg/mL
CBG   1.60   mg/mL
CBN   0.30   mg/mL
Total THC   9.58   mg/mL
Total CBD   92.80   mg/mL

RESIDUAL SOLVENTS — PASS
Analyte   Result   Limit   Unit   Status
Butane   ND   800   ppm   Pass
Ethanol   212   5000   ppm   Pass
Hexane   ND   290   ppm   Pass
Isopropyl alcohol   ND   500   ppm   Pass

PESTICIDES — PASS
Analyte   Result   Limit   Unit   Status
Abamectin   ND   0.1   ppm   Pass
Bifenthrin   ND   0.2   ppm   Pass
Imidacloprid   ND   0.4   ppm   Pass
Spinosad   ND   0.1   ppm   Pass

FUNGICIDES — PASS
Analyte   Result   Limit   Unit   Status
Myclobutanil   ND   0.2   ppm   Pass
Azoxystrobin   ND   0.2   ppm   Pass
Boscalid   ND   0.4   ppm   Pass

FERTILIZER RESIDUES — PASS
Analyte   Result   Limit   Unit   Status
Nitrate   12   500   ppm   Pass
Phosphate   ND   500   ppm   Pass

MICROBIALS — PASS
Analyte   Result   Limit   Unit   Status
Total yeast and mold   <100   10000   CFU/g   Pass
Total aerobic count   <100   100000   CFU/g   Pass
E. coli (STEC)   ND   ND in 1 g   —   Pass
Salmonella   ND   ND in 1 g   —   Pass

HEAVY METALS — PASS
Analyte   Result   Limit   Unit   Status
Arsenic   0.02   0.2   µg/g   Pass
Cadmium   ND   0.2   µg/g   Pass
Lead   0.05   0.5   µg/g   Pass
Mercury   ND   0.1   µg/g   Pass
`},
{ id: "gummy", label: "Edibles", hint: "Over the dose cap",
text: `CERTIFICATE OF ANALYSIS
Llano Uplift Labs (fictional sample lab)
Accreditation: ISO/IEC 17025 · Cert. 9999.02 (sample)
Client: Bluebonnet Medical (fictional)
Sample Name: Night Gummies 10 mg
Product Form: Gummy
Batch ID: NG-2609-221
Units per Package: 100
Unit Weight: 4.0 g
Net Weight: 400 g
Date Collected: 2026-09-28
Date Tested: 2026-10-01
Date Reported: 2026-10-03

CANNABINOIDS (HPLC)
Analyte   Result   Unit
Δ9-THC   2.85   mg/g
THCA   0.05   mg/g
CBD   0.40   mg/g
CBN   1.20   mg/g
Total THC   2.89   mg/g

RESIDUAL SOLVENTS — PASS
Analyte   Result   Limit   Unit   Status
Ethanol   88   5000   ppm   Pass
Butane   ND   800   ppm   Pass

PESTICIDES — PASS
Analyte   Result   Limit   Unit   Status
Bifenthrin   ND   0.2   ppm   Pass
Imidacloprid   ND   0.4   ppm   Pass

MICROBIALS — PASS
Analyte   Result   Limit   Unit   Status
Total aerobic count   1200   100000   CFU/g   Pass
E. coli (STEC)   ND   ND in 1 g   —   Pass
Salmonella   ND   ND in 1 g   —   Pass

HEAVY METALS — PASS
Analyte   Result   Limit   Unit   Status
Arsenic   ND   0.2   µg/g   Pass
Cadmium   ND   0.2   µg/g   Pass
Lead   0.11   0.5   µg/g   Pass
Mercury   ND   0.1   µg/g   Pass
`},
{ id: "vape", label: "Vape cartridge", hint: "Several failures",
text: `CERTIFICATE OF ANALYSIS
Caprock Testing Co. (fictional sample lab)
Accreditation: ISO/IEC 17025 · Cert. 9999.03 (sample)
Client: Bluebonnet Medical (fictional)
Sample Name: Calm Cartridge 1 g
Product Form: Vape cartridge
Batch ID: CC-2610-007
Units per Package: 1
Dosage Unit Size: 1.0 g
Net Weight: 1.0 g
Date Collected: 2026-10-10
Date Tested: 2026-10-13
Date Reported: 2026-10-15

CANNABINOIDS (HPLC)
Analyte   Result   Unit
Δ9-THC   81.2   %
THCA   1.1   %
Δ8-THC   6.4   %
HHC   0.9   %
CBD   0.6   %
CBG   2.3   %
Total THC   82.2   %

RESIDUAL SOLVENTS — PASS
Analyte   Result   Limit   Unit   Status
Butane   46   800   ppm   Pass
Propane   ND   2100   ppm   Pass
Ethanol   310   5000   ppm   Pass

PESTICIDES — PASS
Analyte   Result   Limit   Unit   Status
Bifenthrin   ND   0.2   ppm   Pass
Myclobutanil   ND   0.2   ppm   Pass
Spinosad   ND   0.1   ppm   Pass

MICROBIALS — PASS
Analyte   Result   Limit   Unit   Status
Total yeast and mold   <100   10000   CFU/g   Pass
Salmonella   ND   ND in 1 g   —   Pass

HEAVY METALS — FAIL
Analyte   Result   Limit   Unit   Status
Arsenic   0.04   0.2   µg/g   Pass
Cadmium   0.03   0.2   µg/g   Pass
Lead   0.62   0.5   µg/g   Fail
Mercury   ND   0.1   µg/g   Pass
`},
];
if (typeof module !== "undefined") module.exports = SAMPLES;
