import nextra from 'nextra'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const withNextra = nextra({
  latex: true,
  search: {
    codeblocks: false
  }
})

export default withNextra({
  output: 'export',
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true
  },
  basePath: process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/lio-client' : ''),
  assetPrefix: process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/lio-client' : ''),
  trailingSlash: true
})
