// ─── LICENSE SYSTEM ──────────────────────────────────────────────────────────
// Key format:  base64( YYYY-MM-DD | sha256(SECRET + "|" + YYYY-MM-DD).slice(0,32) )
// The SECRET is split across multiple variables so it is never a single
// searchable string in the bundle — and the obfuscator scrambles it further.
//
// Keys are time-limited. The expiry date is embedded in the key itself.
// When the date passes, isActivated() returns false and the app locks.
//
// To generate a key use:   node keygen.js <days>
// ─────────────────────────────────────────────────────────────────────────────

// Secret assembled at call-time from fragments — never a single literal string
const _f = ['Tr4n', 'sP0r', 't@M4', 'n4g3', 'r!20', '25#S', 'h41l', 'xK9']
const _secret = () => _f.reduce((a, b) => a + b, '')

const STORAGE_KEY = '__tm_lic_v3__'

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function _sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function _sign(dateStr) {
  return (await _sha256(_secret() + '|' + dateStr)).slice(0, 32)
}

function _today() {
  return new Date().toISOString().slice(0, 10)
}

// ── Key validation ────────────────────────────────────────────────────────────

/**
 * Validate an entered key.
 * Returns:
 *   { ok: true,  expiry: 'YYYY-MM-DD' }   — valid, not yet expired
 *   { ok: false, expired: true, expiry }   — valid signature but date passed
 *   null                                   — bad key (wrong format / bad signature)
 */
export async function validateKey(enteredKey) {
  try {
    const decoded = atob(enteredKey.trim().replace(/\s/g, ''))
    const parts = decoded.split('|')
    if (parts.length !== 2) return null
    const [expiry, sig] = parts

    // Must look like a date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return null

    // Verify signature first (before revealing expiry status)
    const expected = await _sign(expiry)
    if (sig !== expected) return null

    // Check expiry
    if (expiry < _today()) return { ok: false, expired: true, expiry }

    return { ok: true, expiry }
  } catch {
    return null
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function saveActivation(expiry) {
  const payload = btoa(JSON.stringify({ flag: 'ok', expiry, ts: Date.now() }))
  localStorage.setItem(STORAGE_KEY, payload)
}

function _loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(atob(raw))
    if (data?.flag !== 'ok' || !data?.expiry) return null
    return data
  } catch { return null }
}

/** Returns true only if a valid key was activated AND it hasn't expired today */
export function isActivated() {
  const data = _loadStored()
  if (!data) return false
  return data.expiry >= _today()
}

/** Returns stored expiry string 'YYYY-MM-DD' or null */
export function getStoredExpiry() {
  return _loadStored()?.expiry || null
}

/** Returns true if a key was activated but has now expired */
export function isExpired() {
  const data = _loadStored()
  if (!data) return false
  return data.expiry < _today()
}

/** Returns how many days remain (0 = today is last day, negative = expired) */
export function daysRemaining() {
  const expiry = getStoredExpiry()
  if (!expiry) return null
  const diff = new Date(expiry).getTime() - new Date(_today()).getTime()
  return Math.round(diff / 86400000)
}

export function clearActivation() {
  localStorage.removeItem(STORAGE_KEY)
}
