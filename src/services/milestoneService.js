import db from '../db/database.js'

export const STAGES = ['Planned', 'Departed', 'In Transit', 'Reached', 'Delivered', 'Returned']

export const getByTrip = (tripId) =>
  db.trip_milestones.where('trip_id').equals(tripId).sortBy('datetime')

export const add = (data) => db.trip_milestones.add({
  ...data,
  datetime: data.datetime || new Date().toISOString(),
})

export const remove = (id) => db.trip_milestones.delete(id)
