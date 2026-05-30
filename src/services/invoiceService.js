import db from '../db/database.js'

export const getAll = () => db.invoices.orderBy('id').reverse().toArray()

export const getById = (id) => db.invoices.get(id)

export const add = (data) => db.invoices.add(data)

export const update = (id, data) => db.invoices.update(id, data)

export const remove = async (id) => {
  await db.invoice_payments.where('invoice_id').equals(id).delete()
  await db.invoices.delete(id)
}

export const getPayments = (invoiceId) =>
  db.invoice_payments.where('invoice_id').equals(invoiceId).toArray()

export async function addPayment(invoiceId, data) {
  await db.invoice_payments.add({ invoice_id: invoiceId, ...data })
  const payments = await db.invoice_payments.where('invoice_id').equals(invoiceId).toArray()
  const inv = await db.invoices.get(invoiceId)
  if (inv) {
    const paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
    const status = paid >= inv.total ? 'Paid' : paid > 0 ? 'Partial' : inv.status
    await db.invoices.update(invoiceId, { paid_amount: paid, status })
  }
}

export async function autoInvoiceNumber() {
  const year = new Date().getFullYear()
  // Use max id to avoid collisions after deletions
  const all = await db.invoices.toArray()
  const maxNum = all.reduce((max, inv) => {
    const match = inv.invoice_no?.match(/(\d+)$/)
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  return `INV-${year}-${String(maxNum + 1).padStart(3, '0')}`
}

export async function getOverdueInvoices() {
  const today = new Date().toISOString().split('T')[0]
  const all = await db.invoices.toArray()
  return all.filter(inv => inv.status !== 'Paid' && inv.due_date && inv.due_date < today)
}

export async function getInvoiceSummary() {
  const all = await db.invoices.toArray()
  const total    = all.reduce((s, i) => s + (i.total || 0), 0)
  const paid     = all.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const pending  = all.filter(i => i.status !== 'Paid').length
  const overdue  = await getOverdueInvoices()
  return { total, paid, unpaid: total - paid, pendingCount: pending, overdueCount: overdue.length }
}
