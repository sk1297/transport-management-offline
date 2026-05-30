import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { getAll, add, update, remove, getPayments, addPayment } from '../services/loanService.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

function LoanForm({ open, onClose, onSaved, editing, vehicles }) {
  const { show } = useToast()
  const { t } = useT()
  const blank = { vehicle_id: '', bank_name: '', loan_amount: '', emi_amount: '', start_date: todayStr(), tenure_months: '', paid_emis: '0', status: 'Active' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(editing ? { ...blank, ...editing, vehicle_id: String(editing.vehicle_id||'') } : blank) }, [open, editing])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.bank_name || !form.loan_amount) { show('Bank name & amount required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, vehicle_id: Number(form.vehicle_id)||null, loan_amount: Number(form.loan_amount), emi_amount: Number(form.emi_amount), tenure_months: Number(form.tenure_months), paid_emis: Number(form.paid_emis)||0 }
      if (editing) { await update(editing.id, payload); show('Loan updated!', 'success') }
      else         { await add(payload); show('Loan added!', 'success') }
      onSaved(); onClose()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? t('Edit') : t('Add Loan')}
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
        <label className="form-label">{t('Lender')}</label>
        <select className="form-input" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
          <option value="">— Select —</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Bank Name</label><input className="form-input" value={form.bank_name||''} onChange={e => f('bank_name', e.target.value)} placeholder="HDFC Bank" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Loan Amount ₹</label><input className="form-input" type="number" value={form.loan_amount||''} onChange={e => f('loan_amount', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">EMI ₹/month</label><input className="form-input" type="number" value={form.emi_amount||''} onChange={e => f('emi_amount', e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.start_date||''} onChange={e => f('start_date', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Tenure (months)</label><input className="form-input" type="number" value={form.tenure_months||''} onChange={e => f('tenure_months', e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group"><label className="form-label">Paid EMIs</label><input className="form-input" type="number" value={form.paid_emis||'0'} onChange={e => f('paid_emis', e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
            <option>Active</option><option>Closed</option>
          </select>
        </div>
      </div>
    </Modal>
  )
}

function LoanDetail({ loan, vehicle, onBack, onRefresh }) {
  const { show } = useToast()
  const { t } = useT()
  const [payments, setPayments] = useState([])
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ date: todayStr(), amount: loan.emi_amount || '', mode: 'Bank Transfer' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setPayments(await getPayments(loan.id))
  }, [loan.id])

  useEffect(() => { load() }, [load])

  const handlePay = async () => {
    setSaving(true)
    try {
      await addPayment(loan.id, { ...payForm, amount: Number(payForm.amount) })
      show('EMI payment recorded!', 'success'); setPayModal(false); load(); onRefresh()
    } catch (err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  const paid    = loan.paid_emis || 0
  const tenure  = loan.tenure_months || 1
  const pct     = Math.min(100, Math.round((paid / tenure) * 100))
  const outstanding = (loan.emi_amount || 0) * (tenure - paid)

  return (
    <>
      <Header title={`${loan.bank_name}`} onBack={onBack}
        rightAction={loan.status !== 'Closed' && <button className="btn btn-primary btn-sm" onClick={() => setPayModal(true)}>Pay EMI</button>}
      />
      <div className="page">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{loan.bank_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{vehicle?.name || 'N/A'}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: loan.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: loan.status === 'Active' ? '#10b981' : '#94a3b8', textTransform: 'uppercase' }}>{loan.status}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Loan Amount', value: formatCurrency(loan.loan_amount), color: 'var(--text)' },
              { label: 'EMI', value: formatCurrency(loan.emi_amount), color: 'var(--accent)' },
              { label: 'Paid', value: `${paid} / ${tenure} EMIs`, color: 'var(--green)' },
              { label: 'Outstanding', value: formatCurrency(outstanding), color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)' }}>
            <span>Repayment Progress</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
          </div>
          <div className="progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Payment History</div>
        {payments.length === 0 ? (
          <div className="empty"><div className="empty-icon">💳</div><div className="empty-title">No payments yet</div></div>
        ) : payments.slice().reverse().map(p => (
          <div key={p.id} className="card" style={{ borderLeft: '3px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{formatDate(p.date)}</div>
                {p.mode && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{p.mode}</div>}
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>{formatCurrency(p.amount)}</div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record EMI Payment"
        footer={
          <>
            <button className="btn btn-secondary flex-1" onClick={() => setPayModal(false)}>{t('Cancel')}</button>
            <button className="btn btn-primary flex-1" onClick={handlePay} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : t('Save')}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">{t('Amount')} ₹</label><input className="form-input" type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">{t('Date')}</label><input className="form-input" type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Payment Mode</label>
          <select className="form-input" value={payForm.mode} onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))}>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>Cheque</option>
            <option>UPI</option>
          </select>
        </div>
      </Modal>
    </>
  )
}

export default function Loans() {
  const navigate  = useNavigate()
  const { show }  = useToast()
  const { t } = useT()
  const [loans,    setLoans]    = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [detail,   setDetail]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const [l, v] = await Promise.all([getAll(), getVehicles()]); setLoans(l); setVehicles(v) }
    catch (err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (detail) return <LoanDetail loan={detail} vehicle={vehicles.find(v => v.id === detail.vehicle_id)} onBack={() => { setDetail(null); load() }} onRefresh={load} />

  const handleDelete = async (l) => {
    if (!window.confirm('Delete this loan?')) return
    try { await remove(l.id); show('Deleted', 'success'); load() }
    catch (err) { show(getErrorMsg(err), 'error') }
  }

  const totalOutstanding = loans.filter(l => l.status === 'Active').reduce((s,l) => s + (l.emi_amount||0) * ((l.tenure_months||0) - (l.paid_emis||0)), 0)

  return (
    <>
      <Header title={t('Loans')} onBack={() => navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setModal(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {t('Add Loan')}
        </button>}
      />
      <div className="page">
        <div className="card" style={{ textAlign: 'center', borderTop: '2px solid var(--red)', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Total Outstanding</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>{formatCurrency(totalOutstanding)}</div>
        </div>

        {loading && <div className="loading"><span className="spinner" />Loading…</div>}
        {!loading && loans.length === 0 && <div className="empty"><div className="empty-icon">🏦</div><div className="empty-title">No loans</div></div>}

        {!loading && loans.map(loan => {
          const v     = vehicles.find(veh => veh.id === loan.vehicle_id)
          const paid  = loan.paid_emis || 0
          const total = loan.tenure_months || 1
          const pct   = Math.min(100, Math.round((paid / total) * 100))
          const sc    = loan.status === 'Active' ? '#10b981' : '#94a3b8'
          return (
            <div key={loan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${sc}`, borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer' }}
              onClick={() => setDetail(loan)}
              onPointerEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onPointerLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{loan.bank_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{v?.name || 'N/A'} · EMI: {formatCurrency(loan.emi_amount)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{formatCurrency(loan.loan_amount)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{paid} / {total} EMIs paid</div>
                </div>
              </div>
              <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text2)' }}>Progress</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: sc }}>{pct}%</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: `${pct}%`, background: sc }} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setEditing(loan); setModal(true) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="btn-icon" style={{ width: 28, height: 28, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none' }} onClick={() => handleDelete(loan)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <LoanForm open={modal} onClose={() => setModal(false)} onSaved={load} editing={editing} vehicles={vehicles} />
    </>
  )
}
