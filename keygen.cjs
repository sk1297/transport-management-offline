#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Transport Manager — License Key Generator
//
// Usage:
//   node keygen.js <days>
//
// Examples:
//   node keygen.js 1      → 1-day key (demo / trial)
//   node keygen.js 30     → 30-day key
//   node keygen.js 365    → 1-year key
//   node keygen.js 9999   → lifetime-style (27 years)
//
// ⚠️  Keep this file PRIVATE — never share it or commit it to a public repo.
//     Anyone with this file can generate their own keys.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto')

// MUST match exactly what is in src/utils/license.js _f array
const _f = ['Tr4n', 'sP0r', 't@M4', 'n4g3', 'r!20', '25#S', 'h41l', 'xK9']
const SECRET = _f.join('')

const days = parseInt(process.argv[2])
if (!days || days < 1 || days > 36500) {
  console.error('\nUsage:  node keygen.js <days>\nExample: node keygen.js 30\n')
  process.exit(1)
}

const expiry = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
const sig    = crypto.createHash('sha256').update(SECRET + '|' + expiry).digest('hex').slice(0, 32)
const key    = Buffer.from(expiry + '|' + sig).toString('base64')

console.log('\n╔══════════════════════════════════════════════════════╗')
console.log('║          Transport Manager — License Key             ║')
console.log('╚══════════════════════════════════════════════════════╝')
console.log(`\n  Days     : ${days}`)
console.log(`  Expires  : ${expiry}`)
console.log(`\n  KEY:\n`)
console.log(`  ${key}`)
console.log('\n  Copy the key above and send it to your customer.')
console.log('  They paste it into the app activation screen.\n')
