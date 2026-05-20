import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import db from '../db/database.js'

const DEFAULT = {
  companyName: 'Transport Company',
  ownerName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  gstin: '',
  panNumber: '',
  lrPrefix: 'LR',
  invoicePrefix: 'INV',
  currency: 'INR',
}

export function getSettings() {
  try {
    const s = localStorage.getItem('transportSettings')
    return s ? { ...DEFAULT, ...JSON.parse(s) } : { ...DEFAULT }
  } catch { return { ...DEFAULT } }
}

export default function Settings() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [form, setForm] = useState(getSettings())
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      localStorage.setItem('transportSettings', JSON.stringify(form))
      show('Settings saved!', 'success')
    } catch (err) { show(err.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const inp = (key, label, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} className="input" placeholder={placeholder || label} />
    </div>
  )

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 58 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Settings</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>Company information</div>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="page" style={{ paddingBottom: 'calc(var(--nav-h) + 24px)' }}>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Company Details</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            {inp('companyName', 'Company Name', 'text', 'e.g. Sharma Transport Co.')}
            {inp('ownerName', 'Owner Name')}
            {inp('phone', 'Phone', 'tel', '10-digit mobile')}
            {inp('email', 'Email', 'email')}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 20 }}>Address</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            {inp('address', 'Address')}
            {inp('city', 'City')}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)} className="input">
                {['Andhra Pradesh','Assam','Bihar','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 20 }}>Tax & Compliance</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            {inp('gstin', 'GSTIN', 'text', '15-digit GSTIN')}
            {inp('panNumber', 'PAN Number')}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginTop: 20 }}>Document Numbering</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            {inp('lrPrefix', 'LR Number Prefix', 'text', 'e.g. LR')}
            {inp('invoicePrefix', 'Invoice Number Prefix', 'text', 'e.g. INV')}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ width: '100%', padding: 14, marginTop: 16 }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </>
  )
}
