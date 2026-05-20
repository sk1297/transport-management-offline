import db from '../db/database.js'

export async function getTripPL(tripId) {
  const lrs      = await db.lr_bilty.where('trip_id').equals(tripId).toArray()
  const expenses = await db.expenses.where('trip_id').equals(tripId).toArray()
  const tolls    = await db.toll_logs.where('trip_id').equals(tripId).toArray()
  const revenue  = lrs.reduce((s, l) => s + (l.freight || 0), 0)
  const expTotal = [...expenses, ...tolls].reduce((s, e) => s + (e.amount || 0), 0)
  return { revenue, expenses: expTotal, profit: revenue - expTotal }
}

export async function getVehicleExpenses(vehicleId) {
  const expenses = await db.expenses.where('vehicle_id').equals(vehicleId).toArray()
  const diesel   = await db.diesel_logs.where('vehicle_id').equals(vehicleId).toArray()
  const byCategory = {}
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0)
  }
  const totalDiesel = diesel.reduce((s, d) => s + (d.amount || 0), 0)
  byCategory['Diesel (Logs)'] = totalDiesel
  return byCategory
}

export async function getMonthlyPL(year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}`
  const lrs      = await db.lr_bilty.toArray()
  const expenses = await db.expenses.toArray()
  const diesel   = await db.diesel_logs.toArray()
  const tolls    = await db.toll_logs.toArray()
  const revenue  = lrs.filter(l => l.date?.startsWith(prefix)).reduce((s, l) => s + (l.freight || 0), 0)
  const expTotal = [
    ...expenses.filter(e => e.date?.startsWith(prefix)),
    ...diesel.filter(d => d.date?.startsWith(prefix)),
    ...tolls.filter(t => t.date?.startsWith(prefix)),
  ].reduce((s, e) => s + (e.amount || 0), 0)
  return { revenue, expenses: expTotal, profit: revenue - expTotal }
}

export async function getOutstandingReceivables() {
  const all = await db.lr_bilty.toArray()
  return all.filter(lr => lr.pay_type === 'To-Pay' && lr.status !== 'Delivered')
}

// Alias for spec compatibility
export const getOutstandingLRs = getOutstandingReceivables
