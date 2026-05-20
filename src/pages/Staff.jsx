import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import db from '../db/database.js'

const ROLES = ['DRIVER', 'MANAGER', 'OWNER']
const ROLE_CFG = {
  OWNER:   { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', label: 'Owner'   },
  MANAGER: { bg: 'rgba(139,92,246,0.15)',  color: '#8b5cf6', label: 'Manager' },
  DRIVER:  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Driver'  },
}

function StaffSheet({ open, onClose, onSaved, editing }) {
  const { show } = useToast()
  const [form, setForm] = useState({ name: '', mobile: '', role: 'MANAGER', password: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { name: editing.name || '', mobile: editing.mobile || '', role: editing.role || 'MANAGER', password: '' }
        : { name: '', mobile: '', role: 'MANAGER', password: '' }
      )
      setErrors({})
    }
  }, [open, editing])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    if (!editing && !form.password.trim()) e.password = 'Password required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        const data = { name: form.name, mobile: form.mobile, role: form.role }
        if (form.password) data.password = form.password
        await db.staff.update(editing.id, data)
        show('Staff updated!', 'success')
      } else {
        await db.staff.add({ name: form.name, mobile: form.mobile, role: form.role, password: form.password, isActive: 1 })
        show('Staff added!', 'success')
      }
      onSaved(); onClose()
    } catch (err) { show(err.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  if (!open) return null
  const inp = (field, label, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        className="input"
        placeholder={label}
        style={errors[field] ? { borderColor: 'var(--red)' } : {}}
      />
      {errors[field] && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{errors[field]}</div>}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{editing ? 'Edit Staff' : 'Add Staff'}</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {inp('name', 'Full Name')}
        {inp('mobile', 'Mobile (10 digits)', 'tel')}
        {inp('password', editing ? 'New Password (leave blank to keep)' : 'Password', 'password')}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Role</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => setForm(p => ({ ...p, role: r }))}
                style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: `1.5px solid ${form.role === r ? ROLE_CFG[r]?.color || 'var(--accent)' : 'var(--border)'}`, background: form.role === r ? (ROLE_CFG[r]?.bg || 'rgba(59,130,246,0.15)') : 'transparent', color: form.role === r ? (ROLE_CFG[r]?.color || 'var(--accent)') : 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ width: '100%', padding: 14, marginTop: 8 }}>
          {saving ? 'Saving...' : editing ? 'Update Staff' : 'Add Staff'}
        </button>
      </div>
    </div>
  )
}

export default function Staff() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const data = await db.staff.orderBy('name').toArray()
    setList(data)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = list.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.mobile?.includes(search))

  const toggleActive = async (s) => {
    // Cannot deactivate owner if they are the only active owner
    if (s.isActive && s.role === 'OWNER') {
      const activeOwners = list.filter(m => m.role === 'OWNER' && m.isActive)
      if (activeOwners.length <= 1) {
        show('Cannot deactivate the only active Owner', 'error'); return
      }
    }
    await db.staff.update(s.id, { isActive: s.isActive ? 0 : 1 })
    show(s.isActive ? 'Staff deactivated' : 'Staff activated', 'success')
    load()
  }

  const handleDelete = async (s) => {
    if (s.mobile === user?.mobile) { show('Cannot delete your own account', 'error'); return }
    if (s.role === 'OWNER') {
      const owners = list.filter(m => m.role === 'OWNER')
      if (owners.length <= 1) { show('Cannot delete the only Owner account', 'error'); return }
    }
    if (!window.confirm(`Delete "${s.name}"?`)) return
    try { await db.staff.delete(s.id); show('Staff deleted', 'success'); load() }
    catch (err) { show(err.message || 'Error', 'error') }
  }

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 58 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Staff</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>App users & access</div>
        </div>
        {user?.role === 'OWNER' && (
          <button onClick={() => { setEditing(null); setSheet(true) }} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        )}
      </div>
      <div className="page" style={{ paddingBottom: 'calc(var(--nav-h) + 24px)' }}>
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="search-input" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const cfg = ROLE_CFG[s.role] || ROLE_CFG.DRIVER
            return (
              <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: cfg.bg, border: `1.5px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: cfg.color, flexShrink: 0 }}>
                  {(s.name || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.mobile}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: cfg.bg, color: cfg.color }}>{s.role}</span>
                    {!s.isActive && <span style={{ marginLeft: 6, display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: 'var(--red)' }}>INACTIVE</span>}
                  </div>
                </div>
                {user?.role === 'OWNER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => { setEditing(s); setSheet(true) }} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => toggleActive(s)} title={s.isActive ? 'Deactivate' : 'Activate'} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${s.isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, background: s.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: s.isActive ? 'var(--green)' : 'var(--red)' }}>
                      {s.isActive
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      }
                    </button>
                    {s.mobile !== user?.mobile && (
                      <button onClick={() => handleDelete(s)} title="Delete" style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--red)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)', fontSize: 14 }}>No staff found</div>
          )}
        </div>
      </div>
      <StaffSheet open={sheet} onClose={() => setSheet(false)} onSaved={load} editing={editing} />
    </>
  )
}
