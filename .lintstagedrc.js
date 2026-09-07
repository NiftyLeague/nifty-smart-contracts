module.exports = {
  // Type check TypeScript files
  '**/*.ts': () => 'bun tsc --noEmit',

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|js)': (filenames) => [
    `bun oxlint --fix ${filenames.join(' ')}`,
    `bun oxfmt ${filenames.join(' ')}`,
  ],

  // Format MarkDown and JSON
  '**/*.(md|json)': (filenames) => `bun oxfmt ${filenames.join(' ')}`,

  // Lint Solidity (formatting via solhint rules)
  '**/*.sol': (filenames) => [`bun solhint ${filenames.join(' ')}`],
}
