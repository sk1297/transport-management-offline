import db from '../db/database.js'
export const getByTrip = (tripId) => db.trip_checklist.where('trip_id').equals(tripId).toArray()
export const upsert = async (tripId, item, checked) => {
  const existing = await db.trip_checklist.where('trip_id').equals(tripId).toArray()
  const found = existing.find(r => r.item === item)
  if (found) return db.trip_checklist.update(found.id, { checked })
  return db.trip_checklist.add({ trip_id: tripId, item, checked })
}
export const addItem = (tripId, item) => db.trip_checklist.add({ trip_id: tripId, item, checked: false })
export const remove = (id) => db.trip_checklist.delete(id)
