require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');
const Message = require('./models/Message');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lionjuicebar';
const JWT_SECRET = process.env.JWT_SECRET || 'lionjuicebar_secret_key_12345';

// Nodemailer transporter (Gmail)
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});


app.use(cors());
app.use(express.json());

// Auth Middlewares
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied, admin only' });
  }
};

// Initial products dataset
const initialProducts = [
  // Minute Maid
  { name: 'ORANGE JUICE', category: 'Minute Maid', price: 50, stock: 50, image: '/images/en_minute_maid_prod_orange_100vitc_750x750_v1.jpg', description: 'Fresh 100% Vitamin C Minute Maid Orange Juice.' },
  { name: 'PEACH MANGO', category: 'Minute Maid', price: 450, stock: 45, image: '/images/960485287-A1C1.webp', description: 'Delicious blend of ripe peach and juicy mango.' },
  { name: 'STRAWBERRY PASSION FRUIT', category: 'Minute Maid', price: 510, stock: 30, image: '/images/resize.webp', description: 'Refreshing strawberry passion fruit drink.' },
  { name: 'APPLE JUICE', category: 'Minute Maid', price: 510, stock: 40, image: '/images/en_minute_maid_prod_apple_juice_100vitc_750x750_v1.jpg', description: 'Pure crisp Minute Maid Apple Juice.' },
  { name: 'BERRY BLEND', category: 'Minute Maid', price: 510, stock: 35, image: '/images/minute-maid--juices-to-go.main-image.290-417.jpg', description: 'Berry mix juice packed with antioxidants.' },
  { name: 'WATERMELON', category: 'Minute Maid', price: 500, stock: 50, image: '/images/MinuteMaidJuice-Watermelon_PETBottle_12x355mL(1).jpg', description: 'Sweet hydrating Minute Maid Watermelon juice.' },

  // Ritai Juice
  { name: 'STRAWBERRY', category: 'Ritai Juice', price: 350, stock: 60, image: '/images/IMG-20241010-WA0008.jpg', description: 'Rich and smooth Ritai Strawberry juice.' },
  { name: 'MIXED JUICE', category: 'Ritai Juice', price: 370, stock: 55, image: '/images/IMG-20241010-WA0009.jpg', description: 'Ritai special multi-fruit mixed juice.' },
  { name: 'APPLE JUICE', category: 'Ritai Juice', price: 350, stock: 50, image: '/images/IMG-20241010-WA0010.jpg', description: 'Crisp and sweet Ritai Apple juice.' },
  { name: 'PASSION JUICE', category: 'Ritai Juice', price: 330, stock: 40, image: '/images/IMG-20241010-WA0011.jpg', description: 'Tangy tropical passion fruit juice by Ritai.' },
  { name: 'MANGO JUICE', category: 'Ritai Juice', price: 330, stock: 60, image: '/images/IMG-20241010-WA0012.jpg', description: 'Luscious tropical mango juice by Ritai.' },
  { name: 'ORANGE JUICE', category: 'Ritai Juice', price: 330, stock: 50, image: '/images/IMG-20241010-WA0013.jpg', description: 'Classic citrus Ritai orange juice.' },

  // YOOH Juice
  { name: 'KIWI JUICE', category: 'YOOH Juice', price: 960, stock: 25, image: '/images/IMG-20241015-WA0096.jpg', description: 'Premium exotic kiwi juice by YOOH.' },
  { name: 'GUAVA JUICE', category: 'YOOH Juice', price: 960, stock: 30, image: '/images/IMG-20241015-WA0099.jpg', description: 'Rich tropical pink guava juice by YOOH.' },
  { name: 'COCONUT JUICE', category: 'YOOH Juice', price: 940, stock: 35, image: '/images/IMG-20241015-WA0098.jpg', description: 'Cool hydrating coconut juice by YOOH.' },
  { name: 'LYCHEE JUICE', category: 'YOOH Juice', price: 960, stock: 20, image: '/images/IMG-20241015-WA0095.jpg', description: 'Fragrant sweet lychee juice by YOOH.' },
  { name: 'CHERRY JUICE', category: 'YOOH Juice', price: 960, stock: 25, image: '/images/IMG-20241015-WA0097.jpg', description: 'Delicious tart cherry juice by YOOH.' },
  { name: 'PEACH JUICE', category: 'YOOH Juice', price: 960, stock: 30, image: '/images/IMG-20241015-WA0100.jpg', description: 'Sweet peach nectar by YOOH.' },

  // THIS IS IT
  { name: 'BLUE BERRY', category: 'THIS IS IT', price: 1400, stock: 20, image: '/images/IMG-20241015-WA0106.jpg', description: 'Premium wild blueberry juice blend.' },
  { name: 'KIWI LIME', category: 'THIS IS IT', price: 1400, stock: 18, image: '/images/IMG-20241015-WA0108.jpg', description: 'Zesty kiwi lime fusion drink.' },
  { name: 'GUAVA', category: 'THIS IS IT', price: 1200, stock: 22, image: '/images/IMG-20241015-WA0105.jpg', description: 'Smooth guava refresh fruit drink.' },
  { name: 'ORANGE', category: 'THIS IS IT', price: 1200, stock: 25, image: '/images/IMG-20241015-WA0102.jpg', description: 'Pure squeezed premium orange drink.' },
  { name: 'STRAWBERRY', category: 'THIS IS IT', price: 1300, stock: 20, image: '/images/IMG-20241015-WA0107.jpg', description: 'Fresh strawberry delight.' },
  { name: 'CLASSIC LIMEADE', category: 'THIS IS IT', price: 1300, stock: 28, image: '/images/IMG-20241015-WA0101.jpg', description: 'Crisp classic limeade beverage.' },
  { name: 'MANGO', category: 'THIS IS IT', price: 1300, stock: 25, image: '/images/IMG-20241015-WA0103.jpg', description: 'Rich Alphonso mango juice drink.' },
  { name: 'LIMEADE', category: 'THIS IS IT', price: 1200, stock: 30, image: '/images/IMG-20241015-WA0104.jpg', description: 'Tangy citrus limeade juice.' },

  // DAYMER BAY
  { name: 'CRANBERRY', category: 'DAYMER BAY', price: 1500, stock: 15, image: '/images/IMG-20241015-WA0109.jpg', description: 'Authentic English Daymer Bay Cranberry juice.' },
  { name: 'ORANGE', category: 'DAYMER BAY', price: 1200, stock: 20, image: '/images/IMG-20241015-WA0110.jpg', description: 'Daymer Bay fresh sunshine orange juice.' },
  { name: 'PINEAPPLE', category: 'DAYMER BAY', price: 1200, stock: 20, image: '/images/IMG-20241015-WA0111.jpg', description: 'Tropical Daymer Bay Pineapple juice.' },
  { name: 'CLOUDY APPLE', category: 'DAYMER BAY', price: 1400, stock: 18, image: '/images/IMG-20241015-WA0112.jpg', description: 'Pressed Daymer Bay Cloudy Apple juice.' },
  { name: 'CLOUDY LEMONADE', category: 'DAYMER BAY', price: 1200, stock: 22, image: '/images/IMG-20241015-WA0113.jpg', description: 'Traditional Daymer Bay Cloudy Lemonade.' },
  { name: 'ELDERFLOWER LEMONADE', category: 'DAYMER BAY', price: 1450, stock: 15, image: '/images/IMG-20241015-WA0114.jpg', description: 'Floral Daymer Bay Elderflower Lemonade.' },
  { name: 'RASPBERRY LEMONADE', category: 'DAYMER BAY', price: 1350, stock: 18, image: '/images/IMG-20241015-WA0115.jpg', description: 'Fruity Daymer Bay Raspberry Lemonade.' },
  { name: 'TOMATO', category: 'DAYMER BAY', price: 1300, stock: 20, image: '/images/IMG-20241015-WA0116.jpg', description: 'Savory Daymer Bay Tomato juice.' }
];

// Seed MongoDB if empty
const seedDatabase = async () => {
  try {
    // Seed Products
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(initialProducts);
      console.log('Database seeded with initial 34 products!');
    } else {
      console.log(`Database already initialized with ${count} products.`);
    }

    // Seed Users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const customerPasswordHash = await bcrypt.hash('customer123', 10);

      await User.insertMany([
        {
          name: 'Juice Admin',
          email: 'admin@lionjuicebar.com',
          password: adminPasswordHash,
          role: 'admin'
        },
        {
          name: 'Nelu Wasana',
          email: 'customer@gmail.com',
          password: customerPasswordHash,
          role: 'customer'
        }
      ]);
      console.log('Database seeded with default users! (admin@lionjuicebar.com / admin123, customer@gmail.com / customer123)');
    } else {
      console.log(`Database already has ${userCount} users.`);
    }
  } catch (error) {
    console.error('Database seeding error:', error);
  }
};

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    seedDatabase();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// API ROUTES

// AUTHENTICATION ROUTES

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer'
    });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error registering user' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error logging in' });
  }
});

// Get logged-in user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PRODUCT ROUTES

// 1. Get all products (Public)
app.get('/api/products', async (req, res) => {
  try {
    const { search, sort, category } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    let sortOptions = {};
    if (sort === 'price-asc') sortOptions.price = 1;
    else if (sort === 'price-desc') sortOptions.price = -1;
    else if (sort === 'name-asc') sortOptions.name = 1;

    const products = await Product.find(query).sort(sortOptions);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// 2. Get single product by ID (Public)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching product' });
  }
});

// 3. Add new product (Admin Only)
app.post('/api/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, category, price, stock, image, description } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category and price are required' });
    }
    const newProduct = new Product({
      name,
      category,
      price: Number(price),
      stock: stock !== undefined ? Number(stock) : 50,
      image: image || '/images/en_minute_maid_prod_orange_100vitc_750x750_v1.jpg',
      description: description || ''
    });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error creating product' });
  }
});

// 4. Edit product details (Admin Only)
app.put('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: 'Server error updating product' });
  }
});

// 5. Delete product (Admin Only)
app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting product' });
  }
});

// 6. Update product stock (Admin Only, direct edit)
app.patch('/api/products/:id/stock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { quantity, setStock } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (setStock !== undefined) {
      product.stock = Number(setStock);
    } else if (quantity !== undefined) {
      product.stock = Math.max(0, product.stock - Number(quantity));
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Server error updating stock' });
  }
});

// ORDER ROUTES

// Create Order (Authenticated Customer)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, paymentMethod, deliveryDetails } = req.body;
    if (!items || items.length === 0 || !deliveryDetails) {
      return res.status(400).json({ error: 'Invalid order details' });
    }

    let totalAmount = 0;
    // Verify products and calculate total
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      item.price = product.price; // Use price from DB
      totalAmount += product.price * item.quantity;
    }

    // Create the order
    const newOrder = new Order({
      customer: req.user.id,
      items,
      totalAmount,
      paymentMethod,
      deliveryDetails
    });

    await newOrder.save();

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error placing order' });
  }
});

// Get Orders (Admin gets all, Customer gets their own)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.customer = req.user.id;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name email')
      .populate('items.product', 'name category image price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching orders' });
  }
});

// Update Order Status (Admin Only)
app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('customer', 'name email')
      .populate('items.product', 'name category image price');

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error updating order status' });
  }
});

// ADMIN ANALYTICS & USERS ROUTES

// Admin Dashboard Stats (Admin Only)
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalSalesObj = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalSales = totalSalesObj.length > 0 ? totalSalesObj[0].total : 0;

    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();

    const lowStockProducts = await Product.find({ stock: { $lte: 10 } })
      .select('name stock price category')
      .limit(10);

    const statusDistribution = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      totalSales,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      statusDistribution
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching admin stats' });
  }
});

// Get all customers (Admin Only)
app.get('/api/admin/customers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching customers' });
  }
});

// Get all customer messages (Admin Only)
app.get('/api/admin/messages', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// Delete customer message (Admin Only)
app.delete('/api/admin/messages/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deletedMsg = await Message.findByIdAndDelete(req.params.id);
    if (!deletedMsg) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting message' });
  }
});

// CONTACT FORM - Save to DB + Send email to shop owner + auto-reply to customer
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  let savedMessage = null;
  try {
    // 1. Always save to MongoDB database
    savedMessage = new Message({ name, email, phone: phone || '', message });
    await savedMessage.save();
  } catch (dbErr) {
    console.error('Error saving contact message to DB:', dbErr);
  }

  // 2. If Gmail not configured yet, return success with DB saved message
  if (!process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD === 'your_app_password_here') {
    console.log('Contact form received & saved to DB (Email not configured):', { name, email, phone, message });
    return res.json({ success: true, savedToDb: true, emailSent: false, message: savedMessage });
  }

  try {
    const transporter = createTransporter();

    // Email to shop owner
    await transporter.sendMail({
      from: `"Lion Juice Bar Website" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Contact Message from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:white;padding:30px;border-radius:12px;">
          <h2 style="color:#ff9800;text-align:center;">Lion Juice Bar - New Message</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #333;">
              <td style="padding:10px;color:#aaa;width:30%;">Name:</td>
              <td style="padding:10px;font-weight:bold;">${name}</td>
            </tr>
            <tr style="border-bottom:1px solid #333;">
              <td style="padding:10px;color:#aaa;">Email:</td>
              <td style="padding:10px;"><a href="mailto:${email}" style="color:#4da6ff;">${email}</a></td>
            </tr>
            <tr style="border-bottom:1px solid #333;">
              <td style="padding:10px;color:#aaa;">Phone:</td>
              <td style="padding:10px;"><a href="tel:${phone}" style="color:#4da6ff;">${phone || 'Not provided'}</a></td>
            </tr>
            <tr>
              <td style="padding:10px;color:#aaa;vertical-align:top;">Message:</td>
              <td style="padding:10px;">${message}</td>
            </tr>
          </table>
          <p style="color:#aaa;font-size:12px;margin-top:20px;">Received: ${new Date().toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })} (Sri Lanka Time)</p>
        </div>
      `
    });

    // Auto-reply to customer
    await transporter.sendMail({
      from: `"Lion Juice Bar" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'We received your message - Lion Juice Bar',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:white;padding:30px;border-radius:12px;">
          <h2 style="color:#ff9800;text-align:center;">Lion Juice Bar</h2>
          <p>Dear <b>${name}</b>,</p>
          <p style="color:#ddd;">Thank you for contacting us! We received your message and will reply soon.</p>
          <div style="background:#2a2a2a;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="color:#aaa;margin:0 0 8px;">Your message:</p>
            <p style="color:white;margin:0;font-style:italic;">"${message}"</p>
          </div>
          <p>Call us: <a href="tel:0755021040" style="color:#4da6ff;">075-502-1040</a></p>
          <p>WhatsApp: <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '94755021040'}" style="color:#25D366;">Chat on WhatsApp</a></p>
          <p style="color:#aaa;font-size:12px;">11th Mile Post, Ella-Wellawaya Road, Ella 90091 | Open 24 Hours</p>
        </div>
      `
    });

    res.json({ success: true, savedToDb: true, emailSent: true, message: savedMessage });
  } catch (err) {
    console.error('Email error:', err.message);
    res.json({ success: true, savedToDb: true, emailSent: false, message: savedMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Lion Juice Bar Express Server running on port ${PORT}`);
});
