// @vitest-environment node
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectServer, FileServerAdapter } from '../src/state/serverStorage'
import { DEFAULT_USER_STATE, MULTIPLIER_MAX, toggleFavorite } from '../src/state/userState'
import { createAppServer, lanAddresses, mimeType, parsePort, resolveStaticPath, writeStateAtomic } from './serve'

let dir: string
let dataFile: string
let server: Server
let port: number
let base: string
const logs: string[] = []

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'kucharka-serve-'))
  await mkdir(path.join(dir, 'dist', 'assets'), { recursive: true })
  await writeFile(path.join(dir, 'dist', 'index.html'), '<!doctype html><title>Kuchařka</title>')
  await writeFile(path.join(dir, 'dist', 'assets', 'app-abc.js'), 'console.log(1)')
  await writeFile(path.join(dir, 'dist', 'assets', 'app-abc.css'), 'body{}')
  await writeFile(path.join(dir, 'secret.txt'), 'TAJNE')
  dataFile = path.join(dir, 'userdata', 'user-state.json')
  logs.length = 0
  server = createAppServer({ distDir: path.join(dir, 'dist'), dataFile, maxBodyBytes: 2000, log: (m) => logs.push(m) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  base = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await rm(dir, { recursive: true, force: true })
})

/** Požadavek s cestou přesně tak, jak je napsaná (fetch by ji normalizoval). */
function raw(rawPath: string, method = 'GET'): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: rawPath, method }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => (body += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('statické soubory', () => {
  it('/ vrátí index.html jako HTML bez dlouhé cache', async () => {
    const res = await fetch(`${base}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(await res.text()).toContain('Kuchařka')
  })

  it('assety se správným MIME a neměnnou cache', async () => {
    const js = await fetch(`${base}/assets/app-abc.js`)
    expect(js.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    expect(js.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(await js.text()).toBe('console.log(1)')
    const css = await fetch(`${base}/assets/app-abc.css`)
    expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8')
  })

  it('chybějící asset je 404, ne index.html', async () => {
    const res = await fetch(`${base}/assets/chybi.js`)
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain('<!doctype html>')
  })

  it('cesta bez přípony spadne na index.html (SPA fallback)', async () => {
    const res = await fetch(`${base}/nejaka/stranka`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Kuchařka')
  })

  it('HEAD bez těla, POST na statický soubor 405 s Allow', async () => {
    const head = await fetch(`${base}/`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
    const post = await fetch(`${base}/`, { method: 'POST' })
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
  })

  it.each(['/../secret.txt', '/..%2fsecret.txt', '/%2e%2e/secret.txt', '/assets/..%2f..%2fsecret.txt', '/%2e%2e%5csecret.txt'])(
    'path traversal %s nevydá soubor mimo dist',
    async (p) => {
      const res = await raw(p)
      expect([400, 404]).toContain(res.status)
      expect(res.body).not.toContain('TAJNE')
    },
  )

  it('nulový bajt a neplatné kódování jsou 400', async () => {
    expect((await raw('/index.html%00.js')).status).toBe(400)
    expect((await raw('/%E0%A4%A')).status).toBe(400)
  })
})

describe('/api/health', () => {
  it('GET vrátí {"ok":true} jako JSON bez cache', async () => {
    const res = await fetch(`${base}/api/health`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('jiná metoda 405, neznámé API 404 JSON', async () => {
    expect((await fetch(`${base}/api/health`, { method: 'POST' })).status).toBe(405)
    const res = await fetch(`${base}/api/nic`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Neznámé API' })
  })
})

describe('pomocné funkce', () => {
  it('resolveStaticPath nikdy neopustí kořen', () => {
    const root = path.resolve('/srv/dist')
    expect(resolveStaticPath(root, '/assets/a.js')).toBe(path.join(root, 'assets', 'a.js'))
    for (const p of ['/../etc/passwd', '/a/../../etc/passwd', '/..%2f..%2fetc']) {
      const r = resolveStaticPath(root, p)
      expect(r === root || r!.startsWith(root + path.sep)).toBe(true)
    }
    expect(resolveStaticPath(root, '/%E0%A4%A')).toBeNull()
    expect(resolveStaticPath(root, '/a%00b')).toBeNull()
    expect(resolveStaticPath(root, '/..%5c..%5cetc')).toBeNull()
  })

  it('mimeType', () => {
    expect(mimeType('a.woff2')).toBe('font/woff2')
    expect(mimeType('A.SVG')).toBe('image/svg+xml')
    expect(mimeType('a.neznamo')).toBe('application/octet-stream')
  })
})

const putState = (body: string) => fetch(`${base}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
const userdataFiles = async () => readdir(path.dirname(dataFile)).catch(() => [] as string[])

describe('/api/state', () => {
  it('bez souboru vrátí 200 null', async () => {
    const res = await fetch(`${base}/api/state`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toBeNull()
  })

  it('PUT uloží opravený stav (meze, bez neznámých polí) a GET ho vrátí', async () => {
    const res = await putState(JSON.stringify({ version: 1, favorites: ['a'], cart: [{ recipeId: 'x', multiplier: 99 }], extra: true }))
    expect(res.status).toBe(204)
    const saved = JSON.parse(await readFile(dataFile, 'utf8'))
    expect(saved.cart).toEqual([{ recipeId: 'x', multiplier: MULTIPLIER_MAX }])
    expect(saved.extra).toBeUndefined()
    expect(await readFile(dataFile, 'utf8')).toMatch(/^\{\n {2}"version": 1,[\s\S]*\}\n$/)
    expect(await (await fetch(`${base}/api/state`)).json()).toEqual(saved)
  })

  it('neplatný JSON 400, cizí JSON 422, příliš velké tělo 413 – soubor nevznikne', async () => {
    expect((await putState('{nejson')).status).toBe(400)
    const foreign = await putState('{"foo":1}')
    expect(foreign.status).toBe(422)
    expect(((await foreign.json()) as { error: string }).error).toContain('version')
    expect((await putState(JSON.stringify({ version: 1, favorites: ['x'.repeat(3000)] }))).status).toBe(413)
    expect(await userdataFiles()).toEqual([])
  })

  it('souběžné zápisy nechají platný soubor bez dočasných souborů', async () => {
    const states = [1, 2, 3, 4, 5].map((n) => ({ ...DEFAULT_USER_STATE, favorites: [`r${n}`] }))
    const results = await Promise.all(states.map((s) => putState(JSON.stringify(s))))
    expect(results.map((r) => r.status)).toEqual([204, 204, 204, 204, 204])
    expect(await userdataFiles()).toEqual(['user-state.json'])
    const saved = JSON.parse(await readFile(dataFile, 'utf8'))
    expect(states.map((s) => s.favorites[0])).toContain(saved.favorites[0])
  })

  it('poškozený soubor: GET vrátí null, soubor se zazálohuje a zaloguje', async () => {
    await mkdir(path.dirname(dataFile), { recursive: true })
    await writeFile(dataFile, '{"version":1,"favorites":[')
    expect(await (await fetch(`${base}/api/state`)).json()).toBeNull()
    const backups = (await userdataFiles()).filter((f) => f.startsWith('user-state.json.poskozeny-'))
    expect(backups).toHaveLength(1)
    expect(await readFile(path.join(path.dirname(dataFile), backups[0]), 'utf8')).toBe('{"version":1,"favorites":[')
    expect(logs.join('\n')).toContain('VAROVÁNÍ')
  })

  it('prázdný soubor je null bez zálohy', async () => {
    await mkdir(path.dirname(dataFile), { recursive: true })
    await writeFile(dataFile, '  \n')
    expect(await (await fetch(`${base}/api/state`)).json()).toBeNull()
    expect(await userdataFiles()).toEqual(['user-state.json'])
  })

  it('DELETE 405 s Allow', async () => {
    const res = await fetch(`${base}/api/state`, { method: 'DELETE' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET, PUT')
  })

  it('klientské adaptéry fungují proti skutečnému serveru', async () => {
    const adapter = await detectServer({ baseUrl: base })
    expect(adapter).toBeInstanceOf(FileServerAdapter)
    await expect(adapter!.load()).resolves.toBeNull()
    const s = toggleFavorite(DEFAULT_USER_STATE, 'r1')
    await adapter!.save(s)
    await expect(adapter!.load()).resolves.toEqual(s)
  })
})

describe('writeStateAtomic, parsePort, lanAddresses', () => {
  it('writeStateAtomic vytvoří složku a přepíše soubor', async () => {
    const file = path.join(dir, 'nova', 'stav.json')
    await writeStateAtomic(file, DEFAULT_USER_STATE)
    await writeStateAtomic(file, toggleFavorite(DEFAULT_USER_STATE, 'a'))
    expect(JSON.parse(await readFile(file, 'utf8')).favorites).toEqual(['a'])
    expect(await readdir(path.dirname(file))).toEqual(['stav.json'])
  })

  it('parsePort: výchozí 8787, číslo z env, jinak chyba', () => {
    expect(parsePort(undefined)).toBe(8787)
    expect(parsePort('')).toBe(8787)
    expect(parsePort('9000')).toBe(9000)
    for (const bad of ['abc', '0', '70000', '80.5']) expect(() => parsePort(bad)).toThrow('Neplatný PORT')
  })

  it('lanAddresses vrátí jen vnější IPv4', () => {
    expect(
      lanAddresses({
        lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        en0: [
          { address: 'fe80::1', family: 'IPv6', internal: false },
          { address: '192.168.1.20', family: 'IPv4', internal: false },
        ],
        en1: [{ address: '10.0.0.5', family: 4, internal: false }],
        prazdne: undefined,
      }),
    ).toEqual(['192.168.1.20', '10.0.0.5'])
  })
})
