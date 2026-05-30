import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'
import db from '../db/database.js'
import { getAll as getVehicles } from '../services/vehicleService.js'
import { formatCurrency, formatDate } from '../utils.js'
import Header from '../components/Header.jsx'
import { useToast } from '../context/ToastContext.jsx'

function efficiencyColor(kml) {
  if (kml >= 5) return '#10b981'
  if (kml >= 3) return '#f59e0b'
  return '#ef4444'
}

/**
 * Compute per-interval efficiency data for a list of diesel logs.
 * Logs must already be sorted by km_reading ascending.
 * Returns array of { date, km_reading, km_driven, litres, efficiency, amount, cost_per_km }
 */
function computeIntervals(logs) {
  const intervals = []
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1]
    const curr = logs[i]
    const km_driven = (curr.km_reading || 0) - (prev.km_reading || 0)
    const litres = prev.litres || 0
    if (km_driven > 0 && litres > 0) {
      const efficiency = km_driven / litres
      const cost_per_km = prev.amount > 0 && km_driven > 0 ? (prev.amount / km_driven) : 0
      intervals.push({
        date: curr.date || prev.date,
        km_reading: curr.km_reading,
        km_driven,
        litres,
        efficiency: Math.round(efficiency * 100) / 100,
        amount: prev.amount || 0,
        cost_per_km: Math.round(cost_per_km * 100) / 100,
      })
    }
  }
  return intervals
}

function avg(arr) {
  if (!arr.length) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function SVGBarChart({ intervals, avgEff }) {
  if (!intervals.length) return null

  const BAR_W = 28
  const CHART_H = 110
  const Y_BOTTOM = 90
  const PADDING_L = 32
  const maxEff = Math.max(...intervals.map(i => i.efficiency), avgEff, 1)
  const totalW = Math.max(300, PADDING_L + intervals.length * (BAR_W + 8) + 16)

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <svg width={totalW} height={CHART_H + 24} style={{ display: 'block', minWidth: '100%' }}>
        {/* Y-axis labels */}
        {[0, Math.round(maxEff / 2), Math.round(maxEff)].map((v, i) => {
          const y = Y_BOTTOM - (v / maxEff) * (Y_BOTTOM - 10)
          return (
            <g key={i}>
              <line x1={PADDING_L - 4} y1={y} x2={totalW - 8} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PADDING_L - 6} y={y + 4} textAnchor="end" fontSize="7" fill="#94a3b8">{v}</text>
            </g>
          )
        })}

        {/* Average line */}
        {avgEff > 0 && (
          <line
            x1={PADDING_L} y1={Y_BOTTOM - (avgEff / maxEff) * (Y_BOTTOM - 10)}
            x2={totalW - 8} y2={Y_BOTTOM - (avgEff / maxEff) * (Y_BOTTOM - 10)}
            stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,3"
          />
        )}

        {/* Bars */}
        {intervals.map((item, i) => {
          const barH = Math.max(2, (item.efficiency / maxEff) * (Y_BOTTOM - 10))
          const x = PADDING_L + i * (BAR_W + 8)
          const color = item.efficiency >= avgEff ? '#10b981' : '#ef4444'
          const labelDate = item.date ? item.date.slice(5) : '' // MM-DD
          return (
            <g key={i}>
              <rect x={x} y={Y_BOTTOM - barH} width={BAR_W} height={barH} rx={3} fill={color} opacity={0.85} />
              <text x={x + BAR_W / 2} y={Y_BOTTOM - barH - 3} textAnchor="middle" fontSize="7" fill={color} fontWeight="bold">
                {item.efficiency}
              </text>
              <text x={x + BAR_W / 2} y={CHART_H + 10} textAnchor="middle" fontSize="7" fill="#94a3b8">{labelDate}</text>
            </g>
          )
        })}

        {/* Y-axis label */}
        <text x={6} y={CHART_H / 2} fontSize="7" fill="#94a3b8" transform={`rotate(-90, 8, ${CHART_H / 2})`} textAnchor="middle">KM/L</text>
      </svg>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, paddingLeft: PADDING_L }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 4, background: '#3b82f6', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>Avg {avgEff.toFixed(2)} KM/L</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2, opacity: 0.85 }} />
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>Above avg</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2, opacity: 0.85 }} />
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>Below avg</span>
        </div>
      </div>
    </div>
  )
}

export default function FuelEfficiency() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t } = useT()
  const [vehicles, setVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [vehicleData, setVehicleData] = useState({}) // vehicleId -> { logs, intervals, summary }
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vs, allLogs] = await Promise.all([
        getVehicles(),
        db.diesel_logs.toArray(),
      ])

      // Group logs by vehicle and filter those with km_reading
      const byVehicle = {}
      for (const log of allLogs) {
        if (!log.vehicle_id || !log.km_reading) continue
        if (!byVehicle[log.vehicle_id]) byVehicle[log.vehicle_id] = []
        byVehicle[log.vehicle_id].push(log)
      }

      // Only keep vehicles that have diesel logs with km_reading
      const activeVehicles = vs.filter(v => byVehicle[v.id] && byVehicle[v.id].length >= 1)
      setVehicles(activeVehicles)

      const data = {}
      for (const v of activeVehicles) {
        const logs = (byVehicle[v.id] || []).slice().sort((a, b) => {
          // Sort by km_reading ascending, fall back to date
          if (a.km_reading !== b.km_reading) return a.km_reading - b.km_reading
          return (a.date || '').localeCompare(b.date || '')
        })
        const intervals = computeIntervals(logs)
        const efficiencies = intervals.map(i => i.efficiency)
        const avgEff = efficiencies.length ? avg(efficiencies) : 0
        const totalLitres = logs.reduce((s, l) => s + (l.litres || 0), 0)
        const totalCost = logs.reduce((s, l) => s + (l.amount || 0), 0)
        const kmReadings = logs.map(l => l.km_reading).filter(Boolean)
        const totalKm = kmReadings.length >= 2 ? Math.max(...kmReadings) - Math.min(...kmReadings) : 0

        data[v.id] = { logs, intervals, avgEff, totalLitres, totalCost, totalKm }
      }

      setVehicleData(data)
      if (activeVehicles.length && !selectedVehicle) {
        setSelectedVehicle(activeVehicles[0].id)
      }
    } catch (err) {
      show('Failed to load fuel data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const currentData = selectedVehicle ? vehicleData[selectedVehicle] : null
  const currentVehicle = vehicles.find(v => v.id === selectedVehicle)
  const avgEff = currentData ? Math.round(currentData.avgEff * 100) / 100 : 0
  const avgColor = efficiencyColor(avgEff)

  return (
    <>
      <Header title={t('Fuel Efficiency')} onBack={() => navigate('/more')} />
      <div className="page">
        {loading && <div className="loading"><span className="spinner" />Loading…</div>}

        {!loading && vehicles.length === 0 && (
          <div className="empty">
            <div className="empty-icon">⛽</div>
            <div className="empty-title">{t('No data found')}</div>
            <div className="empty-desc">Add diesel logs with KM readings to track fuel efficiency</div>
          </div>
        )}

        {!loading && vehicles.length > 0 && (
          <>
            {/* Vehicle selector chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
              {vehicles.map(v => (
                <button key={v.id}
                  className={`filter-chip${selectedVehicle === v.id ? ' active' : ''}`}
                  onClick={() => setSelectedVehicle(v.id)}
                  style={{ whiteSpace: 'nowrap' }}>
                  {v.number || v.registration_number || `Vehicle ${v.id}`}
                </button>
              ))}
            </div>

            {currentData && currentVehicle && (
              <>
                {/* Not enough data */}
                {currentData.intervals.length < 1 && (
                  <div className="empty">
                    <div className="empty-icon">📊</div>
                    <div className="empty-title">Not enough data</div>
                    <div className="empty-desc">Add at least 2 diesel log entries with KM reading to track efficiency</div>
                  </div>
                )}

                {currentData.intervals.length >= 1 && (
                  <>
                    {/* Summary card */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 12 }}>
                        {currentVehicle.number || currentVehicle.registration_number} — Efficiency Summary
                      </div>

                      {/* Big KM/L number */}
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 52, fontWeight: 900, color: avgColor, lineHeight: 1 }}>{avgEff}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: avgColor, marginTop: 4 }}>{t('KM per Litre')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                          {avgEff >= 5 ? 'Excellent efficiency' : avgEff >= 3 ? 'Average efficiency' : 'Poor efficiency — check vehicle'}
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Total Cost', value: formatCurrency(currentData.totalCost), color: '#ef4444' },
                          { label: 'Total KM', value: `${currentData.totalKm.toLocaleString('en-IN')} km`, color: '#3b82f6' },
                          { label: 'Litres Used', value: `${Math.round(currentData.totalLitres)} L`, color: '#f59e0b' },
                        ].map(s => (
                          <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 12 }}>
                        Fill-up Efficiency Chart
                      </div>
                      <SVGBarChart intervals={currentData.intervals} avgEff={currentData.avgEff} />
                    </div>

                    {/* Detail table */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 10 }}>
                        Fill-up Details
                      </div>

                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 60px 50px 50px 70px', gap: 4, marginBottom: 6 }}>
                        {['Date', 'KM Reading', 'KM Driven', 'Litres', 'KM/L', 'Cost/KM'].map(h => (
                          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' }}>{h}</div>
                        ))}
                      </div>

                      {currentData.intervals.map((item, i) => {
                        const kmlColor = efficiencyColor(item.efficiency)
                        const aboveAvg = item.efficiency >= currentData.avgEff
                        return (
                          <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '80px 70px 60px 50px 50px 70px', gap: 4,
                            padding: '7px 0', borderBottom: '1px solid var(--border)',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                          }}>
                            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(item.date)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text)' }}>{item.km_reading?.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: 11, color: 'var(--text)' }}>{item.km_driven?.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: 11, color: 'var(--text)' }}>{item.litres}</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: kmlColor }}>
                              {item.efficiency}
                              {aboveAvg
                                ? <span style={{ fontSize: 8, marginLeft: 2 }}>▲</span>
                                : <span style={{ fontSize: 8, marginLeft: 2 }}>▼</span>}
                            </div>
                            <div style={{ fontSize: 11, color: item.cost_per_km > 0 ? 'var(--text)' : 'var(--text2)' }}>
                              {item.cost_per_km > 0 ? `₹${item.cost_per_km}/km` : '—'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
