import db from '../db/database.js'

export const getAll = () => db.lr_bilty.orderBy('id').reverse().toArray()

export const getById = (id) => db.lr_bilty.get(id)

export const getByTrip = (tripId) => db.lr_bilty.where('trip_id').equals(tripId).toArray()

export const add = (data) => db.lr_bilty.add(data)

export const update = (id, data) => db.lr_bilty.update(id, data)

export const remove = (id) => db.lr_bilty.delete(id)

export async function autoLRNumber() {
  const setting = await db.settings.where('key').equals('lr_counter').first()
  const prefix = (await db.settings.where('key').equals('lr_prefix').first())?.value || 'LR'
  const counter = parseInt(setting?.value || '0') + 1
  const year = new Date().getFullYear()
  if (setting) {
    await db.settings.where('key').equals('lr_counter').modify({ value: String(counter) })
  } else {
    await db.settings.add({ key: 'lr_counter', value: String(counter) })
  }
  return `${prefix}-${year}-${String(counter).padStart(3, '0')}`
}
