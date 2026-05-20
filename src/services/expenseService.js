import db from '../db/database.js'

export const getAll = () => db.expenses.orderBy('id').reverse().toArray()

export const getByVehicle = (vehicleId) => db.expenses.where('vehicle_id').equals(vehicleId).toArray()

export const getByTrip = (tripId) => db.expenses.where('trip_id').equals(tripId).toArray()

export const add = (data) => db.expenses.add(data)

export const update = (id, data) => db.expenses.update(id, data)

export const remove = (id) => db.expenses.delete(id)

export async function getMonthlyExpenses(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const all = await db.expenses.toArray()
  return all.filter(e => e.date && e.date.startsWith(prefix))
}

export async function getTodayTotal() {
  const today = new Date().toISOString().split('T')[0]
  const all = await db.expenses.toArray()
  return all.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0)
}
