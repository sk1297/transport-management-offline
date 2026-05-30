import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getByMonth, add, remove, getByDate } from '../services/rosterService.js'
import { getAll as getDrivers } from '../services/driverService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { formatCurrency, getErrorMsg } from '../utils.js'
import Header from '../components/Header.jsx'
import Modal from '../components/Modal.jsx'
import { useToast } from '../context/ToastContext.jsx'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DRIVER_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899']

function driverColor(id) {
  if (!id) return '#94a3b8'
  let h = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return DRIVER_COLORS[h % DRIVER_COLORS.length]
}

function calendarDays(year, month) {
  // Returns array of {date, isCurrentMonth} objects for the 6-week grid
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month, 0)
  // Monday = 0, Sunday = 6
  const startDow = (first.getDay() + 6) % 7 // adjust so Mon=0
  const days = []
  // previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i)
    days.push({ date: d, isCurrentMonth: false })
  }
  // current month
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month - 1, d), isCurrentMonth: true })
  }
  // next month padding to fill to multiple of 7
  let pad = 7 - (days.length % 7)
  if (pad === 7) pad = 0
  for (let d = 1; d <= pad; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: false })
  }
  return days
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtDayLabel(dateObj) {
  return `${DAY_NAMES[(dateObj.getDay()+6)%7]} ${String(dateObj.getDate()).padStart(2,'0')} ${MONTH_NAMES[dateObj.getMonth()]}`
}

export default function DriverRoster() {
  const navigate = useNavigate()
  const { show }  = useToast()

  const today = new Date()
  const [month, setMonth]   = useState(today.getMonth() + 1)
  const [year,  setYear]    = useState(today.getFullYear())
  const [roster,   setRoster]   = useState([])
  const [drivers,  setDrivers]  = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)

  const [selectedDate,  setSelectedDate]  = useState(null) // Date object
  const [assignModal,   setAssignModal]   = useState(false)
  const [assignForm,    setAssignForm]    = useState({ driver_id: '', vehicle_id: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, d, v] = await Promise.all([getByMonth(year, month), getDrivers(), getVehicles()])
      setRoster(r)
      setDrivers(d)
      setVehicles(v)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const openDay = (dateObj) => {
    setSelectedDate(dateObj)
    setAssignForm({ driver_id: drivers[0]?.id || '', vehicle_id: vehicles[0]?.id || '' })
    setAssignModal(true)
  }

  const handleAssign = async () => {
    if (!assignForm.driver_id || !assignForm.vehicle_id) { show('Select driver and vehicle', 'error'); return }
    setSaving(true)
    try {
      await add({ driver_id: assignForm.driver_id, vehicle_id: assignForm.vehicle_id, date: toISODate(selectedDate) })
      show('Assigned!', 'success')
      await load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const handleRemove = async (id) => {
    try { await remove(id); await load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  // Build lookup: date string -> roster entries
  const byDate = {}
  roster.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
  })

  const days = calendarDays(year, month)
  const todayStr = toISODate(today)

  const driverMap  = Object.fromEntries(drivers.map(d => [d.id, d]))
  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]))

  // Summary: group by driver
  const driverSummary = {}
  roster.forEach(r => {
    if (!driverSummary[r.driver_id]) driverSummary[r.driver_id] = { days: new Set(), vehicles: new Set() }
    driverSummary[r.driver_id].days.add(r.date)
    driverSummary[r.driver_id].vehicles.add(r.vehicle_id)
  })

  const dayEntries = selectedDate ? (byDate[toISODate(selectedDate)] || []) : []

  return (
    <>
      <Header title="Driver Roster" onBack={() => navigate(-1)} />
      <div className="page">

        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth} style={{ minWidth: 36 }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{MONTH_NAMES[month-1]} {year}</div>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth} style={{ minWidth: 36 }}>›</button>
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {!loading && (
          <>
            {/* Calendar Grid */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text2)', padding: '7px 2px', textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {days.map(({ date, isCurrentMonth }, idx) => {
                  const ds = toISODate(date)
                  const entries = byDate[ds] || []
                  const isToday = ds === todayStr
                  const first = entries[0]
                  const driverObj = first ? driverMap[first.driver_id] : null
                  const vehicleObj = first ? vehicleMap[first.vehicle_id] : null
                  const color = first ? driverColor(first.driver_id) : null

                  return (
                    <div key={idx}
                      onClick={() => isCurrentMonth && openDay(date)}
                      style={{
                        minHeight: 64,
                        padding: '5px 4px',
                        borderRight: (idx % 7 !== 6) ? '1px solid var(--border)' : 'none',
                        borderBottom: idx < days.length - 7 ? '1px solid var(--border)' : 'none',
                        background: isToday ? 'rgba(59,130,246,0.07)' : isCurrentMonth ? 'var(--surface)' : 'var(--surface2)',
                        cursor: isCurrentMonth ? 'pointer' : 'default',
                        outline: isToday ? '2px solid #3b82f6' : 'none',
                        outlineOffset: '-2px',
                        position: 'relative',
                        transition: 'background 0.15s',
                      }}
                      onPointerEnter={e => { if (isCurrentMonth) e.currentTarget.style.background = 'var(--surface2)' }}
                      onPointerLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.07)' : isCurrentMonth ? 'var(--surface)' : 'var(--surface2)' }}
                    >
                      <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? '#3b82f6' : isCurrentMonth ? 'var(--text)' : 'var(--text2)', marginBottom: 3 }}>{date.getDate()}</div>
                      {first && (
                        <div style={{ borderRadius: 4, background: `${color}22`, borderLeft: `3px solid ${color}`, padding: '2px 3px', marginBottom: 2 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {driverObj ? (driverObj.name || driverObj.full_name || '?').slice(0,8) : '?'}
                          </div>
                          {vehicleObj && (
                            <div style={{ fontSize: 8, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vehicleObj.reg_no}</div>
                          )}
                        </div>
                      )}
                      {entries.length > 1 && (
                        <div style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {entries.length}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary Section */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Monthly Summary</div>
              {Object.keys(driverSummary).length === 0 ? (
                <div className="empty" style={{ padding: '20px 0' }}>
                  <div className="empty-icon">📅</div>
                  <div className="empty-title">No assignments yet</div>
                  <div className="empty-desc">Tap any day on the calendar to assign a driver</div>
                </div>
              ) : (
                Object.entries(driverSummary).map(([driverId, info]) => {
                  const driver = driverMap[driverId]
                  const color  = driverColor(driverId)
                  const vehicleList = [...info.vehicles].map(vid => vehicleMap[vid]?.reg_no).filter(Boolean).join(', ')
                  return (
                    <div key={driverId} className="card" style={{ borderLeft: `3px solid ${color}`, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {(driver?.name || driver?.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{driver?.name || driver?.full_name || `Driver #${driverId}`}</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                            <span style={{ fontWeight: 700, color }}>{info.days.size} day{info.days.size !== 1 ? 's' : ''}</span>
                            {vehicleList && <span> · {vehicleList}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        title={selectedDate ? `Assign — ${fmtDayLabel(selectedDate)}` : 'Assign'}
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setAssignModal(false)}>Close</button>
            <button className="btn btn-primary flex-1" onClick={handleAssign} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Assign'}
            </button>
          </>
        }
      >
        {/* Existing assignments as deletable chips */}
        {dayEntries.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase' }}>Current Assignments</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dayEntries.map(entry => {
                const d = driverMap[entry.driver_id]
                const v = vehicleMap[entry.vehicle_id]
                const color = driverColor(entry.driver_id)
                return (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 20, padding: '4px 10px 4px 10px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{d?.name || d?.full_name || '?'}</span>
                    {v && <span style={{ fontSize: 11, color: 'var(--text2)' }}>· {v.reg_no}</span>}
                    <button
                      onClick={() => handleRemove(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0 0 4px', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                    >×</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Driver dropdown */}
        <div className="form-group">
          <label className="form-label">Driver</label>
          <select className="form-input" value={assignForm.driver_id} onChange={e => setAssignForm(p => ({ ...p, driver_id: e.target.value }))}>
            {drivers.length === 0 && <option value="">No drivers</option>}
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name || d.full_name}</option>)}
          </select>
        </div>

        {/* Vehicle dropdown */}
        <div className="form-group">
          <label className="form-label">Vehicle</label>
          <select className="form-input" value={assignForm.vehicle_id} onChange={e => setAssignForm(p => ({ ...p, vehicle_id: e.target.value }))}>
            {vehicles.length === 0 && <option value="">No vehicles</option>}
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>)}
          </select>
        </div>
      </Modal>
    </>
  )
}
