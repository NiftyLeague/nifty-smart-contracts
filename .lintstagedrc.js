module.exports = {
  // Type check TypeScript files
  '**/*.ts': () => 'npx hardhat test --typecheck',

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|js)': filenames => [
    `yarn eslint --fix ${filenames.join(' ')}`,
    `yarn prettier --write ${filenames.join(' ')}`,
  ],

  // Format MarkDown and JSON
  '**/*.(md|json)': filenames => `yarn prettier --write ${filenames.join(' ')}`,

  // Lint then formatSolidity
  '**/*.sol': filenames => [`yarn solhint ${filenames.join(' ')}`],
};
