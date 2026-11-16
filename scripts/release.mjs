import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workerMarker = 'null /* motion-play-release */'
const digest = (value) => createHash('sha256').update(value).digest('hex')
// Raw-byte regression guards, not claims about download speed or FPS.
export const budgets = { javascript: 550_000, css: 160_000, total: 33_000_000, core: 3_000_000, pose: 30_000_000 }

// These runtime dependencies are loaded from JavaScript, so the HTML/CSS asset
// checks cannot discover a missing model or a missing browser-specific WASM path.
export const requiredPoseFiles = [
  'pose/tracker.html', 'pose/tracker.js', 'pose/vision_bundle.mjs',
  'pose/pose_landmarker_lite.task',
  'pose/wasm/vision_wasm_internal.js', 'pose/wasm/vision_wasm_internal.wasm',
  'pose/wasm/vision_wasm_nosimd_internal.js', 'pose/wasm/vision_wasm_nosimd_internal.wasm',
  'pose/LICENSE.txt', 'pose/MODEL-CARD.txt', 'pose/README.txt',
]

async function checkPrivacyPolicy(html, path) {
  const policies = JSON.parse(await readFile(join(root, 'config/privacy-policy.json'), 'utf8'))
  // Only the opt-in diagnostic may fetch local model/WASM files or compile WASM.
  // All other packaged documents retain the main app's blocked connections.
  const policy = path === 'pose/tracker.html' ? policies.poseContent : policies.content
  // Verify the canonical tag emitted by Vite, including placement before loads.
  // Substrings elsewhere (or in comments) do not establish an enforced policy.
  const markup = html.replace(/<!--[\s\S]*?-->/g, '')
  const head = markup.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? ''
  const expected = `<meta http-equiv="Content-Security-Policy" content="${policy}">`
  if (!head.trimStart().startsWith(expected)) {
    throw new Error(`Missing or misplaced production privacy policy in ${path}`)
  }
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true })
  const groups = await Promise.all(entries.map((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) throw new Error(`Symlink in release: ${path}`)
    return entry.isDirectory() ? listFiles(directory, path) : [path]
  }))
  return groups.flat().sort()
}

async function checkManifest(directory, paths) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.webmanifest'), 'utf8'))
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Invalid release manifest')
  const base = new URL('https://motion-play.invalid/manifest.webmanifest')
  const localUrl = (reference) => {
    if (typeof reference !== 'string' || !reference.trim()) throw new Error('Invalid manifest URL')
    const target = new URL(reference, base)
    if (target.origin !== base.origin || target.username || target.password) throw new Error(`External manifest URL: ${reference}`)
    return target
  }
  const launchUrl = (reference) => {
    const target = localUrl(reference)
    // This build uses hash routes and is packaged for root hosting only.
    if (!['/', '/index.html'].includes(target.pathname) || target.search) throw new Error(`Unsupported manifest launch URL: ${reference}`)
    return target
  }
  launchUrl(manifest.start_url)
  if (localUrl(manifest.scope).href !== base.origin + '/') throw new Error('Manifest scope must be the hosting root')
  const checkImages = (images) => {
    if (!Array.isArray(images)) throw new Error('Invalid manifest images')
    for (const image of images) {
      const target = localUrl(image?.src)
      if (!paths.includes(decodeURIComponent(target.pathname.slice(1)))) throw new Error(`Missing manifest asset: ${image.src}`)
    }
  }
  if (!manifest.icons?.length) throw new Error('Missing manifest icons')
  checkImages(manifest.icons)
  if (manifest.screenshots !== undefined) checkImages(manifest.screenshots)
  if (manifest.shortcuts !== undefined) {
    if (!Array.isArray(manifest.shortcuts)) throw new Error('Invalid manifest shortcuts')
    for (const shortcut of manifest.shortcuts) {
      launchUrl(shortcut?.url)
      if (shortcut.icons !== undefined) checkImages(shortcut.icons)
    }
  }
}

async function describeRelease(directory) {
  const paths = (await listFiles(directory)).filter((path) => !['sw.js', 'release-report.json'].includes(path))
  for (const required of ['index.html', 'manifest.webmanifest', 'icon.svg', 'licenses/Short-Stack.txt', ...requiredPoseFiles]) {
    if (!paths.includes(required)) throw new Error(`Missing release file: ${required}`)
  }
  const files = await Promise.all(paths.map(async (path) => {
    if (/(?:^|\/)(?:\.env[^/]*|.*\.(?:map|pem|key)|.*\.(?:test|spec)\.[^/]+)$/.test(path)) throw new Error(`Unexpected release file: ${path}`)
    const bytes = await readFile(join(directory, path))
    if (requiredPoseFiles.includes(path) && !bytes.length) throw new Error(`Empty release file: ${path}`)
    if (/\.(?:html|css)$/.test(path)) {
      const pattern = path.endsWith('.css') ? /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g : /(?:src|href)="([^"#]+)"/g
      for (const match of bytes.toString().matchAll(pattern)) {
        const reference = match[1] ?? match[2] ?? match[3]
        if (reference.startsWith('data:') || reference.startsWith('#')) continue
        const target = new URL(reference, new URL(path, 'https://motion-play.invalid/'))
        if (target.origin !== 'https://motion-play.invalid') throw new Error(`External asset in ${path}: ${reference}`)
        if (!paths.includes(decodeURIComponent(target.pathname.slice(1)))) throw new Error(`Missing asset in ${path}: ${reference}`)
      }
      if (path.endsWith('.html')) await checkPrivacyPolicy(bytes.toString(), path)
    }
    return { path, bytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: digest(bytes) }
  }))
  const totals = {
    javascript: files.filter((file) => file.path.endsWith('.js') && !file.path.startsWith('pose/')).reduce((sum, file) => sum + file.bytes, 0),
    css: files.filter((file) => file.path.endsWith('.css')).reduce((sum, file) => sum + file.bytes, 0),
    core: files.filter(file => !file.path.startsWith('pose/')).reduce((sum,file) => sum+file.bytes,0),
    pose: files.filter(file => file.path.startsWith('pose/')).reduce((sum,file) => sum+file.bytes,0),
    total: files.reduce((sum, file) => sum + file.bytes, 0),
  }
  for (const [name, limit] of Object.entries(budgets)) {
    if (totals[name] > limit) throw new Error(`${name} budget exceeded: ${totals[name]} > ${limit} bytes`)
  }
  await checkManifest(directory, paths)
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
