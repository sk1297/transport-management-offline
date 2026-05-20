import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { LicenseProvider, useLicense } from './context/LicenseContext.jsx'
import Activate from './pages/Activate.jsx'
import Toast from './components/Toast.jsx'
import AppShell from './components/AppShell.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Vehicles from './pages/Vehicles.jsx'
import Trips from './pages/Trips.jsx'
import Drivers from './pages/Drivers.jsx'
import More from './pages/More.jsx'
import Expenses from './pages/Expenses.jsx'
import Vendors from './pages/Vendors.jsx'
import DieselToll from './pages/DieselToll.jsx'
import Loans from './pages/Loans.jsx'
import Inventory from './pages/Inventory.jsx'
import Accounting from './pages/Accounting.jsx'
import Reports from './pages/Reports.jsx'
import Staff from './pages/Staff.jsx'
import Settings from './pages/Settings.jsx'
import Backup from './pages/Backup.jsx'

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
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppShell>
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  )
}

function LicenseGate({ children }) {
  const { activated, checking } = useLicense()
  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" />
    </div>
  )
  if (!activated) return <Activate />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <LicenseProvider>
        <LicenseGate>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </LicenseGate>
      </LicenseProvider>
    </BrowserRouter>
  )
}
