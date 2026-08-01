import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceDirectory = path.join(root, 'artifacts', 'build-info')
const targetDirectory = path.join(root, 'artifacts', 'slither', 'build-info')

const normalizeNpmPath = (sourceName) => {
  const packageParts = sourceName.slice('npm/'.length).split('/')
  const packagePartCount = packageParts[0].startsWith('@') ? 2 : 1
  const packageName = packageParts
    .slice(0, packagePartCount)
    .join('/')
    .replace(/@[^/]+$/, '')
  const packageRemainder = packageParts.slice(packagePartCount).join('/').replace(/^:/, '')
  return path.posix.join('node_modules', packageName, packageRemainder)
}

const createSourceMappings = (remappings) =>
  remappings
    .map((remapping) => {
      const [from, to] = remapping.split('=')
      const actualFrom = from.startsWith('project/:')
        ? path.posix.join('node_modules', from.slice('project/:'.length))
        : from.includes('/:')
          ? path.posix.join('node_modules', from.split('/:')[1])
          : normalizeNpmPath(from)
      return { from, to, actualFrom }
    })
    .sort((left, right) => right.to.length - left.to.length)

const normalizeSourceName = (sourceName, mappings) => {
  if (sourceName.startsWith('project/')) return sourceName.slice('project/'.length)

  for (const mapping of mappings) {
    if (sourceName.startsWith(mapping.to)) {
      return path.posix.join(mapping.actualFrom, sourceName.slice(mapping.to.length))
    }
  }

  if (sourceName.startsWith('npm/')) {
    return normalizeNpmPath(sourceName)
  }

  return sourceName
}

const normalizeAstPaths = (value, mappings) => {
  if (Array.isArray(value)) return value.map((entry) => normalizeAstPaths(entry, mappings))
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === 'absolutePath' && typeof entry === 'string'
        ? normalizeSourceName(entry, mappings)
        : normalizeAstPaths(entry, mappings),
    ])
  )
}

await rm(path.dirname(targetDirectory), { force: true, recursive: true })
await mkdir(targetDirectory, { recursive: true })

for (const fileName of await readdir(sourceDirectory)) {
  if (!fileName.endsWith('.json') || fileName.endsWith('.output.json')) continue

  const metadataPath = path.join(sourceDirectory, fileName)
  const outputPath = path.join(sourceDirectory, fileName.replace(/\.json$/, '.output.json'))
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  const output = JSON.parse(await readFile(outputPath, 'utf8'))
  const input = {
    ...metadata.input,
    settings: {
      optimizer: { enabled: false },
      ...metadata.input.settings,
    },
  }
  const sourceMappings = createSourceMappings(metadata.input.settings.remappings ?? [])
  const normalizedSources = Object.fromEntries(
    Object.entries(output.output.sources ?? {}).map(([sourceName, value]) => [
      normalizeSourceName(sourceName, sourceMappings),
      normalizeAstPaths(value, sourceMappings),
    ])
  )
  const normalizedOutput = {
    ...output.output,
    sources: normalizedSources,
    contracts: Object.fromEntries(
      Object.entries(output.output.contracts ?? {}).map(([sourceName, value]) => [
        normalizeSourceName(sourceName, sourceMappings),
        value,
      ])
    ),
  }

  await writeFile(
    path.join(targetDirectory, fileName),
    `${JSON.stringify({ ...metadata, input, output: normalizedOutput }, null, 2)}\n`
  )
}
