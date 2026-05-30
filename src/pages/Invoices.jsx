import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share } from '@capacitor/share'
import { getAll, add, update, remove, addPayment, getPayments, autoInvoiceNumber } from '../services/invoiceService.js'
import { getAll as getLRs } from '../services/lrService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const STATUS_COLORS = {
  Draft: '#94a3b8', Sent: '#3b82f6', Partial: '#f97316', Paid: '#10b981', Overdue: '#ef4444'
}

function statusColor(s) { return STATUS_COLORS[s] || '#94a3b8' }

function printInvoice(inv, payments) {
  const s = (() => { try { return JSON.parse(localStorage.getItem('transportSettings') || '{}') } catch { return {} } })()
  const company = s.companyName || 'Transport Company'
  const address = [s.address, s.city, s.state].filter(Boolean).join(', ')
  const gstin   = s.gstin || ''
  const phone   = s.phone || ''
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const balance   = (inv.total || 0) - totalPaid

  const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_no}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}body{padding:20px;color:#000;font-size:13px}.header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}.company{font-size:20px;font-weight:bold;margin-bottom:4px}.sub{font-size:11px;color:#555;margin:1px 0}.invoice-meta{text-align:right}.inv-no{font-size:22px;font-weight:bold;color:#1e3a5f}.party-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}.party-box{border:1px solid #ccc;padding:10px;border-radius:4px}.party-label{font-size:9px;font-weight:bold;text-transform:uppercase;color:#888;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#1e3a5f;color:#fff;padding:7px 10px;font-size:11px;text-align:left}td{border-bottom:1px solid #eee;padding:7px 10px;font-size:12px}.totals{margin-left:auto;width:50%}.total-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;font-size:12px}.total-net{display:flex;justify-content:space-between;padding:8px 0;font-size:15px;font-weight:bold;border-top:2px solid #000;margin-top:4px}.balance{color:#ef4444}.paid-c{color:#10b981}.footer{margin-top:30px;font-size:10px;color:#999;text-align:center}@media print{body{padding:8px}}</style></head>
  <body>
  <div class="header">
    <div><div class="company">${company}</div>${address ? `<div class="sub">${address}</div>` : ''}${phone ? `<div class="sub">Ph: ${phone}</div>` : ''}${gstin ? `<div class="sub">GSTIN: ${gstin}</div>` : ''}</div>
    <div class="invoice-meta"><div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">TAX INVOICE</div><div class="inv-no">${inv.invoice_no}</div><div class="sub">Date: ${inv.date || ''}</div>${inv.due_date ? `<div class="sub">Due: ${inv.due_date}</div>` : ''}</div>
  </div>
  <div class="party-grid">
    <div class="party-box"><div class="party-label">Bill To (Consignee)</div><div style="font-size:14px;font-weight:bold">${inv.consignee || '—'}</div>${inv.consignee_address ? `<div style="font-size:11px;color:#555">${inv.consignee_address}</div>` : ''}</div>
    <div class="party-box"><div class="party-label">Status</div><div style="font-size:14px;font-weight:bold;color:${statusColor(inv.status)}">${inv.status}</div><div class="sub">Payment: ${inv.pay_mode || 'N/A'}</div></div>
  </div>
  <table><tr><th>#</th><th>LR No.</th><th>Description</th><th>From → To</th><th>Weight</th><th>Amount (₹)</th></tr>
  ${(inv.lr_items || []).map((item, i) => `<tr><td>${i+1}</td><td>${item.lr_no || '—'}</td><td>${item.goods_desc || '—'}</td><td>${item.from || ''} → ${item.to || ''}</td><td>${item.weight || 0} kg</td><td>₹${(item.freight || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>₹${(inv.subtotal || 0).toLocaleString('en-IN')}</span></div>
    ${inv.loading_charges ? `<div class="total-row"><span>Loading Charges</span><span>₹${(inv.loading_charges||0).toLocaleString('en-IN')}</span></div>` : ''}
    ${inv.unloading_charges ? `<div class="total-row"><span>Unloading Charges</span><span>₹${(inv.unloading_charges||0).toLocaleString('en-IN')}</span></div>` : ''}
    ${inv.gst_amount ? `<div class="total-row"><span>GST (${inv.gst_pct || 0}%)</span><span>₹${(inv.gst_amount||0).toLocaleString('en-IN')}</span></div>` : ''}
    <div class="total-net"><span>TOTAL</span><span>₹${(inv.total || 0).toLocaleString('en-IN')}</span></div>
    ${totalPaid > 0 ? `<div class="total-row paid-c"><span>Amount Paid</span><span>₹${totalPaid.toLocaleString('en-IN')}</span></div>` : ''}
    ${balance > 0 ? `<div class="total-row balance"><span>Balance Due</span><span>₹${balance.toLocaleString('en-IN')}</span></div>` : ''}
  </div>
  ${inv.notes ? `<div style="margin-top:12px;font-size:11px;color:#555;border-top:1px solid #eee;padding-top:8px"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
  <div class="footer">Thank you for your business! — ${company}</div>
  </body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) { alert('Please allow popups to print invoice'); return }
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}

function InvoiceDetail({ invoice, onBack, onRefresh }) {
  const { show } = useToast()
  const [payments, setPayments] = useState([])
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm]   = useState({ date: todayStr(), amount: '', mode: 'Cash', notes: '', tds_pct: '0', tds_amount: '' })
  const [saving, setSaving]     = useState(false)

  const loadPayments = useCallback(async () => {
    setPayments(await getPayments(invoice.id))
  }, [invoice.id])

  useEffect(() => { loadPayments() }, [loadPayments])

  const handlePay = async () => {
    if (!payForm.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await addPayment(invoice.id, { ...payForm, amount: Number(payForm.amount) })
      show('Payment recorded!', 'success'); setPayModal(false); loadPayments(); onRefresh()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const balance   = (invoice.total || 0) - totalPaid
  const sc        = statusColor(invoice.status)

  return (
    <>
      <Header title={invoice.invoice_no} onBack={onBack}
        rightAction={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => printInvoice(invoice, payments)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
            <button className="btn btn-secondary btn-sm" style={{color:'#25D366',borderColor:'rgba(37,211,102,0.4)'}} onClick={async () => {
              const totalPaid = payments.reduce((s,p) => s+(p.amount||0), 0)
              const balance = (invoice.total||0) - totalPaid
              const text = `*Invoice: ${invoice.invoice_no}*\nParty: ${invoice.consignee}\nDate: ${invoice.date}\nTotal: ₹${(invoice.total||0).toLocaleString('en-IN')}\nPaid: ₹${totalPaid.toLocaleString('en-IN')}\nBalance Due: ₹${balance.toLocaleString('en-IN')}\nStatus: ${invoice.status}`
              try { await Share.share({ text, dialogTitle: 'Share Invoice' }) } catch {}
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 0C5.149 0 0 5.148 0 11.5c0 2.004.521 3.882 1.432 5.51L.035 23.2l6.354-1.666A11.445 11.445 0 0011.5 23C17.851 23 23 17.851 23 11.5S17.851 0 11.5 0zm0 21.077a9.546 9.546 0 01-4.863-1.327l-.349-.207-3.614.948.965-3.524-.228-.362A9.537 9.537 0 012 11.5C2 6.262 6.262 2 11.5 2S21 6.262 21 11.5 16.738 21.077 11.5 21.077z"/></svg>
              Share
            </button>
            {invoice.status !== 'Paid' && (
              <button className="btn btn-primary btn-sm" onClick={() => setPayModal(true)}>+ Payment</button>
            )}
          </div>
        }
      />
      <div className="page">
        <div className="card" style={{ borderLeft: `3px solid ${sc}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{invoice.invoice_no}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{invoice.consignee}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{formatDate(invoice.date)}{invoice.due_date ? ` · Due: ${formatDate(invoice.due_date)}` : ''}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: `${sc}18`, color: sc, textTransform: 'uppercase' }}>{invoice.status}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Total', value: formatCurrency(invoice.total), color: 'var(--text)' },
              { label: 'Paid', value: formatCurrency(totalPaid), color: '#10b981' },
              { label: 'Balance', value: formatCurrency(balance), color: balance > 0 ? '#ef4444' : '#10b981' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LR Items */}
        {invoice.lr_items?.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>LR Items</div>
            {invoice.lr_items.map((item, i) => (
              <div key={i} className="card" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{item.lr_no}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{item.from} → {item.to} · {item.goods_desc}</div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>{item.weight} kg · {item.packages} pkgs</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{formatCurrency(item.freight)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Payment History */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 10px' }}>Payment History</div>
        {payments.length === 0 ? (
          <div className="empty"><div className="empty-icon">💳</div><div className="empty-title">No payments yet</div></div>
        ) : payments.map(p => (
          <div key={p.id} className="card" style={{ borderLeft: '3px solid #10b981', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{formatDate(p.date)}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.mode}{p.tds_amount > 0 ? ` · TDS: ₹${p.tds_amount}` : ''}{p.notes ? ` · ${p.notes}` : ''}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981' }}>{formatCurrency(p.amount)}</div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment"
        footer={<>
          <button className="btn btn-secondary flex-1" onClick={() => setPayModal(false)}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handlePay} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : 'Record'}
          </button>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} placeholder={String(balance)} /></div>
          <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">TDS %</label>
            <select className="form-input" value={payForm.tds_pct} onChange={e => {
              const pct = Number(e.target.value)
              const amt = payForm.amount ? ((Number(payForm.amount) * pct) / 100).toFixed(2) : ''
              setPayForm(p => ({ ...p, tds_pct: e.target.value, tds_amount: amt }))
            }}>
              {['0','1','2','5','10'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">TDS Amount ₹</label><input className="form-input" type="number" value={payForm.tds_amount} onChange={e => setPayForm(p => ({ ...p, tds_amount: e.target.value }))} placeholder="0" /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Payment Mode</label>
          <select className="form-input" value={payForm.mode} onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))}>
            {['Cash','Bank Transfer','UPI','Cheque','NEFT/RTGS'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reference, cheque no, etc." /></div>
      </Modal>
    </>
  )
}

function InvoiceForm({ open, onClose, onSaved }) {
  const { show }    = useToast()
  const [lrs, setLrs]       = useState([])
  const [selectedLRs, setSelectedLRs] = useState([])
  const [step, setStep]     = useState(1)
  const [form, setForm]     = useState({
    invoice_no: '', date: todayStr(), due_date: '', consignee: '', consignee_address: '',
    loading_charges: '', unloading_charges: '', gst_pct: '0', notes: '', pay_mode: 'Cash'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(1); setSelectedLRs([])
      getLRs().then(all => {
        // Show LRs that are To-Be-Billed or To-Pay but not yet delivered & not already invoiced
        setLrs(all.filter(lr => lr.pay_type !== 'Paid' && lr.status !== 'Invoiced'))
      })
      autoInvoiceNumber().then(no => setForm(p => ({ ...p, invoice_no: no })))
    }
  }, [open])

  const toggleLR = (lr) => {
    setSelectedLRs(prev =>
      prev.find(x => x.id === lr.id)
        ? prev.filter(x => x.id !== lr.id)
        : [...prev, lr]
    )
    // Pre-fill consignee from first selected LR
    if (selectedLRs.length === 0 && !form.consignee) {
      setForm(p => ({ ...p, consignee: lr.consignee }))
    }
  }

  const subtotal  = selectedLRs.reduce((s, lr) => s + (lr.freight || 0), 0)
  const extras    = (Number(form.loading_charges) || 0) + (Number(form.unloading_charges) || 0)
  const gstAmt    = Math.round((subtotal + extras) * (Number(form.gst_pct) || 0) / 100)
  const total     = subtotal + extras + gstAmt

  const handleCreate = async () => {
    if (!form.invoice_no || selectedLRs.length === 0) { show('Select at least 1 LR', 'error'); return }
    setSaving(true)
    try {
      const lr_items = selectedLRs.map(lr => ({
        lr_id: lr.id, lr_no: lr.lr_no, goods_desc: lr.goods_desc, from: lr.from,
        to: lr.to, weight: lr.weight, packages: lr.packages, freight: lr.freight,
        consignor: lr.consignor, consignee: lr.consignee,
      }))
      await add({
        ...form,
        lr_items,
        subtotal,
        loading_charges: Number(form.loading_charges) || 0,
        unloading_charges: Number(form.unloading_charges) || 0,
        gst_pct: Number(form.gst_pct) || 0,
        gst_amount: gstAmt,
        total,
        paid_amount: 0,
        status: 'Draft',
        consignee: form.consignee || selectedLRs[0]?.consignee || '',
      })
      show('Invoice created!', 'success'); onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal isOpen={open} onClose={onClose} title={step === 1 ? 'Select LRs' : 'Invoice Details'}
      footer={step === 1 ? (
        <>
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" disabled={selectedLRs.length === 0} onClick={() => setStep(2)}>Next ({selectedLRs.length} LRs)</button>
        </>
      ) : (
        <>
          <button className="btn btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
          <button className="btn btn-primary flex-1" onClick={handleCreate} disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : 'Create Invoice'}
          </button>
        </>
      )}
    >
      {step === 1 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Select LRs to include in this invoice:</div>
          {lrs.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, padding: 20 }}>No pending LRs found</div>}
          {lrs.map(lr => {
            const sel = !!selectedLRs.find(x => x.id === lr.id)
            return (
              <div key={lr.id} onClick={() => toggleLR(lr)} style={{ background: sel ? 'rgba(59,130,246,0.08)' : 'var(--surface2)', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{lr.lr_no}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{lr.consignor} → {lr.consignee}</div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>{lr.from} → {lr.to} · {lr.pay_type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{formatCurrency(lr.freight)}</div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {selectedLRs.length > 0 && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '8px 14px', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{selectedLRs.length} LR selected</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#10b981' }}>{formatCurrency(subtotal)}</span>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">Invoice No.</label><input className="form-input" value={form.invoice_no} onChange={e => f('invoice_no', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => f('date', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Due Date (Optional)</label><input className="form-input" type="date" value={form.due_date} onChange={e => f('due_date', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Consignee (Bill To)</label><input className="form-input" value={form.consignee} onChange={e => f('consignee', e.target.value)} placeholder="Party name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group"><label className="form-label">Loading ₹</label><input className="form-input" type="number" value={form.loading_charges} onChange={e => f('loading_charges', e.target.value)} placeholder="0" /></div>
            <div className="form-group"><label className="form-label">Unloading ₹</label><input className="form-input" type="number" value={form.unloading_charges} onChange={e => f('unloading_charges', e.target.value)} placeholder="0" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">GST %</label>
              <select className="form-input" value={form.gst_pct} onChange={e => f('gst_pct', e.target.value)}>
                {['0','5','12','18','28'].map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-input" value={form.pay_mode} onChange={e => f('pay_mode', e.target.value)}>
                {['Cash','Bank Transfer','UPI','Cheque','NEFT/RTGS'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Any special instructions" /></div>
          <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)' }}>
            {[
              ['Subtotal', subtotal],
              form.loading_charges ? ['Loading', Number(form.loading_charges)] : null,
              form.unloading_charges ? ['Unloading', Number(form.unloading_charges)] : null,
              Number(form.gst_pct) > 0 ? [`GST ${form.gst_pct}%`, gstAmt] : null,
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                <span>{label}</span><span>{formatCurrency(val)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <span>Total</span><span style={{ color: '#10b981' }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Invoices() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [detail, setDetail]     = useState(null)
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvoices(await getAll()) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_no}?`)) return
    try { await remove(inv.id); show('Invoice deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  if (detail) return <InvoiceDetail invoice={detail} onBack={() => { setDetail(null); load() }} onRefresh={load} />

  const filtered = invoices.filter(inv => {
    if (filter !== 'All' && inv.status !== filter) return false
    if (search && !inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) && !inv.consignee?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid    = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const totalPending = invoices.filter(i => i.status !== 'Paid').length

  return (
    <>
      <Header title="Invoices" onBack={() => navigate('/more')}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Invoice
          </button>
        }
      />
      <div className="page">
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total Billed', value: formatCurrency(totalRevenue), color: '#3b82f6' },
            { label: 'Collected', value: formatCurrency(totalPaid), color: '#10b981' },
            { label: 'Pending', value: totalPending, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `2px solid ${s.color}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: typeof s.value === 'number' ? 22 : 13, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['All','Draft','Sent','Partial','Paid','Overdue'].map(f => (
            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="search-input" placeholder="Search invoice no, party…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <div className="empty-title">No invoices found</div>
            <div className="empty-desc">Create invoices from your LR / Bilty records</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setModal(true)}>+ New Invoice</button>
          </div>
        )}

        {!loading && filtered.map((inv, idx) => {
          const sc      = statusColor(inv.status)
          const balance = (inv.total || 0) - (inv.paid_amount || 0)
          return (
            <div key={inv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer', animation: `fadeUp 0.3s ease ${idx*0.04}s both` }}
              onClick={() => setDetail(inv)}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{inv.invoice_no}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${sc}18`, color: sc, textTransform: 'uppercase' }}>{inv.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{inv.consignee}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(inv.date)}{inv.due_date ? ` · Due: ${formatDate(inv.due_date)}` : ''}</div>
                  {(inv.lr_items?.length > 0) && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>{inv.lr_items.length} LR{inv.lr_items.length > 1 ? 's' : ''}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>{formatCurrency(inv.total)}</div>
                  {balance > 0 && <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Balance: {formatCurrency(balance)}</div>}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" style={{ width: 26, height: 26, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: 'none' }}
                      onClick={async () => { const { getPayments } = await import('../services/invoiceService.js'); const pmts = await getPayments(inv.id); printInvoice(inv, pmts) }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    </button>
                    <button className="btn-icon" style={{ width: 26, height: 26, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }}
                      onClick={() => handleDelete(inv)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <InvoiceForm open={modal} onClose={() => setModal(false)} onSaved={load} />
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  )
}
