import db from '../db/database.js'

export async function get(key) {
  const row = await db.settings.where('key').equals(key).first()
  return row ? row.value : null
}

export async function set(key, value) {
  const existing = await db.settings.where('key').equals(key).first()
  if (existing) {
    return db.settings.update(existing.id, { value })
  }
  return db.settings.add({ key, value })
}

export async function getAll() {
  const rows = await db.settings.toArray()
  const obj = {}
  for (const row of rows) obj[row.key] = row.value
  return obj
}

export async function staffGetAll() {
  return db.staff.toArray()
}

export async function staffCreate(data) {
  return db.staff.add(data)
}

export async function staffUpdate(id, data) {
  return db.staff.update(id, data)
}

export async function staffToggleActive(id) {
  const s = await db.staff.get(id)
  if (s) return db.staff.update(id, { isActive: s.isActive ? 0 : 1 })
}
