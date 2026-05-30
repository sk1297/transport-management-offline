import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getAll, add, update, remove, getCommissions, addCommission, updateCommission, getAgentSummary } from '../services/agentService.js'
import { getAll as getTrips } from '../services/tripService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

function AgentForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { name: '', phone: '', address: '', commission_pct: '2', notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing } : blank) }, [open, editing])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name) { show('Agent name required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, commission_pct: Number(form.commission_pct) || 0 }
      if (editing) { await update(editing.id, payload); show('Agent updated!', 'success') }
      else         { await add(payload); show('Agent added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit') : t('Add Agent')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>
      }
    >
      <div className="form-group"><label className="form-label">{t('Name')} *</label><input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">{t('Phone')}</label><input className="form-input" type="tel" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">{t('Commission %')}</label><input className="form-input" type="number" step="0.5" value={form.commission_pct} onChange={e => f('commission_pct', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => f('address', e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
    </Modal>
  )
}

function CommissionModal({ open, onClose, onSaved, agentId, agent }) {
  const { show } = useToast()
  const { t } = useT()
  const [trips, setTrips] = useState([])
  const blank = { trip_id: '', lr_no: '', freight_amount: '', date: todayStr(), notes: '', paid: false }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(blank)
      getTrips().then(setTrips)
    }
  }, [open])

  const commAmt = () => {
    const pct = agent?.commission_pct || 0
    const freight = Number(form.freight_amount) || 0
    return ((freight * pct) / 100).toFixed(2)
  }

  const handleSave = async () => {
    if (!form.freight_amount) { show('Freight amount required', 'error'); return }
    setSaving(true)
    try {
      const amount = Number(commAmt())
      await addCommission({ ...form, agent_id: agentId, trip_id: Number(form.trip_id)||null, freight_amount: Number(form.freight_amount), amount })
      show('Commission logged!', 'success'); onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={t('Commission')}
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
        <label className="form-label">Trip (Optional)</label>
        <select className="form-input" value={form.trip_id} onChange={e => setForm(p => ({ ...p, trip_id: e.target.value }))}>
          <option value="">— Select —</option>
          {trips.map(t => <option key={t.id} value={t.id}>{t.from_loc} → {t.to_loc} ({t.start_date})</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">LR No.</label><input className="form-input" value={form.lr_no} onChange={e => setForm(p => ({ ...p, lr_no: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Freight Amount ₹</label>
        <input className="form-input" type="number" value={form.freight_amount} onChange={e => setForm(p => ({ ...p, freight_amount: e.target.value }))} />
        {form.freight_amount > 0 && (
          <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: '#10b981', fontWeight: 700 }}>
            Commission @ {agent?.commission_pct}% = ₹{commAmt()}
          </div>
        )}
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
    </Modal>
  )
}

function AgentDetail({ agent, onBack, onRefresh }) {
  const { show } = useToast()
  const { t } = useT()
  const [commissions, setCommissions] = useState([])
  const [summary, setSummary] = useState({ totalEarned: 0, totalPaid: 0, pending: 0 })
  const [commModal, setCommModal] = useState(false)

  const load = useCallback(async () => {
    const [comms, sum] = await Promise.all([getCommissions(agent.id), getAgentSummary(agent.id)])
    setCommissions(comms.slice().reverse())
    setSummary(sum)
  }, [agent.id])

  useEffect(() => { load() }, [load])

  const togglePaid = async (c) => {
    try { await updateCommission(c.id, { ...c, paid: !c.paid }); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  return (
    <>
      <Header title={agent.name} onBack={onBack}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => setCommModal(true)}>+ Log</button>}
      />
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total Earned', value: formatCurrency(summary.totalEarned), color: '#3b82f6' },
            { label: 'Paid', value: formatCurrency(summary.totalPaid), color: '#10b981' },
            { label: 'Pending', value: formatCurrency(summary.pending), color: summary.pending > 0 ? '#f59e0b' : '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Phone</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{agent.phone || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Commission Rate</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{agent.commission_pct}%</span>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Commission History</div>

        {commissions.length === 0
          ? <div className="empty"><div className="empty-icon">💼</div><div className="empty-title">No commissions yet</div></div>
          : commissions.map(c => (
            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${c.paid ? '#10b981' : '#f59e0b'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(c.date)}{c.lr_no ? ` · ${c.lr_no}` : ''}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                    Freight: {formatCurrency(c.freight_amount)}
                  </div>
                  {c.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{c.notes}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: c.paid ? '#10b981' : '#f59e0b' }}>{formatCurrency(c.amount)}</div>
                  <button onClick={() => togglePaid(c)} style={{ marginTop: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: 'none', background: c.paid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: c.paid ? '#10b981' : '#f59e0b', cursor: 'pointer' }}>
                    {c.paid ? '✓ Paid' : 'Mark Paid'}
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
      <CommissionModal open={commModal} onClose={() => setCommModal(false)} onSaved={load} agentId={agent.id} agent={agent} />
    </>
  )
}

export default function Agents() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [agents, setAgents] = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAll()
      setAgents(list)
      const sums = {}
      await Promise.all(list.map(async a => { sums[a.id] = await getAgentSummary(a.id) }))
      setSummaries(sums)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (detail) return <AgentDetail agent={detail} onBack={() => { setDetail(null); load() }} onRefresh={load} />

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete ${a.name}?`)) return
    try { await remove(a.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const totalPending = Object.values(summaries).reduce((s, v) => s + (v?.pending || 0), 0)

  return (
    <>
      <Header title={t('Agents')} onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModal(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {t('Add Agent')}
        </button>}
      />
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{agents.length}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>Total Agents</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(totalPending)}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>Commission Due</div>
          </div>
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && agents.length === 0 && <div className="empty"><div className="empty-icon">🤝</div><div className="empty-title">No agents yet</div><div className="empty-desc">Add brokers & commission agents</div></div>}

        {!loading && agents.map(a => {
          const sum = summaries[a.id] || {}
          return (
            <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sum.pending > 0 ? '#f59e0b' : '#10b981'}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer' }}
              onClick={() => setDetail(a)}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{a.phone || ''} · {a.commission_pct}% commission</div>
                </div>
                {sum.pending > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(sum.pending)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text2)' }}>pending</div>
                  </div>
                )}
              </div>
              {sum.count > 0 && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{sum.count} transactions · Earned: {formatCurrency(sum.totalEarned)}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditing(a); setModal(true) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(a)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <AgentForm open={modal} onClose={() => setModal(false)} onSaved={load} editing={editing} />
    </>
  )
}
