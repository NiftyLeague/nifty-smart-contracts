import type { LegacyHardhatRuntimeEnvironment } from './legacy.js'
import { createLegacyHardhatRuntime } from './legacy.js'
import { withEnvironment } from '@rocketh/core/environment'
import { extensions } from '../../rocketh/config.js'

type RockethEnvironment = {
  name: string
}

type LegacyDeployModule = {
  default: ((hre: LegacyHardhatRuntimeEnvironment) => Promise<void>) & {
    skip?: (hre: LegacyHardhatRuntimeEnvironment) => Promise<boolean>
  }
}

type LegacyDeployScript = ((env: RockethEnvironment) => Promise<void>) & {
  tags: string[]
}

export const createLegacyDeployScript = (
  scriptPath: string,
  tag: string,
  networks: readonly string[]
): LegacyDeployScript => {
  const script = async (env: RockethEnvironment) => {
    if (!networks.includes(env.name)) return

    const enhancedEnv = Object.assign(
      Object.create(Object.getPrototypeOf(env)),
      env,
      withEnvironment(env as never, extensions)
    )
    const hre = await createLegacyHardhatRuntime(enhancedEnv)
    const module = (await import(scriptPath)) as LegacyDeployModule

    if (module.default.skip && (await module.default.skip(hre))) return
    await module.default(hre)
  }

  script.tags = [tag]
  return script
}
