import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, remove, getAllTolls, addToll, removeToll, getMileage } from '../services/dieselService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { getAll as getVendors } from '../services/vendorService.js'
import { getAll as getTrips } from '../services/tripService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

export default function DieselToll() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [tab, setTab]           = useState('diesel')
  const [dieselLogs, setDiesel] = useState([])
  const [tollLogs, setTolls]    = useState([])
  const [vehicles, setVehicles] = useState([])
  const [vendors, setVendors]   = useState([])
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [mileage, setMileage]   = useState({})

  // Diesel form
  const dBlank = { vehicle_id: '', date: todayStr(), litres: '', rate: '', amount: '', km_reading: '', vendor_id: '', notes: '' }
  const [dForm, setDForm] = useState(dBlank)
  const df = (k, v) => {
    const updated = { ...dForm, [k]: v }
    if (k === 'litres' || k === 'rate') updated.amount = String(parseFloat(updated.litres||0) * parseFloat(updated.rate||0) || '')
    setDForm(updated)
  }

  // Toll form
  const tBlank = { trip_id: '', location: '', amount: '', date: todayStr() }
  const [tForm, setTForm] = useState(tBlank)

  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, t, v, vend, tr] = await Promise.all([getAll(), getAllTolls(), getVehicles(), getVendors(), getTrips()])
      setDiesel(d); setTolls(t); setVehicles(v); setVendors(vend); setTrips(tr)
      // Mileage per vehicle
      const mil = {}
      for (const veh of v) mil[veh.id] = await getMileage(veh.id)
      setMileage(mil)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaveDiesel = async () => {
    if (!dForm.vehicle_id || !dForm.litres) { show('Vehicle and litres required', 'error'); return }
    setSaving(true)
    try {
      await add({ ...dForm, vehicle_id: Number(dForm.vehicle_id), vendor_id: Number(dForm.vendor_id)||null, litres: Number(dForm.litres), rate: Number(dForm.rate), amount: Number(dForm.amount), km_reading: Number(dForm.km_reading)||0 })
      show('Diesel log added!', 'success'); setDForm(dBlank); setModal(false); load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const handleSaveToll = async () => {
    if (!tForm.location || !tForm.amount) { show('Location and amount required', 'error'); return }
    setSaving(true)
    try {
      await addToll({ ...tForm, trip_id: Number(tForm.trip_id)||null, amount: Number(tForm.amount) })
      show('Toll logged!', 'success'); setTForm(tBlank); setModal(false); load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const totalDiesel = dieselLogs.reduce((s,d) => s + (d.amount||0), 0)
  const totalToll   = tollLogs.reduce((s,t) => s + (t.amount||0), 0)
  const totalLitres = dieselLogs.reduce((s,d) => s + (d.litres||0), 0)

  return (
    <>
      <Header title="Diesel & Toll" onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Log</button>}
      />
      <div className="page">
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Diesel Cost', value: formatCurrency(totalDiesel), color: '#f59e0b' },
            { label: 'Total Litres', value: `${totalLitres.toFixed(1)} L`, color: '#10b981' },
            { label: 'Toll Cost', value: formatCurrency(totalToll), color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mileage */}
        {vehicles.filter(v => mileage[v.id]).length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Vehicle Mileage</div>
            {vehicles.filter(v => mileage[v.id]).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{v.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{mileage[v.id]} km/L</span>
              </div>
            ))}
          </div>
        )}

        <div className="tabs">
          {[{ id: 'diesel', label: '⛽ Diesel' }, { id: 'toll', label: '🛣️ Toll' }].map(t => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {!loading && tab === 'diesel' && (() => {
          if (dieselLogs.length === 0) return <div className="empty"><div className="empty-icon">⛽</div><div className="empty-title">No diesel logs</div></div>
          // Build sorted-by-km map per vehicle for per-entry mileage
          const vehLogs = {}
          for (const d of dieselLogs) {
            if (!vehLogs[d.vehicle_id]) vehLogs[d.vehicle_id] = []
            vehLogs[d.vehicle_id].push(d)
          }
          for (const vid in vehLogs) vehLogs[vid].sort((a, b) => (a.km_reading||0) - (b.km_reading||0))

          return dieselLogs.slice().reverse().map(d => {
            const v = vehicles.find(veh => veh.id === d.vehicle_id)
            // Find previous fill-up for this vehicle (lower km_reading)
            let kmpl = null
            if (d.km_reading > 0 && d.litres > 0) {
              const sorted = vehLogs[d.vehicle_id] || []
              const idx = sorted.findIndex(x => x.id === d.id)
              if (idx > 0) {
                const prev = sorted[idx - 1]
                const kmDiff = d.km_reading - (prev.km_reading || 0)
                if (kmDiff > 0) kmpl = (kmDiff / d.litres).toFixed(1)
              }
            }
            return (
              <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #f59e0b', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{v?.name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{d.litres}L @ ₹{d.rate}/L · {formatDate(d.date)}</div>
                  {d.km_reading > 0 && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>KM: {d.km_reading?.toLocaleString()}{kmpl ? <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 8 }}>{kmpl} km/L</span> : null}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#f59e0b' }}>{formatCurrency(d.amount)}</div>
                  <button style={{ marginTop: 4, width: 26, height: 26, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={async () => { await remove(d.id); load() }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            )
          })
        })()}

        {!loading && tab === 'toll' && (
          tollLogs.length === 0 ? <div className="empty"><div className="empty-icon">🛣️</div><div className="empty-title">No toll logs</div></div>
          : tollLogs.slice().reverse().map(t => (
            <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #3b82f6', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{t.location}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(t.date)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#3b82f6' }}>{formatCurrency(t.amount)}</div>
                <button style={{ marginTop: 4, width: 26, height: 26, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={async () => { await removeToll(t.id); load() }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Unified Add Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Log Entry"
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={tab === 'diesel' ? handleSaveDiesel : handleSaveToll} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Save'}
            </button>
          </>
        }
      >
        <div className="tabs" style={{ marginBottom: 16 }}>
          {[{ id: 'diesel', label: '⛽ Diesel' }, { id: 'toll', label: '🛣️ Toll' }].map(t => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'diesel' && (
          <>
            <div className="form-group">
              <label className="form-label">Vehicle</label>
              <select className="form-input" value={dForm.vehicle_id} onChange={e => df('vehicle_id', e.target.value)}>
                <option value="">— Select —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group"><label className="form-label">Litres</label><input className="form-input" type="number" value={dForm.litres} onChange={e => df('litres', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Rate ₹/L</label><input className="form-input" type="number" value={dForm.rate} onChange={e => df('rate', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={dForm.amount} onChange={e => df('amount', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">KM Reading</label><input className="form-input" type="number" value={dForm.km_reading} onChange={e => df('km_reading', e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={dForm.date} onChange={e => df('date', e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <select className="form-input" value={dForm.vendor_id} onChange={e => df('vendor_id', e.target.value)}>
                <option value="">— Select —</option>
                {vendors.filter(v => v.type === 'Fuel Station').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </>
        )}

        {tab === 'toll' && (
          <>
            <div className="form-group">
              <label className="form-label">Trip (Optional)</label>
              <select className="form-input" value={tForm.trip_id} onChange={e => setTForm(p => ({ ...p, trip_id: e.target.value }))}>
                <option value="">— Select —</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.from_loc} → {t.to_loc}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Toll Location</label><input className="form-input" value={tForm.location} onChange={e => setTForm(p => ({ ...p, location: e.target.value }))} placeholder="Toll plaza name" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={tForm.amount} onChange={e => setTForm(p => ({ ...p, amount: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={tForm.date} onChange={e => setTForm(p => ({ ...p, date: e.target.value }))} /></div>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
