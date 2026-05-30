import db from '../db/database.js'

export const PURPOSES = ['Trip', 'Service', 'Empty Run', 'Testing', 'Other']

export const getByVehicle = (vehicleId) =>
  db.km_logs.where('vehicle_id').equals(vehicleId).sortBy('date')

export const add = (data) => db.km_logs.add(data)

export const remove = (id) => db.km_logs.delete(id)

export async function getLatestKm(vehicleId) {
  const logs = await db.km_logs.where('vehicle_id').equals(vehicleId).sortBy('km_reading')
  return logs.length > 0 ? logs[logs.length - 1].km_reading : null
}
