import db from '../db/database.js'

export const getAll = () => db.trips.orderBy('id').reverse().toArray()

export const getById = (id) => db.trips.get(id)

export const add = (data) => db.trips.add(data)

export const update = (id, data) => db.trips.update(id, data)

export const remove = (id) => db.trips.delete(id)

export async function getWithLRs(tripId) {
  const trip = await db.trips.get(tripId)
  if (!trip) return null
  const lrs = await db.lr_bilty.where('trip_id').equals(tripId).toArray()
  const expenses = await db.expenses.where('trip_id').equals(tripId).toArray()
  const tolls = await db.toll_logs.where('trip_id').equals(tripId).toArray()
  const totalFreight = lrs.reduce((s, l) => s + (l.freight || 0), 0)
  const totalExpenses = [...expenses, ...tolls].reduce((s, e) => s + (e.amount || 0), 0)
  return { ...trip, lrs, expenses, tolls, totalFreight, totalExpenses, profit: totalFreight - totalExpenses }
}
