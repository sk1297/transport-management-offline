import Dexie from 'dexie'

export const db = new Dexie('TransportManagementDB')

db.version(1).stores({
  staff:          '++id, name, mobile, password, role, isActive',
  vehicles:       '++id, name, type, reg_no, insurance_expiry, puc_expiry, next_service_km, status',
  drivers:        '++id, name, phone, license_no, license_expiry, status',
  vendors:        '++id, name, type, phone, gstin',
  trips:          '++id, vehicle_id, driver_id, from_loc, to_loc, start_date, end_date, status',
  lr_bilty:       '++id, trip_id, lr_no, date, consignor, consignee, freight, pay_type, status',
  expenses:       '++id, trip_id, vehicle_id, category, amount, date, vendor_id',
  diesel_logs:    '++id, vehicle_id, date, litres, rate, amount, km_reading, vendor_id',
  toll_logs:      '++id, trip_id, location, amount, date',
  loans:          '++id, vehicle_id, bank_name, loan_amount, emi_amount, start_date, tenure_months, paid_emis',
  loan_payments:  '++id, loan_id, date, amount',
  attendance:     '++id, driver_id, date, status',
  salary:         '++id, driver_id, month, year, basic, allowance, advance_deducted, net_paid',
  advances:       '++id, driver_id, date, amount, recovered',
  accounts:       '++id, date, type, category, debit, credit, ref_type, ref_id',
  inventory:      '++id, item_name, category, qty, unit, rate, reorder_level',
  stock_movement: '++id, item_id, date, type, qty',
  vendor_ledger:  '++id, vendor_id, date, type, amount, notes',
  settings:       '++id, key, value',
})

db.on('ready', async () => {
  const staffCount = await db.staff.count()
  if (staffCount > 0) return

  const today = new Date()
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
  const daysLater = (n) => { const d = new Date(today); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0] }
  const monthsLater = (n) => { const d = new Date(today); d.setMonth(d.getMonth()+n); return d.toISOString().split('T')[0] }

  // Staff
  await db.staff.bulkAdd([
    { name: 'Ramesh Kumar',  mobile: '9000000001', password: 'Admin@123', role: 'owner',   isActive: 1 },
    { name: 'Suresh Verma',  mobile: '9000000002', password: 'Admin@123', role: 'manager', isActive: 1 },
    { name: 'Priya Singh',   mobile: '9000000003', password: '1234',      role: 'staff',   isActive: 1 },
  ])

  // Vehicles
  const v1 = await db.vehicles.add({ name: 'Tata 407',        type: 'Truck',  reg_no: 'MH 12 AB 1234', owner: 'Ramesh Kumar', insurance_expiry: daysLater(20), puc_expiry: daysLater(15), next_service_km: 85000, current_km: 82000, status: 'Active' })
  const v2 = await db.vehicles.add({ name: 'Ashok Leyland',   type: 'Truck',  reg_no: 'MH 12 CD 5678', owner: 'Ramesh Kumar', insurance_expiry: monthsLater(6), puc_expiry: monthsLater(4), next_service_km: 120000, current_km: 115000, status: 'Active' })
  const v3 = await db.vehicles.add({ name: 'Mahindra Bolero', type: 'Pickup', reg_no: 'MH 12 EF 9012', owner: 'Ramesh Kumar', insurance_expiry: daysLater(25), puc_expiry: monthsLater(3), next_service_km: 60000, current_km: 58000, status: 'Active' })

  // Drivers
  const d1 = await db.drivers.add({ name: 'Raju Yadav',    phone: '9111000001', license_no: 'MH1220220001234', license_expiry: monthsLater(18), address: 'Pune, Maharashtra', join_date: daysAgo(365), status: 'Active' })
  const d2 = await db.drivers.add({ name: 'Mohan Patel',   phone: '9111000002', license_no: 'MH1220210005678', license_expiry: monthsLater(12), address: 'Nashik, Maharashtra', join_date: daysAgo(180), status: 'Active' })
  const d3 = await db.drivers.add({ name: 'Sunil Sharma',  phone: '9111000003', license_no: 'MH1220230009012', license_expiry: monthsLater(24), address: 'Mumbai, Maharashtra', join_date: daysAgo(90), status: 'Active' })

  // Vendors
  const vend1 = await db.vendors.add({ name: 'HP Fuel Station', type: 'Fuel Station', phone: '9200000001', gstin: '27AABCH1234A1Z5', address: 'Pune Nagar Road', contact_person: 'Hemant' })
  const vend2 = await db.vendors.add({ name: 'Shree Auto Works', type: 'Repair Shop',  phone: '9200000002', gstin: '',                address: 'MIDC, Pune',      contact_person: 'Yogesh' })
  const vend3 = await db.vendors.add({ name: 'Raj Tyres & Spares', type: 'Spare Parts', phone: '9200000003', gstin: '27AABCR5678B1Z3', address: 'Kondhwa, Pune', contact_person: 'Rajesh' })

  // Trips
  const t1 = await db.trips.add({ vehicle_id: v1, driver_id: d1, from_loc: 'Pune', to_loc: 'Mumbai', start_date: daysAgo(10), end_date: daysAgo(8), status: 'Completed', notes: 'Regular cargo run' })
  const t2 = await db.trips.add({ vehicle_id: v2, driver_id: d2, from_loc: 'Nashik', to_loc: 'Pune',   start_date: daysAgo(3),  end_date: null,       status: 'Active',    notes: 'Freight from warehouse' })
  const t3 = await db.trips.add({ vehicle_id: v3, driver_id: d3, from_loc: 'Pune', to_loc: 'Solapur', start_date: daysLater(2), end_date: null,       status: 'Planned',   notes: 'Delivery scheduled' })

  // LR/Bilty
  await db.lr_bilty.bulkAdd([
    { trip_id: t1, lr_no: 'LR-2026-001', date: daysAgo(10), consignor: 'ABC Traders', consignee: 'XYZ Enterprises', from: 'Pune', to: 'Mumbai', goods_desc: 'Cotton Fabric',     weight: 500, packages: 20, freight: 8500, pay_type: 'Paid',          status: 'Delivered' },
    { trip_id: t1, lr_no: 'LR-2026-002', date: daysAgo(10), consignor: 'Mehta & Co',  consignee: 'Global Impex',     from: 'Pune', to: 'Mumbai', goods_desc: 'Machinery Parts',  weight: 300, packages: 10, freight: 6000, pay_type: 'To-Pay',         status: 'Delivered' },
    { trip_id: t2, lr_no: 'LR-2026-003', date: daysAgo(3),  consignor: 'Pune Depot',  consignee: 'Nashik Traders',   from: 'Nashik', to: 'Pune', goods_desc: 'Electronic Goods', weight: 200, packages: 15, freight: 4500, pay_type: 'To-Be-Billed',   status: 'In Transit' },
    { trip_id: t2, lr_no: 'LR-2026-004', date: daysAgo(3),  consignor: 'Fresh Farm',  consignee: 'City Mart',        from: 'Nashik', to: 'Pune', goods_desc: 'Agricultural Produce', weight: 800, packages: 40, freight: 9000, pay_type: 'To-Pay',    status: 'In Transit' },
  ])

  // Expenses
  await db.expenses.bulkAdd([
    { trip_id: t1, vehicle_id: v1, category: 'Diesel', amount: 3200, date: daysAgo(10), vendor_id: vend1, notes: 'Full tank fill' },
    { trip_id: t1, vehicle_id: v1, category: 'Toll',   amount: 450,  date: daysAgo(10), vendor_id: null,  notes: 'Pune-Mumbai expressway' },
    { trip_id: t2, vehicle_id: v2, category: 'Diesel', amount: 5600, date: daysAgo(3),  vendor_id: vend1, notes: 'Nashik fuel stop' },
    { trip_id: null, vehicle_id: v1, category: 'Repair', amount: 2800, date: daysAgo(5), vendor_id: vend2, notes: 'Brake pad replacement' },
    { trip_id: null, vehicle_id: v2, category: 'Tyre',   amount: 14000, date: daysAgo(7), vendor_id: vend3, notes: '2 new tyres fitted' },
    { trip_id: null, vehicle_id: null, category: 'Miscellaneous', amount: 500, date: daysAgo(2), vendor_id: null, notes: 'Office supplies' },
  ])

  // Diesel logs
  await db.diesel_logs.bulkAdd([
    { vehicle_id: v1, date: daysAgo(10), litres: 80, rate: 100, amount: 8000, km_reading: 81000, vendor_id: vend1 },
    { vehicle_id: v2, date: daysAgo(3),  litres: 100, rate: 100, amount: 10000, km_reading: 114000, vendor_id: vend1 },
    { vehicle_id: v3, date: daysAgo(5),  litres: 50,  rate: 100, amount: 5000,  km_reading: 57500, vendor_id: vend1 },
  ])

  // Toll logs
  await db.toll_logs.bulkAdd([
    { trip_id: t1, location: 'Pune-Mumbai Expressway - Entry', amount: 225, date: daysAgo(10) },
    { trip_id: t1, location: 'Pune-Mumbai Expressway - Exit',  amount: 225, date: daysAgo(10) },
    { trip_id: t2, location: 'Nashik-Pune Toll Plaza',         amount: 180, date: daysAgo(3) },
  ])

  // Loans
  await db.loans.add({ vehicle_id: v2, bank_name: 'HDFC Bank', loan_amount: 1500000, emi_amount: 28500, start_date: daysAgo(180), tenure_months: 60, paid_emis: 6, status: 'Active' })

  // Inventory
  await db.inventory.bulkAdd([
    { item_name: 'Engine Oil 5W-30 (5L)', category: 'Lubricants',  qty: 10, unit: 'Can',  rate: 850,  reorder_level: 5 },
    { item_name: 'Brake Fluid',           category: 'Fluids',      qty: 6,  unit: 'Bottle', rate: 250, reorder_level: 3 },
    { item_name: 'Air Filter',            category: 'Filters',     qty: 4,  unit: 'Pcs',  rate: 350,  reorder_level: 4 },
    { item_name: 'Tyre Pressure Gauge',   category: 'Tools',       qty: 2,  unit: 'Pcs',  rate: 500,  reorder_level: 1 },
    { item_name: 'LED Headlight Bulb',    category: 'Electricals', qty: 8,  unit: 'Pcs',  rate: 450,  reorder_level: 4 },
    { item_name: 'Coolant (1L)',          category: 'Fluids',      qty: 3,  unit: 'Bottle', rate: 200, reorder_level: 4 },
  ])

  // Accounts
  await db.accounts.bulkAdd([
    { date: daysAgo(10), type: 'credit', category: 'Income',  debit: 0,    credit: 8500, ref_type: 'lr',      ref_id: 1, narration: 'Freight received LR-2026-001' },
    { date: daysAgo(10), type: 'debit',  category: 'Expense', debit: 3200, credit: 0,    ref_type: 'expense', ref_id: 1, narration: 'Diesel - Tata 407' },
    { date: daysAgo(10), type: 'debit',  category: 'Expense', debit: 450,  credit: 0,    ref_type: 'expense', ref_id: 2, narration: 'Toll - Pune-Mumbai' },
    { date: daysAgo(7),  type: 'debit',  category: 'Expense', debit: 14000, credit: 0,   ref_type: 'expense', ref_id: 5, narration: 'Tyres - Ashok Leyland' },
    { date: daysAgo(5),  type: 'debit',  category: 'Expense', debit: 2800, credit: 0,    ref_type: 'expense', ref_id: 4, narration: 'Repair - Brake pads' },
  ])

  // Vendor ledger
  await db.vendor_ledger.bulkAdd([
    { vendor_id: vend1, date: daysAgo(10), type: 'debit',  amount: 3200,  notes: 'Diesel - Tata 407' },
    { vendor_id: vend1, date: daysAgo(3),  type: 'debit',  amount: 5600,  notes: 'Diesel - Ashok Leyland' },
    { vendor_id: vend2, date: daysAgo(5),  type: 'debit',  amount: 2800,  notes: 'Brake pad replacement' },
    { vendor_id: vend3, date: daysAgo(7),  type: 'debit',  amount: 14000, notes: '2 tyres - Ashok Leyland' },
    { vendor_id: vend3, date: daysAgo(7),  type: 'credit', amount: 14000, notes: 'Payment made - cash' },
  ])

  // Settings
  await db.settings.bulkAdd([
    { key: 'company_name',  value: 'Ramesh Transport Co.' },
    { key: 'owner_name',    value: 'Ramesh Kumar' },
    { key: 'phone',         value: '9000000001' },
    { key: 'gstin',         value: '27AABCR1234A1Z5' },
    { key: 'address',       value: 'Survey No. 45, Kondhwa, Pune - 411048' },
    { key: 'lr_prefix',     value: 'LR' },
    { key: 'lr_counter',    value: '4' },
  ])

  console.log('✅ TransportManagementDB seeded successfully')
})

export default db
