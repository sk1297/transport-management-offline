import db from '../db/database.js'
export const getAll = () => db.quotations.orderBy('date').reverse().toArray()
export const add = (data) => db.quotations.add({ ...data, status: data.status || 'Draft' })
export const update = (id, data) => db.quotations.update(id, data)
export const remove = (id) => db.quotations.delete(id)
export const getByCustomer = (cid) => db.quotations.where('customer_id').equals(cid).toArray()
