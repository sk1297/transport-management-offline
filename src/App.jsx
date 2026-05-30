import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { LicenseProvider, useLicense } from './context/LicenseContext.jsx'
import { LanguageProvider } from './i18n/index.js'
import Toast from './components/Toast.jsx'
import AppShell from './components/AppShell.jsx'

// ── Lazy-load all pages for faster startup ────────────────────────────────────
const Activate          = lazy(() => import('./pages/Activate.jsx'))
const Login             = lazy(() => import('./pages/Login.jsx'))
const Dashboard         = lazy(() => import('./pages/Dashboard.jsx'))
const Vehicles          = lazy(() => import('./pages/Vehicles.jsx'))
const Trips             = lazy(() => import('./pages/Trips.jsx'))
const Drivers           = lazy(() => import('./pages/Drivers.jsx'))
const More              = lazy(() => import('./pages/More.jsx'))
const Expenses          = lazy(() => import('./pages/Expenses.jsx'))
const Vendors           = lazy(() => import('./pages/Vendors.jsx'))
const DieselToll        = lazy(() => import('./pages/DieselToll.jsx'))
const Loans             = lazy(() => import('./pages/Loans.jsx'))
const Inventory         = lazy(() => import('./pages/Inventory.jsx'))
const Accounting        = lazy(() => import('./pages/Accounting.jsx'))
const Reports           = lazy(() => import('./pages/Reports.jsx'))
const Staff             = lazy(() => import('./pages/Staff.jsx'))
const Settings          = lazy(() => import('./pages/Settings.jsx'))
const Backup            = lazy(() => import('./pages/Backup.jsx'))
const Invoices          = lazy(() => import('./pages/Invoices.jsx'))
const Customers         = lazy(() => import('./pages/Customers.jsx'))
const RouteMaster       = lazy(() => import('./pages/Routes.jsx'))
const Agents            = lazy(() => import('./pages/Agents.jsx'))
const Maintenance       = lazy(() => import('./pages/Maintenance.jsx'))
const Search            = lazy(() => import('./pages/Search.jsx'))
const PettyCash         = lazy(() => import('./pages/PettyCash.jsx'))
const TyreManagement    = lazy(() => import('./pages/TyreManagement.jsx'))
const FreightQuotation  = lazy(() => import('./pages/FreightQuotation.jsx'))
const FuelEfficiency    = lazy(() => import('./pages/FuelEfficiency.jsx'))
const DriverRoster      = lazy(() => import('./pages/DriverRoster.jsx'))
const Help              = lazy(() => import('./pages/Help.jsx'))

// ── Spinner shown while lazy chunk loads ─────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

function BackButtonHandler() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let listener
    const setup = async () => {
      listener = await CapApp.addListener('backButton', () => {
        if (location.pathname === '/' || location.pathname === '/login') {
          CapApp.exitApp()
        } else {
          navigate(-1)
        }
      })
    }
    setup()
    return () => { listener?.remove() }
  }, [location.pathname, navigate])

  return null
}

function AppRoutes() {
  return (
    <>
      <Toast />
      <BackButtonHandler />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppShell>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/vehicles" element={<Vehicles />} />
                    <Route path="/trips" element={<Trips />} />
                    <Route path="/drivers" element={<Drivers />} />
                    <Route path="/more" element={<More />} />
                    <Route path="/more/expenses" element={<Expenses />} />
                    <Route path="/more/vendors" element={<Vendors />} />
                    <Route path="/more/diesel-toll" element={<DieselToll />} />
                    <Route path="/more/loans" element={<Loans />} />
                    <Route path="/more/inventory" element={<Inventory />} />
                    <Route path="/more/accounting" element={<Accounting />} />
                    <Route path="/more/reports" element={<Reports />} />
                    <Route path="/more/staff" element={<Staff />} />
                    <Route path="/more/settings" element={<Settings />} />
                    <Route path="/more/backup" element={<Backup />} />
                    <Route path="/more/invoices" element={<Invoices />} />
                    <Route path="/more/customers" element={<Customers />} />
                    <Route path="/more/routes" element={<RouteMaster />} />
                    <Route path="/more/agents" element={<Agents />} />
                    <Route path="/more/maintenance" element={<Maintenance />} />
                    <Route path="/more/petty-cash" element={<PettyCash />} />
                    <Route path="/more/tyres" element={<TyreManagement />} />
                    <Route path="/more/quotations" element={<FreightQuotation />} />
                    <Route path="/more/fuel-efficiency" element={<FuelEfficiency />} />
                    <Route path="/more/driver-roster" element={<DriverRoster />} />
                    <Route path="/more/help" element={<Help />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </>
  )
}

function LicenseGate({ children }) {
  const { activated, checking, daysLeft } = useLicense()
  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" />
    </div>
  )
  if (!activated) return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>}>
      <Activate />
    </Suspense>
  )
  return (
    <>
      {daysLeft !== null && daysLeft <= 5 && daysLeft >= 0 && (
        <div style={{
          background: daysLeft <= 1 ? '#ef4444' : '#f59e0b',
          color: '#fff', textAlign: 'center',
          fontSize: 12, fontWeight: 700, padding: '6px 12px',
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999
        }}>
          {daysLeft === 0
            ? '⚠️ License expires TODAY — contact your provider for renewal'
            : `⚠️ License expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''} — contact your provider`}
        </div>
      )}
      {children}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <LicenseProvider>
          <LicenseGate>
            <AuthProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </AuthProvider>
          </LicenseGate>
        </LicenseProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
