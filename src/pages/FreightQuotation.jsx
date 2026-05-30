import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { Share } from '@capacitor/share'
import { getAll, add, update, remove } from '../services/quotationService.js'
import { getAll as getCustomers } from '../services/customerService.js'
import { getDistanceKm } from '../services/apiUtils.js'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'
import { useToast } from '../context/ToastContext.jsx'

const STATUS_COLORS = {
  Draft: '#94a3b8',
  Sent: '#3b82f6',
  Accepted: '#10b981',
  Rejected: '#ef4444',
}

const RATE_TYPES = [
  { value: 'per_kg', label: 'Per KG' },
  { value: 'per_km', label: 'Per KM' },
  { value: 'flat', label: 'Flat Rate' },
]

const STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected']
const STATUS_FLOW = { Draft: ['Sent'], Sent: ['Accepted', 'Rejected'], Accepted: [], Rejected: ['Draft'] }

function calcTotal(form) {
  const w = parseFloat(form.weight) || 0
  const r = parseFloat(form.rate) || 0
  if (form.rate_type === 'flat') return r
  if (form.rate_type === 'per_kg') return w * r
  if (form.rate_type === 'per_km') {
    const km = parseFloat(form.distance_km) || 0
    return km * r
  }
  return 0
}

function calcGrand(form) {
  return calcTotal(form) + (parseFloat(form.loading_charges) || 0) + (parseFloat(form.unloading_charges) || 0)
}

function printQuotation(q) {
  let settings = {}
  try { settings = JSON.parse(localStorage.getItem('transportSettings') || '{}') } catch { /**/ }
  const company = settings.companyName || 'Transport Company'
  const phone = settings.phone || ''
  const address = settings.address || ''
  const grandTotal = (q.total_amount || 0) + (q.loading_charges || 0) + (q.unloading_charges || 0)

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Quotation QT-${q.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
    body { padding: 24px; font-size: 12px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 22px; font-weight: bold; color: #1e3a5f; }
    .company-sub { font-size: 11px; color: #555; margin-top: 4px; }
    .qt-title { font-size: 15px; font-weight: bold; margin-top: 10px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .meta-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
    .meta-label { font-size: 9px; text-transform: uppercase; color: #888; margin-bottom: 3px; }
    .meta-value { font-size: 13px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #1e3a5f; color: #fff; padding: 8px 10px; font-size: 11px; text-align: left; }
    td { border-bottom: 1px solid #eee; padding: 8px 10px; }
    .total-row { font-weight: bold; background: #f0f9ff; }
    .grand-row { font-weight: bold; background: #dbeafe; font-size: 14px; }
    .validity { margin-top: 14px; font-size: 11px; color: #555; }
    .terms { margin-top: 10px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: bold; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company}</div>
    <div class="company-sub">${[phone, address].filter(Boolean).join(' | ')}</div>
    <div class="qt-title">FREIGHT QUOTATION — QT-${q.id}</div>
  </div>
  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">Customer</div>
      <div class="meta-value">${q.customer_name || '—'}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Date</div>
      <div class="meta-value">${q.date || '—'}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Valid For</div>
      <div class="meta-value">${q.valid_days || 7} days</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Status</div>
      <div class="meta-value">${q.status || 'Draft'}</div>
    </div>
  </div>
  <table>
    <tr><th>Description</th><th>Details</th></tr>
    <tr><td>From Location</td><td>${q.from_loc || '—'}</td></tr>
    <tr><td>To Location</td><td>${q.to_loc || '—'}</td></tr>
    <tr><td>Goods Description</td><td>${q.goods_desc || '—'}</td></tr>
    <tr><td>Weight</td><td>${q.weight ? q.weight + ' kg' : '—'}</td></tr>
    <tr><td>Rate Type</td><td>${q.rate_type === 'per_kg' ? 'Per KG' : q.rate_type === 'per_km' ? 'Per KM' : 'Flat Rate'}</td></tr>
    <tr><td>Rate</td><td>₹${(q.rate || 0).toLocaleString('en-IN')}</td></tr>
    <tr class="total-row"><td>Freight Total</td><td>₹${(q.total_amount || 0).toLocaleString('en-IN')}</td></tr>
    ${q.loading_charges ? `<tr><td>Loading Charges</td><td>₹${(q.loading_charges).toLocaleString('en-IN')}</td></tr>` : ''}
    ${q.unloading_charges ? `<tr><td>Unloading Charges</td><td>₹${(q.unloading_charges).toLocaleString('en-IN')}</td></tr>` : ''}
    <tr class="grand-row"><td>Grand Total</td><td>₹${grandTotal.toLocaleString('en-IN')}</td></tr>
  </table>
  ${q.notes ? `<div class="validity"><strong>Notes:</strong> ${q.notes}</div>` : ''}
  <div class="validity">This quotation is valid for <strong>${q.valid_days || 7} days</strong> from the date of issue.</div>
  <div class="terms">Terms: Goods insurance is the responsibility of the consignor. This is a computer-generated quotation. Subject to our standard terms and conditions.</div>
</body>
</html>`

  const w = window.open('', '_blank', 'width=820,height=680')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 350)
}

function QuotationForm({ open, onClose, onSaved, editing, customers }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = {
    customer_id: '',
    customer_name: '',
    date: todayStr(),
    valid_days: 7,
    from_loc: '',
    to_loc: '',
    distance_km: '',
    goods_desc: '',
    weight: '',
    rate_type: 'per_kg',
    rate: '',
    loading_charges: '',
    unloading_charges: '',
    notes: '',
    status: 'Draft',
  }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [fetchingDist, setFetchingDist] = useState(false)

  useEffect(() => {
    if (open) setForm(editing ? { ...blank, ...editing, distance_km: editing.distance_km || '' } : blank)
  }, [open, editing])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleCustomerChange = (id) => {
    const c = customers.find(x => String(x.id) === String(id))
    f('customer_id', id)
    f('customer_name', c ? c.name : '')
  }

  const handleGetDistance = async () => {
    if (!form.from_loc || !form.to_loc) { show('Enter From and To locations first', 'error'); return }
    setFetchingDist(true)
    try {
      const km = await getDistanceKm(form.from_loc, form.to_loc)
      if (km) { f('distance_km', km); show(`Distance: ${km} km`, 'success') }
      else show('Could not fetch distance. Try city names.', 'error')
    } finally { setFetchingDist(false) }
  }

  const handleSave = async () => {
    if (!form.customer_id) { show('Select a customer', 'error'); return }
    if (!form.from_loc || !form.to_loc) { show('From and To locations required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        valid_days: Number(form.valid_days) || 7,
        weight: Number(form.weight) || 0,
        rate: Number(form.rate) || 0,
        distance_km: Number(form.distance_km) || 0,
        loading_charges: Number(form.loading_charges) || 0,
        unloading_charges: Number(form.unloading_charges) || 0,
        total_amount: calcTotal(form),
      }
      if (editing) { await update(editing.id, payload); show('Quotation updated!', 'success') }
      else { await add(payload); show('Quotation created!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const total = calcTotal(form)
  const grand = calcGrand(form)

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit') : t('Add Quotation')}
      footer={
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : t('Save')}
          </button>
        </>
      }
    >
      {/* Customer */}
      <div className="form-group">
        <label className="form-label">{t('Customer')} *</label>
        <select className="form-input" value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)}>
          <option value="">— Select Customer —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Date + Valid Days */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={form.date} onChange={e => f('date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Valid Days</label>
          <input className="form-input" type="number" value={form.valid_days} onChange={e => f('valid_days', e.target.value)} min="1" />
        </div>
      </div>

      {/* From / To */}
      <div className="form-group">
        <label className="form-label">{t('From')} *</label>
        <input className="form-input" value={form.from_loc} onChange={e => f('from_loc', e.target.value)} placeholder="e.g. Mumbai" />
      </div>
      <div className="form-group">
        <label className="form-label">{t('To')} *</label>
        <input className="form-input" value={form.to_loc} onChange={e => f('to_loc', e.target.value)} placeholder="e.g. Delhi" />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={handleGetDistance} disabled={fetchingDist} style={{ flexShrink: 0 }}>
          {fetchingDist ? <span className="spinner spinner-sm" /> : 'Get Distance'}
        </button>
        {form.distance_km ? (
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>{form.distance_km} km</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Enter city names &amp; click Get Distance</span>
        )}
      </div>

      {/* Goods */}
      <div className="form-group">
        <label className="form-label">Goods Description</label>
        <input className="form-input" value={form.goods_desc} onChange={e => f('goods_desc', e.target.value)} placeholder="e.g. Electronics, Machinery..." />
      </div>
      <div className="form-group">
        <label className="form-label">Weight (kg)</label>
        <input className="form-input" type="number" value={form.weight} onChange={e => f('weight', e.target.value)} placeholder="0" />
      </div>

      {/* Rate Type */}
      <div className="form-group">
        <label className="form-label">{t('Rate')}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {RATE_TYPES.map(rt => (
            <button key={rt.value} type="button" onClick={() => f('rate_type', rt.value)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                border: `2px solid ${form.rate_type === rt.value ? 'var(--accent)' : 'var(--border)'}`,
                background: form.rate_type === rt.value ? 'rgba(99,102,241,0.1)' : 'var(--surface2)',
                color: form.rate_type === rt.value ? 'var(--accent)' : 'var(--text2)',
              }}>
              {rt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rate */}
      <div className="form-group">
        <label className="form-label">Rate (₹ {form.rate_type === 'per_kg' ? 'per kg' : form.rate_type === 'per_km' ? 'per km' : 'flat'})</label>
        <input className="form-input" type="number" value={form.rate} onChange={e => f('rate', e.target.value)} placeholder="0" />
      </div>

      {/* Auto-calculated total */}
      {(parseFloat(form.rate) > 0) && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Freight Total</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{formatCurrency(total)}</div>
        </div>
      )}

      {/* Loading / Unloading */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Loading ₹</label>
          <input className="form-input" type="number" value={form.loading_charges} onChange={e => f('loading_charges', e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Unloading ₹</label>
          <input className="form-input" type="number" value={form.unloading_charges} onChange={e => f('unloading_charges', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Grand total */}
      {(parseFloat(form.rate) > 0 || parseFloat(form.loading_charges) > 0 || parseFloat(form.unloading_charges) > 0) && (
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Grand Total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(grand)}</div>
        </div>
      )}

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <input className="form-input" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Special conditions, remarks..." />
      </div>

      {/* Status (only when editing) */}
      {editing && (
        <div className="form-group">
          <label className="form-label">Status</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s} type="button" onClick={() => f('status', s)}
                style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11,
                  border: `2px solid ${form.status === s ? STATUS_COLORS[s] : 'var(--border)'}`,
                  background: form.status === s ? `${STATUS_COLORS[s]}18` : 'var(--surface2)',
                  color: form.status === s ? STATUS_COLORS[s] : 'var(--text2)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function QuotationDetail({ quotation, onBack, onRefresh }) {
  const { show } = useToast()
  const { t } = useT()
  const [updating, setUpdating] = useState(false)

  const grandTotal = (quotation.total_amount || 0) + (quotation.loading_charges || 0) + (quotation.unloading_charges || 0)
  const nextStatuses = STATUS_FLOW[quotation.status] || []

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true)
    try {
      await update(quotation.id, { ...quotation, status: newStatus })
      show(`Status updated to ${newStatus}`, 'success')
      onRefresh()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setUpdating(false) }
  }

  const handleShare = async () => {
    const text = [
      `FREIGHT QUOTATION — QT-${quotation.id}`,
      `Customer: ${quotation.customer_name || '—'}`,
      `Route: ${quotation.from_loc} → ${quotation.to_loc}`,
      `Date: ${quotation.date}  |  Valid: ${quotation.valid_days || 7} days`,
      `Goods: ${quotation.goods_desc || '—'}  |  Weight: ${quotation.weight || 0} kg`,
      `Freight: ${formatCurrency(quotation.total_amount)}`,
      quotation.loading_charges ? `Loading: ${formatCurrency(quotation.loading_charges)}` : '',
      quotation.unloading_charges ? `Unloading: ${formatCurrency(quotation.unloading_charges)}` : '',
      `Grand Total: ${formatCurrency(grandTotal)}`,
      quotation.notes ? `Notes: ${quotation.notes}` : '',
    ].filter(Boolean).join('\n')

    try {
      await Share.share({ title: `Quotation QT-${quotation.id}`, text, dialogTitle: 'Share Quotation' })
    } catch {
      try { await navigator.share({ title: `Quotation QT-${quotation.id}`, text }) }
      catch { show('Share not supported on this device', 'error') }
    }
  }

  const statusColor = STATUS_COLORS[quotation.status] || '#94a3b8'
  const rateLabel = quotation.rate_type === 'per_kg' ? 'per kg' : quotation.rate_type === 'per_km' ? 'per km' : 'flat'

  return (
    <>
      <Header title={`QT-${quotation.id}`} onBack={onBack}
        rightAction={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => printQuotation(quotation)}>{t('Print')}</button>
            <button className="btn btn-secondary btn-sm" onClick={handleShare}>{t('Share')}</button>
          </div>
        }
      />
      <div className="page">
        {/* Status badge + update buttons */}
        <div style={{ background: 'var(--surface)', border: `1px solid ${statusColor}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: nextStatuses.length > 0 ? 10 : 0 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 2 }}>Current Status</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: statusColor }}>{quotation.status}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '4px 12px', borderRadius: 20 }}>{quotation.status}</span>
          </div>
          {nextStatuses.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'center' }}>Move to:</span>
              {nextStatuses.map(s => (
                <button key={s} className="btn btn-sm" onClick={() => handleStatusUpdate(s)} disabled={updating}
                  style={{ background: `${STATUS_COLORS[s]}18`, color: STATUS_COLORS[s], border: `1px solid ${STATUS_COLORS[s]}`, borderRadius: 8, fontWeight: 700, fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer + route */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Quotation Details</div>
          {[
            ['Customer', quotation.customer_name],
            ['Date', formatDate(quotation.date)],
            ['Valid For', `${quotation.valid_days || 7} days`],
            ['From', quotation.from_loc],
            ['To', quotation.to_loc],
            quotation.distance_km ? ['Distance', `${quotation.distance_km} km`] : null,
            ['Goods', quotation.goods_desc],
            ['Weight', quotation.weight ? `${quotation.weight} kg` : null],
            ['Rate', `${formatCurrency(quotation.rate)} ${rateLabel}`],
          ].filter(row => row && row[1]).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>Amount Breakdown</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Freight Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{formatCurrency(quotation.total_amount)}</span>
          </div>
          {quotation.loading_charges > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Loading</span>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{formatCurrency(quotation.loading_charges)}</span>
            </div>
          )}
          {quotation.unloading_charges > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Unloading</span>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{formatCurrency(quotation.unloading_charges)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Grand Total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {quotation.notes && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{quotation.notes}</div>
          </div>
        )}
      </div>
    </>
  )
}

export default function FreightQuotation() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [quotations, setQuotations] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qs, cs] = await Promise.all([getAll(), getCustomers()])
      setQuotations(qs)
      setCustomers(cs)
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (q, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete quotation QT-${q.id}?`)) return
    try { await remove(q.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  // If viewing detail, and quotation may have been updated, refresh from state
  const handleDetailRefresh = async () => {
    const qs = await getAll()
    setQuotations(qs)
    // Update detail with fresh data
    if (detail) {
      const fresh = qs.find(q => q.id === detail.id)
      if (fresh) setDetail(fresh)
    }
  }

  if (detail) {
    return (
      <QuotationDetail
        quotation={detail}
        onBack={() => { setDetail(null); load() }}
        onRefresh={handleDetailRefresh}
      />
    )
  }

  const filtered = filterStatus === 'All' ? quotations : quotations.filter(q => q.status === filterStatus)

  const totalCount = quotations.length
  const acceptedCount = quotations.filter(q => q.status === 'Accepted').length
  const pendingCount = quotations.filter(q => q.status === 'Draft' || q.status === 'Sent').length

  return (
    <>
      <Header
        title={t('Freight Quotation')}
        onBack={() => navigate('/more')}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModal(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> {t('Add Quotation')}
          </button>
        }
      />
      <div className="page">
        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: t('Total'), value: totalCount, color: 'var(--accent)' },
            { label: t('Accepted'), value: acceptedCount, color: '#10b981' },
            { label: 'Pending', value: pendingCount, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
          {['All', ...STATUSES].map(s => (
            <button key={s} className={`filter-chip${filterStatus === s ? ' active' : ''}`}
              onClick={() => setFilterStatus(s)} style={{ whiteSpace: 'nowrap' }}>
              {s}
            </button>
          ))}
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No quotations</div>
            <div className="empty-desc">Create your first freight quotation</div>
          </div>
        )}

        {!loading && filtered.map(q => {
          const grandTotal = (q.total_amount || 0) + (q.loading_charges || 0) + (q.unloading_charges || 0)
          const statusColor = STATUS_COLORS[q.status] || '#94a3b8'
          return (
            <div key={q.id}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${statusColor}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer' }}
              onClick={() => setDetail(q)}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{q.customer_name || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {q.from_loc} → {q.to_loc}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{formatDate(q.date)} · QT-{q.id}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{formatCurrency(grandTotal)}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '2px 8px', borderRadius: 20, marginTop: 3, display: 'inline-block' }}>
                    {q.status}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button className="btn-icon" style={{ width: 28, height: 28 }}
                  onClick={e => { e.stopPropagation(); setEditing(q); setModal(true) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }}
                  onClick={e => handleDelete(q, e)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <QuotationForm
        open={modal}
        onClose={() => setModal(false)}
        onSaved={load}
        editing={editing}
        customers={customers}
      />
    </>
  )
}
