import React, { createContext, useContext, useState, useEffect } from 'react'
import { isActivated, validateKey, saveActivation, sha256 } from '../utils/license.js'

const LicenseContext = createContext(null)

export function LicenseProvider({ children }) {
  const [activated, setActivated] = useState(false)
  const [checking,  setChecking]  = useState(true)

  useEffect(() => {
    setActivated(isActivated())
    setChecking(false)
  }, [])

  const activate = async (key) => {
    const ok = await validateKey(key)
    if (ok) {
      const hash = import.meta.env.VITE_APP_KEY_HASH || ''
      saveActivation(key, hash)
      setActivated(true)
    }
    return ok
  }

  return (
    <LicenseContext.Provider value={{ activated, checking, activate }}>
      {children}
    </LicenseContext.Provider>
  )
}

export const useLicense = () => useContext(LicenseContext)
