export function formatCurrency(amount) {
  if (amount == null) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const datePart = formatDate(dateStr)
  const timePart = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${datePart}, ${timePart}`
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function getErrorMsg(err) {
  return err?.message || 'Something went wrong'
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  d.setHours(0,0,0,0)
  now.setHours(0,0,0,0)
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24))
}

export function monthStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
}
