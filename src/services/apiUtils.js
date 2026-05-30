// Free API utilities — all calls have 5s timeout, never throw, return null on failure

const geocodeCache = new Map()

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function lookupPincode(pin) {
  if (!pin || pin.length !== 6) return null
  try {
    const data = await fetchWithTimeout(`https://api.postalpincode.in/pincode/${pin}`)
    if (!data || data[0]?.Status !== 'Success') return null
    const po = data[0].PostOffice?.[0]
    if (!po) return null
    return { city: po.District, state: po.State, district: po.District }
  } catch { return null }
}

export function validateGSTIN(gstin) {
  if (!gstin) return { valid: false, message: 'Empty' }
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  if (!regex.test(gstin.toUpperCase())) return { valid: false, message: 'Invalid format' }
  const stateCode = parseInt(gstin.substring(0, 2), 10)
  if (stateCode < 1 || stateCode > 37) return { valid: false, message: 'Invalid state code' }
  return { valid: true, message: 'Valid GSTIN format' }
}

export async function lookupIFSC(ifsc) {
  if (!ifsc || ifsc.length !== 11) return null
  try {
    const data = await fetchWithTimeout(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`)
    if (!data) return null
    return { bank: data.BANK, branch: data.BRANCH, address: data.ADDRESS, city: data.CITY, state: data.STATE }
  } catch { return null }
}

async function geocodeCity(city) {
  const key = city.toLowerCase().trim()
  if (geocodeCache.has(key)) return geocodeCache.get(key)
  try {
    const data = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city+', India')}&format=json&limit=1`,
      { headers: { 'User-Agent': 'TransportManagementApp/1.0' } }
    )
    if (!data || data.length === 0) return null
    const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    geocodeCache.set(key, result)
    return result
  } catch { return null }
}

export async function getDistanceKm(city1, city2) {
  if (!city1 || !city2) return null
  try {
    const [c1, c2] = await Promise.all([geocodeCity(city1), geocodeCity(city2)])
    if (!c1 || !c2) return null
    const data = await fetchWithTimeout(
      `https://router.project-osrm.org/route/v1/driving/${c1.lon},${c1.lat};${c2.lon},${c2.lat}?overview=false`
    )
    if (!data || !data.routes?.[0]) return null
    return Math.round(data.routes[0].distance / 1000)
  } catch { return null }
}

export async function getPublicHolidays(year) {
  try {
    const data = await fetchWithTimeout(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`)
    if (!Array.isArray(data)) return []
    return data.map(h => ({ date: h.date, name: h.localName || h.name }))
  } catch { return [] }
}
