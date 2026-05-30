import db from '../db/database.js'

export const DOC_TYPES = ['RC Book', 'Insurance Policy', 'PUC Certificate', 'Permit', 'Fitness Certificate', 'Other']

export const getByVehicle = (vehicleId) =>
  db.vehicle_documents.where('vehicle_id').equals(vehicleId).toArray()

export const add = (data) => db.vehicle_documents.add({
  ...data,
  uploaded_date: data.uploaded_date || new Date().toISOString().split('T')[0],
})

export const remove = (id) => db.vehicle_documents.delete(id)
