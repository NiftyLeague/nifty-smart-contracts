import { readFile } from 'node:fs/promises'

const minimumLineCoverage = 54
const reportPath = new URL('../coverage/lcov.info', import.meta.url)

let report
try {
  report = await readFile(reportPath, 'utf8')
} catch (error) {
  console.error(`Unable to read Solidity coverage report: ${error.message}`)
  process.exit(1)
}

let coveredLines = 0
let totalLines = 0

for (const line of report.split('\n')) {
  if (!line.startsWith('DA:')) continue

  const [, hits] = line.match(/^DA:\d+,(\d+)/) ?? []
  if (hits === undefined) {
    console.error(`Malformed coverage record: ${line}`)
    process.exit(1)
  }

  totalLines++
  if (Number(hits) > 0) coveredLines++
}

if (totalLines === 0) {
  console.error('Coverage report did not contain any executable lines.')
  process.exit(1)
}

const lineCoverage = (coveredLines / totalLines) * 100
console.log(`lines: ${lineCoverage.toFixed(2)}% (${coveredLines}/${totalLines})`)

if (lineCoverage < minimumLineCoverage) {
  console.error(
    `Line coverage is below its required floor: ${lineCoverage.toFixed(2)}% < ${minimumLineCoverage}%.`
  )
  process.exit(1)
}

console.log(`Solidity coverage gate passed (lines ${minimumLineCoverage}%).`)
