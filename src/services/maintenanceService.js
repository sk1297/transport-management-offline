import db from '../db/database.js'

export const SERVICE_TYPES = [
  'Oil Change', 'Tyre Rotation', 'Brake Service', 'Air Filter', 'Clutch Service',
  'Battery Check', 'Full Service', 'AC Service', 'Wheel Alignment', 'Other'
]

// Schedules
export const getSchedules = (vehicleId) =>
  db.maintenance_schedules.where('vehicle_id').equals(vehicleId).toArray()

export const addSchedule = (data) => db.maintenance_schedules.add(data)
export const updateSchedule = (id, data) => db.maintenance_schedules.update(id, data)
export const removeSchedule = async (id) => {
  await db.maintenance_logs.where('schedule_id').equals(id).delete()
  await db.maintenance_schedules.delete(id)
}

// Logs
export const getLogs = (vehicleId) =>
  db.maintenance_logs.where('vehicle_id').equals(vehicleId).reverse().sortBy('date')

export const addLog = async (vehicleId, scheduleId, data) => {
  const id = await db.maintenance_logs.add({ ...data, vehicle_id: vehicleId, schedule_id: scheduleId })
  // Update schedule's last done
  if (scheduleId) {
    await db.maintenance_schedules.update(scheduleId, {
      last_done_km:   data.km   || null,
      last_done_date: data.date || null,
      next_due_km:    data.km   ? data.km + (await db.maintenance_schedules.get(scheduleId))?.interval_km : null,
      next_due_date:  data.date ? nextDueDate(data.date, (await db.maintenance_schedules.get(scheduleId))?.interval_days) : null,
    })
  }
  return id
}

function nextDueDate(fromDate, intervalDays) {
  if (!fromDate || !intervalDays) return null
  const d = new Date(fromDate)
  d.setDate(d.getDate() + intervalDays)
  return d.toISOString().split('T')[0]
}

// Get all overdue / due-soon across all vehicles
export async function getDueAlerts(currentKmMap = {}) {
  const schedules = await db.maintenance_schedules.toArray()
  const today = new Date().toISOString().split('T')[0]
  const alerts = []
  for (const s of schedules) {
    const currentKm = currentKmMap[s.vehicle_id] || 0
    const kmOverdue = s.next_due_km && currentKm >= s.next_due_km - 500
    const dateOverdue = s.next_due_date && s.next_due_date <= today
    if (kmOverdue || dateOverdue) {
      alerts.push({ ...s, kmOverdue, dateOverdue })
    }
  }
  return alerts
}
