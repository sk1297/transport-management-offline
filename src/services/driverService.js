import db from '../db/database.js'

export const getAll = () => db.drivers.toArray()

export const getById = (id) => db.drivers.get(id)

export const add = (data) => db.drivers.add(data)

export const update = (id, data) => db.drivers.update(id, data)

export const remove = (id) => db.drivers.delete(id)
