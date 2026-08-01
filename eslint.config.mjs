import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

export default [
  {
    ignores: [
      'node_modules/**',
      '.vscode/**',
      '.idea/**',
      '.env',
      '.DS_Store',
      'artifacts/**',
      'cache/**',
      'deployments/**',
      'gasReporterOutput.json',
      'Flattened.sol',
      'SLITHER.md',
      'coverage*/**',
      'coverage.json',
      '.openzeppelin/**',
      'logs/**',
      '*.log',
      'npm-debug.log*',
    ],
  },
  ...compat.config({
    env: {
      browser: false,
      es2021: true,
      mocha: true,
      node: true,
    },
    plugins: ['@typescript-eslint'],
    extends: ['plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 12,
    },
    rules: {},
  }),
]
