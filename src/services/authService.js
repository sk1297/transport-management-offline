import db from '../db/database.js'

const USER_KEY = 'tm_user'

export async function login(mobile, password) {
  try {
    const staff = await db.staff.where('mobile').equals(mobile).first()
    if (!staff) return { success: false, error: 'Staff not found. Check mobile number.' }
    if (staff.password !== password) return { success: false, error: 'Incorrect password.' }
    if (!staff.isActive) return { success: false, error: 'Account is inactive. Contact owner.' }

    const user = { id: staff.id, name: staff.name, mobile: staff.mobile, role: staff.role.toUpperCase() }
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return { success: true, user }
  } catch (err) {
    return { success: false, error: err.message || 'Login failed.' }
  }
}

export function logout() {
  localStorage.removeItem(USER_KEY)
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
