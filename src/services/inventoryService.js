import db from '../db/database.js'

export const getAll = () => db.inventory.toArray()

export const getById = (id) => db.inventory.get(id)

export const add = (data) => db.inventory.add(data)

export const update = (id, data) => db.inventory.update(id, data)

export const remove = (id) => db.inventory.delete(id)

export async function addStock(itemId, qty, notes = '') {
  const item = await db.inventory.get(itemId)
  if (!item) throw new Error('Item not found')
  await db.inventory.update(itemId, { qty: (item.qty || 0) + qty })
  await db.stock_movement.add({ item_id: itemId, date: new Date().toISOString().split('T')[0], type: 'in', qty, notes })
}

export async function reduceStock(itemId, qty, notes = '') {
  const item = await db.inventory.get(itemId)
  if (!item) throw new Error('Item not found')
  if ((item.qty || 0) < qty) throw new Error('Insufficient stock')
  await db.inventory.update(itemId, { qty: (item.qty || 0) - qty })
  await db.stock_movement.add({ item_id: itemId, date: new Date().toISOString().split('T')[0], type: 'out', qty, notes })
}

export async function getLowStock() {
  const all = await db.inventory.toArray()
  return all.filter(i => (i.qty || 0) <= (i.reorder_level || 0))
}

export const getMovements = (itemId) => db.stock_movement.where('item_id').equals(itemId).toArray()
