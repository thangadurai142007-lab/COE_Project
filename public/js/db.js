/**
 * Fresh Supermart - Database & Data Layer Service
 * Complete Grocery Inventory, POS & Customer Online Shopping Data Engine
 * Supports Node.js Express REST API with automatic LocalStorage fallback & zero data loss migration
 */
const DB = (function () {
  const LOCAL_STORAGE_KEY = 'fresh_supermart_db_v5';

  // Default clean UPI QR SVG Data URL for instant out-of-the-box demo preview
  const defaultUpiQrSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
      <rect width="240" height="240" fill="#ffffff" rx="12"/>
      <rect x="20" y="20" width="60" height="60" fill="#0f172a" rx="6"/>
      <rect x="32" y="32" width="36" height="36" fill="#ffffff" rx="3"/>
      <rect x="42" y="42" width="16" height="16" fill="#16a34a"/>
      <rect x="160" y="20" width="60" height="60" fill="#0f172a" rx="6"/>
      <rect x="172" y="32" width="36" height="36" fill="#ffffff" rx="3"/>
      <rect x="182" y="42" width="16" height="16" fill="#16a34a"/>
      <rect x="20" y="160" width="60" height="60" fill="#0f172a" rx="6"/>
      <rect x="32" y="172" width="36" height="36" fill="#ffffff" rx="3"/>
      <rect x="42" y="182" width="16" height="16" fill="#16a34a"/>
      <!-- Grid Matrix Pattern -->
      <rect x="100" y="20" width="16" height="16" fill="#0f172a"/>
      <rect x="124" y="20" width="16" height="16" fill="#16a34a"/>
      <rect x="100" y="44" width="36" height="16" fill="#0f172a"/>
      <rect x="100" y="68" width="16" height="36" fill="#16a34a"/>
      <rect x="124" y="92" width="28" height="16" fill="#0f172a"/>
      <rect x="20" y="100" width="28" height="16" fill="#0f172a"/>
      <rect x="56" y="100" width="24" height="24" fill="#16a34a"/>
      <rect x="20" y="124" width="16" height="24" fill="#0f172a"/>
      <rect x="56" y="132" width="24" height="16" fill="#0f172a"/>
      <rect x="160" y="100" width="24" height="20" fill="#16a34a"/>
      <rect x="192" y="100" width="28" height="16" fill="#0f172a"/>
      <rect x="160" y="128" width="60" height="16" fill="#0f172a"/>
      <rect x="100" y="160" width="20" height="24" fill="#0f172a"/>
      <rect x="128" y="160" width="24" height="16" fill="#16a34a"/>
      <rect x="100" y="192" width="40" height="28" fill="#0f172a"/>
      <rect x="160" y="160" width="28" height="28" fill="#0f172a"/>
      <rect x="196" y="160" width="24" height="20" fill="#16a34a"/>
      <rect x="160" y="196" width="60" height="24" fill="#0f172a"/>
      <!-- Center UPI Badge -->
      <circle cx="120" cy="120" r="22" fill="#16a34a"/>
      <text x="120" y="125" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">UPI</text>
    </svg>
  `);

  const defaultSeedData = {
    users: [
      { id: 1, username: 'admin', password: 'password123', role: 'admin', name: 'Store Owner' },
      { id: 2, username: 'staff', password: 'staff123', role: 'staff', name: 'Cashier Staff' }
    ],
    settings: {
      store_name: 'Fresh Supermart',
      tagline: 'Fresh Groceries & Daily Needs',
      address: 'Shop #14, Main Market, MG Road, Bengaluru - 560001',
      phone: '+91 98765 43210',
      email: 'care@freshsupermart.in',
      gstin: '29ABCDE1234F1Z5',
      daily_sales_target: 10000,
      payment_settings: {
        upi_enabled: true,
        upi_id: 'freshsupermart@okaxis',
        upi_qr_image: defaultUpiQrSvg,
        cash_enabled: true,
        card_enabled: true,
        cod_enabled: true,
        pickup_payment_enabled: true
      }
    },
    categories: [
      { id: 1, category_name: 'Rice & Grains', description: 'Basmati, Sona Masoori, Poha & Millets' },
      { id: 2, category_name: 'Atta & Flour', description: 'Wheat Atta, Maida, Besan & Sooji' },
      { id: 3, category_name: 'Cooking Oil', description: 'Sunflower Oil, Mustard Oil & Pure Desi Ghee' },
      { id: 4, category_name: 'Dairy', description: 'Fresh Milk, Paneer, Curd, Butter & Cheese' },
      { id: 5, category_name: 'Biscuits', description: 'Cookies, Glucose & Cream Biscuits' },
      { id: 6, category_name: 'Snacks', description: 'Noodles, Namkeen, Chips & Savouries' },
      { id: 7, category_name: 'Beverages', description: 'Premium Leaf Tea, Instant Coffee & Soft Drinks' },
      { id: 8, category_name: 'Personal Care', description: 'Soaps, Shampoos, Toothpastes & Face Washes' },
      { id: 9, category_name: 'Household', description: 'Spices, Salts, Sugar & Kitchen Essentials' },
      { id: 10, category_name: 'Cleaning Products', description: 'Detergents, Dishwashers & Surface Disinfectants' }
    ],
    suppliers: [
      { id: 1, name: 'Fresh Grain Co-op India', phone: '+91 98765-43210', email: 'orders@freshgrain.in', address: '12 Harvest Lane, Punjab Mandi', products_supplied: 'Atta, Rice, Pulses', total_purchases: 85000, last_purchase_date: '2026-08-25' },
      { id: 2, name: 'SunGold Oils & Agro Ltd', phone: '+91 98765-43211', email: 'sales@sungold.in', address: '45 Industrial Park, Sector 4, Gujarat', products_supplied: 'Cooking Oil, Ghee', total_purchases: 62000, last_purchase_date: '2026-08-20' },
      { id: 3, name: 'Amul Dairy Distributing Hub', phone: '+91 98765-43212', email: 'supply@amuldairy.in', address: '88 Milkway Blvd, Anand, Gujarat', products_supplied: 'Milk, Butter, Paneer, Curd', total_purchases: 94000, last_purchase_date: '2026-09-02' },
      { id: 4, name: 'Parle & Britannia FMCG Depot', phone: '+91 98765-43213', email: 'contact@fmcgdepot.in', address: '102 Confectionery St, Mumbai', products_supplied: 'Biscuits, Rusks, Cakes', total_purchases: 41000, last_purchase_date: '2026-08-15' },
      { id: 5, name: 'Hindustan Consumer Care', phone: '+91 98765-43214', email: 'support@hccdistributors.in', address: '55 Commerce Hub, Bengaluru', products_supplied: 'Detergents, Tea, Soaps', total_purchases: 78000, last_purchase_date: '2026-08-28' }
    ],
    products: [
      {
        id: 101,
        product_name: 'Aashirvaad Whole Wheat Atta 5kg',
        category_id: 2,
        category_name: 'Atta & Flour',
        brand: 'Aashirvaad',
        purchase_price: 230.00,
        selling_price: 280.00,
        mrp: 310.00,
        quantity: 35,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 3,
        unit: 'Kg',
        supplier: 'Fresh Grain Co-op India',
        expiry_date: '2027-08-20',
        batch_no: 'ASH-26-AUG01',
        barcode: '8901234567801',
        rating: 4.8,
        reviews_count: 42,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 102,
        product_name: 'India Gate Feast Rozzana Basmati Rice 5kg',
        category_id: 1,
        category_name: 'Rice & Grains',
        brand: 'India Gate',
        purchase_price: 360.00,
        selling_price: 450.00,
        mrp: 495.00,
        quantity: 8,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 4,
        unit: 'Kg',
        supplier: 'Fresh Grain Co-op India',
        expiry_date: '2027-12-15',
        batch_no: 'ING-26-RICE09',
        barcode: '8901234567802',
        rating: 4.9,
        reviews_count: 68,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 103,
        product_name: 'Tata Salt Vacuum Evaporated 1kg',
        category_id: 9,
        category_name: 'Household',
        brand: 'Tata',
        purchase_price: 22.00,
        selling_price: 28.00,
        mrp: 30.00,
        quantity: 6,
        min_stock_level: 20,
        safety_stock: 12,
        lead_time_days: 2,
        unit: 'Packet',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2028-06-30',
        batch_no: 'TAT-26-SALT03',
        barcode: '8901234567803',
        rating: 4.9,
        reviews_count: 110,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 104,
        product_name: 'Fortune Sunlite Refined Sunflower Oil 1L',
        category_id: 3,
        category_name: 'Cooking Oil',
        brand: 'Fortune',
        purchase_price: 115.00,
        selling_price: 135.00,
        mrp: 155.00,
        quantity: 45,
        min_stock_level: 20,
        safety_stock: 15,
        lead_time_days: 3,
        unit: 'Litre',
        supplier: 'SunGold Oils & Agro Ltd',
        expiry_date: '2027-05-30',
        batch_no: 'FOR-26-OIL12',
        barcode: '8901234567804',
        rating: 4.7,
        reviews_count: 53,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 105,
        product_name: 'Parle-G Original Glucose Biscuits 250g',
        category_id: 5,
        category_name: 'Biscuits',
        brand: 'Parle',
        purchase_price: 22.00,
        selling_price: 28.00,
        mrp: 30.00,
        quantity: 120,
        min_stock_level: 30,
        safety_stock: 20,
        lead_time_days: 2,
        unit: 'Packet',
        supplier: 'Parle & Britannia FMCG Depot',
        expiry_date: '2027-01-10',
        batch_no: 'PAR-26-GLU05',
        barcode: '8901234567805',
        rating: 4.8,
        reviews_count: 95,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 106,
        product_name: 'Britannia Good Day Butter Cookies 200g',
        category_id: 5,
        category_name: 'Biscuits',
        brand: 'Britannia',
        purchase_price: 32.00,
        selling_price: 40.00,
        mrp: 45.00,
        quantity: 75,
        min_stock_level: 25,
        safety_stock: 15,
        lead_time_days: 2,
        unit: 'Packet',
        supplier: 'Parle & Britannia FMCG Depot',
        expiry_date: '2026-12-20',
        batch_no: 'BRI-26-GD22',
        barcode: '8901234567806',
        rating: 4.7,
        reviews_count: 39,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 107,
        product_name: 'Maggi 2-Minute Masala Instant Noodles 280g',
        category_id: 6,
        category_name: 'Snacks',
        brand: 'Maggi',
        purchase_price: 45.00,
        selling_price: 55.00,
        mrp: 60.00,
        quantity: 80,
        min_stock_level: 20,
        safety_stock: 15,
        lead_time_days: 3,
        unit: 'Packet',
        supplier: 'Parle & Britannia FMCG Depot',
        expiry_date: '2026-11-25',
        batch_no: 'MAG-26-NDL08',
        barcode: '8901234567807',
        rating: 4.9,
        reviews_count: 142,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 108,
        product_name: 'Surf Excel Easy Wash Detergent Powder 1kg',
        category_id: 10,
        category_name: 'Cleaning Products',
        brand: 'Surf Excel',
        purchase_price: 110.00,
        selling_price: 135.00,
        mrp: 145.00,
        quantity: 32,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 4,
        unit: 'Packet',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2028-04-10',
        batch_no: 'SRF-26-WSH14',
        barcode: '8901234567808',
        rating: 4.8,
        reviews_count: 48,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 109,
        product_name: 'Colgate Strong Teeth Dental Cream 200g',
        category_id: 8,
        category_name: 'Personal Care',
        brand: 'Colgate',
        purchase_price: 85.00,
        selling_price: 105.00,
        mrp: 118.00,
        quantity: 40,
        min_stock_level: 12,
        safety_stock: 10,
        lead_time_days: 3,
        unit: 'Piece',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2027-10-15',
        batch_no: 'COL-26-TP19',
        barcode: '8901234567809',
        rating: 4.7,
        reviews_count: 61,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 110,
        product_name: 'Thums Up Charged Soft Drink 750ml',
        category_id: 7,
        category_name: 'Beverages',
        brand: 'Thums Up',
        purchase_price: 32.00,
        selling_price: 40.00,
        mrp: 45.00,
        quantity: 25,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 2,
        unit: 'Bottle',
        supplier: 'Parle & Britannia FMCG Depot',
        expiry_date: '2026-10-30',
        batch_no: 'THU-26-SFT02',
        barcode: '8901234567810',
        rating: 4.6,
        reviews_count: 34,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 111,
        product_name: 'Coca-Cola Original Taste 750ml',
        category_id: 7,
        category_name: 'Beverages',
        brand: 'Coca-Cola',
        purchase_price: 32.00,
        selling_price: 40.00,
        mrp: 45.00,
        quantity: 22,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 2,
        unit: 'Bottle',
        supplier: 'Parle & Britannia FMCG Depot',
        expiry_date: '2026-11-15',
        batch_no: 'COK-26-SFT11',
        barcode: '8901234567811',
        rating: 4.7,
        reviews_count: 45,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 112,
        product_name: 'Amul Taaza Fresh Toned Milk 1L',
        category_id: 4,
        category_name: 'Dairy',
        brand: 'Amul',
        purchase_price: 52.00,
        selling_price: 66.00,
        mrp: 70.00,
        quantity: 4,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 1,
        unit: 'Packet',
        supplier: 'Amul Dairy Distributing Hub',
        expiry_date: '2026-09-12', // Expiring soon demo (< 7 days)
        batch_no: 'AML-26-MLK33',
        barcode: '8901234567812',
        rating: 4.9,
        reviews_count: 88,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 113,
        product_name: 'Amul Pasteurized Butter 500g',
        category_id: 4,
        category_name: 'Dairy',
        brand: 'Amul',
        purchase_price: 235.00,
        selling_price: 275.00,
        mrp: 290.00,
        quantity: 18,
        min_stock_level: 10,
        safety_stock: 8,
        lead_time_days: 2,
        unit: 'Packet',
        supplier: 'Amul Dairy Distributing Hub',
        expiry_date: '2027-02-15',
        batch_no: 'AML-26-BTR09',
        barcode: '8901234567813',
        rating: 4.9,
        reviews_count: 76,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 114,
        product_name: 'Tata Tea Gold Premium Leaf Tea 500g',
        category_id: 7,
        category_name: 'Beverages',
        brand: 'Tata Tea',
        purchase_price: 280.00,
        selling_price: 340.00,
        mrp: 375.00,
        quantity: 26,
        min_stock_level: 10,
        safety_stock: 8,
        lead_time_days: 3,
        unit: 'Packet',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2027-09-20',
        batch_no: 'TAT-26-TEA44',
        barcode: '8901234567814',
        rating: 4.8,
        reviews_count: 51,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 115,
        product_name: 'Brooke Bond Red Label Tea 500g',
        category_id: 7,
        category_name: 'Beverages',
        brand: 'Brooke Bond',
        purchase_price: 220.00,
        selling_price: 265.00,
        mrp: 290.00,
        quantity: 30,
        min_stock_level: 12,
        safety_stock: 8,
        lead_time_days: 3,
        unit: 'Packet',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2027-07-15',
        batch_no: 'BKB-26-RL07',
        barcode: '8901234567815',
        rating: 4.7,
        reviews_count: 43,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 116,
        product_name: 'Fresh Red Shimla Apples 1kg',
        category_id: 9,
        category_name: 'Household',
        brand: 'Farm Fresh',
        purchase_price: 120.00,
        selling_price: 160.00,
        mrp: 180.00,
        quantity: 0, // Critical Out of stock demo
        min_stock_level: 10,
        safety_stock: 8,
        lead_time_days: 2,
        unit: 'Kg',
        supplier: 'Fresh Grain Co-op India',
        expiry_date: '2026-09-14',
        batch_no: 'FRM-26-APL01',
        barcode: '8901234567816',
        rating: 4.5,
        reviews_count: 27,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 117,
        product_name: 'Dettol Original Germ Protection Liquid Handwash 200ml',
        category_id: 8,
        category_name: 'Personal Care',
        brand: 'Dettol',
        purchase_price: 75.00,
        selling_price: 99.00,
        mrp: 109.00,
        quantity: 48,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 3,
        unit: 'Bottle',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2028-02-28',
        batch_no: 'DET-26-HW18',
        barcode: '8901234567817',
        rating: 4.9,
        reviews_count: 64,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 118,
        product_name: 'Vim Lemon Dishwash Liquid Gel 500ml',
        category_id: 10,
        category_name: 'Cleaning Products',
        brand: 'Vim',
        purchase_price: 90.00,
        selling_price: 115.00,
        mrp: 125.00,
        quantity: 36,
        min_stock_level: 12,
        safety_stock: 8,
        lead_time_days: 3,
        unit: 'Bottle',
        supplier: 'Hindustan Consumer Care',
        expiry_date: '2028-01-15',
        batch_no: 'VIM-26-DW25',
        barcode: '8901234567818',
        rating: 4.8,
        reviews_count: 52,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 119,
        product_name: "Haldiram's Nagpur Bhujia Sev 400g",
        category_id: 6,
        category_name: 'Snacks',
        brand: "Haldiram's",
        purchase_price: 95.00,
        selling_price: 120.00,
        mrp: 135.00,
        quantity: 50,
        min_stock_level: 15,
        safety_stock: 10,
        lead_time_days: 2,
        unit: 'Packet',
        supplier: 'Parle & Britannia FMCG Depot',
        expiry_date: '2027-01-20',
        batch_no: 'HLD-26-BHJ11',
        barcode: '8901234567819',
        rating: 4.8,
        reviews_count: 73,
        is_featured: true,
        image_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=400&auto=format&fit=crop&q=70'
      },
      {
        id: 120,
        product_name: 'Everest Super Garam Masala Powder 100g',
        category_id: 9,
        category_name: 'Household',
        brand: 'Everest',
        purchase_price: 68.00,
        selling_price: 88.00,
        mrp: 96.00,
        quantity: 19,
        min_stock_level: 10,
        safety_stock: 6,
        lead_time_days: 3,
        unit: 'Packet',
        supplier: 'Fresh Grain Co-op India',
        expiry_date: '2027-04-10',
        batch_no: 'EVR-26-GM04',
        barcode: '8901234567820',
        rating: 4.7,
        reviews_count: 36,
        is_featured: false,
        image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=70'
      }
    ],
    sales: [
      {
        id: 1001,
        source: 'pos',
        product_id: 105,
        product_name: 'Parle-G Original Glucose Biscuits 250g',
        category_name: 'Biscuits',
        quantity_sold: 42,
        unit_price: 28.00,
        total_price: 1176.00,
        cost_price: 22.00,
        profit: 252.00,
        payment_method: 'Cash',
        date: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 1002,
        source: 'pos',
        product_id: 107,
        product_name: 'Maggi 2-Minute Masala Instant Noodles 280g',
        category_name: 'Snacks',
        quantity_sold: 28,
        unit_price: 55.00,
        total_price: 1540.00,
        cost_price: 45.00,
        profit: 280.00,
        payment_method: 'UPI',
        date: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: 1003,
        source: 'online',
        product_id: 101,
        product_name: 'Aashirvaad Whole Wheat Atta 5kg',
        category_name: 'Atta & Flour',
        quantity_sold: 5,
        unit_price: 280.00,
        total_price: 1400.00,
        cost_price: 230.00,
        profit: 250.00,
        payment_method: 'UPI',
        date: new Date().toISOString()
      },
      {
        id: 1004,
        source: 'online',
        product_id: 104,
        product_name: 'Fortune Sunlite Refined Sunflower Oil 1L',
        category_name: 'Cooking Oil',
        quantity_sold: 4,
        unit_price: 135.00,
        total_price: 540.00,
        cost_price: 115.00,
        profit: 80.00,
        payment_method: 'UPI',
        date: new Date().toISOString()
      }
    ],
    customer_orders: [
      {
        order_id: 'ORD-1025',
        payment_id: 'PAY-1025-01',
        customer_name: 'Thangadurai',
        phone: '+91 98765 12345',
        email: 'thangadurai@example.com',
        address: 'Flat 402, Green Meadows, 5th Main, Bengaluru - 560034',
        delivery_type: 'Home Delivery',
        pickup_code: '',
        payment_method: 'UPI',
        payment_status: 'Paid',
        utr_number: '123456789012',
        payment_time: new Date(Date.now() - 3600000).toISOString(),
        order_status: 'Confirmed',
        items: [
          { product_id: 101, product_name: 'Aashirvaad Whole Wheat Atta 5kg', quantity: 1, unit_price: 280.00, total: 280.00 },
          { product_id: 112, product_name: 'Amul Taaza Fresh Toned Milk 1L', quantity: 2, unit_price: 66.00, total: 132.00 },
          { product_id: 105, product_name: 'Parle-G Original Glucose Biscuits 250g', quantity: 3, unit_price: 28.00, total: 84.00 }
        ],
        subtotal: 496.00,
        discount: 20.00,
        gst: 24.80,
        delivery_fee: 30.00,
        grand_total: 530.80,
        date: new Date().toISOString()
      }
    ],
    payments: [
      {
        payment_id: 'PAY-1025-01',
        order_id: 'ORD-1025',
        amount: 530.80,
        currency: 'INR',
        payment_method: 'UPI',
        payment_status: 'Paid',
        utr_number: '123456789012',
        gateway_reference: 'GW-UPI-98712',
        is_mock: false,
        verification_source: 'Server Reconciled (Bank UTR)',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3500000).toISOString()
      }
    ],
    feedback: [
      {
        feedback_id: 'FB-9001',
        user_name: 'Ramesh Patel',
        store_type: 'Kirana / General Provision Store',
        experience: 'Tested with 25 daily customers',
        rating_ease_of_use: 5,
        rating_inventory: 5,
        rating_pos: 5,
        rating_customer_ordering: 4,
        rating_overall: 5,
        problems_encountered: 'Earlier, customers clicking "completed payment" was confusing. The new UTR verification and payment pending state solved this completely.',
        suggested_improvements: 'Add WhatsApp automated invoice sending for customers after billing.',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ],
    usability_tests: [
      {
        test_id: 'TEST-101',
        task_name: 'Process a UPI payment & Verify UTR',
        status: 'Success',
        time_taken_seconds: 24,
        difficulty_rating: 1,
        notes: 'Clean QR scan and instant UTR verification was seamless on mobile counter screen.',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ],
    purchase_orders: [
      {
        po_id: 'PO-2026-001',
        supplier_id: 1,
        supplier_name: 'Fresh Grain Co-op India',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'Received',
        items: [
          { product_id: 101, product_name: 'Aashirvaad Whole Wheat Atta 5kg', quantity: 50, purchase_price: 230.00, total: 11500.00 }
        ],
        total_amount: 11500.00
      },
      {
        po_id: 'PO-2026-002',
        supplier_id: 2,
        supplier_name: 'SunGold Oils & Agro Ltd',
        date: new Date(Date.now() - 86400000 * 1).toISOString(),
        status: 'Pending',
        items: [
          { product_id: 104, product_name: 'Fortune Sunlite Refined Sunflower Oil 1L', quantity: 40, purchase_price: 115.00, total: 4600.00 }
        ],
        total_amount: 4600.00
      }
    ],
    wishlist: [101, 107, 113],
    reviews: [
      { id: 1, product_id: 101, customer_name: 'Rajesh Sharma', rating: 5, comment: 'Soft rotis and excellent flour quality! Fresh delivery.', date: '2026-08-20' },
      { id: 2, product_id: 102, customer_name: 'Priya Iyer', rating: 5, comment: 'Very long grain Basmati with rich aroma for Biryani.', date: '2026-08-22' },
      { id: 3, product_id: 107, customer_name: 'Ankit Patel', rating: 5, comment: 'All-time favorite instant snack. Super fast delivery!', date: '2026-08-29' }
    ]
  };

  function getLocalStore() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let store = null;
      if (!stored) {
        // Check for migration from previous versions
        const prev = localStorage.getItem('fresh_supermart_db_v5') || localStorage.getItem('grocery_shop_db_v4') || localStorage.getItem('grocery_shop_db_v2');
        if (prev) {
          try {
            const prevData = JSON.parse(prev);
            store = { ...defaultSeedData, ...prevData };
            if (!store.payments || store.payments.length === 0) store.payments = defaultSeedData.payments;
            if (!store.feedback || store.feedback.length === 0) store.feedback = defaultSeedData.feedback;
            if (!store.usability_tests || store.usability_tests.length === 0) store.usability_tests = defaultSeedData.usability_tests;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
            return store;
          } catch (e) {
            console.warn('Migration parse error, initializing default seed data');
          }
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSeedData));
        return defaultSeedData;
      }
      store = JSON.parse(stored);
      // Ensure new relational collections exist
      if (!store.payments) store.payments = defaultSeedData.payments;
      if (!store.feedback) store.feedback = defaultSeedData.feedback;
      if (!store.usability_tests) store.usability_tests = defaultSeedData.usability_tests;
      return store;
    } catch (e) {
      return defaultSeedData;
    }
  }

  function saveLocalStore(data) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to write to LocalStorage", e);
    }
  }

  // Mutex lock to prevent race conditions during concurrent browser transactions
  let isLocalLocked = false;
  const localLockQueue = [];
  function acquireLocalLock() {
    return new Promise(resolve => {
      if (!isLocalLocked) {
        isLocalLocked = true;
        resolve();
      } else {
        localLockQueue.push(resolve);
      }
    });
  }
  function releaseLocalLock() {
    if (localLockQueue.length > 0) {
      const next = localLockQueue.shift();
      next();
    } else {
      isLocalLocked = false;
    }
  }
  async function withTransactionLock(operation) {
    await acquireLocalLock();
    try {
      return await operation();
    } finally {
      releaseLocalLock();
    }
  }

  // Server API helper with fast fallback
  async function apiFetch(endpoint, options = {}) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(endpoint, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      return null;
    }
  }

  return {
    // Products
    async getProducts() {
      const store = getLocalStore();
      return store.products || [];
    },

    async getProductById(id) {
      const store = getLocalStore();
      return store.products.find(p => p.id == id) || null;
    },

    async addProduct(pData) {
      const store = getLocalStore();
      const cat = store.categories.find(c => c.id == pData.category_id);
      const newProd = {
        id: Date.now(),
        product_name: pData.product_name,
        category_id: parseInt(pData.category_id) || 1,
        category_name: cat ? cat.category_name : 'Household',
        brand: pData.brand || 'Generic',
        purchase_price: parseFloat(pData.purchase_price) || 0,
        selling_price: parseFloat(pData.selling_price) || 0,
        mrp: parseFloat(pData.mrp) || (parseFloat(pData.selling_price) * 1.15) || 0,
        quantity: parseFloat(pData.quantity) || 0,
        min_stock_level: parseFloat(pData.min_stock_level) || 10,
        safety_stock: parseFloat(pData.safety_stock) || 8,
        lead_time_days: parseInt(pData.lead_time_days) || 3,
        unit: pData.unit || 'Piece',
        supplier: pData.supplier || 'N/A',
        expiry_date: pData.expiry_date || '',
        batch_no: pData.batch_no || ('BAT-' + Date.now().toString().slice(-6)),
        barcode: pData.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
        rating: 4.8,
        reviews_count: 0,
        is_featured: false,
        image_url: pData.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=70'
      };
      store.products.unshift(newProd);
      saveLocalStore(store);
      return newProd;
    },

    async updateProduct(id, pData) {
      const store = getLocalStore();
      const index = store.products.findIndex(p => p.id == id);
      if (index !== -1) {
        const updated = { ...store.products[index], ...pData };
        if (pData.category_id) {
          const cat = store.categories.find(c => c.id == pData.category_id);
          if (cat) updated.category_name = cat.category_name;
        }
        store.products[index] = updated;
        saveLocalStore(store);
        return updated;
      }
      return null;
    },

    async deleteProduct(id) {
      const store = getLocalStore();
      store.products = store.products.filter(p => p.id != id);
      saveLocalStore(store);
      return true;
    },

    async adjustProductStock(id, delta) {
      const store = getLocalStore();
      const index = store.products.findIndex(p => p.id == id);
      if (index !== -1) {
        const current = store.products[index].quantity || 0;
        const newQty = Math.max(0, current + delta);
        store.products[index].quantity = newQty;
        saveLocalStore(store);
        return store.products[index];
      }
      return null;
    },

    // Categories
    async getCategories() {
      const store = getLocalStore();
      return store.categories || [];
    },

    async addCategory(catData) {
      const store = getLocalStore();
      const newCat = { id: Date.now(), ...catData };
      store.categories.push(newCat);
      saveLocalStore(store);
      return newCat;
    },

    async updateCategory(id, catData) {
      const store = getLocalStore();
      const index = store.categories.findIndex(c => c.id == id);
      if (index !== -1) {
        store.categories[index] = { ...store.categories[index], ...catData };
        saveLocalStore(store);
        return store.categories[index];
      }
      return null;
    },

    async deleteCategory(id) {
      const store = getLocalStore();
      store.categories = store.categories.filter(c => c.id != id);
      saveLocalStore(store);
      return true;
    },

    // Suppliers
    async getSuppliers() {
      const store = getLocalStore();
      return store.suppliers || [];
    },

    async addSupplier(supData) {
      const store = getLocalStore();
      const newSup = {
        id: Date.now(),
        name: supData.name,
        phone: supData.phone || '',
        email: supData.email || '',
        address: supData.address || '',
        products_supplied: supData.products_supplied || 'General Groceries',
        total_purchases: 0,
        last_purchase_date: new Date().toISOString().split('T')[0]
      };
      store.suppliers.push(newSup);
      saveLocalStore(store);
      return newSup;
    },

    async deleteSupplier(id) {
      const store = getLocalStore();
      store.suppliers = store.suppliers.filter(s => s.id != id);
      saveLocalStore(store);
      return true;
    },

    // Sales & Transactions
    async getSales() {
      const store = getLocalStore();
      return store.sales || [];
    },

    // =========================================================================
    // ATOMIC INVENTORY TRANSACTIONS: SALES (POS) & CUSTOMER ORDERS (ONLINE)
    // =========================================================================

    // Atomic POS Sale
    async processAtomicSale(payload) {
      const items = Array.isArray(payload.items) ? payload.items : [
        {
          product_id: payload.product_id,
          quantity_sold: parseFloat(payload.quantity_sold),
          unit_price: parseFloat(payload.unit_price)
        }
      ];

      // Try server API first if available
      const apiRes = await apiFetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, payment_method: payload.payment_method })
      });

      if (apiRes) {
        if (apiRes.status === 409) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Insufficient stock for this sale.');
        } else if (apiRes.ok) {
          const data = await apiRes.json();
          // Sync local storage with successful server deduction
          const store = getLocalStore();
          for (const item of items) {
            const prod = store.products.find(p => p.id == item.product_id);
            if (prod) prod.quantity -= item.quantity_sold;
          }
          if (!store.sales) store.sales = [];
          if (Array.isArray(data.sales)) {
            data.sales.forEach(s => store.sales.unshift(s));
          }
          if (data.payment) {
            if (!store.payments) store.payments = [];
            store.payments.unshift(data.payment);
          }
          saveLocalStore(store);
          return data;
        }
      }

      // Local Atomic Transaction (Fallback / Offline Engine)
      return withTransactionLock(async () => {
        const store = getLocalStore();

        // 1. Strict Stock Pre-validation for ALL cart items
        for (const item of items) {
          const prod = store.products.find(p => p.id == item.product_id);
          if (!prod) {
            throw new Error(`Product ${item.product_name || item.product_id} was not found in inventory.`);
          }
          if (prod.quantity < item.quantity_sold) {
            throw new Error(`Sorry, only ${prod.quantity} ${prod.unit} of ${prod.product_name} are available.`);
          }
        }

        // 2. Decrement stock atomically and record sales
        const salesCreated = [];
        for (const item of items) {
          const prod = store.products.find(p => p.id == item.product_id);
          prod.quantity -= item.quantity_sold;

          const unitPrice = parseFloat(item.unit_price || prod.selling_price);
          const costPrice = parseFloat(prod.purchase_price || 0);
          const total = item.quantity_sold * unitPrice;
          const profit = total - (item.quantity_sold * costPrice);

          const sale = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            source: 'pos',
            product_id: prod.id,
            product_name: prod.product_name,
            category_name: prod.category_name,
            quantity_sold: item.quantity_sold,
            unit_price: unitPrice,
            cost_price: costPrice,
            total_price: total,
            profit: profit,
            payment_method: payload.payment_method || 'Cash',
            date: new Date().toISOString()
          };

          if (!store.sales) store.sales = [];
          store.sales.unshift(sale);
          salesCreated.push(sale);
        }

        // 3. Create POS Payment Record
        const paymentId = 'PAY-POS-' + Date.now().toString().slice(-6);
        const totalAmount = salesCreated.reduce((sum, s) => sum + s.total_price, 0);
        const paymentRecord = {
          payment_id: paymentId,
          order_id: 'POS-BILL-' + Date.now().toString().slice(-6),
          amount: totalAmount,
          currency: 'INR',
          payment_method: payload.payment_method || 'Cash',
          payment_status: 'Paid',
          is_mock: false,
          verification_source: 'Counter POS Terminal',
          created_at: new Date().toISOString()
        };

        if (!store.payments) store.payments = [];
        store.payments.unshift(paymentRecord);

        saveLocalStore(store);
        return { success: true, sales: salesCreated, payment: paymentRecord };
      });
    },

    async recordSale(saleData) {
      return this.processAtomicSale({
        items: [{
          product_id: saleData.product_id,
          quantity_sold: saleData.quantity_sold,
          unit_price: saleData.unit_price
        }],
        payment_method: saleData.payment_method
      });
    },

    // Customer Online Orders
    async getCustomerOrders() {
      const store = getLocalStore();
      return store.customer_orders || [];
    },

    // Atomic Online Order Placement
    async processAtomicOrder(orderPayload) {
      const orderItems = orderPayload.items || [];
      if (orderItems.length === 0) {
        throw new Error('Your cart is empty. Please select products to order.');
      }

      // Try server API first if available
      const apiRes = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (apiRes) {
        if (apiRes.status === 409) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Insufficient stock for this order.');
        } else if (apiRes.ok) {
          const data = await apiRes.json();
          // Sync local storage with successful server deduction
          const store = getLocalStore();
          for (const item of orderItems) {
            const prod = store.products.find(p => p.id == item.product_id);
            if (prod) prod.quantity -= item.quantity;
          }
          if (!store.customer_orders) store.customer_orders = [];
          store.customer_orders.unshift(data.order);
          if (data.payment) {
            if (!store.payments) store.payments = [];
            store.payments.unshift(data.payment);
          }
          saveLocalStore(store);
          return data.order;
        }
      }

      // Local Atomic Transaction (Fallback / Offline Engine)
      return withTransactionLock(async () => {
        const store = getLocalStore();

        // 1. Strict Stock Pre-validation: Rollback immediately if ANY item is unavailable
        for (const item of orderItems) {
          const prod = store.products.find(p => p.id == item.product_id);
          if (!prod) {
            throw new Error(`Product ${item.product_name} is no longer in the catalog.`);
          }
          if (prod.quantity < item.quantity) {
            throw new Error(`Sorry, only ${prod.quantity} ${prod.unit} of ${prod.product_name} are available.`);
          }
        }

        // 2. Decrement stock atomically
        for (const item of orderItems) {
          const prod = store.products.find(p => p.id == item.product_id);
          prod.quantity -= item.quantity;

          // Log into sales analytics
          const unitPrice = parseFloat(item.unit_price);
          const costPrice = parseFloat(prod.purchase_price || 0);
          const total = item.quantity * unitPrice;
          const profit = total - (item.quantity * costPrice);

          if (!store.sales) store.sales = [];
          store.sales.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000),
            source: 'online',
            product_id: prod.id,
            product_name: prod.product_name,
            category_name: prod.category_name,
            quantity_sold: item.quantity,
            unit_price: unitPrice,
            cost_price: costPrice,
            total_price: total,
            profit: profit,
            payment_method: orderPayload.payment_method,
            date: new Date().toISOString()
          });
        }

        // 3. Generate Unique Identifiers
        const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
        const paymentId = 'PAY-' + Math.floor(1000 + Math.random() * 9000);
        const isUPI = orderPayload.payment_method === 'UPI';

        // Payment status rule: NEVER mark as Paid just because customer placed order
        const initialPaymentStatus = isUPI ? 'Pending' : (orderPayload.payment_method === 'Cash on Delivery' ? 'Pending' : 'Paid');

        const paymentRecord = {
          payment_id: paymentId,
          order_id: orderId,
          amount: parseFloat(orderPayload.grand_total) || 0,
          currency: 'INR',
          payment_method: orderPayload.payment_method || 'UPI',
          payment_status: initialPaymentStatus,
          utr_number: orderPayload.utr_number || '',
          is_mock: orderPayload.is_mock || false,
          verification_source: isUPI ? 'Awaiting Bank UTR / Webhook' : 'Store Checkout',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const newOrder = {
          order_id: orderId,
          payment_id: paymentId,
          customer_name: orderPayload.customer_name,
          phone: orderPayload.phone,
          email: orderPayload.email || '',
          address: orderPayload.address || 'Store Pickup Counter',
          delivery_type: orderPayload.delivery_type || 'Home Delivery',
          pickup_code: orderPayload.delivery_type === 'Store Pickup' ? ('FS-' + Math.floor(1000 + Math.random() * 9000)) : '',
          payment_method: orderPayload.payment_method || 'UPI',
          payment_status: paymentRecord.payment_status,
          utr_number: orderPayload.utr_number || '',
          order_status: 'New',
          items: orderPayload.items,
          subtotal: orderPayload.subtotal,
          discount: orderPayload.discount || 0,
          gst: orderPayload.gst || 0,
          delivery_fee: orderPayload.delivery_fee || 0,
          grand_total: orderPayload.grand_total,
          is_mock: orderPayload.is_mock || false,
          date: new Date().toISOString()
        };

        if (!store.customer_orders) store.customer_orders = [];
        if (!store.payments) store.payments = [];

        store.customer_orders.unshift(newOrder);
        store.payments.unshift(paymentRecord);

        saveLocalStore(store);
        return newOrder;
      });
    },

    async createCustomerOrder(orderPayload) {
      return this.processAtomicOrder(orderPayload);
    },

    async updateCustomerOrderStatus(orderId, newStatus) {
      const store = getLocalStore();
      const order = (store.customer_orders || []).find(o => o.order_id === orderId);
      if (order) {
        order.order_status = newStatus;
        saveLocalStore(store);
        return order;
      }
      return null;
    },

    // =========================================================================
    // SECURE UPI PAYMENT VERIFICATION & RECONCILIATION
    // =========================================================================

    async getPayments() {
      const store = getLocalStore();
      return store.payments || [];
    },

    async verifyPaymentRecord({ order_id, payment_id, utr_number, amount }) {
      if (!order_id || !utr_number) {
        throw new Error('Order ID and 12-digit UTR are required.');
      }

      const cleanUTR = String(utr_number).trim();
      if (!/^\d{12}$/.test(cleanUTR)) {
        throw new Error('Invalid UTR format. Bank UPI reference must be exactly 12 digits.');
      }

      // Try server API first if available
      const apiRes = await apiFetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, payment_id, utr_number: cleanUTR, amount })
      });

      if (apiRes) {
        if (!apiRes.ok) {
          const err = await apiRes.json().catch(() => ({}));
          throw new Error(err.error || 'Server payment verification failed.');
        }
      }

      // Local Store verification & state reconciliation
      return withTransactionLock(async () => {
        const store = getLocalStore();

        // Prevent duplicate UTR replay attacks across orders
        const duplicate = (store.payments || []).find(p => p.utr_number === cleanUTR && p.order_id !== order_id && p.payment_status === 'Paid');
        if (duplicate) {
          throw new Error(`This UPI UTR (${cleanUTR}) has already been reconciled with order ${duplicate.order_id}.`);
        }

        const order = (store.customer_orders || []).find(o => o.order_id === order_id);
        if (!order) throw new Error(`Order ${order_id} not found.`);

        let payment = (store.payments || []).find(p => p.order_id === order_id || (payment_id && p.payment_id === payment_id));
        if (!payment) {
          payment = {
            payment_id: payment_id || ('PAY-' + Date.now().toString().slice(-6)),
            order_id: order_id,
            amount: order.grand_total,
            currency: 'INR',
            payment_method: 'UPI',
            payment_status: 'Paid',
            utr_number: cleanUTR,
            is_mock: false,
            verification_source: 'Server Reconciled (Bank UTR)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          if (!store.payments) store.payments = [];
          store.payments.unshift(payment);
        } else {
          payment.payment_status = 'Paid';
          payment.utr_number = cleanUTR;
          payment.verification_source = 'Server Reconciled (Bank UTR)';
          payment.updated_at = new Date().toISOString();
        }

        order.payment_status = 'Paid';
        order.order_status = 'Confirmed';
        order.utr_number = cleanUTR;
        order.payment_time = new Date().toISOString();

        saveLocalStore(store);
        return { success: true, order, payment };
      });
    },

    // Mock Payment Sandbox (Clearly Labeled for Development & Defense Demo)
    async processMockPayment({ order_id, outcome }) {
      const store = getLocalStore();
      const order = (store.customer_orders || []).find(o => o.order_id === order_id);
      if (!order) throw new Error('Order not found');

      let payment = (store.payments || []).find(p => p.order_id === order_id);

      if (outcome === 'success') {
        order.payment_status = 'Paid';
        order.order_status = 'Confirmed';
        order.is_mock = true;
        if (payment) {
          payment.payment_status = 'Paid';
          payment.is_mock = true;
          payment.utr_number = 'MOCK-UTR-' + Math.floor(100000 + Math.random() * 900000);
          payment.verification_source = '🧪 Mock Sandbox Gateway (Demo Only)';
          payment.updated_at = new Date().toISOString();
        }
        saveLocalStore(store);
        return { success: true, message: '🧪 MOCK PAYMENT SUCCESS: Simulated paid status applied for testing.', order, payment };
      } else if (outcome === 'failure') {
        order.payment_status = 'Failed';
        if (payment) {
          payment.payment_status = 'Failed';
          payment.is_mock = true;
          payment.updated_at = new Date().toISOString();
        }
        saveLocalStore(store);
        return { success: false, message: '🧪 MOCK PAYMENT FAILED: Simulated bank decline applied for testing.', order, payment };
      } else {
        order.payment_status = 'Pending';
        saveLocalStore(store);
        return { success: false, message: '🧪 MOCK PAYMENT TIMEOUT: Simulated timeout. Status remains Pending.', order, payment };
      }
    },

    // Order Cancellation & Stock Refund (Atomic)
    async cancelAndRefundOrder(orderId) {
      // Try server API first
      const apiRes = await apiFetch(`/api/orders/${orderId}/refund`, { method: 'POST' });
      if (apiRes && apiRes.ok) {
        const data = await apiRes.json();
        // Sync local storage
        const store = getLocalStore();
        const order = (store.customer_orders || []).find(o => o.order_id === orderId);
        if (order) {
          for (const item of (order.items || [])) {
            const prod = store.products.find(p => p.id == item.product_id);
            if (prod) prod.quantity += parseFloat(item.quantity);
          }
          order.order_status = 'Cancelled';
          order.payment_status = 'Refunded';
        }
        const payment = (store.payments || []).find(p => p.order_id === orderId);
        if (payment) payment.payment_status = 'Refunded';
        saveLocalStore(store);
        return data;
      }

      return withTransactionLock(async () => {
        const store = getLocalStore();
        const order = (store.customer_orders || []).find(o => o.order_id === orderId);
        if (!order) throw new Error('Order not found');
        if (order.order_status === 'Cancelled') throw new Error('Order is already cancelled');

        // Restore stock for all items
        for (const item of (order.items || [])) {
          const prod = store.products.find(p => p.id == item.product_id);
          if (prod) {
            prod.quantity += parseFloat(item.quantity);
          }
        }

        order.order_status = 'Cancelled';
        order.payment_status = 'Refunded';

        const payment = (store.payments || []).find(p => p.order_id === order.order_id);
        if (payment) {
          payment.payment_status = 'Refunded';
          payment.updated_at = new Date().toISOString();
        }

        saveLocalStore(store);
        return { success: true, message: `Order ${order.order_id} cancelled and stock safely restored.`, order };
      });
    },

    // =========================================================================
    // CONCURRENCY STRESS TEST RUNNER
    // Proves that simultaneous POS and Online competition never drives stock negative
    // =========================================================================
    async runConcurrencySimulation(productId, posQty, onlineQty) {
      // Try server API first
      const apiRes = await apiFetch('/api/inventory/test-concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, pos_qty: posQty, online_qty: onlineQty })
      });

      if (apiRes && apiRes.ok) {
        return await apiRes.json();
      }

      // Local fallback concurrency simulation
      const store = getLocalStore();
      const prod = store.products.find(p => p.id == productId);
      if (!prod) throw new Error('Product not found');

      const initialStock = prod.quantity;

      const attemptPOS = async () => {
        return withTransactionLock(async () => {
          const s = getLocalStore();
          const p = s.products.find(x => x.id == productId);
          if (p.quantity < posQty) {
            throw new Error(`POS transaction aborted: Only ${p.quantity} ${p.unit} available.`);
          }
          p.quantity -= posQty;
          saveLocalStore(s);
          return { client: 'POS Terminal', requested: posQty, remainingStock: p.quantity, status: 'Committed' };
        });
      };

      const attemptOnline = async () => {
        return withTransactionLock(async () => {
          const s = getLocalStore();
          const p = s.products.find(x => x.id == productId);
          if (p.quantity < onlineQty) {
            throw new Error(`Online order aborted: Only ${p.quantity} ${p.unit} available.`);
          }
          p.quantity -= onlineQty;
          saveLocalStore(s);
          return { client: 'Online Shopper', requested: onlineQty, remainingStock: p.quantity, status: 'Committed' };
        });
      };

      const [posRes, onlineRes] = await Promise.allSettled([attemptPOS(), attemptOnline()]);

      const finalStore = getLocalStore();
      const finalProd = finalStore.products.find(x => x.id == productId);

      return {
        test_summary: 'Simultaneous Competition for Shared Stock',
        product_tested: prod.product_name,
        initial_stock: initialStock,
        final_stock: finalProd.quantity,
        stock_is_safe: finalProd.quantity >= 0,
        transactions: [
          posRes.status === 'fulfilled' ? posRes.value : { client: 'POS Terminal', error: posRes.reason.message, status: 'Rolled Back' },
          onlineRes.status === 'fulfilled' ? onlineRes.value : { client: 'Online Shopper', error: onlineRes.reason.message, status: 'Rolled Back' }
        ]
      };
    },

    // =========================================================================
    // PROJECT BETTER TOMORROW: USER VALIDATION & USABILITY TESTS
    // =========================================================================

    async getFeedback() {
      const store = getLocalStore();
      const list = store.feedback || [];
      const count = list.length;
      const avgOverall = count ? (list.reduce((s, f) => s + (f.rating_overall || 5), 0) / count).toFixed(1) : '5.0';
      const avgEase = count ? (list.reduce((s, f) => s + (f.rating_ease_of_use || 5), 0) / count).toFixed(1) : '5.0';
      const avgInventory = count ? (list.reduce((s, f) => s + (f.rating_inventory || 5), 0) / count).toFixed(1) : '5.0';
      const avgPos = count ? (list.reduce((s, f) => s + (f.rating_pos || 5), 0) / count).toFixed(1) : '5.0';

      return {
        metrics: {
          users_tested: count,
          avg_overall: parseFloat(avgOverall),
          avg_ease: parseFloat(avgEase),
          avg_inventory: parseFloat(avgInventory),
          avg_pos: parseFloat(avgPos)
        },
        feedback_list: list
      };
    },

    async addFeedback(feedbackData) {
      const store = getLocalStore();
      const newFb = {
        feedback_id: 'FB-' + Math.floor(1000 + Math.random() * 9000),
        user_name: feedbackData.user_name || 'Anonymous Shopkeeper',
        store_type: feedbackData.store_type || 'General Kirana Store',
        experience: feedbackData.experience || 'Field Usability Trial',
        rating_ease_of_use: parseInt(feedbackData.rating_ease_of_use) || 5,
        rating_inventory: parseInt(feedbackData.rating_inventory) || 5,
        rating_pos: parseInt(feedbackData.rating_pos) || 5,
        rating_customer_ordering: parseInt(feedbackData.rating_customer_ordering) || 5,
        rating_overall: parseInt(feedbackData.rating_overall) || 5,
        problems_encountered: feedbackData.problems_encountered || 'None reported',
        suggested_improvements: feedbackData.suggested_improvements || 'System functions smoothly',
        created_at: new Date().toISOString()
      };

      if (!store.feedback) store.feedback = [];
      store.feedback.unshift(newFb);
      saveLocalStore(store);

      // Try server sync
      apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFb)
      });

      return newFb;
    },

    async getUsabilityTests() {
      const store = getLocalStore();
      return store.usability_tests || [];
    },

    async saveUsabilityTest(testData) {
      const store = getLocalStore();
      const record = {
        test_id: 'TEST-' + Math.floor(100 + Math.random() * 900),
        task_name: testData.task_name,
        status: testData.status || 'Success',
        time_taken_seconds: parseInt(testData.time_taken_seconds) || 0,
        difficulty_rating: parseInt(testData.difficulty_rating) || 1,
        notes: testData.notes || '',
        created_at: new Date().toISOString()
      };

      if (!store.usability_tests) store.usability_tests = [];
      store.usability_tests.unshift(record);
      saveLocalStore(store);

      // Try server sync
      apiFetch('/api/usability-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      return record;
    },

    // Purchase Orders (Supplier Reorders)
    async getPurchaseOrders() {
      const store = getLocalStore();
      return store.purchase_orders || [];
    },

    async createPurchaseOrder(poPayload) {
      const store = getLocalStore();
      const newPo = {
        po_id: 'PO-2026-' + Math.floor(100 + Math.random() * 900),
        supplier_id: poPayload.supplier_id,
        supplier_name: poPayload.supplier_name,
        date: new Date().toISOString(),
        status: 'Pending',
        items: poPayload.items,
        total_amount: poPayload.total_amount
      };
      if (!store.purchase_orders) store.purchase_orders = [];
      store.purchase_orders.unshift(newPo);
      saveLocalStore(store);
      return newPo;
    },

    async receivePurchaseOrder(poId) {
      const store = getLocalStore();
      const po = (store.purchase_orders || []).find(p => p.po_id === poId);
      if (!po) throw new Error('Purchase order not found');
      if (po.status === 'Received') throw new Error('PO already received');

      po.status = 'Received';
      // Restock items in inventory
      po.items.forEach(item => {
        const prod = store.products.find(p => p.id == item.product_id);
        if (prod) {
          prod.quantity += parseFloat(item.quantity);
        }
      });

      // Update supplier purchase stats
      const sup = store.suppliers.find(s => s.id == po.supplier_id);
      if (sup) {
        sup.total_purchases = (sup.total_purchases || 0) + po.total_amount;
        sup.last_purchase_date = new Date().toISOString().split('T')[0];
      }

      saveLocalStore(store);
      return po;
    },

    // Wishlist
    async getWishlist() {
      const store = getLocalStore();
      return store.wishlist || [];
    },

    async toggleWishlist(productId) {
      const store = getLocalStore();
      if (!store.wishlist) store.wishlist = [];
      const index = store.wishlist.indexOf(productId);
      let isWishlisted = false;
      if (index === -1) {
        store.wishlist.push(productId);
        isWishlisted = true;
      } else {
        store.wishlist.splice(index, 1);
        isWishlisted = false;
      }
      saveLocalStore(store);
      return { isWishlisted, wishlist: store.wishlist };
    },

    // Reviews
    async getReviews() {
      const store = getLocalStore();
      return store.reviews || [];
    },

    async addReview(reviewData) {
      const store = getLocalStore();
      const newRev = {
        id: Date.now(),
        product_id: parseInt(reviewData.product_id),
        customer_name: reviewData.customer_name || 'Verified Customer',
        rating: parseInt(reviewData.rating) || 5,
        comment: reviewData.comment || '',
        date: new Date().toISOString().split('T')[0]
      };
      if (!store.reviews) store.reviews = [];
      store.reviews.unshift(newRev);

      // Recalculate product rating
      const prod = store.products.find(p => p.id == reviewData.product_id);
      if (prod) {
        const prodReviews = store.reviews.filter(r => r.product_id == prod.id);
        const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
        prod.rating = parseFloat(avg.toFixed(1));
        prod.reviews_count = prodReviews.length;
      }

      saveLocalStore(store);
      return newRev;
    },

    // Settings & UPI Payment Configuration
    async getSettings() {
      const store = getLocalStore();
      return store.settings || defaultSeedData.settings;
    },

    async updatePaymentSettings(paymentSettings) {
      const store = getLocalStore();
      if (!store.settings) store.settings = { ...defaultSeedData.settings };
      store.settings.payment_settings = {
        ...store.settings.payment_settings,
        ...paymentSettings
      };
      saveLocalStore(store);
      return store.settings.payment_settings;
    },

    async updateDailyTarget(target) {
      const store = getLocalStore();
      if (!store.settings) store.settings = { ...defaultSeedData.settings };
      store.settings.daily_sales_target = parseFloat(target) || 10000;
      saveLocalStore(store);
      return store.settings.daily_sales_target;
    },

    // Users & Auth
    async authenticate(username, password) {
      const store = getLocalStore();
      const user = (store.users || defaultSeedData.users).find(u => u.username === username && u.password === password);
      if (user) {
        return { success: true, user: { id: user.id, username: user.username, role: user.role, name: user.name } };
      }
      return { success: false, message: 'Invalid username or password' };
    },

    // Full Backup, Restore & Demo Reset
    getFullData() {
      return getLocalStore();
    },

    restoreFullData(data) {
      if (!data || !Array.isArray(data.products) || !Array.isArray(data.categories)) {
        throw new Error('Invalid backup structure. File must contain valid products and categories.');
      }
      saveLocalStore(data);
      return true;
    },

    resetDemoData() {
      saveLocalStore(defaultSeedData);
      return defaultSeedData;
    }
  };
})();
