import db from '../db/database.js'

export const getAll = () => db.routes.orderBy('from_loc').toArray()
export const add = (data) => db.routes.add(data)
export const update = (id, data) => db.routes.update(id, data)
export const remove = (id) => db.routes.delete(id)

export async function findRoute(from, to) {
  const all = await db.routes.toArray()
  return all.find(r =>
    r.from_loc?.toLowerCase() === from?.toLowerCase() &&
    r.to_loc?.toLowerCase() === to?.toLowerCase()
  )
}
