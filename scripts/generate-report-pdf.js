#!/usr/bin/env node
/**
 * Generate PDFs for all update reports in docs/update-reports/.
 * Run: npm run docs:pdf  (or node scripts/generate-report-pdf.js)
 * Converts every .md file except README.md to a same-named .pdf.
 * Rule: Every update report must have a PDF; run this after adding or editing reports.
 */
const path = require("path");
const fs = require("fs");
const mdToPdf = require("md-to-pdf").default;

const reportsDir = path.join(__dirname, "..", "docs", "update-reports");

const mdFiles = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md") && f !== "README.md");

if (mdFiles.length === 0) {
  console.log("No report .md files found in docs/update-reports/");
  process.exit(0);
}

Promise.all(
  mdFiles.map((filename) => {
    const base = filename.replace(/\.md$/, "");
    const mdPath = path.join(reportsDir, filename);
    const destPath = path.join(reportsDir, `${base}.pdf`);
    return mdToPdf({ path: mdPath }, { dest: destPath }).then(() => {
      console.log("PDF generated:", path.relative(process.cwd(), destPath));
    });
  })
)
  .then(() => console.log("Done. PDFs:", mdFiles.map((f) => f.replace(".md", ".pdf")).join(", ")))
  .catch((err) => {
    console.error("PDF generation failed:", err.message);
    process.exit(1);
  });
