import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate, formatCurrency, todayStr, getErrorMsg } from '../utils.js'
import Modal from '../components/Modal.jsx'
import Header from '../components/Header.jsx'
import db from '../db/database.js'

const POSITIONS = ['Front Left','Front Right','Rear Left 1','Rear Left 2','Rear Right 1','Rear Right 2','Stepney']
const LOG_TYPES = ['Fitted','Removed','Puncture','Retread','Rotation','Replaced']
const TYRE_BRANDS = ['MRF','Apollo','CEAT','Bridgestone','Michelin','JK','Goodyear','Other']

function TyreForm({ open, onClose, onSaved, editing, vehicles }) {
  const { show } = useToast()
  const blank = { vehicle_id:'', serial_no:'', brand:'MRF', size:'', position:'Front Left', purchase_date:todayStr(), purchase_cost:'', km_at_fitting:'', notes:'' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(editing ? {...blank,...editing, vehicle_id:String(editing.vehicle_id||'')} : blank) }, [open,editing])
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const handleSave = async () => {
    if (!form.serial_no) { show('Serial number required','error'); return }
    setSaving(true)
    try {
      const payload = {...form, vehicle_id:Number(form.vehicle_id)||null, purchase_cost:Number(form.purchase_cost)||0, km_at_fitting:Number(form.km_at_fitting)||0}
      if (editing) { await db.tyres.update(editing.id, payload); show('Tyre updated!','success') }
      else { await db.tyres.add(payload); show('Tyre added!','success') }
      onSaved(); onClose()
    } catch(err) { show(getErrorMsg(err),'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={editing?'Edit Tyre':'Add Tyre'}
      footer={<>
        <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
          {saving?<span className="spinner spinner-sm"/>:editing?'Update':'Add Tyre'}
        </button>
      </>}
    >
      <div className="form-group"><label className="form-label">Serial Number *</label><input className="form-input" value={form.serial_no} onChange={e=>f('serial_no',e.target.value)} placeholder="Tyre serial / batch no."/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="form-group">
          <label className="form-label">Brand</label>
          <select className="form-input" value={form.brand} onChange={e=>f('brand',e.target.value)}>
            {TYRE_BRANDS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Size</label><input className="form-input" value={form.size} onChange={e=>f('size',e.target.value)} placeholder="e.g. 10.00-20"/></div>
      </div>
      <div className="form-group">
        <label className="form-label">Vehicle</label>
        <select className="form-input" value={form.vehicle_id} onChange={e=>f('vehicle_id',e.target.value)}>
          <option value="">— Not fitted —</option>
          {vehicles.map(v=><option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Position</label>
        <select className="form-input" value={form.position} onChange={e=>f('position',e.target.value)}>
          {POSITIONS.map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="form-group"><label className="form-label">Purchase Date</label><input className="form-input" type="date" value={form.purchase_date} onChange={e=>f('purchase_date',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Purchase Cost ₹</label><input className="form-input" type="number" value={form.purchase_cost} onChange={e=>f('purchase_cost',e.target.value)}/></div>
      </div>
      <div className="form-group"><label className="form-label">KM at Fitting</label><input className="form-input" type="number" value={form.km_at_fitting} onChange={e=>f('km_at_fitting',e.target.value)} placeholder="Current odometer reading"/></div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e=>f('notes',e.target.value)}/></div>
    </Modal>
  )
}

function TyreLogModal({ open, onClose, onSaved, tyreId }) {
  const { show } = useToast()
  const blank = { type:'Puncture', date:todayStr(), km:'', cost:'', notes:'' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(blank) }, [open])

  const handleSave = async () => {
    setSaving(true)
    try {
      await db.tyre_logs.add({...form, tyre_id:tyreId, km:Number(form.km)||0, cost:Number(form.cost)||0})
      show('Log added!','success'); onSaved(); onClose()
    } catch(err) { show(getErrorMsg(err),'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Log Tyre Event"
      footer={<>
        <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>Save</button>
      </>}
    >
      <div className="form-group">
        <label className="form-label">Event Type</label>
        <select className="form-input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
          {LOG_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">Current KM</label><input className="form-input" type="number" value={form.km} onChange={e=>setForm(p=>({...p,km:e.target.value}))}/></div>
      </div>
      <div className="form-group"><label className="form-label">Cost ₹ (if any)</label><input className="form-input" type="number" value={form.cost} onChange={e=>setForm(p=>({...p,cost:e.target.value}))}/></div>
      <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
    </Modal>
  )
}

function TyreDetail({ tyre, vehicle, onBack, onRefresh }) {
  const [logs, setLogs] = useState([])
  const [logModal, setLogModal] = useState(false)

  const load = useCallback(async () => {
    const l = await db.tyre_logs.where('tyre_id').equals(tyre.id).reverse().sortBy('date')
    setLogs(l)
  }, [tyre.id])

  useEffect(() => { load() }, [load])

  const logColor = { Fitted:'#10b981', Removed:'#94a3b8', Puncture:'#ef4444', Retread:'#8b5cf6', Rotation:'#3b82f6', Replaced:'#f59e0b' }
  const totalKm = tyre.km_at_fitting ? '—' : '—'

  return (
    <>
      <Header title={`${tyre.brand} — ${tyre.serial_no}`} onBack={onBack}
        rightAction={<button className="btn btn-primary btn-sm" onClick={()=>setLogModal(true)}>+ Event</button>}
      />
      <div className="page">
        <div className="card" style={{marginBottom:16}}>
          {[
            ['Vehicle', vehicle?.name || 'Not fitted'],
            ['Position', tyre.position],
            ['Size', tyre.size || '—'],
            ['Brand', tyre.brand],
            ['Purchase Date', formatDate(tyre.purchase_date)],
            ['Purchase Cost', formatCurrency(tyre.purchase_cost)],
            ['KM at Fitting', tyre.km_at_fitting ? tyre.km_at_fitting.toLocaleString() : '—'],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:12,color:'var(--text2)'}}>{k}</span>
              <span style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>Event History</div>
        {logs.length===0
          ? <div className="empty"><div className="empty-icon">🔧</div><div className="empty-title">No events logged</div></div>
          : logs.map(l => {
            const color = logColor[l.type] || '#94a3b8'
            return (
              <div key={l.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`3px solid ${color}`,borderRadius:10,padding:'10px 12px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <span style={{fontSize:11,fontWeight:700,color,background:`${color}18`,padding:'2px 8px',borderRadius:5}}>{l.type}</span>
                    <span style={{fontSize:11,color:'var(--text2)'}}>{formatDate(l.date)}</span>
                  </div>
                  {l.km>0 && <div style={{fontSize:11,color:'var(--text2)'}}>KM: {l.km.toLocaleString()}</div>}
                  {l.notes && <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{l.notes}</div>}
                </div>
                {l.cost>0 && <div style={{fontWeight:800,fontSize:13,color:'#ef4444'}}>{formatCurrency(l.cost)}</div>}
              </div>
            )
          })}
      </div>
      <TyreLogModal open={logModal} onClose={()=>setLogModal(false)} onSaved={load} tyreId={tyre.id}/>
    </>
  )
}

export default function TyreManagement() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [tyres, setTyres] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filterVehicle, setFilterVehicle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, v] = await Promise.all([db.tyres.toArray(), getVehicles()])
      setTyres(t); setVehicles(v)
    } catch(err) { show(getErrorMsg(err),'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (detail) {
    const v = vehicles.find(x=>x.id===detail.vehicle_id)
    return <TyreDetail tyre={detail} vehicle={v} onBack={()=>{setDetail(null);load()}} onRefresh={load}/>
  }

  const handleDelete = async (t) => {
    if (!window.confirm('Delete this tyre?')) return
    try {
      await db.tyre_logs.where('tyre_id').equals(t.id).delete()
      await db.tyres.delete(t.id)
      show('Deleted','success'); load()
    } catch(err) { show(getErrorMsg(err),'error') }
  }

  const filtered = filterVehicle ? tyres.filter(t=>String(t.vehicle_id)===filterVehicle) : tyres

  return (
    <>
      <Header title="Tyre Management" onBack={()=>navigate('/more')}
        rightAction={<button className="btn btn-primary btn-sm" onClick={()=>{setEditing(null);setModal(true)}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
        </button>}
      />
      <div className="page">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:'var(--accent)'}}>{tyres.length}</div>
            <div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',marginTop:3}}>Total Tyres</div>
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:'#ef4444'}}>{formatCurrency(tyres.reduce((s,t)=>s+(t.purchase_cost||0),0))}</div>
            <div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',marginTop:3}}>Total Investment</div>
          </div>
        </div>

        <div className="form-group" style={{marginBottom:12}}>
          <select className="form-input" value={filterVehicle} onChange={e=>setFilterVehicle(e.target.value)}>
            <option value="">All Vehicles</option>
            {vehicles.map(v=><option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>)}
          </select>
        </div>

        {loading && <div className="loading"><span className="spinner"/>Loading…</div>}
        {!loading && filtered.length===0 && <div className="empty"><div className="empty-icon">🛞</div><div className="empty-title">No tyres added</div><div className="empty-desc">Track every tyre on your fleet</div></div>}

        {!loading && filtered.map(t => {
          const v = vehicles.find(x=>x.id===t.vehicle_id)
          return (
            <div key={t.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid #f59e0b',borderRadius:12,padding:'14px',marginBottom:10,cursor:'pointer'}}
              onClick={()=>setDetail(t)}
              onPointerEnter={e=>e.currentTarget.style.background='var(--surface2)'}
              onPointerLeave={e=>e.currentTarget.style.background='var(--surface)'}
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>{t.brand} — {t.serial_no}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{t.size||'—'} · {t.position}</div>
                  <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{v ? v.name : 'Not fitted'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:800,fontSize:13,color:'#f59e0b'}}>{formatCurrency(t.purchase_cost)}</div>
                  <div style={{fontSize:10,color:'var(--text2)',marginTop:2}}>{formatDate(t.purchase_date)}</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:4}} onClick={e=>e.stopPropagation()}>
                <button className="btn-icon" style={{width:28,height:28}} onClick={()=>{setEditing(t);setModal(true)}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="btn-icon" style={{width:28,height:28,color:'#ef4444',background:'rgba(239,68,68,0.1)',border:'none'}} onClick={()=>handleDelete(t)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <TyreForm open={modal} onClose={()=>setModal(false)} onSaved={load} editing={editing} vehicles={vehicles}/>
    </>
  )
}
