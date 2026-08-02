import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Recreate the single-network export produced by hardhat-deploy 0.x.
 *
 * hardhat-deploy 2 keeps deployment records on disk but no longer exposes the
 * old `deploy --export` option. Keeping this adapter at the repository edge
 * preserves the export contract for client repositories without coupling them
 * to Rocketh internals.
 *
 * @param {{ deploymentsDirectory: string, outputFile: string, networkName: string }} options
 */
export async function exportDeployments({ deploymentsDirectory, outputFile, networkName }) {
  const chainId = (await readFile(path.join(deploymentsDirectory, '.chainId'), 'utf8')).trim()
  if (!chainId) {
    throw new Error(`Missing chain ID in ${deploymentsDirectory}/.chainId`)
  }

  const files = (await readdir(deploymentsDirectory))
    .filter((file) => file.endsWith('.json'))
    .sort()

  if (files.length === 0) {
    throw new Error(`No deployment records found in ${deploymentsDirectory}`)
  }

  const contracts = {}
  for (const file of files) {
    const contractName = path.basename(file, '.json')
    const deployment = JSON.parse(await readFile(path.join(deploymentsDirectory, file), 'utf8'))

    contracts[contractName] = {
      address: deployment.address,
      abi: deployment.abi,
      ...(deployment.linkedData === undefined ? {} : { linkedData: deployment.linkedData }),
    }
  }

  const output = {
    name: networkName,
    chainId,
    contracts,
  }
  const rendered = `export default ${JSON.stringify(output, null, 2)} as const;\n`

  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, rendered)
}

async function main() {
  const [networkName, outputFile = `exports/deployments.${networkName}.ts`] = process.argv.slice(2)

  if (!networkName) {
    throw new Error('Usage: node scripts/export-deployments.mjs <network-name> [output-file]')
  }

  await exportDeployments({
    deploymentsDirectory: path.resolve('deployments', networkName),
    outputFile: path.resolve(outputFile),
    networkName,
  })
}

const invokedFile = process.argv[1]
if (invokedFile && import.meta.url === pathToFileURL(path.resolve(invokedFile)).href) {
  await main()
}
