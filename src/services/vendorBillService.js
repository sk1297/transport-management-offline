import db from '../db/database.js'
export const getAll = () => db.vendor_bills.orderBy('due_date').toArray()
export const getUnpaid = () => db.vendor_bills.where('status').notEqual('Paid').toArray()
export const getByVendor = (vid) => db.vendor_bills.where('vendor_id').equals(vid).toArray()
export const add = (data) => db.vendor_bills.add({ ...data, status: data.status || 'Unpaid' })
export const update = (id, data) => db.vendor_bills.update(id, data)
export const markPaid = (id) => db.vendor_bills.update(id, { status: 'Paid', paid_date: new Date().toISOString().split('T')[0] })
export const remove = (id) => db.vendor_bills.delete(id)
