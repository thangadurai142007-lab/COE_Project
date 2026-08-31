const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple JSON File DB / Persistent Storage fallback handler
const DB_FILE = path.join(__dirname, 'db_storage.json');

const defaultData = {
  users: [
    { id: 1, username: 'admin', password: 'password123' }
  ],
  categories: [
    { id: 1, category_name: 'Rice & Grains', description: 'Basmati, Sona Masoori, Wheat Atta, Raw & Parboiled Rice' },
    { id: 2, category_name: 'Oil & Ghee', description: 'Cooking Oil, Mustard Oil, Sunflower Oil & Pure Ghee' },
    { id: 3, category_name: 'Biscuits & Bakery', description: 'Cookies, Cream Biscuits, Digestives & Crackers' },
    { id: 4, category_name: 'Beverages', description: 'Tea, Coffee, Fruit Juices & Cold Drinks' },
    { id: 5, category_name: 'Vegetables', description: 'Fresh Farm Produce, Onions, Potatoes & Greens' },
    { id: 6, category_name: 'Fruits', description: 'Fresh Apples, Bananas, Mangoes & Berries' },
    { id: 7, category_name: 'Dairy & Eggs', description: 'Milk, Butter, Cheese, Paneer, Curd & Farm Eggs' },
    { id: 8, category_name: 'Snacks & Sweets', description: 'Chips, Namkeen, Nuts & Chocolates' },
    { id: 9, category_name: 'Cleaning Products', description: 'Detergents, Dishwashers & Disinfectants' },
    { id: 10, category_name: 'Personal Care', description: 'Soaps, Shampoos, Toothpastes & Lotions' }
  ],
  suppliers: [
    { id: 1, name: 'Fresh Grain Co-op India', phone: '+91 98765-43210', email: 'orders@freshgrain.in', address: '12 Harvest Lane, Punjab Farms' },
    { id: 2, name: 'SunGold Oils & Agro India', phone: '+91 98765-43211', email: 'sales@sungold.in', address: '45 Industrial Park, Sector 4, Gujarat' },
    { id: 3, name: 'DairyFresh Foods Ltd', phone: '+91 98765-43212', email: 'supply@dairyfresh.in', address: '88 Milkway Blvd, Anand, Gujarat' },
    { id: 4, name: 'BakeWell FMCG Distributors', phone: '+91 98765-43213', email: 'contact@bakewell.in', address: '102 Confectionery St, Mumbai' },
    { id: 5, name: 'Hindustan Consumer Goods', phone: '+91 98765-43214', email: 'support@hcgdistributors.in', address: '55 Commerce Hub, Bengaluru' }
  ],
  products: [
    {
      id: 101,
      product_name: 'Royal Basmati Rice 5kg',
      category_id: 1,
      category_name: 'Rice & Grains',
      brand: 'Royal Agro',
      purchase_price: 350.00,
      selling_price: 450.00,
      quantity: 150,
      min_stock_level: 30,
      unit: 'Kg',
      supplier: 'Fresh Grain Co-op India',
      expiry_date: '2027-12-31',
      barcode: '8901234567890',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 102,
      product_name: 'Fortune Sunflower Oil 1L',
      category_id: 2,
      category_name: 'Oil & Ghee',
      brand: 'Fortune',
      purchase_price: 110.00,
      selling_price: 135.00,
      quantity: 85,
      min_stock_level: 20,
      unit: 'Litre',
      supplier: 'SunGold Oils & Agro India',
      expiry_date: '2027-06-30',
      barcode: '8901234567891',
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 103,
      product_name: 'Oreo Chocolate Biscuits 120g',
      category_id: 3,
      category_name: 'Biscuits & Bakery',
      brand: 'Cadbury',
      purchase_price: 25.00,
      selling_price: 35.00,
      quantity: 200,
      min_stock_level: 40,
      unit: 'Packet',
      supplier: 'BakeWell FMCG Distributors',
      expiry_date: '2026-11-15',
      barcode: '8901234567892',
      image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 104,
      product_name: 'Tropicana Orange Juice 1L',
      category_id: 4,
      category_name: 'Beverages',
      brand: 'Tropicana',
      purchase_price: 85.00,
      selling_price: 110.00,
      quantity: 12,
      min_stock_level: 15,
      unit: 'Tetra Pack',
      supplier: 'BakeWell FMCG Distributors',
      expiry_date: '2026-09-28',
      barcode: '8901234567893',
      image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 105,
      product_name: 'Farm Fresh Organic Milk 1L',
      category_id: 7,
      category_name: 'Dairy & Eggs',
      brand: 'DairyFresh',
      purchase_price: 50.00,
      selling_price: 65.00,
      quantity: 5,
      min_stock_level: 15,
      unit: 'Litre',
      supplier: 'DairyFresh Foods Ltd',
      expiry_date: '2026-09-10',
      barcode: '8901234567894',
      image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 106,
      product_name: 'Fresh Red Apples 1kg',
      category_id: 6,
      category_name: 'Fruits',
      brand: 'Shimla Orchards',
      purchase_price: 120.00,
      selling_price: 160.00,
      quantity: 0,
      min_stock_level: 10,
      unit: 'Kg',
      supplier: 'Fresh Grain Co-op India',
      expiry_date: '2026-09-15',
      barcode: '8901234567895',
      image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 107,
      product_name: 'Lysol Surface Cleaner 500ml',
      category_id: 9,
      category_name: 'Cleaning Products',
      brand: 'Lysol',
      purchase_price: 160.00,
      selling_price: 199.00,
      quantity: 45,
      min_stock_level: 10,
      unit: 'Bottle',
      supplier: 'Hindustan Consumer Goods',
      expiry_date: '2028-01-01',
      barcode: '8901234567896',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 108,
      product_name: 'Amul Pasteurized Butter 500g',
      category_id: 7,
      category_name: 'Dairy & Eggs',
      brand: 'Amul',
      purchase_price: 230.00,
      selling_price: 275.00,
      quantity: 60,
      min_stock_level: 15,
      unit: 'Packet',
      supplier: 'DairyFresh Foods Ltd',
      expiry_date: '2027-02-15',
      barcode: '8901234567897',
      image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 109,
      product_name: 'Aashirvaad Whole Wheat Atta 5kg',
      category_id: 1,
      category_name: 'Rice & Grains',
      brand: 'Aashirvaad',
      purchase_price: 220.00,
      selling_price: 270.00,
      quantity: 95,
      min_stock_level: 25,
      unit: 'Kg',
      supplier: 'Fresh Grain Co-op India',
      expiry_date: '2027-08-20',
      barcode: '8901234567898',
      image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 110,
      product_name: 'Nescafe Classic Coffee 100g',
      category_id: 4,
      category_name: 'Beverages',
      brand: 'Nescafe',
      purchase_price: 290.00,
      selling_price: 350.00,
      quantity: 40,
      min_stock_level: 10,
      unit: 'Bottle',
      supplier: 'Hindustan Consumer Goods',
      expiry_date: '2027-11-30',
      barcode: '8901234567899',
      image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=60'
    }
  ],
  sales: [
    {
      id: 1001,
      product_id: 101,
      product_name: 'Royal Basmati Rice 5kg',
      category_name: 'Rice & Grains',
      quantity_sold: 25,
      unit_price: 450.00,
      total_price: 11250.00,
      date: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 1002,
      product_id: 102,
      product_name: 'Fortune Sunflower Oil 1L',
      category_name: 'Oil & Ghee',
      quantity_sold: 15,
      unit_price: 135.00,
      total_price: 2025.00,
      date: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: 1003,
      product_id: 108,
      product_name: 'Amul Pasteurized Butter 500g',
      category_name: 'Dairy & Eggs',
      quantity_sold: 10,
      unit_price: 275.00,
      total_price: 2750.00,
      date: new Date().toISOString()
    }
  ]
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE);
    return JSON.parse(raw);
  } catch (err) {
    console.error("DB Read error:", err);
    return defaultData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("DB Write error:", err);
  }
}

// API Routes
app.get('/api/categories', (req, res) => {
  const db = readDB();
  res.json(db.categories || []);
});

app.post('/api/categories', (req, res) => {
  const db = readDB();
  const newCat = { id: Date.now(), ...req.body };
  db.categories.push(newCat);
  writeDB(db);
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', (req, res) => {
  const db = readDB();
  const index = db.categories.findIndex(c => c.id == req.params.id);
  if (index !== -1) {
    db.categories[index] = { ...db.categories[index], ...req.body };
    writeDB(db);
    return res.json(db.categories[index]);
  }
  res.status(404).json({ error: 'Category not found' });
});

app.delete('/api/categories/:id', (req, res) => {
  const db = readDB();
  db.categories = db.categories.filter(c => c.id != req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json(db.products || []);
});

app.post('/api/products', (req, res) => {
  const db = readDB();
  const category = db.categories.find(c => c.id == req.body.category_id);
  const newProd = {
    id: Date.now(),
    product_name: req.body.product_name,
    category_id: req.body.category_id,
    category_name: category ? category.category_name : 'General',
    brand: req.body.brand || 'Generic',
    purchase_price: parseFloat(req.body.purchase_price) || 0,
    selling_price: parseFloat(req.body.selling_price) || 0,
    quantity: parseFloat(req.body.quantity) || 0,
    min_stock_level: parseFloat(req.body.min_stock_level) || 10,
    unit: req.body.unit || 'Piece',
    supplier: req.body.supplier || 'N/A',
    expiry_date: req.body.expiry_date || '',
    barcode: req.body.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
    image_url: req.body.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'
  };
  db.products.push(newProd);
  writeDB(db);
  res.status(201).json(newProd);
});

app.put('/api/products/:id', (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id == req.params.id);
  if (index !== -1) {
    const updated = { ...db.products[index], ...req.body };
    if (req.body.category_id) {
      const cat = db.categories.find(c => c.id == req.body.category_id);
      if (cat) updated.category_name = cat.category_name;
    }
    db.products[index] = updated;
    writeDB(db);
    return res.json(updated);
  }
  res.status(404).json({ error: 'Product not found' });
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDB();
  db.products = db.products.filter(p => p.id != req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/sales', (req, res) => {
  const db = readDB();
  res.json(db.sales || []);
});

app.post('/api/sales', (req, res) => {
  const db = readDB();
  const pIndex = db.products.findIndex(p => p.id == req.body.product_id);
  if (pIndex === -1) return res.status(404).json({ error: 'Product not found' });

  const prod = db.products[pIndex];
  const qty = parseFloat(req.body.quantity_sold);
  if (prod.quantity < qty) return res.status(400).json({ error: 'Insufficient stock!' });

  prod.quantity -= qty;
  const sale = {
    id: Date.now(),
    product_id: prod.id,
    product_name: prod.product_name,
    category_name: prod.category_name,
    quantity_sold: qty,
    unit_price: parseFloat(req.body.unit_price || prod.selling_price),
    total_price: qty * parseFloat(req.body.unit_price || prod.selling_price),
    date: new Date().toISOString()
  };

  db.sales.unshift(sale);
  writeDB(db);
  res.status(201).json({ success: true, sale, updated_product: prod });
});

app.get('/api/suppliers', (req, res) => {
  const db = readDB();
  res.json(db.suppliers || []);
});

app.post('/api/suppliers', (req, res) => {
  const db = readDB();
  const newSup = { id: Date.now(), ...req.body };
  db.suppliers.push(newSup);
  writeDB(db);
  res.status(201).json(newSup);
});

app.delete('/api/suppliers/:id', (req, res) => {
  const db = readDB();
  db.suppliers = db.suppliers.filter(s => s.id != req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/backup', (req, res) => {
  const db = readDB();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="grocery_inventory_backup.json"');
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/restore', (req, res) => {
  if (!req.body || !req.body.products || !req.body.categories) {
    return res.status(400).json({ error: 'Invalid backup structure' });
  }
  writeDB(req.body);
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Grocery Shop Inventory Calculator running at http://localhost:${PORT}`);
});
