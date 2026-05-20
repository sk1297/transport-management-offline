import db from '../db/database.js'

export const getByDriver = (driverId) => db.attendance.where('driver_id').equals(driverId).toArray()

export const markAttendance = async (driverId, date, status) => {
  const existing = await db.attendance.where('driver_id').equals(driverId).and(a => a.date === date).first()
  if (existing) {
    return db.attendance.update(existing.id, { status })
  }
  return db.attendance.add({ driver_id: driverId, date, status })
}

export async function getMonthlySummary(driverId, year, month) {
  const prefix = `${year}-${String(month).padStart(2,'0')}`
  const all = await db.attendance.where('driver_id').equals(driverId).toArray()
  const monthRecords = all.filter(a => a.date?.startsWith(prefix))
  const present = monthRecords.filter(a => a.status === 'Present').length
  const absent  = monthRecords.filter(a => a.status === 'Absent').length
  const leave   = monthRecords.filter(a => a.status === 'Leave').length
  return { present, absent, leave, total: monthRecords.length }
}

export const getAllSalaries = () => db.salary.orderBy('id').reverse().toArray()

export const addSalary = (data) => db.salary.add(data)

export const getAdvances = (driverId) => db.advances.where('driver_id').equals(driverId).toArray()

export const addAdvance = (data) => db.advances.add(data)
