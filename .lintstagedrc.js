module.exports = {
  // Type check TypeScript files
  '**/*.ts': () => 'pnpm tsc --noEmit',

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|js)': filenames => [
    `pnpm eslint --fix ${filenames.join(' ')}`,
    `pnpm prettier --write ${filenames.join(' ')}`,
  ],

  // Format MarkDown and JSON
  '**/*.(md|json)': filenames => `pnpm prettier --write ${filenames.join(' ')}`,

  // Lint then format Solidity
  '**/*.sol': filenames => [
    `pnpm solhint ${filenames.join(' ')}`,
    `pnpm prettier --write --plugin=prettier-plugin-solidity ${filenames.join(' ')}`,
  ],
};
