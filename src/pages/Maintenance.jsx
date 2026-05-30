import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { getSchedules, addSchedule, updateSchedule, removeSchedule, getLogs, addLog, SERVICE_TYPES } from '../services/maintenanceService.js'
import { getLatestKm } from '../services/kmLogService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

function ScheduleForm({ open, onClose, onSaved, editing, vehicleId }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { service_type: 'Oil Change', interval_km: '5000', interval_days: '90', last_done_km: '', last_done_date: todayStr(), notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing } : blank) }, [open, editing])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.service_type) { show('Service type required', 'error'); return }
    setSaving(true)
    try {
      const intKm   = Number(form.interval_km)   || null
      const intDays = Number(form.interval_days) || null
      const lastKm  = Number(form.last_done_km)  || null
      const nextKm  = lastKm && intKm ? lastKm + intKm : null
      const nextDate = form.last_done_date && intDays
        ? (() => { const d = new Date(form.last_done_date); d.setDate(d.getDate() + intDays); return d.toISOString().split('T')[0] })()
        : null
      const payload = { ...form, vehicle_id: vehicleId, interval_km: intKm, interval_days: intDays, last_done_km: lastKm, next_due_km: nextKm, next_due_date: nextDate }
      if (editing) { await updateSchedule(editing.id, payload); show('Updated!', 'success') }
      else         { await addSchedule(payload); show('Schedule added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit') : t('Add Maintenance')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">{t('Service Type')}</label>
        <select className="form-input" value={form.service_type} onChange={e => f('service_type', e.target.value)}>
          {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Interval (km)</label><input className="form-input" type="number" value={form.interval_km} onChange={e => f('interval_km', e.target.value)} placeholder="e.g. 5000" /></div>
        <div className="form-group"><label className="form-label">Interval (days)</label><input className="form-input" type="number" value={form.interval_days} onChange={e => f('interval_days', e.target.value)} placeholder="e.g. 90" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Last Done at km</label><input className="form-input" type="number" value={form.last_done_km} onChange={e => f('last_done_km', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Last Done Date</label><input className="form-input" type="date" value={form.last_done_date} onChange={e => f('last_done_date', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
    </Modal>
  )
}

function ServiceLogModal({ open, onClose, onSaved, vehicleId, scheduleId, scheduleType }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { date: todayStr(), km: '', cost: '', workshop: '', notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(blank) }, [open])

  const handleSave = async () => {
    if (!form.km) { show('Current KM required', 'error'); return }
    setSaving(true)
    try {
      await addLog(vehicleId, scheduleId, { ...form, km: Number(form.km), cost: Number(form.cost)||0 })
      show('Service logged!', 'success'); onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`Log Service: ${scheduleType}`}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">{t('Service Date')}</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Current KM *</label><input className="form-input" type="number" value={form.km} onChange={e => setForm(p => ({ ...p, km: e.target.value }))} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">{t('Cost')}</label><input className="form-input" type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">{t('Garage')}</label><input className="form-input" value={form.workshop} onChange={e => setForm(p => ({ ...p, workshop: e.target.value }))} /></div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
    </Modal>
  )
}

function VehicleMaintenance({ vehicle, currentKm, onBack }) {
  const { show } = useToast()
  const { t } = useT()
  const [schedules, setSchedules] = useState([])
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState('schedules')
  const [schedModal, setSchedModal] = useState(false)
  const [editSched, setEditSched] = useState(null)
  const [logModal, setLogModal] = useState(null) // { scheduleId, scheduleType }

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([getSchedules(vehicle.id), getLogs(vehicle.id)])
    setSchedules(s)
    setLogs(l)
  }, [vehicle.id])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]

  const getStatus = (s) => {
    const kmOverdue  = s.next_due_km   && currentKm >= s.next_due_km
    const kmSoon     = s.next_due_km   && currentKm >= s.next_due_km - 500 && currentKm < s.next_due_km
    const dateOverdue = s.next_due_date && s.next_due_date <= today
    const dateSoon    = s.next_due_date && s.next_due_date > today && new Date(s.next_due_date) - new Date() <= 14 * 86400000
    if (kmOverdue || dateOverdue) return { label: 'Overdue', color: '#ef4444' }
    if (kmSoon || dateSoon)       return { label: 'Due Soon', color: '#f59e0b' }
    return { label: 'OK', color: '#10b981' }
  }

  return (
    <>
      <Header title={`${vehicle.name} — Maintenance`} onBack={onBack}
        rightAction={tab === 'schedules' && <button className="btn btn-primary btn-sm" onClick={() => { setEditSched(null); setSchedModal(true) }}>+ Schedule</button>}
      />
      <div className="page">
        <div className="tabs" style={{ marginBottom: 14 }}>
          {[{ id: 'schedules', label: '📋 Schedules' }, { id: 'history', label: '🔧 History' }].map(t => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'schedules' && (
          schedules.length === 0
            ? <div className="empty"><div className="empty-icon">🔧</div><div className="empty-title">No schedules</div><div className="empty-desc">Add a service schedule to get alerts</div></div>
            : schedules.map(s => {
              const status = getStatus(s)
              const kmLeft = s.next_due_km ? s.next_due_km - currentKm : null
              return (
                <div key={s.id} style={{ background: 'var(--surface)', border: `1px solid ${status.color}44`, borderLeft: `3px solid ${status.color}`, borderRadius: 12, padding: '14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{s.service_type}</div>
                      {s.last_done_date && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Last: {formatDate(s.last_done_date)}{s.last_done_km ? ` @ ${s.last_done_km?.toLocaleString()} km` : ''}</div>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: `${status.color}18`, color: status.color }}>{status.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {s.next_due_km && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface2)', padding: '3px 8px', borderRadius: 6 }}>
                      Next: {s.next_due_km?.toLocaleString()} km {kmLeft != null && <strong style={{ color: kmLeft <= 0 ? '#ef4444' : 'var(--text)' }}>({kmLeft <= 0 ? `${Math.abs(kmLeft)} km overdue` : `${kmLeft} km left`})</strong>}
                    </span>}
                    {s.next_due_date && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface2)', padding: '3px 8px', borderRadius: 6 }}>Next date: {formatDate(s.next_due_date)}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setLogModal({ scheduleId: s.id, scheduleType: s.service_type })}>Log Service Done</button>
                    <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => { setEditSched(s); setSchedModal(true) }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-icon" style={{ width: 32, height: 32, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={async () => { if (window.confirm('Delete schedule?')) { await removeSchedule(s.id); load() } }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              )
            })
        )}

        {tab === 'history' && (
          logs.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-title">No service history</div></div>
            : logs.map(l => (
              <div key={l.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #10b981', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{l.vehicle_id === vehicle.id ? (schedules.find(s => s.id === l.schedule_id)?.service_type || 'Service') : 'Service'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{formatDate(l.date)} · KM: {l.km?.toLocaleString()}</div>
                    {l.workshop && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{l.workshop}</div>}
                    {l.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{l.notes}</div>}
                  </div>
                  {l.cost > 0 && <div style={{ fontWeight: 800, fontSize: 14, color: '#ef4444' }}>{formatCurrency(l.cost)}</div>}
                </div>
              </div>
            ))
        )}
      </div>

      <ScheduleForm open={schedModal} onClose={() => setSchedModal(false)} onSaved={load} editing={editSched} vehicleId={vehicle.id} />
      {logModal && <ServiceLogModal open={!!logModal} onClose={() => setLogModal(null)} onSaved={load} vehicleId={vehicle.id} scheduleId={logModal.scheduleId} scheduleType={logModal.scheduleType} />}
    </>
  )
}

export default function Maintenance() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [vehicles, setVehicles] = useState([])
  const [kmMap, setKmMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [allSchedules, setAllSchedules] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const v = await getVehicles()
      setVehicles(v)
      const km = {}
      for (const veh of v) {
        const latest = await getLatestKm(veh.id)
        km[veh.id] = latest || veh.current_km || 0
      }
      setKmMap(km)
      const scheds = []
      for (const veh of v) {
        const s = await getSchedules(veh.id)
        scheds.push(...s.map(x => ({ ...x, vehicleName: veh.name })))
      }
      setAllSchedules(scheds)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (selected) {
    const v = vehicles.find(x => x.id === selected)
    return <VehicleMaintenance vehicle={v} currentKm={kmMap[v.id] || 0} onBack={() => { setSelected(null); load() }} />
  }

  const today = new Date().toISOString().split('T')[0]
  const overdueCount = allSchedules.filter(s => {
    const kmOver  = s.next_due_km   && (kmMap[s.vehicle_id]||0) >= s.next_due_km
    const dateOver = s.next_due_date && s.next_due_date <= today
    return kmOver || dateOver
  }).length

  return (
    <>
      <Header title={t('Maintenance')} onBack={() => navigate('/more')} />
      <div className="page">
        {overdueCount > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{overdueCount} service(s) overdue or due soon</span>
          </div>
        )}

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && vehicles.length === 0 && <div className="empty"><div className="empty-icon">🚛</div><div className="empty-title">No vehicles</div></div>}

        {!loading && vehicles.map(v => {
          const km = kmMap[v.id] || 0
          const vSchedules = allSchedules.filter(s => s.vehicle_id === v.id)
          const overdueScheds = vSchedules.filter(s => {
            const kmOver  = s.next_due_km   && km >= s.next_due_km
            const dateOver = s.next_due_date && s.next_due_date <= today
            return kmOver || dateOver
          })
          const soonScheds = vSchedules.filter(s => {
            const kmSoon   = s.next_due_km   && km >= s.next_due_km - 500 && km < s.next_due_km
            const dateSoon = s.next_due_date && s.next_due_date > today && new Date(s.next_due_date) - new Date() <= 14 * 86400000
            return (kmSoon || dateSoon) && !overdueScheds.find(x => x.id === s.id)
          })
          const statusColor = overdueScheds.length > 0 ? '#ef4444' : soonScheds.length > 0 ? '#f59e0b' : '#10b981'
          const statusLabel = overdueScheds.length > 0 ? `${overdueScheds.length} overdue` : soonScheds.length > 0 ? `${soonScheds.length} due soon` : 'All good'

          return (
            <div key={v.id} onClick={() => setSelected(v.id)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${statusColor}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer' }}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{v.reg_no} · Current KM: {km.toLocaleString()}</div>
                  <div style={{ fontSize: 11, marginTop: 6 }}>{vSchedules.length} schedule(s) set</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: `${statusColor}18`, color: statusColor }}>{statusLabel}</span>
              </div>
              {overdueScheds.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {overdueScheds.map(s => <span key={s.id} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{s.service_type}</span>)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
