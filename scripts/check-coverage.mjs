import { readFile } from 'node:fs/promises';

const thresholds = {
  statements: 54,
  branches: 40,
  functions: 48,
  lines: 53,
};
const reportPath = new URL('../coverage/coverage-summary.json', import.meta.url);

let report;
try {
  report = JSON.parse(await readFile(reportPath, 'utf8'));
} catch (error) {
  console.error(`Unable to read Solidity coverage summary: ${error.message}`);
  process.exit(1);
}

const metrics = Object.keys(thresholds);
const failures = metrics.filter(metric => report.total?.[metric]?.pct < thresholds[metric]);

for (const metric of metrics) {
  const percentage = report.total?.[metric]?.pct;
  if (typeof percentage !== 'number') {
    console.error(`Coverage summary is missing the ${metric} metric.`);
    process.exit(1);
  }
  console.log(`${metric}: ${percentage}%`);
}

if (failures.length > 0) {
  console.error(
    `Coverage is below its required floor for: ${failures
      .map(metric => `${metric} (${thresholds[metric]}%)`)
      .join(', ')}.`,
  );
  process.exit(1);
}

console.log(`Solidity coverage gate passed (${metrics.map(metric => `${metric} ${thresholds[metric]}%`).join(', ')}).`);
