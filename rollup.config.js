// 根据 tsconfig.json 把 ts 转成 js
import typescript from 'rollup-plugin-typescript2'
// 替换代码中的变量
import replace from '@rollup/plugin-replace'
// 输出打包后的文件大小
import filesize from 'rollup-plugin-filesize'
// ES6 转 ES5
import buble from '@rollup/plugin-buble'
// 压缩
import { terser } from 'rollup-plugin-terser'
// 本地服务器
import serve from 'rollup-plugin-serve'
// yox 模板预编译
import yoxTemplate from 'rollup-plugin-yox-template'

import { name, version, author, license } from './package.json'

const banner =
  `${'/**\n' + ' * '}${name}.js v${version}\n` +
  ` * (c) 2017-${new Date().getFullYear()} ${author}\n` +
  ` * Released under the ${license} License.\n` +
  ` */\n`;

const sourcemap = true

let suffix = '.js'

const env = process.env.NODE_ENV
const minify = process.env.NODE_MINIFY === 'true'
const port = process.env.NODE_PORT

const replaces = {
  'process.env.NODE_ENV': JSON.stringify(env),
  'process.env.NODE_VERSION': JSON.stringify(version),
  preventAssignment: true
}

let plugins = [
  replace(replaces),
  yoxTemplate()
]

if (minify) {
  suffix = '.min' + suffix
}

const output = []

if (process.env.NODE_FORMAT === 'es') {
  plugins.push(
    typescript({
      check: false,
      useTsconfigDeclarationDir: true
    })
  )
  output.push({
    file: `dist/${name}.esm${suffix}`,
    format: 'es',
    interop: false,
    banner,
    sourcemap,
  })
}
else {
  plugins.push(
    typescript({
      check: false,
      useTsconfigDeclarationDir: true
    }),
    buble({
      namedFunctionExpressions: false
    })
  )
  output.push({
    file: `dist/${name}${suffix}`,
    format: 'umd',
    name: 'YoxRouter',
    interop: false,
    banner,
    sourcemap,
  })
}

if (minify) {
  plugins.push(
    terser()
  )
}

plugins.push(
  filesize(),
)

if (port) {
  plugins.push(
    serve({
      port,
      contentBase: ['']
    })
  )
}

module.exports = [
  {
    input: 'src/Router.ts',
    external: ['yox'],
    output,
    plugins
  }
]