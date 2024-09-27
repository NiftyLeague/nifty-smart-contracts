import { program } from 'commander';
import fs from 'fs';
import { parseBalanceMap } from './helpers/parse-balance-map';

program
  .version('0.0.0')
  .requiredOption(
    '-i, --input <path>',
    'input JSON file location containing a map of account addresses to string balances',
  );

program.parse(process.argv);

const options = program.opts();
const json = JSON.parse(fs.readFileSync(options.input, { encoding: 'utf8' }));

if (typeof json !== 'object') throw new Error('Invalid JSON');

fs.writeFileSync(`src/data/merkle-result.json`, JSON.stringify(parseBalanceMap(json), null, 2));
console.log('Wrote result to src/data/merkle-result.json');
