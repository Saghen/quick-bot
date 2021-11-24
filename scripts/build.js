const { build } = require('esbuild')
const { dependencies } = require('../package.json')

const bundledDependencies = ['strip-ansi']

build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  external: Object.keys(dependencies).filter((dependency) => !bundledDependencies.includes(dependency)),
  target: ['node16'],
  outfile: 'dist/main.js',
})
