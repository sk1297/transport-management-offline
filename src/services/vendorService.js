import db from '../db/database.js'

export const getAll = () => db.vendors.toArray()

export const getById = (id) => db.vendors.get(id)

export const add = (data) => db.vendors.add(data)

export const update = (id, data) => db.vendors.update(id, data)

export const remove = (id) => db.vendors.delete(id)

export const getLedger = (vendorId) => db.vendor_ledger.where('vendor_id').equals(vendorId).toArray()

export const addLedgerEntry = (data) => db.vendor_ledger.add(data)

export async function getOutstanding(vendorId) {
  const entries = await getLedger(vendorId)
  const debit  = entries.filter(e => e.type === 'debit').reduce((s, e) => s + (e.amount || 0), 0)
  const credit = entries.filter(e => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0)
  return debit - credit
}
