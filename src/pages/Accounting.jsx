import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, remove } from '../services/accountingService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const CATEGORIES = ['Cash', 'Bank', 'Party', 'Income', 'Expense', 'Capital']
const TYPES = ['credit', 'debit']

export default function Accounting() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal,   setModal]     = useState(false)
  const [tab,     setTab]       = useState('all')
  const [dateFilter, setDate]   = useState(todayStr())
  const blank = { date: todayStr(), type: 'credit', category: 'Income', debit: '', credit: '', narration: '', ref_type: '', ref_id: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEntries(await getAll()) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.narration) { show('Narration required', 'error'); return }
    const amount = Number(form.type === 'credit' ? form.credit : form.debit) || 0
    if (!amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await add({ ...form, debit: form.type === 'debit' ? amount : 0, credit: form.type === 'credit' ? amount : 0 })
      show('Entry added!', 'success'); setForm(blank); setModal(false); load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (e) => {
    if (!window.confirm('Delete entry?')) return
    try { await remove(e.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const totalCredit = entries.reduce((s,e) => s + (e.credit||0), 0)
  const totalDebit  = entries.reduce((s,e) => s + (e.debit||0), 0)

  const filtered = tab === 'daybook'
    ? entries.filter(e => e.date === dateFilter)
    : entries

  return (
    <>
      <Header title="Accounting" onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Entry</button>}
      />
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total Income', value: formatCurrency(totalCredit), color: '#10b981' },
            { label: 'Total Expense', value: formatCurrency(totalDebit), color: '#ef4444' },
            { label: 'Balance', value: formatCurrency(totalCredit - totalDebit), color: totalCredit >= totalDebit ? '#10b981' : '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="tabs">
          <button className={`tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>All Entries</button>
          <button className={`tab${tab === 'daybook' ? ' active' : ''}`} onClick={() => setTab('daybook')}>Daybook</button>
        </div>

        {tab === 'daybook' && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <input className="form-input" type="date" value={dateFilter} onChange={e => setDate(e.target.value)} />
          </div>
        )}

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && filtered.length === 0 && <div className="empty"><div className="empty-icon">📒</div><div className="empty-title">No entries</div></div>}

        {!loading && filtered.map(e => (
          <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${e.type === 'credit' ? '#10b981' : '#ef4444'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{e.narration || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 8 }}>
                <span>{formatDate(e.date)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--surface2)', textTransform: 'uppercase' }}>{e.category}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {e.credit > 0 && <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981' }}>+{formatCurrency(e.credit)}</div>}
              {e.debit > 0  && <div style={{ fontWeight: 800, fontSize: 14, color: '#ef4444' }}>-{formatCurrency(e.debit)}</div>}
              <button style={{ marginTop: 4, width: 24, height: 24, borderRadius: 5, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }} onClick={() => handleDelete(e)}>×</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Ledger Entry"
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Add Entry'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="credit">Credit (Income)</option>
              <option value="debit">Debit (Expense)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Amount ₹</label>
            <input className="form-input" type="number" value={form.type === 'credit' ? (form.credit||'') : (form.debit||'')}
              onChange={e => setForm(p => p.type === 'credit' ? { ...p, credit: e.target.value, debit: 0 } : { ...p, debit: e.target.value, credit: 0 })}
              placeholder="0" />
          </div>
          <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label className="form-label">Narration</label><input className="form-input" value={form.narration||''} onChange={e => setForm(p => ({ ...p, narration: e.target.value }))} placeholder="Description of entry" /></div>
      </Modal>
    </>
  )
}
