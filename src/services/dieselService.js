import db from '../db/database.js'

export const getAll = () => db.diesel_logs.orderBy('id').reverse().toArray()

export const getByVehicle = (vehicleId) => db.diesel_logs.where('vehicle_id').equals(vehicleId).toArray()

export const add = (data) => db.diesel_logs.add(data)

export const update = (id, data) => db.diesel_logs.update(id, data)

export const remove = (id) => db.diesel_logs.delete(id)

export const getAllTolls = () => db.toll_logs.orderBy('id').reverse().toArray()

export const addToll = (data) => db.toll_logs.add(data)

export const updateToll = (id, data) => db.toll_logs.update(id, data)

export const removeToll = (id) => db.toll_logs.delete(id)

export async function getMileage(vehicleId) {
  const logs = await db.diesel_logs.where('vehicle_id').equals(vehicleId).sortBy('km_reading')
  if (logs.length < 2) return null
  const first = logs[0]
  const last  = logs[logs.length - 1]
  const km = last.km_reading - first.km_reading
  const litres = logs.slice(1).reduce((s, l) => s + (l.litres || 0), 0)
  return litres > 0 ? (km / litres).toFixed(2) : null
}
