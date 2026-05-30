import db from '../db/database.js'

export const getAll = () => db.agents.orderBy('name').toArray()
export const add = (data) => db.agents.add(data)
export const update = (id, data) => db.agents.update(id, data)
export const remove = async (id) => {
  await db.agent_commissions.where('agent_id').equals(id).delete()
  await db.agents.delete(id)
}

// Commissions
export const getCommissions = (agentId) =>
  db.agent_commissions.where('agent_id').equals(agentId).toArray()

export const addCommission = (data) => db.agent_commissions.add(data)
export const updateCommission = (id, data) => db.agent_commissions.update(id, data)

export async function getAgentSummary(agentId) {
  const comms = await db.agent_commissions.where('agent_id').equals(agentId).toArray()
  const totalEarned = comms.reduce((s, c) => s + (c.amount || 0), 0)
  const totalPaid   = comms.filter(c => c.paid).reduce((s, c) => s + (c.amount || 0), 0)
  return { totalEarned, totalPaid, pending: totalEarned - totalPaid, count: comms.length }
}
