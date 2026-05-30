import db from '../db/database.js'
export const getByMonth = (year, month) => {
  const prefix = `${year}-${String(month).padStart(2,'0')}`
  return db.driver_roster.toArray().then(all => all.filter(r => r.date?.startsWith(prefix)))
}
export const add = (data) => db.driver_roster.add(data)
export const remove = (id) => db.driver_roster.delete(id)
export const getByDate = (date) => db.driver_roster.where('date').equals(date).toArray()
