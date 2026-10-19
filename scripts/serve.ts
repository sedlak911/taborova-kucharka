// Volitelný domácí server kuchařky: servíruje dist/ a ukládá uživatelský stav do userdata/. Spuštění: npm run serve
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseUserState, type UserState } from '../src/state/userState'

export const DEFAULT_PORT = 8787
/** Stejný limit jako import zálohy v aplikaci (MAX_BACKUP_BYTES v src/state/backup.ts). */
export const MAX_BODY_BYTES = 1_000_000

export interface ServeOptions {
  distDir: string
  dataFile: string
  maxBodyBytes?: number
  log?: (message: string) => void
}

type ResolvedOptions = ServeOptions & { maxBodyBytes: number; log: (message: string) => void }

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

export function mimeType(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/** Cesta souboru uvnitř distDir, nebo null (neplatné kódování, nulový bajt, zpětné lomítko). Nikdy mimo kořen. */
export function resolveStaticPath(distDir: string, urlPath: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null
  const root = path.resolve(distDir)
  // posix.normalize s úvodním „/“ ořízne „..“ nad kořenem; kontrola prefixu je druhá pojistka
  const target = path.resolve(root, '.' + path.posix.normalize('/' + decoded))
  return target === root || target.startsWith(root + path.sep) ? target : null
}

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(text)
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile()
  } catch {
    return false
  }
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, distDir: string): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Metoda není povolena' }, { Allow: 'GET, HEAD' })
  }
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const file = resolveStaticPath(distDir, pathname)
  if (!file) return sendJson(res, 400, { error: 'Neplatná cesta' })
  let target = file
  if (!(await isFile(target))) {
    // SPA fallback jen pro „stránky“ bez přípony; chybějící asset = 404, ne HTML místo JS (ruling R7)
    if (path.extname(pathname) !== '') return sendJson(res, 404, { error: 'Nenalezeno' })
    target = path.join(distDir, 'index.html')
    if (!(await isFile(target))) return sendJson(res, 404, { error: 'Chybí dist/index.html – spusťte npm run build' })
  }
  const body = await readFile(target)
  const immutable = target === file && pathname.startsWith('/assets/')
  res.writeHead(200, {
    'Content-Type': mimeType(target),
    'Content-Length': body.length,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

/** Stav ze souboru; chybějící nebo prázdný = null, poškozený = null + záloha (ruling R6). */
async function readState(dataFile: string, log: (m: string) => void): Promise<UserState | null> {
  let text: string
  try {
    text = await readFile(dataFile, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  if (text.trim() === '') return null
  let state: UserState | null
  try {
    state = parseUserState(JSON.parse(text))
  } catch {
    state = null
  }
  if (state === null) {
    const backup = `${dataFile}.poskozeny-${Date.now()}`
    await copyFile(dataFile, backup)
    log(`VAROVÁNÍ: ${dataFile} není platný stav kuchařky, záloha: ${backup}`)
  }
  return state
}

/** Zápis přes dočasný soubor ve stejné složce + rename: soubor je vždy celý starý, nebo celý nový. */
export async function writeStateAtomic(dataFile: string, state: UserState): Promise<void> {
  await mkdir(path.dirname(dataFile), { recursive: true })
  const tmp = `${dataFile}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`
  try {
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(tmp, dataFile)
  } catch (e) {
    await rm(tmp, { force: true })
    throw e
  }
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > limit) {
    req.resume() // tělo zahodit, odpověď 413 jde hned
    return Promise.reject(new HttpError(413, 'Data jsou příliš velká (nejvýš 1 MB)'))
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return
      size += chunk.length
      if (size > limit) {
        tooLarge = true
        reject(new HttpError(413, 'Data jsou příliš velká (nejvýš 1 MB)'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', reject)
  })
}

async function handleState(req: IncomingMessage, res: ServerResponse, opts: ResolvedOptions): Promise<void> {
  if (req.method === 'GET') return sendJson(res, 200, await readState(opts.dataFile, opts.log))
  if (req.method !== 'PUT') return sendJson(res, 405, { error: 'Metoda není povolena' }, { Allow: 'GET, PUT' })
  const text = await readBody(req, opts.maxBodyBytes)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Neplatný JSON')
  }
  const state = parseUserState(raw)
  if (!state) throw new HttpError(422, 'Data nejsou stav kuchařky (chybí "version": 1)')
  await writeStateAtomic(opts.dataFile, state)
  res.writeHead(204, { 'Cache-Control': 'no-store' })
  res.end()
}

async function handle(req: IncomingMessage, res: ServerResponse, opts: ResolvedOptions): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (pathname === '/api/health') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Metoda není povolena' }, { Allow: 'GET' })
    return sendJson(res, 200, { ok: true })
  }
  if (pathname === '/api/state') return handleState(req, res, opts)
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Neznámé API' })
  return serveStatic(req, res, opts.distDir)
}

export function createAppServer(options: ServeOptions): Server {
  const opts: ResolvedOptions = {
    ...options,
    maxBodyBytes: options.maxBodyBytes ?? MAX_BODY_BYTES,
    log: options.log ?? ((m: string) => console.log(m)),
  }
  return createServer((req, res) => {
    handle(req, res, opts).catch((e: unknown) => {
      if (e instanceof HttpError) {
        if (!res.headersSent) sendJson(res, e.status, { error: e.message }, e.status === 413 ? { Connection: 'close' } : {})
        return
      }
      opts.log(`CHYBA: ${(e as Error).message}`)
      if (!res.headersSent) sendJson(res, 500, { error: 'Chyba serveru' })
      else res.end()
    })
  })
}

export function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Neplatný PORT „${value}“ (čekám celé číslo 1–65535)`)
  return port
}

type Interfaces = Record<string, { address: string; family: string | number; internal: boolean }[] | undefined>

/** IPv4 adresy počítače v místní síti – na ně se připojí telefon na stejné Wi-Fi. */
export function lanAddresses(interfaces: Interfaces = networkInterfaces()): string[] {
  return Object.values(interfaces)
    .flatMap((list) => list ?? [])
    .filter((a) => (a.family === 'IPv4' || a.family === 4) && !a.internal)
    .map((a) => a.address)
}

function main(): void {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = path.join(root, 'dist')
  const dataFile = path.join(root, 'userdata', 'user-state.json')
  const port = parsePort(process.env.PORT)
  const host = process.env.HOST ?? '0.0.0.0'
  if (!existsSync(path.join(distDir, 'index.html'))) throw new Error('chybí dist/index.html – nejdřív spusťte npm run build')
  const server = createAppServer({ distDir, dataFile })
  server.on('error', (e: NodeJS.ErrnoException) => {
    console.error(e.code === 'EADDRINUSE' ? `CHYBA: port ${port} je obsazený – zkuste PORT=${port + 1} npm run serve` : `CHYBA: ${e.message}`)
    process.exit(1)
  })
  server.listen(port, host, () => {
    console.log(`Kuchařka běží: http://localhost:${port}`)
    for (const ip of lanAddresses()) console.log(`  telefon na stejné Wi-Fi: http://${ip}:${port}`)
    console.log(`  data: ${path.relative(root, dataFile)} · ukončení Ctrl+C`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (e) {
    console.error(`CHYBA: ${(e as Error).message}`)
    process.exit(1)
  }
}
