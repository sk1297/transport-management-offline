import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, update, remove, getLedger, addLedgerEntry, getCustomerSummary } from '../services/customerService.js'
import { getByCustomer as getFollowUps, add as addFollowUp, update as updateFollowUp, STATUSES as FOLLOW_UP_STATUSES } from '../services/followUpService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const CUSTOMER_TYPES = ['Regular', 'Occasional', 'Corporate', 'Government']

function CustomerForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const blank = { name: '', phone: '', gstin: '', city: '', address: '', type: 'Regular', credit_limit: '', email: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(editing ? { ...blank, ...editing } : blank)
  }, [open, editing])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name) { show('Customer name required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, credit_limit: Number(form.credit_limit) || 0 }
      if (editing) { await update(editing.id, payload); show('Customer updated!', 'success') }
      else         { await add(payload); show('Customer added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : editing ? 'Update' : 'Add Customer'}
          </button>
        </>
      }
    >
      <div className="form-group"><label className="form-label">Customer / Company Name *</label><input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. ABC Traders" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" type="tel" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" value={form.gstin} onChange={e => f('gstin', e.target.value.toUpperCase())} placeholder="15-digit GSTIN" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => f('city', e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input" value={form.type} onChange={e => f('type', e.target.value)}>
            {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => f('address', e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Credit Limit ₹</label><input className="form-input" type="number" value={form.credit_limit} onChange={e => f('credit_limit', e.target.value)} placeholder="0 = unlimited" /></div>
    </Modal>
  )
}

function LedgerModal({ open, onClose, onSaved, customerId }) {
  const { show } = useToast()
  const blank = { type: 'debit', amount: '', date: todayStr(), notes: '', ref_type: 'Manual' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(blank) }, [open])

  const handleSave = async () => {
    if (!form.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await addLedgerEntry(customerId, { ...form, amount: Number(form.amount) })
      show('Entry added!', 'success'); onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Ledger Entry"
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>Save</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ v: 'debit', label: 'Invoice / Billed', color: '#ef4444' }, { v: 'credit', label: 'Payment Received', color: '#10b981' }].map(opt => (
            <button key={opt.v} type="button" onClick={() => setForm(p => ({ ...p, type: opt.v }))}
              style={{ padding: '10px 8px', borderRadius: 10, border: `2px solid ${form.type === opt.v ? opt.color : 'var(--border)'}`, background: form.type === opt.v ? `${opt.color}18` : 'var(--surface2)', color: form.type === opt.v ? opt.color : 'var(--text2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Invoice no., LR no., etc." /></div>
    </Modal>
  )
}

const FOLLOW_STATUS_COLORS = { Pending:'#f59e0b', Promised:'#3b82f6', Disputed:'#ef4444', 'Part-Paid':'#8b5cf6', Resolved:'#10b981' }

function FollowUpModal({ open, onClose, onSaved, customerId, editing }) {
  const { show } = useToast()
  const blank = { date: todayStr(), next_date: '', status: 'Pending', notes: '', amount_promised: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing } : blank) }, [open, editing])
  const f = (k,v) => setForm(p => ({...p,[k]:v}))
  const handleSave = async () => {
    if (!form.notes) { show('Notes required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, customer_id: customerId, amount_promised: Number(form.amount_promised)||0 }
      if (editing) await updateFollowUp(editing.id, payload)
      else await addFollowUp(payload)
      show('Saved!', 'success'); onSaved(); onClose()
    } catch(err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }
  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? 'Edit Follow-Up' : 'Add Follow-Up'}
      footer={<><button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button><button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? <span className="spinner spinner-sm"/> : 'Save'}</button></>}
    >
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e=>f('date',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Next Follow-Up</label><input className="form-input" type="date" value={form.next_date} onChange={e=>f('next_date',e.target.value)}/></div>
      </div>
      <div className="form-group">
        <label className="form-label">Status</label>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {FOLLOW_UP_STATUSES.map(s => (
            <button key={s} type="button" onClick={()=>f('status',s)}
              style={{padding:'6px 12px',borderRadius:8,border:`2px solid ${form.status===s?FOLLOW_STATUS_COLORS[s]:'var(--border)'}`,background:form.status===s?`${FOLLOW_STATUS_COLORS[s]}18`:'var(--surface2)',color:form.status===s?FOLLOW_STATUS_COLORS[s]:'var(--text2)',fontWeight:700,fontSize:11,cursor:'pointer'}}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Amount Promised ₹</label><input className="form-input" type="number" value={form.amount_promised} onChange={e=>f('amount_promised',e.target.value)} placeholder="0"/></div>
      <div className="form-group"><label className="form-label">Notes *</label><input className="form-input" value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Call notes, what was discussed..."/></div>
    </Modal>
  )
}

function CustomerDetail({ customer, onBack, onRefresh }) {
  const { show } = useToast()
  const [ledger, setLedger] = useState([])
  const [summary, setSummary] = useState({ totalBilled: 0, totalPaid: 0, outstanding: 0 })
  const [ledgerModal, setLedgerModal] = useState(false)
  const [followUps, setFollowUps] = useState([])
  const [followUpModal, setFollowUpModal] = useState(false)
  const [editingFU, setEditingFU] = useState(null)
  const [detailTab, setDetailTab] = useState('ledger')

  const load = useCallback(async () => {
    const [entries, sum, fups] = await Promise.all([getLedger(customer.id), getCustomerSummary(customer.id), getFollowUps(customer.id)])
    setLedger(entries.slice().reverse())
    setSummary(sum)
    setFollowUps(fups)
  }, [customer.id])

  useEffect(() => { load() }, [load])

  const today = todayStr()
  const pendingFollowUps = followUps.filter(f => f.next_date && f.next_date <= today && f.status !== 'Resolved').length

  return (
    <>
      <Header title={customer.name} onBack={onBack}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => detailTab === 'ledger' ? setLedgerModal(true) : (setEditingFU(null), setFollowUpModal(true))}>
            + {detailTab === 'ledger' ? 'Entry' : 'Follow-Up'}
          </button>
        }
      />
      <div className="page">
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Total Billed', value: formatCurrency(summary.totalBilled), color: '#ef4444' },
            { label: 'Received', value: formatCurrency(summary.totalPaid), color: '#10b981' },
            { label: 'Outstanding', value: formatCurrency(summary.outstanding), color: summary.outstanding > 0 ? '#f59e0b' : '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[{id:'ledger',label:'Ledger'},{id:'info',label:'Info'},{id:'followups',label:'Follow-Ups' + (pendingFollowUps>0 ? ` (${pendingFollowUps})` : '')}].map(t => (
            <button key={t.id} className={`filter-chip${detailTab===t.id?' active':''}`} onClick={()=>setDetailTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Customer info */}
        {detailTab === 'info' && (
          <div className="card" style={{ marginBottom: 16 }}>
            {[
              ['Phone', customer.phone], ['Email', customer.email],
              ['GSTIN', customer.gstin], ['City', customer.city],
              ['Type', customer.type], ['Credit Limit', customer.credit_limit ? formatCurrency(customer.credit_limit) : 'Unlimited'],
            ].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ledger */}
        {detailTab === 'ledger' && (
          ledger.length === 0 ? (
            <div className="empty"><div className="empty-icon">📒</div><div className="empty-title">No transactions</div></div>
          ) : ledger.map((entry) => {
            const isDebit = entry.type === 'debit'
            const color = isDebit ? '#ef4444' : '#10b981'
            return (
              <div key={entry.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(entry.date)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{entry.notes || (isDebit ? 'Invoice' : 'Payment')}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: '2px 6px', borderRadius: 4 }}>{isDebit ? 'BILLED' : 'PAID'}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color }}>{isDebit ? '-' : '+'}{formatCurrency(entry.amount)}</div>
              </div>
            )
          })
        )}

        {/* Follow-Ups */}
        {detailTab === 'followups' && (
          followUps.length === 0 ? (
            <div className="empty"><div className="empty-icon">📞</div><div className="empty-title">No follow-ups</div><div className="empty-desc">Add call/visit notes</div></div>
          ) : followUps.map(fu => {
            const color = FOLLOW_STATUS_COLORS[fu.status] || '#94a3b8'
            const overdue = fu.next_date && fu.next_date <= today && fu.status !== 'Resolved'
            return (
              <div key={fu.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}
                onClick={() => { setEditingFU(fu); setFollowUpModal(true) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 6 }}>{fu.status}</span>
                  <span style={{ fontSize: 10, color: 'var(--text2)' }}>{formatDate(fu.date)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{fu.notes}</div>
                {fu.amount_promised > 0 && <div style={{ fontSize: 11, color: '#10b981' }}>Promise: {formatCurrency(fu.amount_promised)}</div>}
                {fu.next_date && (
                  <div style={{ fontSize: 11, color: overdue ? '#ef4444' : 'var(--text2)', marginTop: 2, fontWeight: overdue ? 700 : 400 }}>
                    {overdue ? '⚠ ' : ''}Next: {formatDate(fu.next_date)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      <LedgerModal open={ledgerModal} onClose={() => setLedgerModal(false)} onSaved={load} customerId={customer.id} />
      <FollowUpModal open={followUpModal} onClose={() => setFollowUpModal(false)} onSaved={load} customerId={customer.id} editing={editingFU} />
    </>
  )
}

export default function Customers() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [customers, setCustomers] = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAll()
      setCustomers(list)
      const sums = {}
      await Promise.all(list.map(async c => { sums[c.id] = await getCustomerSummary(c.id) }))
      setSummaries(sums)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (detail) return <CustomerDetail customer={detail} onBack={() => { setDetail(null); load() }} onRefresh={load} />

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.name}?`)) return
    try { await remove(c.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const filtered = search
    ? customers.filter(c => `${c.name} ${c.phone} ${c.city} ${c.gstin}`.toLowerCase().includes(search.toLowerCase()))
    : customers

  const totalOutstanding = Object.values(summaries).reduce((s, v) => s + (v?.outstanding || 0), 0)

  return (
    <>
      <Header title="Customers" onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModal(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
        </button>}
      />
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{customers.length}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>Total Customers</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(totalOutstanding)}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>Total Outstanding</div>
          </div>
        </div>

        <input className="form-input" style={{ marginBottom: 12 }} placeholder="Search by name, phone, city..." value={search} onChange={e => setSearch(e.target.value)} />

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && filtered.length === 0 && <div className="empty"><div className="empty-icon">👥</div><div className="empty-title">No customers yet</div><div className="empty-desc">Add your first customer</div></div>}

        {!loading && filtered.map(c => {
          const sum = summaries[c.id] || {}
          const outstanding = sum.outstanding || 0
          const typeColor = { Regular: '#3b82f6', Corporate: '#8b5cf6', Government: '#10b981', Occasional: '#94a3b8' }[c.type] || '#94a3b8'
          return (
            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${outstanding > 0 ? '#f59e0b' : '#10b981'}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer' }}
              onClick={() => setDetail(c)}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.phone}{c.city ? ` · ${c.city}` : ''}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${typeColor}18`, color: typeColor, marginTop: 4, display: 'inline-block' }}>{c.type}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {outstanding > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(outstanding)}<div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 500 }}>outstanding</div></div>}
                  {outstanding === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: 6 }}>Clear</span>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditing(c); setModal(true) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(c)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <CustomerForm open={modal} onClose={() => setModal(false)} onSaved={load} editing={editing} />
    </>
  )
}
