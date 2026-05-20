// ─── LICENSE VALIDATION ────────────────────────────────────────────────────
// The valid key is NEVER stored in the app.
// Only the SHA-256 hash of the key is embedded at build time via .env.
// Even full APK decompilation reveals only the hash — the original key is safe.
// Each APK build uses a different VITE_APP_KEY_HASH → different key per client.

const STORAGE_KEY = '__tm_lic_v2__'

/** Hash any string with SHA-256, return lowercase hex */
export async function sha256(text) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Validate user-entered key against the hash baked into this build */
export async function validateKey(enteredKey) {
  const expected = import.meta.env.VITE_APP_KEY_HASH   // injected at build time
  if (!expected) return false                            // no hash → not configured
  const actual = await sha256(enteredKey.trim())
  return actual === expected.toLowerCase()
}

// ── Persistence ─────────────────────────────────────────────────────────────

export function isActivated() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(atob(raw))
    // Also verify the stored hash still matches this build's hash
    const buildHash = import.meta.env.VITE_APP_KEY_HASH || ''
    return data?.flag === 'ok' && data?.h === buildHash
  } catch { return false }
}

export function saveActivation(enteredKey, hash) {
  const payload = btoa(JSON.stringify({
    flag: 'ok',
    h: hash,
    ts: Date.now()
  }))
  localStorage.setItem(STORAGE_KEY, payload)
}
