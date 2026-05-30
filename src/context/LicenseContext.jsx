import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { isActivated, isExpired, validateKey, saveActivation, daysRemaining, getStoredExpiry } from '../utils/license.js'

const LicenseContext = createContext(null)

export function LicenseProvider({ children }) {
  const [activated, setActivated]   = useState(false)
  const [checking,  setChecking]    = useState(true)
  const [expiry,    setExpiry]      = useState(null)
  const [expired,   setExpired]     = useState(false)

  const check = useCallback(() => {
    const ok  = isActivated()
    const exp = isExpired()
    setActivated(ok)
    setExpired(exp)
    setExpiry(getStoredExpiry())
  }, [])

  useEffect(() => {
    check()
    setChecking(false)
    // Re-check every hour so an open app locks when the key expires at midnight
    const t = setInterval(check, 60 * 60 * 1000)
    return () => clearInterval(t)
  }, [check])

  const activate = async (key) => {
    const result = await validateKey(key)
    if (!result) return { ok: false, msg: 'Invalid key. Check the key and try again.' }
    if (!result.ok && result.expired)
      return { ok: false, msg: `This key expired on ${result.expiry}. Please get a new key.` }
    saveActivation(result.expiry)
    setActivated(true)
    setExpired(false)
    setExpiry(result.expiry)
    return { ok: true, expiry: result.expiry }
  }

  const daysLeft = daysRemaining()

  return (
    <LicenseContext.Provider value={{ activated, checking, activate, expiry, expired, daysLeft }}>
      {children}
    </LicenseContext.Provider>
  )
}

export const useLicense = () => useContext(LicenseContext)
