import db from '../db/database.js'

export const getAll = () => db.vehicles.toArray()

export const getById = (id) => db.vehicles.get(id)

export const add = (data) => db.vehicles.add(data)

export const update = (id, data) => db.vehicles.update(id, data)

export const remove = (id) => db.vehicles.delete(id)
