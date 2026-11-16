import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { budgets, checkRelease, prepareRelease } from './release.mjs'

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'motion-play-release-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, 'assets'))
  for (const [path, contents] of Object.entries({
    'index.html': `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">`,
    'manifest.webmanifest': '{}', 'icon.svg': '<svg/>',
    'assets/main.js': 'export {}', 'assets/main.css': `body{background:url(./paper.webp);filter:url("data:image/svg+xml,<svg><path filter='url(%23grain)'/></svg>")}`,
    'assets/paper.webp': 'image', 'assets/font.ttf': 'font',
  })) await writeFile(join(directory, path), contents)
  return directory
}

test('packages all assets and license, checks content and worker integrity', async (t) => {
  const directory = await fixture(t)
  const report = await prepareRelease(directory)
  assert.deepEqual(await checkRelease(directory), report)
  for (const path of ['assets/paper.webp', 'assets/font.ttf', 'licenses/Short-Stack.txt']) {
    assert.ok(report.files.some((file) => file.path === path))
  }
  const original = await readFile(join(directory, 'sw.js'), 'utf8')
  await writeFile(join(directory, 'sw.js'), `${original}\n// changed`)
  await assert.rejects(checkRelease(directory), /Service worker differs/)
  await writeFile(join(directory, 'sw.js'), original)
  await writeFile(join(directory, 'assets/main.js'), 'changed')
  await assert.rejects(checkRelease(directory), /checksums/)
  assert.notEqual((await prepareRelease(directory)).version, report.version)
})

test('rejects oversized scripts, accidentally shipped secrets and absent privacy policy', async (t) => {
  const directory = await fixture(t)
  await writeFile(join(directory, '.env.local'), 'example=not-a-secret')
  await assert.rejects(prepareRelease(directory), /Unexpected release file/)
  await rm(join(directory, '.env.local'))
  await writeFile(join(directory, 'assets/main.js'), 'x'.repeat(budgets.javascript + 1))
  await assert.rejects(prepareRelease(directory), /javascript budget exceeded/)
  await writeFile(join(directory, 'assets/main.js'), 'export {}')
  await writeFile(join(directory, 'index.html'), '<h1>Missing policy</h1>')
  await assert.rejects(prepareRelease(directory), /privacy policy/)
})

test('worker precaches complete release, isolates caches and never stores runtime data', async (t) => {
  const directory = await fixture(t)
  const report = await prepareRelease(directory)
  const handlers = {}, added = [], deleted = []
  let claimed = false
  const cache = { addAll: async (urls) => added.push(...urls), match: async (url) => ({ cached: url }) }
  const cacheName = `motion-play-shell-${report.version}`
  const scope = 'https://motion-play.test/play/'
  runInNewContext(await readFile(join(directory, 'sw.js'), 'utf8'), {
    URL,
    self: { registration: { scope }, location: { origin: new URL(scope).origin },
      clients: { claim: async () => { claimed = true } },
      addEventListener: (type, handler) => { handlers[type] = handler } },
    caches: { open: async (name) => { assert.equal(name, cacheName); return cache },
      keys: async () => [cacheName, 'motion-play-shell-old', 'another-app'],
      delete: async (name) => { deleted.push(name) } },
  })
  let pending
  handlers.install({ waitUntil: (value) => { pending = value } }); await pending
  assert.deepEqual(added.sort(), report.files.map((file) => `${scope}${file.path}`).sort())
  handlers.activate({ waitUntil: (value) => { pending = value } }); await pending
  assert.deepEqual(deleted, ['motion-play-shell-old']); assert.equal(claimed, true)
  for (const request of [
    { method: 'POST', url: `${scope}camera` },
    { method: 'GET', url: 'https://other.test/asset.js' },
    { method: 'GET', url: `${scope}unknown.json` },
  ]) handlers.fetch({ request, respondWith: () => assert.fail('Unexpected intercepted runtime request') })
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: scope }, respondWith: (value) => { pending = value } })
  assert.deepEqual(await pending, { cached: `${scope}index.html` })
  handlers.fetch({ request: { method: 'GET', url: `${scope}assets/font.ttf` }, respondWith: (value) => { pending = value } })
  assert.deepEqual(await pending, { cached: `${scope}assets/font.ttf` })
})

test('a missing asset rejects worker installation', async (t) => {
  const directory = await fixture(t)
  await prepareRelease(directory)
  let install, pending
  runInNewContext(await readFile(join(directory, 'sw.js'), 'utf8'), {
    URL, self: { registration: { scope: 'https://motion-play.test/' }, addEventListener: (type, handler) => { if (type === 'install') install = handler } },
    caches: { open: async () => ({ addAll: async () => { throw new Error('Missing font') } }) },
  })
  install({ waitUntil: (value) => { pending = value } })
  await assert.rejects(pending, /Missing font/)
})

test('rejects missing CSS assets and external HTML assets before packaging', async (t) => {
  const directory = await fixture(t)
  await rm(join(directory, 'assets/paper.webp'))
  await assert.rejects(prepareRelease(directory), /Missing asset in assets\/main.css/)
  await writeFile(join(directory, 'assets/paper.webp'), 'image')
  await writeFile(join(directory, 'index.html'), '<script src="https://other.test/tracker.js"></script>')
  await assert.rejects(prepareRelease(directory), /External asset/)
})

test('an evicted packaged asset can recover online without caching arbitrary responses', async (t) => {
  const directory = await fixture(t)
  await prepareRelease(directory)
  let fetchHandler, pending
  const requests = [], stored = []
  const response = { ok: true, clone: () => 'copied response' }
  runInNewContext(await readFile(join(directory, 'sw.js'), 'utf8'), {
    URL, self: { registration: { scope: 'https://motion-play.test/' }, location: { origin: 'https://motion-play.test' }, addEventListener: (type, handler) => { if (type === 'fetch') fetchHandler = handler } },
    fetch: async (url) => { requests.push(url); return response },
    caches: { open: async () => ({ match: async () => undefined, put: async (...args) => stored.push(args) }) },
  })
  fetchHandler({ request: { method: 'GET', url: 'https://motion-play.test/assets/font.ttf' }, respondWith: (value) => { pending = value } })
  assert.equal(await pending, response)
  assert.deepEqual(requests, ['https://motion-play.test/assets/font.ttf'])
  assert.deepEqual(stored, [['https://motion-play.test/assets/font.ttf', 'copied response']])
})
