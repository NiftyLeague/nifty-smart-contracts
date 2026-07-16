import { readFile } from 'node:fs/promises';

const threshold = 25;
const reportPath = new URL('../coverage/coverage-summary.json', import.meta.url);

let report;
try {
  report = JSON.parse(await readFile(reportPath, 'utf8'));
} catch (error) {
  console.error(`Unable to read Solidity coverage summary: ${error.message}`);
  process.exit(1);
}

const metrics = ['statements', 'branches', 'functions', 'lines'];
const failures = metrics.filter(metric => report.total?.[metric]?.pct < threshold);

for (const metric of metrics) {
  const percentage = report.total?.[metric]?.pct;
  if (typeof percentage !== 'number') {
    console.error(`Coverage summary is missing the ${metric} metric.`);
    process.exit(1);
  }
  console.log(`${metric}: ${percentage}%`);
}

if (failures.length > 0) {
  console.error(`Coverage must be at least ${threshold}% for: ${failures.join(', ')}.`);
  process.exit(1);
}

console.log(`Solidity coverage gate passed (minimum ${threshold}% for every metric).`);
