import db from '../db/database.js'

export const STATUSES = ['Pending', 'Promised', 'Disputed', 'Part-Paid', 'Resolved']

export const getByCustomer = (customerId) =>
  db.follow_ups.where('customer_id').equals(customerId).reverse().sortBy('date')

export const getAll = () => db.follow_ups.orderBy('date').reverse().toArray()
export const add = (data) => db.follow_ups.add(data)
export const update = (id, data) => db.follow_ups.update(id, data)
export const remove = (id) => db.follow_ups.delete(id)

export async function getDueToday() {
  const today = new Date().toISOString().split('T')[0]
  const all = await db.follow_ups.toArray()
  return all.filter(f => f.next_date <= today && f.status !== 'Resolved')
}
