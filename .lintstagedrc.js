module.exports = {
  // Type check TypeScript files
  '**/*.ts': () => ['npx hardhat test --typecheck', 'yarn tsc --noEmit'],

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|js)': filenames => [
    `yarn eslint --fix ${filenames.join(' ')}`,
    `yarn prettier --write ${filenames.join(' ')}`,
  ],

  // Format MarkDown and JSON
  '**/*.(md|json)': filenames => `yarn prettier --write ${filenames.join(' ')}`,

  // Lint then format Solidity
  '**/*.sol': filenames => [
    `yarn solhint ${filenames.join(' ')}`,
    `yarn prettier --write --plugin=prettier-plugin-solidity ${filenames.join(' ')}`,
  ],
};
