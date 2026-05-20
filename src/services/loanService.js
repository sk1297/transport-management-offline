import db from '../db/database.js'

export const getAll = () => db.loans.toArray()

export const getById = (id) => db.loans.get(id)

export const add = (data) => db.loans.add(data)

export const update = (id, data) => db.loans.update(id, data)

export const remove = (id) => db.loans.delete(id)

export const getPayments = (loanId) => db.loan_payments.where('loan_id').equals(loanId).toArray()

export async function addPayment(loanId, data) {
  const payId = await db.loan_payments.add({ loan_id: loanId, ...data })
  const loan = await db.loans.get(loanId)
  if (loan) {
    const paid = (loan.paid_emis || 0) + 1
    await db.loans.update(loanId, { paid_emis: paid, status: paid >= loan.tenure_months ? 'Closed' : 'Active' })
  }
  return payId
}
