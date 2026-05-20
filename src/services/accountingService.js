import db from '../db/database.js'

export const getAll = () => db.accounts.orderBy('id').reverse().toArray()

export const add = (data) => db.accounts.add(data)

export const update = (id, data) => db.accounts.update(id, data)

export const remove = (id) => db.accounts.delete(id)

export async function getOutstanding() {
  const entries = await db.accounts.toArray()
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0)
  const totalDebit  = entries.reduce((s, e) => s + (e.debit || 0), 0)
  return { totalCredit, totalDebit, balance: totalCredit - totalDebit }
}

export async function getDaybook(date) {
  const all = await db.accounts.toArray()
  return all.filter(e => e.date && e.date.startsWith(date))
}

export async function getSummary() {
  const entries = await db.accounts.toArray()
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0)
  const totalDebit  = entries.reduce((s, e) => s + (e.debit || 0), 0)
  return { totalCredit, totalDebit, balance: totalCredit - totalDebit }
}
