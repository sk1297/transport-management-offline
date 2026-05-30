import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getAll, add, update, remove } from '../services/routeService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

function RouteForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { from_loc: '', to_loc: '', distance_km: '', toll_approx: '', diesel_approx: '', notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing } : blank) }, [open, editing])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const estimateDiesel = () => {
    if (form.distance_km) {
      const km = Number(form.distance_km)
      const est = Math.round(km / 5 * 100) // 5 km/L average, ₹100/L
      f('diesel_approx', String(est))
    }
  }

  const handleSave = async () => {
    if (!form.from_loc || !form.to_loc) { show('From & To required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, distance_km: Number(form.distance_km)||0, toll_approx: Number(form.toll_approx)||0, diesel_approx: Number(form.diesel_approx)||0 }
      if (editing) { await update(editing.id, payload); show('Route updated!', 'success') }
      else         { await add(payload); show('Route saved!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit') : t('Add Route')}
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
        <div className="form-group"><label className="form-label">{t('From')} *</label><input className="form-input" value={form.from_loc} onChange={e => f('from_loc', e.target.value)} placeholder="Origin city" /></div>
        <div className="form-group"><label className="form-label">{t('To')} *</label><input className="form-input" value={form.to_loc} onChange={e => f('to_loc', e.target.value)} placeholder="Destination city" /></div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('Distance (km)')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" type="number" value={form.distance_km} onChange={e => f('distance_km', e.target.value)} style={{ flex: 1 }} />
          <button type="button" onClick={estimateDiesel} style={{ padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Est. Diesel</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Approx. Toll ₹</label><input className="form-input" type="number" value={form.toll_approx} onChange={e => f('toll_approx', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Approx. Diesel ₹</label><input className="form-input" type="number" value={form.diesel_approx} onChange={e => f('diesel_approx', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Via highway, ghat road, etc." /></div>
    </Modal>
  )
}

export default function Routes() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setRoutes(await getAll()) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (r) => {
    if (!window.confirm('Delete this route?')) return
    try { await remove(r.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const filtered = search
    ? routes.filter(r => `${r.from_loc} ${r.to_loc} ${r.notes||''}`.toLowerCase().includes(search.toLowerCase()))
    : routes

  return (
    <>
      <Header title={t('Routes')} onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModal(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {t('Add Route')}
        </button>}
      />
      <div className="page">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{routes.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase' }}>Saved Routes</div>
        </div>

        <input className="form-input" style={{ marginBottom: 12 }} placeholder="Search routes..." value={search} onChange={e => setSearch(e.target.value)} />

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && filtered.length === 0 && <div className="empty"><div className="empty-icon">🗺️</div><div className="empty-title">No routes saved</div><div className="empty-desc">Save common routes with distance and cost estimates</div></div>}

        {!loading && filtered.map(r => {
          const totalCost = (r.toll_approx || 0) + (r.diesel_approx || 0)
          return (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #3b82f6', borderRadius: 12, padding: '14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.from_loc}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.to_loc}</span>
                  </div>
                  {r.distance_km > 0 && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{r.distance_km} km</div>}
                  {r.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{r.notes}</div>}
                </div>
                {totalCost > 0 && <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{formatCurrency(totalCost)}</div>
                  <div style={{ fontSize: 9, color: 'var(--text2)' }}>Est. trip cost</div>
                </div>}
              </div>
              {(r.toll_approx > 0 || r.diesel_approx > 0) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {r.toll_approx > 0 && <span style={{ fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 6 }}>Toll: {formatCurrency(r.toll_approx)}</span>}
                  {r.diesel_approx > 0 && <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6 }}>Diesel: {formatCurrency(r.diesel_approx)}</span>}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditing(r); setModal(true) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(r)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <RouteForm open={modal} onClose={() => setModal(false)} onSaved={load} editing={editing} />
    </>
  )
}
