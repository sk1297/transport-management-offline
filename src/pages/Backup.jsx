import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import { useToast } from '../context/ToastContext.jsx'
import db from '../db/database.js'

const TABLES = [
  // v1
  'staff','vehicles','drivers','vendors','trips','lr_bilty','expenses',
  'diesel_logs','toll_logs','loans','loan_payments','attendance','salary',
  'advances','accounts','inventory','stock_movement','vendor_ledger','settings',
  // v2
  'invoices','invoice_payments','trip_milestones','km_logs','vehicle_documents',
  // v3
  'customers','customer_ledger','maintenance_schedules','maintenance_logs',
  'routes','agents','agent_commissions','tyres','tyre_logs',
  // v4
  'petty_cash','freight_rates','follow_ups','trip_settlements','violations',
  // v5
  'quotations','driver_roster','trip_checklist','vendor_bills',
]

export default function Backup() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const lastBackup = localStorage.getItem('lastBackupDate') || null

  const handleExport = async () => {
    setExporting(true)
    try {
      const backup = { version: 1, exportedAt: new Date().toISOString(), data: {} }
      for (const t of TABLES) {
        backup.data[t] = await db[t].toArray()
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transport-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      localStorage.setItem('lastBackupDate', new Date().toISOString())
      show('Backup downloaded!', 'success')
    } catch (err) { show(err.message || 'Export failed', 'error') }
    finally { setExporting(false) }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!window.confirm('This will REPLACE all existing data. Are you sure?')) return
    setImporting(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.data || !backup.version) throw new Error('Invalid backup file')

      await db.transaction('rw', TABLES.filter(t => db[t]).map(t => db[t]), async () => {
        for (const t of TABLES) {
          if (backup.data[t] && db[t]) {
            await db[t].clear()
            if (backup.data[t].length > 0) await db[t].bulkAdd(backup.data[t])
          }
        }
      })
      show('Data restored successfully! Please refresh.', 'success')
      localStorage.setItem('lastBackupDate', new Date().toISOString())
    } catch (err) { show(err.message || 'Import failed', 'error') }
    finally { setImporting(false); e.target.value = '' }
  }

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 58 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t('Backup')}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>Export and import all data</div>
        </div>
      </div>

      <div className="page" style={{ paddingBottom: 'calc(var(--nav-h) + 24px)' }}>

        {lastBackup && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            <div style={{ fontSize: 12, color: '#10b981' }}>{t('Last Backup')}: {new Date(lastBackup).toLocaleString('en-IN')}</div>
          </div>
        )}

        {/* Export */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t('Export Backup')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>Downloads all your data as a JSON file. Save it to your phone, Google Drive, or WhatsApp to yourself.</div>
            </div>
          </div>
          <button onClick={handleExport} disabled={exporting} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
            {exporting ? 'Exporting...' : t('Export Backup')}
          </button>
        </div>

        {/* Import */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f97316' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t('Import Backup')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>Select a previously exported JSON backup file to restore all data. <strong style={{ color: 'var(--red)' }}>This will replace all current data.</strong></div>
            </div>
          </div>
          <label style={{ display: 'block', width: '100%' }}>
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            <div style={{ width: '100%', padding: 14, borderRadius: 12, border: '1.5px solid rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: 700, fontSize: 14, textAlign: 'center', cursor: 'pointer' }}>
              {importing ? 'Restoring...' : t('Import Backup')}
            </div>
          </label>
        </div>

        {/* Info */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>What is backed up?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Vehicles','Drivers','Trips','LR / Bilty','Invoices','Invoice Payments','Expenses','Diesel Logs','Toll Logs','Vendors','Loans','EMI Payments','Attendance','Salary','Inventory','Accounts','Staff','Settings','Customers','Customer Ledger','Maintenance','Routes','Agents','Commissions','KM Logs','Vehicle Documents'].map(t => (
              <span key={t} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: 11, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
