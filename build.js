const { build } = require('esbuild')
const { copy } = require('fs-extra')
const { join } = require('path')

async function buildElectron() {
  try {
    // Build main process
    await build({
      entryPoints: ['electron/main.ts'],
      bundle: true,
      platform: 'node',
      target: 'node16',
      outfile: 'dist-electron/main.js',
      external: ['electron'],
      format: 'cjs'
    })

    // Build preload script
    await build({
      entryPoints: ['electron/preload.ts'],
      bundle: true,
      platform: 'node',
      target: 'node16',
      outfile: 'dist-electron/preload.js',
      external: ['electron'],
      format: 'cjs'
    })

    console.log('Electron build completed successfully!')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildElectron()
