import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll, add, remove, getSummary } from '../services/pettyCashService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'

const PURPOSES = ['Office Supplies', 'Tea/Snacks', 'Transport', 'Courier', 'Cleaning', 'Repairs', 'Driver Misc', 'Other']

function AddEntryModal({ open, onClose, onSaved }) {
  const { show } = useToast()
  const blank = { type: 'out', amount: '', date: todayStr(), purpose: 'Other', given_to: '', notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(blank) }, [open])
  const f = (k,v) => setForm(p => ({...p,[k]:v}))

  const handleSave = async () => {
    if (!form.amount) { show('Amount required', 'error'); return }
    setSaving(true)
    try {
      await add({ ...form, amount: Number(form.amount) })
      show('Entry added!', 'success'); onSaved(); onClose()
    } catch(err) { show(getErrorMsg(err), 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Petty Cash Entry"
      footer={<>
        <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner spinner-sm"/> : 'Save'}
        </button>
      </>}
    >
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[{v:'in',label:'Cash In',color:'#10b981'},{v:'out',label:'Cash Out',color:'#ef4444'},{v:'opening',label:'Opening',color:'#3b82f6'}].map(opt=>(
            <button key={opt.v} type="button" onClick={()=>f('type',opt.v)}
              style={{padding:'10px 4px',borderRadius:10,border:`2px solid ${form.type===opt.v?opt.color:'var(--border)'}`,background:form.type===opt.v?`${opt.color}18`:'var(--surface2)',color:form.type===opt.v?opt.color:'var(--text2)',fontWeight:700,fontSize:12,cursor:'pointer'}}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="form-group"><label className="form-label">Amount ₹</label><input className="form-input" type="number" value={form.amount} onChange={e=>f('amount',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e=>f('date',e.target.value)}/></div>
      </div>
      <div className="form-group">
        <label className="form-label">Purpose</label>
        <select className="form-input" value={form.purpose} onChange={e=>f('purpose',e.target.value)}>
          {PURPOSES.map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="form-label">Given To / Received From</label><input className="form-input" value={form.given_to} onChange={e=>f('given_to',e.target.value)} placeholder="Name"/></div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Optional notes"/></div>
    </Modal>
  )
}

export default function PettyCash() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState({ balance:0, totalIn:0, totalOut:0 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [dateFilter, setDateFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [all, sum] = await Promise.all([getAll(), getSummary()])
      setEntries(all); setSummary(sum)
    } catch(err) { show(getErrorMsg(err), 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    try { await remove(id); show('Deleted','success'); load() }
    catch(err) { show(getErrorMsg(err),'error') }
  }

  const filtered = dateFilter ? entries.filter(e => e.date === dateFilter) : entries

  // Group by date
  const grouped = {}
  for (const e of filtered) {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  }
  const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a))

  const typeColor = { in:'#10b981', out:'#ef4444', opening:'#3b82f6' }
  const typeLabel = { in:'IN', out:'OUT', opening:'OPEN' }

  return (
    <>
      <Header title="Petty Cash" onBack={()=>navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
        </button>}
      />
      <div className="page">
        {/* Balance card */}
        <div style={{background:'linear-gradient(135deg,#1e3a5f,#0c1a35)',borderRadius:18,padding:'18px 20px',marginBottom:14,color:'#fff'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Current Balance</div>
          <div style={{fontSize:36,fontWeight:900,letterSpacing:-1,color:summary.balance>=0?'#4ade80':'#f87171'}}>{formatCurrency(summary.balance)}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:14}}>
            <div style={{background:'rgba(16,185,129,0.15)',borderRadius:10,padding:'8px 12px'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#4ade80'}}>{formatCurrency(summary.totalIn)}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>Total In</div>
            </div>
            <div style={{background:'rgba(239,68,68,0.15)',borderRadius:10,padding:'8px 12px'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#f87171'}}>{formatCurrency(summary.totalOut)}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>Total Out</div>
            </div>
          </div>
        </div>

        {/* Date filter */}
        <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
          <input className="form-input" type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{flex:1}}/>
          {dateFilter && <button onClick={()=>setDateFilter('')} style={{padding:'8px 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',cursor:'pointer',fontSize:12,fontWeight:600}}>Clear</button>}
        </div>

        {loading && <div className="loading"><span className="spinner"/>Loading…</div>}
        {!loading && filtered.length===0 && <div className="empty"><div className="empty-icon">💰</div><div className="empty-title">No entries</div><div className="empty-desc">Add your first petty cash entry</div></div>}

        {!loading && sortedDates.map(date => {
          const dayIn  = grouped[date].filter(e=>e.type==='in'||e.type==='opening').reduce((s,e)=>s+(e.amount||0),0)
          const dayOut = grouped[date].filter(e=>e.type==='out').reduce((s,e)=>s+(e.amount||0),0)
          return (
            <div key={date}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,marginTop:10}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:0.5}}>{formatDate(date)}</span>
                <div style={{display:'flex',gap:8}}>
                  {dayIn>0 && <span style={{fontSize:11,fontWeight:700,color:'#10b981'}}>+{formatCurrency(dayIn)}</span>}
                  {dayOut>0 && <span style={{fontSize:11,fontWeight:700,color:'#ef4444'}}>-{formatCurrency(dayOut)}</span>}
                </div>
              </div>
              {grouped[date].map(e => {
                const color = typeColor[e.type] || '#94a3b8'
                return (
                  <div key={e.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`3px solid ${color}`,borderRadius:10,padding:'10px 12px',marginBottom:6,display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',color,fontWeight:800,fontSize:10,flexShrink:0}}>
                      {typeLabel[e.type]}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{e.purpose}</div>
                      <div style={{fontSize:11,color:'var(--text2)',marginTop:1}}>{e.given_to||e.notes||'—'}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontWeight:800,fontSize:14,color}}>{e.type==='out'?'-':''}{formatCurrency(e.amount)}</div>
                      <button style={{marginTop:4,width:22,height:22,borderRadius:5,background:'rgba(239,68,68,0.1)',border:'none',color:'#ef4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>handleDelete(e.id)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <AddEntryModal open={modal} onClose={()=>setModal(false)} onSaved={load}/>
    </>
  )
}
