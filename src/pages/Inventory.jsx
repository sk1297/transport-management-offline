import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getAll, add, update, remove, addStock, reduceStock, getLowStock, getMovements } from '../services/inventoryService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const CATEGORIES = ['Lubricants', 'Filters', 'Tyres', 'Electricals', 'Fluids', 'Tools', 'Spare Parts', 'Other']

function ItemForm({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { item_name: '', category: 'Spare Parts', qty: '', unit: 'Pcs', rate: '', reorder_level: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing } : blank) }, [open, editing])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.item_name.trim()) { show('Name required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, qty: Number(form.qty)||0, rate: Number(form.rate)||0, reorder_level: Number(form.reorder_level)||0 }
      if (editing) { await update(editing.id, payload); show('Item updated!', 'success') }
      else         { await add(payload); show('Item added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit') : t('Add Item')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>
      }
    >
      <div className="form-group"><label className="form-label">{t('Name')}</label><input className="form-input" value={form.item_name||''} onChange={e => f('item_name', e.target.value)} placeholder="Item name" /></div>
      <div className="form-group">
        <label className="form-label">{t('Category')}</label>
        <select className="form-input" value={form.category} onChange={e => f('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">{t('Quantity')}</label><input className="form-input" type="number" value={form.qty||''} onChange={e => f('qty', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">{t('Unit')}</label><input className="form-input" value={form.unit||''} onChange={e => f('unit', e.target.value)} placeholder="Pcs/L/kg" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Rate ₹</label><input className="form-input" type="number" value={form.rate||''} onChange={e => f('rate', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">{t('Min Stock')}</label><input className="form-input" type="number" value={form.reorder_level||''} onChange={e => f('reorder_level', e.target.value)} /></div>
      </div>
    </Modal>
  )
}

function StockModal({ open, onClose, onSaved, item, type }) {
  const { show } = useToast()
  const { t } = useT()
  const [qty, setQty]     = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setQty(''); setNotes('') } }, [open])

  const handle = async () => {
    if (!qty) { show('Qty required', 'error'); return }
    setSaving(true)
    try {
      if (type === 'in') await addStock(item.id, Number(qty), notes)
      else               await reduceStock(item.id, Number(qty), notes)
      show(`Stock ${type === 'in' ? 'added' : 'reduced'}!`, 'success'); onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={type === 'in' ? t('Stock') : t('Stock')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className={`btn ${type === 'in' ? 'btn-primary' : 'btn-danger'} flex-1`} onClick={handle} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : type === 'in' ? 'Add Stock' : 'Reduce'}
          </button>
        </>
      }
    >
      <div className="form-group"><label className="form-label">Quantity ({item?.unit})</label><input className="form-input" type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" autoFocus /></div>
      <div className="form-group"><label className="form-label">Notes (Optional)</label><input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Current: {item?.qty || 0} {item?.unit}</div>
    </Modal>
  )
}

export default function Inventory() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [items,     setItems]     = useState([])
  const [lowItems,  setLowItems]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [stockModal, setStockModal] = useState(null)
  const [tab,       setTab]       = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try { const [i, l] = await Promise.all([getAll(), getLowStock()]); setItems(i); setLowItems(l) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}"?`)) return
    try { await remove(item.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const list = tab === 'low' ? lowItems : items
  const filtered = list.filter(i => !search || i.item_name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()))

  const stockStatus = (i) => {
    if ((i.qty||0) === 0) return { label: 'Out', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
    if ((i.qty||0) <= (i.reorder_level||0)) return { label: 'Low', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
    return { label: 'OK', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
  }

  return (
    <>
      <Header title={t('Inventory')} onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModal(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {t('Add Item')}
        </button>}
      />
      <div className="page">
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: t('Inventory'), value: items.length, color: '#3b82f6' },
              { label: t('Low Stock'),   value: lowItems.length, color: '#f59e0b' },
              { label: 'Value',       value: formatCurrency(items.reduce((s,i) => s + (i.qty||0)*(i.rate||0),0)), color: '#10b981' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: s.label === 'Value' ? 11 : 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tabs">
          <button className={`tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>{t('Inventory')}</button>
          <button className={`tab${tab === 'low' ? ' active' : ''}`} onClick={() => setTab('low')}>
            {t('Low Stock')} {lowItems.length > 0 && <span style={{ background: '#f59e0b', color: '#000', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 800, marginLeft: 4 }}>{lowItems.length}</span>}
          </button>
        </div>

        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="search-input" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && filtered.length === 0 && <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">No items</div></div>}

        {!loading && filtered.map(item => {
          const st = stockStatus(item)
          return (
            <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${st.color}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${st.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.color, fontWeight: 800, fontSize: 10, flexShrink: 0, textAlign: 'center' }}>
                  {item.category?.substring(0,3).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{item.item_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{item.category} · ₹{item.rate}/{item.unit}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: st.color }}>{item.qty} {item.unit}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: st.bg, color: st.color, textTransform: 'uppercase' }}>{st.label}</span>
                    {item.reorder_level > 0 && <span style={{ fontSize: 10, color: 'var(--text2)' }}>Min: {item.reorder_level}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className="btn-icon" style={{ width: 28, height: 28, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none' }} title="Add Stock" onClick={() => setStockModal({ item, type: 'in' })}>+</button>
                  <button className="btn-icon" style={{ width: 28, height: 28, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }} title="Reduce Stock" onClick={() => setStockModal({ item, type: 'out' })}>-</button>
                  <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditing(item); setModal(true) }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: 'none' }} onClick={() => handleDelete(item)}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ItemForm open={modal} onClose={() => setModal(false)} onSaved={load} editing={editing} />
      {stockModal && <StockModal open={!!stockModal} onClose={() => setStockModal(null)} onSaved={load} item={stockModal?.item} type={stockModal?.type} />}
    </>
  )
}
