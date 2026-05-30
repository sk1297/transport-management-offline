import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, update, remove, getLedger, addLedgerEntry, getOutstanding } from '../services/vendorService.js'
import { getUnpaid, add as addBill, markPaid, remove as removeBill } from '../services/vendorBillService.js'
import { validateGSTIN, lookupIFSC } from '../services/apiUtils.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg, getInitials } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'
import { useT } from '../i18n/index.js'

const VENDOR_TYPES = ['Fuel Station', 'Repair Shop', 'Spare Parts', 'Tyre Shop', 'Transport', 'Other']

function VendorForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { name: '', type: 'Fuel Station', phone: '', gstin: '', address: '', contact_person: '', ifsc_code: '', bank_name: '', bank_branch: '', account_no: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [gstinStatus, setGstinStatus] = useState(null)
  const [ifscResult, setIfscResult] = useState(null)
  const [ifscLoading, setIfscLoading] = useState(false)

  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing } : blank) }, [open, editing])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { show('Name required', 'error'); return }
    setSaving(true)
    try {
      if (editing) { await update(editing.id, form); show('Vendor updated!', 'success') }
      else         { await add(form); show('Vendor added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit Vendor') : t('Add Vendor')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : null}
            {editing ? t('Update') : t('Add Vendor')}
          </button>
        </>
      }
    >
      <div className="form-group"><label className="form-label">{t('Name')}</label><input className="form-input" value={form.name||''} onChange={e => f('name', e.target.value)} placeholder="Business name" /></div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <select className="form-input" value={form.type} onChange={e => f('type', e.target.value)}>
          {VENDOR_TYPES.map(vt => <option key={vt}>{vt}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">{t('Phone')}</label><input className="form-input" type="tel" value={form.phone||''} onChange={e => f('phone', e.target.value)} placeholder="Contact number" /></div>
      <div className="form-group">
        <label className="form-label">{t('GSTIN')} (Optional)</label>
        <input className="form-input" value={form.gstin||''} onChange={e => f('gstin', e.target.value)} placeholder="GST number" />
        <div style={{display:'flex',gap:6,alignItems:'center',marginTop:4}}>
          <button type="button" style={{fontSize:11,padding:'3px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--surface2)',cursor:'pointer',color:'var(--text2)'}}
            onClick={()=>setGstinStatus(validateGSTIN(form.gstin))}>
            Verify
          </button>
          {gstinStatus && <span style={{fontSize:11,fontWeight:700,color:gstinStatus.valid?'#10b981':'#ef4444'}}>{gstinStatus.message}</span>}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" value={form.contact_person||''} onChange={e => f('contact_person', e.target.value)} placeholder="Contact person name" /></div>
      <div className="form-group"><label className="form-label">{t('Address')}</label><input className="form-input" value={form.address||''} onChange={e => f('address', e.target.value)} placeholder="Address" /></div>
      <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:0.5,margin:'12px 0 8px'}}>Bank Details</div>
      <div className="form-group">
        <label className="form-label">{t('IFSC Code')}</label>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <input className="form-input" style={{flex:1}} value={form.ifsc_code||''} onChange={e => f('ifsc_code', e.target.value)} placeholder="e.g. SBIN0001234" />
          <button type="button" disabled={ifscLoading} style={{fontSize:11,padding:'3px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--surface2)',cursor:'pointer',color:'var(--text2)',whiteSpace:'nowrap'}}
            onClick={async()=>{
              setIfscLoading(true)
              try {
                const res = await lookupIFSC(form.ifsc_code)
                setIfscResult(res)
                if (res) { f('bank_name', res.bank); f('bank_branch', res.branch) }
              } finally { setIfscLoading(false) }
            }}>
            {ifscLoading ? '...' : 'Lookup'}
          </button>
        </div>
      </div>
      <div className="form-group"><label className="form-label">{t('Bank Name')}</label><input className="form-input" value={form.bank_name||''} onChange={e => f('bank_name', e.target.value)} placeholder="Auto-filled on lookup" /></div>
      <div className="form-group"><label className="form-label">{t('Bank Branch')}</label><input className="form-input" value={form.bank_branch||''} onChange={e => f('bank_branch', e.target.value)} placeholder="Auto-filled on lookup" /></div>
      <div className="form-group"><label className="form-label">{t('Account No')}</label><input className="form-input" value={form.account_no||''} onChange={e => f('account_no', e.target.value)} placeholder="Bank account number" /></div>
    </Modal>
  )
}

function VendorLedger({ vendor, onBack }) {
  const { show } = useToast()
  const { t } = useT()
  const [entries, setEntries] = useState([])
  const [outstanding, setOutstanding] = useState(0)
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({ type: 'debit', amount: '', date: todayStr(), notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [e, o] = await Promise.all([getLedger(vendor.id), getOutstanding(vendor.id)])
    setEntries(e.sort((a,b) => b.id - a.id)); setOutstanding(o)
  }, [vendor.id])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await addLedgerEntry({ vendor_id: vendor.id, ...form, amount: Number(form.amount)||0 })
      show('Entry added!', 'success'); setAddModal(false); load()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <>
      <Header title={`${vendor.name} — Ledger`} onBack={onBack}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => setAddModal(true)}>+ Entry</button>}
      />
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: t('Debit'),       value: formatCurrency(entries.filter(e => e.type === 'debit').reduce((s,e) => s+(e.amount||0),0)), color: '#ef4444' },
            { label: t('Credit'),      value: formatCurrency(entries.filter(e => e.type === 'credit').reduce((s,e) => s+(e.amount||0),0)), color: '#10b981' },
            { label: 'Outstanding', value: formatCurrency(outstanding), color: outstanding > 0 ? '#f59e0b' : '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="empty"><div className="empty-icon">📒</div><div className="empty-title">No entries</div></div>
        ) : entries.map(e => (
          <div key={e.id} className="card" style={{ borderLeft: `3px solid ${e.type === 'debit' ? '#ef4444' : '#10b981'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{formatDate(e.date)}</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{e.notes || '—'}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: e.type === 'debit' ? '#ef4444' : '#10b981' }}>
                {e.type === 'debit' ? '-' : '+'}{formatCurrency(e.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Ledger Entry"
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setAddModal(false)}>{t('Cancel')}</button>
            <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Add Entry'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="debit">Debit (Amount Due)</option>
            <option value="credit">Credit (Payment Made)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">{t('Amount')} ₹</label><input className="form-input" type="number" value={form.amount||''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">{t('Date')}</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes||''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
      </Modal>
    </>
  )
}

function AddBillModal({ open, onClose, onSaved, vendors }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { vendor_id: '', description: '', amount: '', date: todayStr(), due_date: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setForm(blank) }, [open])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.vendor_id) { show('Select a vendor', 'error'); return }
    if (!form.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await addBill({ ...form, amount: Number(form.amount) || 0, paid: 0 })
      show('Bill added!', 'success'); onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={t('Add Bill')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Add Bill')}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Vendor</label>
        <select className="form-input" value={form.vendor_id} onChange={e => f('vendor_id', e.target.value)}>
          <option value="">— Select Vendor —</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description||''} onChange={e => f('description', e.target.value)} placeholder="Bill description" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">{t('Amount')} ₹</label><input className="form-input" type="number" value={form.amount||''} onChange={e => f('amount', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">{t('Date')}</label><input className="form-input" type="date" value={form.date} onChange={e => f('date', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">{t('Due Date')}</label><input className="form-input" type="date" value={form.due_date||''} onChange={e => f('due_date', e.target.value)} /></div>
    </Modal>
  )
}

export default function Vendors() {
  const navigate   = useNavigate()
  const { show }   = useToast()
  const { t } = useT()
  const [tab, setTab] = useState('vendors')
  const [vendors,  setVendors]   = useState([])
  const [loading,  setLoading]   = useState(true)
  const [search,   setSearch]    = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [viewLedger, setViewLedger] = useState(null)
  const [bills, setBills] = useState([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [addBillOpen, setAddBillOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setVendors(await getAll()) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  const loadBills = useCallback(async () => {
    setBillsLoading(true)
    try {
      const unpaid = await getUnpaid()
      setBills(unpaid.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setBillsLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === 'bills') loadBills() }, [tab, loadBills])

  const handleDelete = async (v) => {
    if (!window.confirm(`Delete "${v.name}"?`)) return
    try { await remove(v.id); show('Vendor deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const handleMarkPaid = async (bill) => {
    try { await markPaid(bill.id); show('Marked as paid!', 'success'); loadBills() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  if (viewLedger) return <VendorLedger vendor={viewLedger} onBack={() => setViewLedger(null)} />

  const filtered = vendors.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.type?.toLowerCase().includes(search.toLowerCase()))
  const typeColor = t => ({ 'Fuel Station': '#f59e0b', 'Repair Shop': '#ef4444', 'Spare Parts': '#8b5cf6', 'Tyre Shop': '#3b82f6', Transport: '#10b981' }[t] || '#94a3b8')

  const today = todayStr()
  const getBillBorderColor = (bill) => {
    if (!bill.due_date) return 'var(--border)'
    if (bill.due_date < today) return '#ef4444'
    const diff = Math.floor((new Date(bill.due_date) - new Date(today)) / 86400000)
    if (diff <= 1) return '#f97316'
    return 'var(--border)'
  }

  const vendorName = (id) => vendors.find(v => String(v.id) === String(id))?.name || 'Unknown'

  return (
    <>
      <Header title={t('Vendors')} onBack={() => navigate('/more')}
        rightAction={
          tab === 'bills'
            ? <button className="btn btn-primary btn-sm" onClick={() => setAddBillOpen(true)}>+ {t('Add Bill')}</button>
            : <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
              </button>
        }
      />
      <div className="page">
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {[{ id: 'vendors', label: t('Vendors') }, { id: 'bills', label: 'Bills Due' }].map(tab2 => (
            <button key={tab2.id} className={`filter-chip${tab === tab2.id ? ' active' : ''}`} onClick={() => setTab(tab2.id)}>{tab2.label}</button>
          ))}
        </div>

        {/* Vendors tab */}
        {tab === 'vendors' && (
          <>
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading && <div className="loading"><span className="spinner" />Loading…</div>}
            {!loading && filtered.length === 0 && <div className="empty"><div className="empty-icon">🏪</div><div className="empty-title">No vendors</div></div>}

            {!loading && filtered.map((v) => {
              const tc = typeColor(v.type)
              return (
                <div key={v.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${tc}`, borderRadius: 12, padding: '14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${tc}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: tc, flexShrink: 0 }}>
                      {getInitials(v.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{v.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${tc}18`, color: tc, textTransform: 'uppercase' }}>{v.type}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{v.phone}{v.contact_person ? ` · ${v.contact_person}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className="btn-icon" style={{ width: 30, height: 30, background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: 'none' }} title="Ledger" onClick={() => setViewLedger(v)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </button>
                      <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => { setEditing(v); setModalOpen(true) }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-icon" style={{ width: 30, height: 30, color: 'var(--red)', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(v)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Bills Due tab */}
        {tab === 'bills' && (
          <>
            {billsLoading && <div className="loading"><span className="spinner" />Loading…</div>}
            {!billsLoading && bills.length === 0 && <div className="empty"><div className="empty-icon">✅</div><div className="empty-title">No unpaid bills</div></div>}
            {!billsLoading && bills.map(bill => {
              const overdue = bill.due_date && bill.due_date < today
              const borderColor = getBillBorderColor(bill)
              return (
                <div key={bill.id} style={{ background: 'var(--surface)', border: `1px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRadius: 12, padding: '14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{vendorName(bill.vendor_id)}</span>
                        {overdue && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(239,68,68,0.15)', color: '#ef4444', textTransform: 'uppercase' }}>{t('Overdue')}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{bill.description || '—'}</div>
                      {bill.due_date && <div style={{ fontSize: 11, color: overdue ? '#ef4444' : 'var(--text2)' }}>Due: {formatDate(bill.due_date)}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#ef4444', marginBottom: 6 }}>{formatCurrency(bill.amount)}</div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleMarkPaid(bill)} style={{ fontSize: 11, padding: '4px 10px' }}>{t('Mark as Paid')}</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>Date: {formatDate(bill.date)}</div>
                </div>
              )
            })}
          </>
        )}
      </div>
      <VendorForm open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editing={editing} />
      <AddBillModal open={addBillOpen} onClose={() => setAddBillOpen(false)} onSaved={loadBills} vendors={vendors} />
    </>
  )
}
