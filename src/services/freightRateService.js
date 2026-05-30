import db from '../db/database.js'

export const getAll = () => db.freight_rates.toArray()
export const add = (data) => db.freight_rates.add(data)
export const update = (id, data) => db.freight_rates.update(id, data)
export const remove = (id) => db.freight_rates.delete(id)
export const getByCustomer = (customerId) =>
  db.freight_rates.where('customer_id').equals(customerId).toArray()

export async function findRate(customerId, from, to) {
  const all = await db.freight_rates.where('customer_id').equals(customerId).toArray()
  return all.find(r =>
    r.from_loc?.toLowerCase() === from?.toLowerCase() &&
    r.to_loc?.toLowerCase() === to?.toLowerCase()
  ) || null
}
