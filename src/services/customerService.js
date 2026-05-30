import db from '../db/database.js'

export const getAll = () => db.customers.orderBy('name').toArray()
export const getById = (id) => db.customers.get(id)
export const add = (data) => db.customers.add(data)
export const update = (id, data) => db.customers.update(id, data)
export const remove = async (id) => {
  await db.customer_ledger.where('customer_id').equals(id).delete()
  await db.customers.delete(id)
}

// Ledger
export const getLedger = (customerId) =>
  db.customer_ledger.where('customer_id').equals(customerId).sortBy('date')

export const addLedgerEntry = (customerId, data) =>
  db.customer_ledger.add({ ...data, customer_id: customerId })

export async function getCustomerSummary(customerId) {
  const entries = await db.customer_ledger.where('customer_id').equals(customerId).toArray()
  const totalBilled  = entries.filter(e => e.type === 'debit').reduce((s,e) => s + (e.amount||0), 0)
  const totalPaid    = entries.filter(e => e.type === 'credit').reduce((s,e) => s + (e.amount||0), 0)
  return { totalBilled, totalPaid, outstanding: totalBilled - totalPaid }
}

export async function getAllOutstanding() {
  const customers = await db.customers.toArray()
  const result = []
  for (const c of customers) {
    const summary = await getCustomerSummary(c.id)
    if (summary.outstanding > 0) result.push({ ...c, ...summary })
  }
  return result.sort((a,b) => b.outstanding - a.outstanding)
}
