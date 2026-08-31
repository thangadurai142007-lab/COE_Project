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
    { id: 1, category_name: 'Rice', description: 'Basmati, Sona Masoori, Raw & Parboiled Rice' },
    { id: 2, category_name: 'Oil', description: 'Cooking Oil, Mustard Oil, Sunflower & Olive Oil' },
    { id: 3, category_name: 'Biscuits', description: 'Cookies, Cream Biscuits, Digestives & Crackers' },
    { id: 4, category_name: 'Beverages', description: 'Tea, Coffee, Fruit Juices & Soft Drinks' },
    { id: 5, category_name: 'Vegetables', description: 'Fresh Farm Produce, Onions, Potatoes & Greens' },
    { id: 6, category_name: 'Fruits', description: 'Fresh Apples, Bananas, Mangoes & Berries' },
    { id: 7, category_name: 'Dairy', description: 'Milk, Butter, Cheese, Curd & Paneer' },
    { id: 8, category_name: 'Snacks', description: 'Chips, Namkeen, Nuts & Chocolates' },
    { id: 9, category_name: 'Cleaning Products', description: 'Detergents, Dishwashers & Disinfectants' },
    { id: 10, category_name: 'Personal Care', description: 'Soaps, Shampoos, Toothpastes & Lotions' }
  ],
  suppliers: [
    { id: 1, name: 'Fresh Grain Co-op', phone: '+91 98765-43210', email: 'orders@freshgrain.in', address: '12 Harvest Lane, Punjab Farms' },
    { id: 2, name: 'SunGold Oils & Agro', phone: '+91 98765-43211', email: 'sales@sungold.in', address: '45 Industrial Park, Sector 4, Gujarat' },
    { id: 3, name: 'DairyFresh Foods Ltd', phone: '+91 98765-43212', email: 'supply@dairyfresh.in', address: '88 Milkway Blvd, Anand' },
    { id: 4, name: 'BakeWell FMCG', phone: '+91 98765-43213', email: 'contact@bakewell.in', address: '102 Confectionery St, Mumbai' }
  ],
  products: [
    {
      id: 101,
      product_name: 'Royal Basmati Rice 5kg',
      category_id: 1,
      category_name: 'Rice',
      brand: 'Royal Agro',
      purchase_price: 350.00,
      selling_price: 450.00,
      quantity: 150,
      min_stock_level: 30,
      unit: 'Kg',
      supplier: 'Fresh Grain Co-op',
      expiry_date: '2027-12-31',
      barcode: '8901234567890',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 102,
      product_name: 'Fortune Sunflower Oil 1L',
      category_id: 2,
      category_name: 'Oil',
      brand: 'Fortune',
      purchase_price: 110.00,
      selling_price: 135.00,
      quantity: 85,
      min_stock_level: 20,
      unit: 'Litre',
      supplier: 'SunGold Oils & Agro',
      expiry_date: '2027-06-30',
      barcode: '8901234567891',
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 103,
      product_name: 'Oreo Chocolate Biscuits 120g',
      category_id: 3,
      category_name: 'Biscuits',
      brand: 'Cadbury',
      purchase_price: 25.00,
      selling_price: 35.00,
      quantity: 200,
      min_stock_level: 40,
      unit: 'Packet',
      supplier: 'BakeWell FMCG',
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
      supplier: 'BakeWell FMCG',
      expiry_date: '2026-08-28',
      barcode: '8901234567893',
      image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 105,
      product_name: 'Farm Fresh Organic Milk 1L',
      category_id: 7,
      category_name: 'Dairy',
      brand: 'DairyFresh',
      purchase_price: 50.00,
      selling_price: 65.00,
      quantity: 5,
      min_stock_level: 15,
      unit: 'Litre',
      supplier: 'DairyFresh Foods Ltd',
      expiry_date: '2026-07-26',
      barcode: '8901234567894',
      image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=60'
    },
    {
      id: 106,
      product_name: 'Fresh Red Apples 1kg',
      category_id: 6,
      category_name: 'Fruits',
      brand: 'Washington Orchards',
      purchase_price: 120.00,
      selling_price: 160.00,
      quantity: 0,
      min_stock_level: 10,
      unit: 'Kg',
      supplier: 'Fresh Grain Co-op',
      expiry_date: '2026-08-05',
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
      supplier: 'SunGold Oils & Agro',
      expiry_date: '2028-01-01',
      barcode: '8901234567896',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60'
    }
  ],
  sales: [
    {
      id: 1001,
      product_id: 101,
      product_name: 'Royal Basmati Rice 5kg',
      category_name: 'Rice',
      quantity_sold: 25,
      unit_price: 450.00,
      total_price: 11250.00,
      date: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 1002,
      product_id: 102,
      product_name: 'Fortune Sunflower Oil 1L',
      category_name: 'Oil',
      quantity_sold: 15,
      unit_price: 135.00,
      total_price: 2025.00,
      date: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ]
};

function readData() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB file, using fallback:', err);
    return defaultData;
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// REST API Endpoints

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readData();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (user) {
    return res.json({ success: true, user: { id: user.id, username: user.username } });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// Categories API
app.get('/api/categories', (req, res) => {
  const db = readData();
  res.json(db.categories);
});

app.post('/api/categories', (req, res) => {
  const db = readData();
  const newCat = {
    id: Date.now(),
    category_name: req.body.category_name,
    description: req.body.description || ''
  };
  db.categories.push(newCat);
  writeData(db);
  res.json(newCat);
});

app.put('/api/categories/:id', (req, res) => {
  const db = readData();
  const id = parseInt(req.params.id);
  const index = db.categories.findIndex(c => c.id === id);
  if (index !== -1) {
    db.categories[index] = { ...db.categories[index], ...req.body };
    writeData(db);
    res.json(db.categories[index]);
  } else {
    res.status(404).json({ message: 'Category not found' });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const db = readData();
  const id = parseInt(req.params.id);
  db.categories = db.categories.filter(c => c.id !== id);
  writeData(db);
  res.json({ success: true });
});

// Products API
app.get('/api/products', (req, res) => {
  const db = readData();
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const db = readData();
  const p = req.body;
  const category = db.categories.find(c => c.id == p.category_id);
  
  const newProd = {
    id: Date.now(),
    product_name: p.product_name,
    category_id: p.category_id,
    category_name: category ? category.category_name : 'General',
    brand: p.brand || 'Generic',
    purchase_price: parseFloat(p.purchase_price) || 0,
    selling_price: parseFloat(p.selling_price) || 0,
    quantity: parseFloat(p.quantity) || 0,
    min_stock_level: parseFloat(p.min_stock_level) || 10,
    unit: p.unit || 'Piece',
    supplier: p.supplier || 'N/A',
    expiry_date: p.expiry_date || '',
    barcode: p.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
    image_url: p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'
  };
  
  db.products.push(newProd);
  writeData(db);
  res.json(newProd);
});

app.put('/api/products/:id', (req, res) => {
  const db = readData();
  const id = parseInt(req.params.id);
  const index = db.products.findIndex(p => p.id === id);
  if (index !== -1) {
    const updated = { ...db.products[index], ...req.body };
    if (req.body.category_id) {
      const cat = db.categories.find(c => c.id == req.body.category_id);
      if (cat) updated.category_name = cat.category_name;
    }
    db.products[index] = updated;
    writeData(db);
    res.json(updated);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const db = readData();
  const id = parseInt(req.params.id);
  db.products = db.products.filter(p => p.id !== id);
  writeData(db);
  res.json({ success: true });
});

// Sales & Stock Calculator API
app.get('/api/sales', (req, res) => {
  const db = readData();
  res.json(db.sales);
});

app.post('/api/sales', (req, res) => {
  const db = readData();
  const { product_id, quantity_sold, unit_price } = req.body;
  const prodIndex = db.products.findIndex(p => p.id == product_id);
  
  if (prodIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  
  const prod = db.products[prodIndex];
  const qty = parseFloat(quantity_sold);
  if (prod.quantity < qty) {
    return res.status(400).json({ message: 'Insufficient stock available!' });
  }
  
  prod.quantity -= qty;
  
  const sale = {
    id: Date.now(),
    product_id: prod.id,
    product_name: prod.product_name,
    category_name: prod.category_name,
    quantity_sold: qty,
    unit_price: parseFloat(unit_price || prod.selling_price),
    total_price: qty * parseFloat(unit_price || prod.selling_price),
    date: new Date().toISOString()
  };
  
  db.sales.unshift(sale);
  writeData(db);
  res.json({ success: true, sale, updated_product: prod });
});

// Suppliers API
app.get('/api/suppliers', (req, res) => {
  const db = readData();
  res.json(db.suppliers);
});

app.post('/api/suppliers', (req, res) => {
  const db = readData();
  const newSup = { id: Date.now(), ...req.body };
  db.suppliers.push(newSup);
  writeData(db);
  res.json(newSup);
});

// Backup & Restore API
app.get('/api/backup', (req, res) => {
  const db = readData();
  res.setHeader('Content-disposition', 'attachment; filename=grocery_inventory_backup.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/restore', (req, res) => {
  try {
    const data = req.body;
    if (!data.products || !data.categories) {
      return res.status(400).json({ message: 'Invalid backup file structure' });
    }
    writeData(data);
    res.json({ success: true, message: 'Database restored successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error restoring data: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Grocery Shop Inventory Calculator running at http://localhost:${PORT}`);
});
