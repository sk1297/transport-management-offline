import db from '../db/database.js'

export const getAll = () => db.petty_cash.orderBy('date').reverse().toArray()

export const add = (data) => db.petty_cash.add(data)

export const remove = (id) => db.petty_cash.delete(id)

export async function getSummary() {
  const entries = await db.petty_cash.toArray()
  const opening = entries.filter(e => e.type === 'opening').reduce((s,e) => s+(e.amount||0), 0)
  const income  = entries.filter(e => e.type === 'in').reduce((s,e) => s+(e.amount||0), 0)
  const expense = entries.filter(e => e.type === 'out').reduce((s,e) => s+(e.amount||0), 0)
  return { balance: opening + income - expense, totalIn: opening + income, totalOut: expense }
}

export async function getTodayEntries() {
  const today = new Date().toISOString().split('T')[0]
  return db.petty_cash.where('date').equals(today).toArray()
}
