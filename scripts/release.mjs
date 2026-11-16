import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workerMarker = 'null /* motion-play-release */'
const digest = (value) => createHash('sha256').update(value).digest('hex')
// Raw-byte regression guards, not claims about download speed or FPS.
export const budgets = { javascript: 550_000, css: 160_000, total: 3_000_000 }

async function listFiles(directory, prefix = '') {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true })
  const groups = await Promise.all(entries.map((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) throw new Error(`Symlink in release: ${path}`)
    return entry.isDirectory() ? listFiles(directory, path) : [path]
  }))
  return groups.flat().sort()
}

async function describeRelease(directory) {
  const paths = (await listFiles(directory)).filter((path) => !['sw.js', 'release-report.json'].includes(path))
  for (const required of ['index.html', 'manifest.webmanifest', 'icon.svg', 'licenses/Short-Stack.txt']) {
    if (!paths.includes(required)) throw new Error(`Missing release file: ${required}`)
  }
  const files = await Promise.all(paths.map(async (path) => {
    if (/(?:^|\/)(?:\.env[^/]*|.*\.(?:map|pem|key)|.*\.(?:test|spec)\.[^/]+)$/.test(path)) throw new Error(`Unexpected release file: ${path}`)
    const bytes = await readFile(join(directory, path))
    if (/\.(?:html|css)$/.test(path)) {
      const pattern = path.endsWith('.css') ? /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g : /(?:src|href)="([^"#]+)"/g
      for (const match of bytes.toString().matchAll(pattern)) {
        const reference = match[1] ?? match[2] ?? match[3]
        if (reference.startsWith('data:') || reference.startsWith('#')) continue
        const target = new URL(reference, new URL(path, 'https://motion-play.invalid/'))
        if (target.origin !== 'https://motion-play.invalid') throw new Error(`External asset in ${path}: ${reference}`)
        if (!paths.includes(decodeURIComponent(target.pathname.slice(1)))) throw new Error(`Missing asset in ${path}: ${reference}`)
      }
    }
    return { path, bytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: digest(bytes) }
  }))
  const totals = {
    javascript: files.filter((file) => file.path.endsWith('.js')).reduce((sum, file) => sum + file.bytes, 0),
    css: files.filter((file) => file.path.endsWith('.css')).reduce((sum, file) => sum + file.bytes, 0),
    total: files.reduce((sum, file) => sum + file.bytes, 0),
  }
  for (const [name, limit] of Object.entries(budgets)) {
    if (totals[name] > limit) throw new Error(`${name} budget exceeded: ${totals[name]} > ${limit} bytes`)
  }
  const html = await readFile(join(directory, 'index.html'), 'utf8')
  if (!html.includes('http-equiv="Content-Security-Policy"') || !html.includes("connect-src 'none'")) throw new Error('Missing production privacy policy')
  const version = digest(JSON.stringify(files)).slice(0, 20)
  return { version, totals, budgets, files }
}

async function workerFor(report) {
  const template = await readFile(join(root, 'public/sw.js'), 'utf8')
  if (!template.includes(workerMarker)) throw new Error('Missing service worker release marker')
  return template.replace(workerMarker, JSON.stringify({ version: report.version, assets: report.files.map((file) => `./${file.path}`) }))
}

export async function prepareRelease(directory) {
  await mkdir(join(directory, 'licenses'), { recursive: true })
  await copyFile(join(root, 'src/assets/fonts/OFL-Short-Stack.txt'), join(directory, 'licenses/Short-Stack.txt'))
  for (const name of ['react', 'react-dom', 'scheduler']) {
    await copyFile(join(root, 'node_modules', name, 'LICENSE'), join(directory, `licenses/${name}.txt`))
  }
  const report = await describeRelease(directory)
  await writeFile(join(directory, 'sw.js'), await workerFor(report))
  await writeFile(join(directory, 'release-report.json'), `${JSON.stringify(report, null, 2)}\n`)
  return report
}

export async function checkRelease(directory) {
  const report = await describeRelease(directory)
  const recorded = JSON.parse(await readFile(join(directory, 'release-report.json'), 'utf8'))
  if (JSON.stringify(report) !== JSON.stringify(recorded)) throw new Error('Release files differ from the recorded checksums; rebuild')
  if (await readFile(join(directory, 'sw.js'), 'utf8') !== await workerFor(report)) throw new Error('Service worker differs from this release; rebuild')
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = join(root, 'dist')
  const report = await (process.argv.includes('--check') ? checkRelease(directory) : prepareRelease(directory))
  console.log(JSON.stringify({ version: report.version, files: report.files.length, bytes: report.totals, budgets: report.budgets }, null, 2))
}
