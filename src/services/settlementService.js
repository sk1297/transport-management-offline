import db from '../db/database.js'

export const getByTrip = (tripId) =>
  db.trip_settlements.where('trip_id').equals(tripId).toArray()

export const add = (data) => db.trip_settlements.add(data)
export const update = (id, data) => db.trip_settlements.update(id, data)
export const remove = (id) => db.trip_settlements.delete(id)

export async function getTripExpenseTotal(tripId) {
  const expenses = await db.expenses.where('trip_id').equals(tripId).toArray()
  const tolls    = await db.toll_logs.where('trip_id').equals(tripId).toArray()
  const diesel   = await db.diesel_logs.toArray() // diesel doesn't have trip_id index, sum vehicle
  return {
    expenses: expenses.reduce((s,e) => s+(e.amount||0), 0),
    tolls:    tolls.reduce((s,t) => s+(t.amount||0), 0),
    total:    expenses.reduce((s,e) => s+(e.amount||0), 0) + tolls.reduce((s,t) => s+(t.amount||0), 0),
  }
}
