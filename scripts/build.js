const { build } = require('esbuild')
const { dependencies } = require('../package.json')

build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  external: Object.keys(dependencies),
  target: ['node16'],
  outfile: 'dist/main.js',
})
