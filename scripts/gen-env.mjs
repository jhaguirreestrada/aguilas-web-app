#!/usr/bin/env node
/**
 * Genera `.env.local` para desarrollo local (Postgres + PostgREST dockerizados).
 * Crea un JWT_SECRET aleatorio y firma las claves `anon` y `service_role` (HS256),
 * igual que lo hace el stack local de Supabase.   Uso:  npm run setup:env
 * (No sobrescribe un .env.local existente; usa --force para regenerarlo.)
 */
import { createHmac, randomBytes } from 'node:crypto'
import { existsSync, writeFileSync, readFileSync } from 'node:fs'

const force = process.argv.includes('--force')
if (existsSync('.env.local') && !force) {
  console.log('.env.local ya existe (usa --force para regenerarlo).')
  process.exit(0)
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const sign = (payload, secret) => {
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64(payload)
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}

const jwtSecret = randomBytes(32).toString('hex')
const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10
const anon = sign({ iss: 'aguilas-local', role: 'anon', exp }, jwtSecret)
const service = sign({ iss: 'aguilas-local', role: 'service_role', exp }, jwtSecret)

const template = readFileSync('.env.example', 'utf8')
const out = template
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${jwtSecret}`)
  .replace(/^SUPABASE_ANON_KEY=.*$/m, `SUPABASE_ANON_KEY=${anon}`)
  .replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, `SUPABASE_SERVICE_ROLE_KEY=${service}`)
  .replace(/^AUTH_JWT_SECRET=.*$/m, `AUTH_JWT_SECRET=${randomBytes(32).toString('hex')}`)
  .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${randomBytes(12).toString('hex')}`)
  .replace(/^AUTHENTICATOR_PASSWORD=.*$/m, `AUTHENTICATOR_PASSWORD=${randomBytes(12).toString('hex')}`)

writeFileSync('.env.local', out)
console.log('✔ .env.local generado. Siguiente paso: npm run db:up')
