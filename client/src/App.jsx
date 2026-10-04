import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api/products';

function App() {
  // Authentication State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lion_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('lion_token') || null;
  });

  // Navigation State - If not logged in, open project on 'auth' (Register page) first
  const [activeTab, setActiveTab] = useState(() => {
    const savedToken = localStorage.getItem('lion_token');
    return savedToken ? 'home' : 'auth';
  });

  const [authMode, setAuthMode] = useState('register'); // Default to 'register' page first
  const [authFormData, setAuthFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer'
  });
  const [authAlert, setAuthAlert] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Shopping Cart State
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('lion_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCartIds, setSelectedCartIds] = useState([]); // IDs of cart items selected for checkout
  const [showCartModal, setShowCartModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false); // false = view cart, true = shipping & pay
  const [toast, setToast] = useState(null);

  // Buy Now State (single-item direct checkout)
  const [buyNowProduct, setBuyNowProduct] = useState(null);
  const [buyNowQty, setBuyNowQty] = useState(1);
  const [buyNowSuccess, setBuyNowSuccess] = useState(false);

  // Product Preview / Select Modal State
  const [previewProduct, setPreviewProduct] = useState(null);

  // Dashboards Subtabs State
  const [adminSubTab, setAdminSubTab] = useState('stats'); // 'stats', 'products', 'orders', 'customers'
  const [customerSubTab, setCustomerSubTab] = useState('orders'); // 'orders', 'profile'

  // Products & Filter State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('default');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);

  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
    fullName: '',
    address: '',
    phone: ''
  });

  // Admin Modal / Form State for CRUD
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Minute Maid',
    price: '',
    stock: 50,
    image: '/images/en_minute_maid_prod_orange_100vitc_750x750_v1.jpg',
    description: ''
  });

  // Contact Form State
  const [contactMsg, setContactMsg] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });

  // Sync Cart to localStorage
  useEffect(() => {
    localStorage.setItem('lion_cart', JSON.stringify(cart));
  }, [cart]);

  // Toast helper
  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Fetch Products from MongoDB
  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}?search=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(selectedCategory)}`;
      if (sortOption !== 'default') {
        url += `&sort=${sortOption}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products from MongoDB backend:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, selectedCategory, sortOption]);

  // 2. Fetch User Specific Dashboard Information
  const fetchOrders = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchAdminStats = async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAdminStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchCustomersList = async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCustomersList(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAdminMessages = async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAdminMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/admin/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showToastMessage('Message deleted successfully!');
        fetchAdminMessages();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  useEffect(() => {
    if (token) {
      if (activeTab === 'customer') {
        fetchOrders();
      } else if (activeTab === 'admin') {
        if (adminSubTab === 'orders') fetchOrders();
        else if (adminSubTab === 'stats') fetchAdminStats();
        else if (adminSubTab === 'customers') fetchCustomersList();
        else if (adminSubTab === 'messages') fetchAdminMessages();
      }
    }
  }, [activeTab, token, adminSubTab, customerSubTab]);

  // 3. User Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthAlert(null);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authFormData.email, password: authFormData.password })
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('lion_token', data.token);
        localStorage.setItem('lion_user', JSON.stringify(data.user));
        setAuthAlert({ type: 'success', message: 'Logged in successfully!' });
        setAuthFormData({ name: '', email: '', password: '', role: 'customer' });
        
        // Populate delivery name by default
        setDeliveryDetails(prev => ({ ...prev, fullName: data.user.name }));

        setTimeout(() => {
          setActiveTab('home');
        }, 1000);
      } else {
        setAuthAlert({ type: 'error', message: data.error || 'Login failed' });
      }
    } catch (error) {
      setAuthAlert({ type: 'error', message: 'Connection error' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthAlert(null);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authFormData)
      });
      const data = await response.json();
      if (response.ok) {
        setAuthAlert({ type: 'success', message: 'Registered successfully! Please sign in to your account.' });
        const regEmail = authFormData.email;
        setAuthFormData({ name: '', email: regEmail, password: '', role: 'customer' });
        // After Register -> Go to Login Page
        setAuthMode('login');
      } else {
        setAuthAlert({ type: 'error', message: data.error || 'Registration failed' });
      }
    } catch (error) {
      setAuthAlert({ type: 'error', message: 'Connection error' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('lion_token');
    localStorage.removeItem('lion_user');
    setCart([]);
    setAuthMode('register');
    setActiveTab('auth');
  };

  // 4. Shopping Cart Handlers
  const handleAddToCart = (product) => {
    const existing = cart.find(item => item.product._id === product._id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        showToastMessage(`⚠️ Only ${product.stock} items in stock.`);
        return;
      }
      setCart(prev => prev.map(item =>
        item.product._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart(prev => [...prev, { product, quantity: 1 }]);
      // auto-select newly added item
      setSelectedCartIds(prev => [...prev, product._id]);
    }
    showToastMessage(`🍹 Added ${product.name} to cart!`);
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
    setSelectedCartIds(prev => prev.filter(id => id !== productId));
  };

  const handleUpdateCartQty = (productId, newQty, maxStock) => {
    const qty = Number(newQty);
    if (qty <= 0) { handleRemoveFromCart(productId); return; }
    if (qty > maxStock) { showToastMessage(`⚠️ Only ${maxStock} in stock.`); return; }
    setCart(prev => prev.map(item =>
      item.product._id === productId ? { ...item, quantity: qty } : item
    ));
  };

  // Toggle checkbox selection
  const handleToggleSelect = (productId) => {
    setSelectedCartIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const allSelected = cart.length > 0 && cart.every(item => selectedCartIds.includes(item.product._id));
  const handleSelectAll = () => {
    if (allSelected) setSelectedCartIds([]);
    else setSelectedCartIds(cart.map(item => item.product._id));
  };

  // Only selected items
  const selectedItems = cart.filter(item => selectedCartIds.includes(item.product._id));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const handleOpenCheckout = () => {
    if (selectedItems.length === 0) { showToastMessage('⚠️ Please select at least one item to checkout.'); return; }
    if (!user) {
      setShowCartModal(false);
      setActiveTab('auth');
      setAuthMode('register');
      return;
    }
    setDeliveryDetails({ fullName: user.name, address: '', phone: '' });
    setCheckoutStep(true);
  };

  // Place order for selected cart items
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          items: selectedItems.map(i => ({ product: i.product._id, quantity: i.quantity })),
          paymentMethod,
          deliveryDetails
        })
      });
      if (response.ok) {
        setOrderSuccess(true);
        // Remove only the ordered items from cart
        setCart(prev => prev.filter(i => !selectedCartIds.includes(i.product._id)));
        setSelectedCartIds([]);
        fetchProducts();
        fetchOrders();
        setTimeout(() => { setOrderSuccess(false); setShowCartModal(false); setCheckoutStep(false); }, 2000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to place order');
      }
    } catch (error) { console.error('Error placing order:', error); }
  };

  // Buy Now: direct single-item checkout
  const handleBuyNow = (product) => {
    if (!user) { setActiveTab('auth'); setAuthMode('register'); return; }
    setBuyNowProduct(product);
    setBuyNowQty(1);
    setBuyNowSuccess(false);
    setPaymentMethod('card');
    setDeliveryDetails({ fullName: user.name, address: '', phone: '' });
  };

  const handleBuyNowOrder = async (e) => {
    e.preventDefault();
    if (!buyNowProduct) return;
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          items: [{ product: buyNowProduct._id, quantity: buyNowQty }],
          paymentMethod,
          deliveryDetails
        })
      });
      if (response.ok) {
        setBuyNowSuccess(true);
        fetchProducts();
        fetchOrders();
        setTimeout(() => { setBuyNowSuccess(false); setBuyNowProduct(null); }, 2000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to place order');
      }
    } catch (error) { console.error('Buy Now error:', error); }
  };

  // 5. Admin CRUD Handlers
  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Minute Maid',
      price: '',
      stock: 50,
      image: '/images/en_minute_maid_prod_orange_100vitc_750x750_v1.jpg',
      description: ''
    });
    setShowAdminModal(true);
  };

  const handleOpenEditForm = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category,
      price: prod.price,
      stock: prod.stock,
      image: prod.image,
      description: prod.description || ''
    });
    setShowAdminModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `${API_BASE}/${editingProduct._id}` : API_BASE;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAdminModal(false);
        fetchProducts();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchProducts();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleStockUpdateDirect = async (id, newStock) => {
    try {
      const response = await fetch(`${API_BASE}/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ setStock: Number(newStock) })
      });
      if (response.ok) {
        fetchProducts();
      } else {
        const errData = await response.json();
        console.error(errData.error);
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  // Update Order Status (Admin)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchOrders();
        fetchAdminStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Contact Form Submit Handler - Saves to Database + Opens WhatsApp
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactMsg('sending');
    const { name, email, phone, message } = contactForm;

    try {
      await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message })
      });
    } catch (err) {
      console.error('Error saving message to database:', err);
    }

    setContactMsg('sent');

    const waText = encodeURIComponent(
      `🍹 *Lion Juice Bar Website Message*\n\n👤 *Name:* ${name}\n📞 *Phone:* ${phone || 'N/A'}\n📧 *Email:* ${email}\n\n💬 *Message:* ${message}`
    );

    // Open WhatsApp
    window.open(`https://wa.me/94755021040?text=${waText}`, '_blank');

    setContactForm({ name: '', email: '', phone: '', message: '' });
    setTimeout(() => setContactMsg(null), 4000);
  };

  const categoriesList = ['All', 'Minute Maid', 'Ritai Juice', 'YOOH Juice', 'THIS IS IT', 'DAYMER BAY'];
  const cartTotalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortOption === 'price-asc') return a.price - b.price;
    if (sortOption === 'price-desc') return b.price - a.price;
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="app-container">
      {/* Toast Notification banner */}
      {toast && <div className="toast-notification">{toast}</div>}

      {/* Navigation Bar - Hidden on Auth Page */}
      {activeTab !== 'auth' && (
        <nav>
          <div className="nav">
            <img
              src="/images/WhatsApp Image 2024-10-07 at 08.19.50_70e205cb.jpg"
              alt="Lion Juice Bar Logo"
              className="logo"
              onClick={() => setActiveTab('home')}
            />
            <div className="menu">
              <a href="#home" onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}>Home</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); setActiveTab('about'); }}>About Us</a>
              <a href="#products" onClick={(e) => { e.preventDefault(); setActiveTab('products'); }}>Products</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); setActiveTab('contact'); }}>Contact Us</a>
              <a href="#watch" onClick={(e) => { e.preventDefault(); setActiveTab('watch'); }}>Watch Gallery</a>

              {/* Shopping Cart Button */}
              <button className="cart-btn" onClick={() => { setShowCartModal(true); setCheckoutStep(false); }}>
                🛒 Cart ({cartItemsCount})
              </button>

              {user ? (
                <>
                  {user.role === 'admin' ? (
                    <button className="admin-nav-btn" onClick={() => { setActiveTab('admin'); setAdminSubTab('stats'); }}>
                      ⚙️ Admin Console
                    </button>
                  ) : (
                    <button className="admin-nav-btn" style={{ backgroundColor: '#2196f3' }} onClick={() => { setActiveTab('customer'); setCustomerSubTab('orders'); }}>
                      👤 My Dashboard
                    </button>
                  )}
                  <div className="user-badge">
                    <span>Hi, {user.name.split(' ')[0]}</span>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                  </div>
                </>
              ) : (
                <button className="admin-nav-btn" style={{ backgroundColor: '#4caf50' }} onClick={() => { setActiveTab('auth'); setAuthMode('register'); setAuthAlert(null); }}>
                  🔑 Register / Sign In
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      {activeTab === 'home' && (
        <main>
          <div className="hero-banner">
            <h1>LION JUICE BAR</h1>
            <h2 className="w1">Welcome To<br />LION JUICE BAR</h2>
            <p className="pp">
              Enjoy fresh, healthy juices and smoothies made with the best local ingredients. Sip, enjoy, and feel refreshed!
            </p>
            <div className="watch-btn-container">
              <button className="watch-btn" onClick={() => setActiveTab('watch')}>WATCH MORE</button>
            </div>
          </div>

          {/* About Section */}
          <h2 className="section-title">About Us</h2>
          <div className="about-text">
            Lion Juice Bar is a popular spot for regulars for its juice bar, known for serving healthy and delicious creations.<br />
            The locally owned and operated juice bar specializes in chef-made pressed juices, smoothies and bowls.<br />
            Focusing on high quality ingredients and unique flavors, Juice Bar serves only the best.<br />
            Thousands of Sri Lankans visit daily to enjoy fresh juice. The Juice Bar is part of a growing movement of people who believe that a healthy lifestyle is accessible to everyone and essential to a sustainable future.
          </div>

          {/* Featured Products */}
          <h2 className="section-title" style={{ marginTop: '40px' }}>Our Fresh Products</h2>

          {/* Filter, Search & Sort Control Bar */}
          <div className="controls-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search juice or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="category-tabs">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  className={`tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="sort-box">
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="default">Sort by Default</option>
                <option value="name-asc">Sort by Name (A-Z)</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '20px' }}>Loading products from MongoDB...</div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px' }}>No products found matching your search.</div>
          ) : (
            <div className="products-grid">
              {products.map(product => (
                <div className="product-card" key={product._id}>
                  <img src={product.image} alt={product.name} style={{ cursor: 'pointer' }} onClick={() => setPreviewProduct(product)} title="Click to view details" />
                  <span className="product-category-tag">{product.category}</span>
                  <h4 style={{ cursor: 'pointer' }} onClick={() => setPreviewProduct(product)}>{product.name}</h4>
                  <h5>Rs.{product.price}/=</h5>
                  <div className={`stock-badge ${product.stock > 10 ? 'stock-in' : product.stock > 0 ? 'stock-low' : 'stock-out'}`}>
                    {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                  </div>
                  <div className="product-card-actions">
                    <button
                      className="btn-add-cart"
                      disabled={product.stock <= 0}
                      onClick={() => handleAddToCart(product)}
                    >
                      {product.stock > 0 ? '🛒 Add to Cart' : 'Sold Out'}
                    </button>
                    <button
                      className="btn-buy-now"
                      disabled={product.stock <= 0}
                      onClick={() => handleBuyNow(product)}
                    >
                      ⚡ Buy Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Section Preview */}
          <h2 className="section-title" style={{ marginTop: '40px' }}>Contact Us</h2>
          <div className="contact-section">
            <div className="details-container">
              <div className="contact-info">
                <h3>Phone</h3>
                <p><a href="tel:0755021040">075-502-1040</a></p>
                <h3>Email</h3>
                <p><a href="mailto:neluwasana7@gmail.com">neluwasana7@gmail.com</a></p>
                <h3>Address</h3>
                <p>11th Mile Post,<br />Ella-Wellawaya Road, Ella 90091</p>
              </div>

              <div className="box">
                <h3 className="msg">Send a Message</h3>
                {contactMsg === 'sent' ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ color: '#81c784', fontSize: '16px', marginBottom: '8px' }}>✅ Opening WhatsApp...</div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>Your message has been pre-filled for WhatsApp.</div>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit}>
                    <input type="text" placeholder="Enter Full Name" className="textbox" required
                      value={contactForm.name || ''} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                    <input type="email" placeholder="Enter Email Address" className="textbox" required
                      value={contactForm.email || ''} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                    <input type="tel" placeholder="Enter Phone Number" className="textbox"
                      value={contactForm.phone || ''} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                    <textarea placeholder="Message" className="Message" required
                      value={contactForm.message || ''} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea>
                    <button type="submit" className="btn-submit" style={{ background: '#25D366', color: '#fff' }}>
                      💬 Send via WhatsApp
                    </button>
                  </form>
                )}
              </div>

              <div className="map">
                <iframe
                  title="Lion Juice Bar Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d495.1811978168538!2d81.07512570646223!3d6.83657752109766!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae46f2f38d1ac7b%3A0x3aa0274c2f1c0374!2sElla%20Mountain%20Ring%20Hotel%20%26%20Restaurant!5e0!3m2!1sen!2slk!4v1733056139047!5m2!1sen!2slk"
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            </div>

            <div className="lastimage-container">
              <img src="/images/last.jpg" alt="Lion Juice Bar Fresh" className="border-img" />
            </div>
            <p className="open"><b>24 Hours Available</b></p>
          </div>
        </main>
      )}

      {activeTab === 'products' && (
        <main style={{ padding: '20px' }}>
          <h2 className="section-title">Products Menu</h2>

          <div className="controls-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search juice name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="category-tabs">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  className={`tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="sort-box">
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="default">Sort by Default</option>
                <option value="name-asc">Sort by Name (A-Z)</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading products...</div>
          ) : (
            <div className="products-grid">
              {products.map(product => (
                <div className="product-card" key={product._id}>
                  <img src={product.image} alt={product.name} style={{ cursor: 'pointer' }} onClick={() => setPreviewProduct(product)} title="Click to view details" />
                  <span className="product-category-tag">{product.category}</span>
                  <h4 style={{ cursor: 'pointer' }} onClick={() => setPreviewProduct(product)}>{product.name}</h4>
                  <h5>Rs.{product.price}/=</h5>
                  <div className={`stock-badge ${product.stock > 10 ? 'stock-in' : product.stock > 0 ? 'stock-low' : 'stock-out'}`}>
                    {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                  </div>
                  <div className="product-card-actions">
                    <button
                      className="btn-add-cart"
                      disabled={product.stock <= 0}
                      onClick={() => handleAddToCart(product)}
                    >
                      {product.stock > 0 ? '🛒 Add to Cart' : 'Sold Out'}
                    </button>
                    <button
                      className="btn-buy-now"
                      disabled={product.stock <= 0}
                      onClick={() => handleBuyNow(product)}
                    >
                      ⚡ Buy Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeTab === 'about' && (
        <main style={{ padding: '20px' }}>
          <h2 className="section-title">About Us</h2>
          <div className="about-text" style={{ marginTop: '30px' }}>
            Lion Juice Bar is a popular spot for regulars for its juice bar, known for serving healthy and delicious creations.<br /><br />
            The locally owned and operated juice bar specializes in chef-made pressed juices, smoothies and bowls.<br /><br />
            Focusing on high quality ingredients and unique flavors, Juice Bar serves only the best.<br /><br />
            Thousands of Sri Lankans visit daily to enjoy fresh juice. The Juice Bar is part of a growing movement of people who believe that a healthy lifestyle is accessible to everyone and essential to a sustainable future.
          </div>
        </main>
      )}

      {activeTab === 'contact' && (
        <main style={{ padding: '20px' }}>
          <h2 className="section-title">Contact Us</h2>
          <div className="contact-section">
            <div className="details-container">
              <div className="contact-info">
                <h3>Phone</h3>
                <p><a href="tel:0755021040">075-502-1040</a></p>
                <h3>Email</h3>
                <p><a href="mailto:neluwasana7@gmail.com">neluwasana7@gmail.com</a></p>
                <h3>Address</h3>
                <p>11th Mile Post,<br />Ella-Wellawaya Road, Ella 90091</p>
              </div>

              <div className="box">
                <h3 className="msg">Send a Message</h3>
                {contactMsg === 'sent' ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ color: '#81c784', fontSize: '16px', marginBottom: '8px' }}>✅ Message sent!</div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>Email sent to shop + WhatsApp is opening...</div>
                  </div>
                ) : contactMsg === 'error' ? (
                  <div style={{ color: '#e57373', textAlign: 'center', padding: '15px 0' }}>
                    ❌ Failed to send. Please call or WhatsApp directly.
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit}>
                    <input type="text" placeholder="Enter Full Name" className="textbox" required
                      value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                    <input type="email" placeholder="Enter Email Address" className="textbox" required
                      value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                    <input type="tel" placeholder="Enter Phone Number" className="textbox"
                      value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                    <textarea placeholder="Message" className="Message" required
                      value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea>
                    <button type="submit" className="btn-submit" disabled={contactMsg === 'sending'}>
                      {contactMsg === 'sending' ? 'Sending...' : '📨 Send via Email & WhatsApp'}
                    </button>
                  </form>
                )}
              </div>

              <div className="map">
                <iframe
                  title="Lion Juice Bar Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d495.1811978168538!2d81.07512570646223!3d6.83657752109766!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae46f2f38d1ac7b%3A0x3aa0274c2f1c0374!2sElla%20Mountain%20Ring%20Hotel%20%26%20Restaurant!5e0!3m2!1sen!2slk!4v1733056139047!5m2!1sen!2slk"
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            </div>

            <div className="lastimage-container">
              <img src="/images/last.jpg" alt="Lion Juice Bar" className="border-img" />
            </div>
            <p className="open"><b>24 Hours Available</b></p>
          </div>
        </main>
      )}

      {activeTab === 'watch' && (
        <main style={{ 
          padding: '35px 25px', 
          maxWidth: '1300px', 
          margin: '30px auto', 
          background: 'rgba(0, 0, 0, 0.7)', 
          backdropFilter: 'blur(5px)', 
          WebkitBackdropFilter: 'blur(5px)', 
          borderRadius: '20px', 
          border: '1px solid rgba(255, 152, 0, 0.3)', 
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)' 
        }}>
          <div className="gallery-section">
            <h2 className="section-title" style={{ borderRadius: '10px', marginBottom: '30px' }}>🎥 Watch Gallery & Juice Showcase</h2>

            {/* 1. FIRST: Individual Juice Detail Photo Cards List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '25px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
                <img src="/images/137741806(1).png" alt="Mango Lemon Lime Detail" style={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
                <img src="/images/137674785.png" alt="Classic Limeade Detail" style={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
                <img src="/images/137742113(1).png" alt="Orange Lemon Lime Detail" style={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
                <img src="/images/137619198.png" alt="Juice Detail Showcase" style={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
                <img src="/images/137674535(1).png" alt="Juice Detail Showcase" style={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
                <img src="/images/137619194(1).png" alt="Juice Detail Showcase" style={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'contain' }} />
              </div>
            </div>

            {/* 2. LAST: Promotional Videos Section */}
            <div style={{ background: 'rgba(0,0,0,0.7)', padding: '25px', borderRadius: '15px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: '#ff9800', fontSize: '22px', marginBottom: '10px', textAlign: 'center' }}>🎬 Featured Promotional Videos</h3>
              <p style={{ color: '#bbb', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>Experience the fresh atmosphere and crafting process at Ella Lion Juice Bar.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                <div style={{ background: '#181818', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #333' }}>
                  <video src="/videos/WhatsApp Video 2024-12-04 at 20.02.05_a69b4aaa.mp4" controls style={{ width: '100%', borderRadius: '8px', maxHeight: '280px', objectFit: 'cover' }}></video>
                  <h4 style={{ color: '#ff9800', marginTop: '12px', fontSize: '16px' }}>🍊 Fresh Fruit Preparation</h4>
                  <p style={{ color: '#aaa', fontSize: '13px', marginTop: '4px' }}>Behind the scenes: Selecting 100% fresh organic fruits.</p>
                </div>
                <div style={{ background: '#181818', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #333' }}>
                  <video src="/videos/WhatsApp Video 2024-12-04 at 21.32.39_5ccf30c7.mp4" controls style={{ width: '100%', borderRadius: '8px', maxHeight: '280px', objectFit: 'cover' }}></video>
                  <h4 style={{ color: '#ff9800', marginTop: '12px', fontSize: '16px' }}>🍹 Lion Juice Bar Atmosphere</h4>
                  <p style={{ color: '#aaa', fontSize: '13px', marginTop: '4px' }}>Mastering cold-pressed juices and vibrant store atmosphere.</p>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* Authentication Tab */}
      {activeTab === 'auth' && (
        <main style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px 15px' }}>
          <div className="auth-container" style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src="/images/WhatsApp Image 2024-10-07 at 08.19.50_70e205cb.jpg"
                alt="Lion Juice Bar Logo"
                style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #ff9800', objectFit: 'cover' }}
              />
              <h2 style={{ color: '#ff9800', marginTop: '10px', fontSize: '22px', letterSpacing: '1px', fontWeight: 'bold' }}>LION JUICE BAR</h2>
              <p style={{ color: '#aaa', fontSize: '13px', marginTop: '4px' }}>Welcome! Please register or sign in to continue</p>
            </div>
            <div className="auth-toggle">
              <button
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => { setAuthMode('register'); setAuthAlert(null); }}
              >
                Register
              </button>
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => { setAuthMode('login'); setAuthAlert(null); }}
              >
                Sign In
              </button>
            </div>

            {authAlert && (
              <div className={`auth-alert ${authAlert.type}`}>
                {authAlert.message}
              </div>
            )}

            {authMode === 'register' ? (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label>Full Name:</label>
                  <input
                    type="text"
                    value={authFormData.name}
                    onChange={(e) => setAuthFormData({ ...authFormData, name: e.target.value })}
                    required
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address:</label>
                  <input
                    type="email"
                    value={authFormData.email}
                    onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                    required
                    placeholder="name@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={authFormData.password}
                      onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                      required
                      placeholder="Create a password"
                      style={{ paddingRight: '45px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ff9800',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        outline: 'none'
                      }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Account Role:</label>
                  <select
                    value={authFormData.role}
                    onChange={(e) => setAuthFormData({ ...authFormData, role: e.target.value })}
                  >
                    <option value="customer">Customer / Buyer</option>
                    <option value="admin">Admin / Store Manager</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Register Account</button>
                <div style={{ textAlign: 'center', marginTop: '15px', color: '#ccc', fontSize: '14px' }}>
                  Already have an account?{' '}
                  <a
                    href="#login"
                    style={{ color: '#ff9800', fontWeight: 'bold', textDecoration: 'underline' }}
                    onClick={(e) => { e.preventDefault(); setAuthMode('login'); setAuthAlert(null); }}
                  >
                    Sign In
                  </a>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email Address:</label>
                  <input
                    type="email"
                    value={authFormData.email}
                    onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                    required
                    placeholder="name@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={authFormData.password}
                      onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                      required
                      placeholder="Enter password"
                      style={{ paddingRight: '45px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ff9800',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        outline: 'none'
                      }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary">Sign In</button>
                <div style={{ textAlign: 'center', marginTop: '15px', color: '#ccc', fontSize: '13px' }}>
                  <p>Demo Admin: admin@lionjuicebar.com / admin123</p>
                  <p>Demo Customer: customer@gmail.com / customer123</p>
                  <p style={{ marginTop: '10px' }}>
                    Need a new account?{' '}
                    <a
                      href="#register"
                      style={{ color: '#ff9800', fontWeight: 'bold', textDecoration: 'underline' }}
                      onClick={(e) => { e.preventDefault(); setAuthMode('register'); setAuthAlert(null); }}
                    >
                      Register First
                    </a>
                  </p>
                </div>
              </form>
            )}
          </div>
        </main>
      )}

      {/* Customer Dashboard Tab */}
      {activeTab === 'customer' && (
        <main style={{ padding: '20px' }}>
          <h2 className="section-title">Customer Dashboard</h2>

          <div className="admin-table-container">
            <div className="dashboard-sections">
              <button
                className={`dash-sec-btn ${customerSubTab === 'orders' ? 'active' : ''}`}
                onClick={() => setCustomerSubTab('orders')}
              >
                📦 My Orders
              </button>
              <button
                className={`dash-sec-btn ${customerSubTab === 'profile' ? 'active' : ''}`}
                onClick={() => setCustomerSubTab('profile')}
              >
                👤 Profile Settings
              </button>
            </div>

            {customerSubTab === 'orders' && (
              <div>
                <h3>My Order History ({orders.length} orders)</h3>
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                    You have not placed any orders yet.
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                        <th>Payment</th>
                        <th>Delivery To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td style={{ fontSize: '12px', color: '#aaa' }}>{order._id}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td>
                            {order.items.map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                {it.product ? (
                                  <>
                                    <img src={it.product.image} alt={it.product.name} className="table-img" />
                                    <span>{it.product.name} (x{it.quantity})</span>
                                  </>
                                ) : (
                                  <span style={{ color: '#aaa', fontStyle: 'italic' }}>Product Unavailable</span>
                                )}
                              </div>
                            ))}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#ff9800' }}>Rs.{order.totalAmount}</td>
                          <td style={{ textTransform: 'capitalize' }}>{order.paymentMethod}</td>
                          <td>
                            <div><b>{order.deliveryDetails?.fullName}</b></div>
                            <div style={{ fontSize: '13px', color: '#ccc' }}>{order.deliveryDetails?.address}</div>
                            <div style={{ fontSize: '13px', color: '#aaa' }}>📞 {order.deliveryDetails?.phone}</div>
                          </td>
                          <td>
                            <span className={`status-badge status-${order.status.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {customerSubTab === 'profile' && (
              <div className="profile-card">
                <h3>My Profile Information</h3>
                <p>Full Name: <span>{user?.name}</span></p>
                <p>Email Address: <span>{user?.email}</span></p>
                <p>Account Type: <span style={{ color: '#2196f3', textTransform: 'capitalize' }}>{user?.role}</span></p>
                <p>Member Since: <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span></p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Admin Console Tab */}
      {activeTab === 'admin' && (
        <main style={{ padding: '20px' }}>
          <h2 className="section-title">Admin Management Console</h2>

          <div className="admin-table-container">
            {/* Admin Dashboard Subtabs */}
            <div className="dashboard-sections">
              <button
                className={`dash-sec-btn ${adminSubTab === 'stats' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('stats')}
              >
                📊 Dashboard Overview
              </button>
              <button
                className={`dash-sec-btn ${adminSubTab === 'products' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('products')}
              >
                🍹 Manage Products
              </button>
              <button
                className={`dash-sec-btn ${adminSubTab === 'orders' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('orders')}
              >
                📋 Customer Orders
              </button>
              <button
                className={`dash-sec-btn ${adminSubTab === 'customers' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('customers')}
              >
                👥 User Directory
              </button>
              <button
                className={`dash-sec-btn ${adminSubTab === 'messages' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('messages')}
              >
                💬 Customer Messages ({adminMessages.length})
              </button>
              <button
                className={`dash-sec-btn ${adminSubTab === 'gallery' ? 'active' : ''}`}
                onClick={() => setAdminSubTab('gallery')}
              >
                🎥 Watch Gallery
              </button>
            </div>

            {/* Subtab 1: stats */}
            {adminSubTab === 'stats' && adminStats && (
              <div>
                <div className="dashboard-grid">
                  <div className="stat-card">
                    <h3>Total Sales</h3>
                    <p>Rs.{adminStats.totalSales}/=</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Orders</h3>
                    <p>{adminStats.totalOrders}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Registered Customers</h3>
                    <p>{adminStats.totalCustomers}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Menu Products</h3>
                    <p>{adminStats.totalProducts}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                  <div style={{ background: '#222', padding: '20px', borderRadius: '10px' }}>
                    <h4 style={{ color: '#ff9800', marginBottom: '15px' }}>⚠️ Low Stock Warnings (≤ 10 items)</h4>
                    {adminStats.lowStockProducts.length === 0 ? (
                      <p style={{ color: '#81c784' }}>All juices are fully stocked!</p>
                    ) : (
                      <table className="admin-table" style={{ fontSize: '14px' }}>
                        <thead>
                          <tr>
                            <th>Juice Name</th>
                            <th>Category</th>
                            <th>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminStats.lowStockProducts.map(p => (
                            <tr key={p._id}>
                              <td>{p.name}</td>
                              <td>{p.category}</td>
                              <td>
                                <span className="status-badge status-cancelled">{p.stock} left</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div style={{ background: '#222', padding: '20px', borderRadius: '10px' }}>
                    <h4 style={{ color: '#ff9800', marginBottom: '15px' }}>📈 Order Status Breakdown</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {adminStats.statusDistribution.map(item => (
                        <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={`status-badge status-${item._id.toLowerCase()}`}>{item._id}</span>
                          <span style={{ fontWeight: 'bold' }}>{item.count} order(s)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtab 2: Products CRUD */}
            {adminSubTab === 'products' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Total Products: {products.length}</h3>
                  <button className="btn-primary" style={{ width: 'auto' }} onClick={handleOpenAddForm}>
                    + Add New Juice Product
                  </button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price (Rs)</th>
                      <th>Stock</th>
                      <th>Stock Quick Edit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p._id}>
                        <td><img src={p.image} alt={p.name} className="table-img" /></td>
                        <td><b>{p.name}</b></td>
                        <td>{p.category}</td>
                        <td>Rs.{p.price}</td>
                        <td>
                          <span className={`stock-badge ${p.stock > 10 ? 'stock-in' : p.stock > 0 ? 'stock-low' : 'stock-out'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={p.stock}
                            style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white' }}
                            onChange={(e) => handleStockUpdateDirect(p._id, e.target.value)}
                          />
                        </td>
                        <td>
                          <button className="btn-edit" onClick={() => handleOpenEditForm(p)}>Edit</button>
                          <button className="btn-danger" onClick={() => handleDeleteProduct(p._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subtab 3: Orders List */}
            {adminSubTab === 'orders' && (
              <div>
                <h3>Customer Orders Log</h3>
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                    No customer orders found in the database.
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order Details</th>
                        <th>Customer</th>
                        <th>Products Ordered</th>
                        <th>Total Price</th>
                        <th>Delivery Details</th>
                        <th>Order Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td>
                            <div style={{ fontSize: '11px', color: '#aaa' }}>ID: {order._id}</div>
                            <div style={{ fontSize: '13px', marginTop: '4px' }}>Date: {new Date(order.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td>
                            <div><b>{order.customer?.name || 'Guest User'}</b></div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{order.customer?.email}</div>
                          </td>
                          <td>
                            {order.items.map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                {it.product ? (
                                  <>
                                    <img src={it.product.image} alt={it.product.name} className="table-img" />
                                    <span>{it.product.name} (x{it.quantity})</span>
                                  </>
                                ) : (
                                  <span style={{ color: '#aaa', fontStyle: 'italic' }}>Product Unavailable</span>
                                )}
                              </div>
                            ))}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#ff9800' }}>Rs.{order.totalAmount}</td>
                          <td>
                            <div><b>{order.deliveryDetails?.fullName}</b></div>
                            <div style={{ fontSize: '13px', color: '#ccc' }}>{order.deliveryDetails?.address}</div>
                            <div style={{ fontSize: '13px', color: '#aaa' }}>📞 {order.deliveryDetails?.phone}</div>
                            <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '3px', textTransform: 'capitalize' }}>Method: {order.paymentMethod}</div>
                          </td>
                          <td>
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                              style={{ padding: '6px', borderRadius: '4px', background: '#222', color: 'white', border: '1px solid #555' }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Subtab 4: Customers List */}
            {adminSubTab === 'customers' && (
              <div>
                <h3>Registered User Accounts</h3>
                {customersList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>No customers registered yet.</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer ID</th>
                        <th>Name</th>
                        <th>Email Address</th>
                        <th>Role</th>
                        <th>Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersList.map(c => (
                        <tr key={c._id}>
                          <td style={{ fontSize: '12px', color: '#aaa' }}>{c._id}</td>
                          <td><b>{c.name}</b></td>
                          <td>{c.email}</td>
                          <td>
                            <span className="status-badge status-processing">{c.role}</span>
                          </td>
                          <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Subtab 5: Customer Messages */}
            {adminSubTab === 'messages' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Customer Contact Messages ({adminMessages.length})</h3>
                  <button className="btn-secondary" onClick={fetchAdminMessages} style={{ cursor: 'pointer' }}>🔄 Refresh Messages</button>
                </div>
                {adminMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', background: '#222', borderRadius: '10px' }}>
                    <p style={{ fontSize: '18px', marginBottom: '10px' }}>💬 No customer messages received yet.</p>
                    <p style={{ fontSize: '13px', color: '#777' }}>Messages sent through the Contact Us form on the website will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {adminMessages.map((msg) => (
                      <div key={msg._id} style={{ background: '#222', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #ff9800' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h4 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 5px 0' }}>👤 {msg.name}</h4>
                            <div style={{ color: '#ccc', fontSize: '13px' }}>
                              📧 <a href={`mailto:${msg.email}`} style={{ color: '#4da6ff' }}>{msg.email}</a>
                              {msg.phone && <span style={{ marginLeft: '15px' }}>📞 <a href={`tel:${msg.phone}`} style={{ color: '#4da6ff' }}>{msg.phone}</a></span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', color: '#888' }}>
                              {new Date(msg.createdAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                            </span>
                            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {msg.phone && (
                                <a
                                  href={`https://wa.me/${msg.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${msg.name}, thank you for contacting Lion Juice Bar! Regarding your message:`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '12px', background: '#25D366', textDecoration: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  💬 Reply on WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                style={{ padding: '4px 10px', fontSize: '12px', background: '#e53935', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', background: '#181818', padding: '12px', borderRadius: '6px', color: '#ddd', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                          "{msg.message}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subtab 6: Watch Gallery Showcase */}
            {adminSubTab === 'gallery' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3>🎥 Watch Gallery Video Showcase</h3>
                  <p style={{ color: '#aaa', fontSize: '14px' }}>Preview the promotional videos and customer gallery showcase featured on the website.</p>
                </div>
                <div className="watch-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div className="watch-card" style={{ background: '#222', borderRadius: '10px', padding: '15px' }}>
                    <h4 style={{ color: '#ff9800', marginBottom: '10px' }}>🍊 Fresh Fruit Preparation</h4>
                    <video controls width="100%" style={{ borderRadius: '8px', maxHeight: '280px' }}>
                      <source src="/videos/WhatsApp Video 2024-12-04 at 20.02.05_a69b4aaa.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p style={{ color: '#ccc', fontSize: '13px', marginTop: '10px' }}>Behind the scenes: Selecting 100% fresh organic fruits.</p>
                  </div>
                  <div className="watch-card" style={{ background: '#222', borderRadius: '10px', padding: '15px' }}>
                    <h4 style={{ color: '#ff9800', marginBottom: '10px' }}>🍹 Lion Juice Bar Atmosphere</h4>
                    <video controls width="100%" style={{ borderRadius: '8px', maxHeight: '280px' }}>
                      <source src="/videos/WhatsApp Video 2024-12-04 at 21.32.39_5ccf30c7.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p style={{ color: '#ccc', fontSize: '13px', marginTop: '10px' }}>Mastering cold-pressed juices and vibrant store atmosphere.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Shopping Cart Modal */}
      {showCartModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px', width: '95%' }}>
            
            {/* Header: toggle back if on checkout step */}
            <div className="modal-header">
              {checkoutStep && !orderSuccess ? (
                <div className="checkout-header-nav" onClick={() => setCheckoutStep(false)}>
                  ⬅️ Back to Cart
                </div>
              ) : (
                <h3>🛒 Your Shopping Cart</h3>
              )}
              <button className="close-btn" onClick={() => setShowCartModal(false)}>×</button>
            </div>

            {orderSuccess ? (
              <div style={{ textAlign: 'center', color: '#81c784', padding: '35px 0', fontSize: '20px' }}>
                🎉 Order placed successfully! Thank you for ordering from Lion Juice Bar.
              </div>
            ) : !checkoutStep ? (
              /* Step 1: Cart list */
              <div>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                    <p style={{ fontSize: '18px', marginBottom: '10px' }}>Your shopping cart is empty.</p>
                    <p style={{ fontSize: '14px' }}>Add fresh juices from our products menu to get started!</p>
                  </div>
                ) : (
                  <div>
                    {/* Select All Bar */}
                  <div className="cart-select-bar">
                    <label>
                      <input
                        type="checkbox"
                        className="cart-item-checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                      />
                      Select All ({cart.length} items)
                    </label>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>
                      {selectedItems.length} selected
                    </span>
                  </div>

                  {/* Cart Items with Checkboxes */}
                  <div style={{ maxHeight: '310px', overflowY: 'auto', paddingRight: '5px' }}>
                    {cart.map(item => (
                      <div
                        className="cart-item"
                        key={item.product._id}
                        style={{ opacity: selectedCartIds.includes(item.product._id) ? 1 : 0.5 }}
                      >
                        <input
                          type="checkbox"
                          className="cart-item-checkbox"
                          checked={selectedCartIds.includes(item.product._id)}
                          onChange={() => handleToggleSelect(item.product._id)}
                        />
                        <img src={item.product.image} alt={item.product.name} />
                        <div className="cart-item-details">
                          <h4>{item.product.name}</h4>
                          <p>Rs.{item.product.price} × {item.quantity} = <b style={{color:'#ff9800'}}>Rs.{item.product.price * item.quantity}</b></p>
                        </div>
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => handleUpdateCartQty(item.product._id, item.quantity - 1, item.product.stock)}>-</button>
                          <input type="text" className="qty-input" readOnly value={item.quantity} />
                          <button className="qty-btn" onClick={() => handleUpdateCartQty(item.product._id, item.quantity + 1, item.product.stock)}>+</button>
                        </div>
                        <button className="btn-remove" onClick={() => handleRemoveFromCart(item.product._id)} title="Remove">🗑️</button>
                      </div>
                    ))}
                  </div>

                  {/* Bill Footer */}
                  <div className="cart-bill-footer">
                    <div>
                      <div className="total-label">Total ({selectedItems.length} items selected):</div>
                      <div className="total-amount">Rs.{selectedTotal}/=</div>
                    </div>
                    <button
                      className="btn-checkout-selected"
                      onClick={handleOpenCheckout}
                      disabled={selectedItems.length === 0}
                    >
                      Checkout ({selectedItems.length})
                    </button>
                  </div>
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Shipping & Details Checkout form */
              <form onSubmit={handlePlaceOrder}>
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                  {/* Summary of Selected Items */}
                  <div style={{ background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h4 style={{ fontSize: '14px', color: '#ff9800', marginBottom: '8px' }}>Order Summary ({selectedItems.length} items)</h4>
                    {selectedItems.map(item => (
                      <div key={item.product._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '4px 0', color: '#ddd' }}>
                        <span>{item.product.name} (x{item.quantity})</span>
                        <span>Rs.{item.product.price * item.quantity}/=</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #444', marginTop: '8px', paddingTop: '8px', display:'flex', justifyContent:'space-between', fontWeight:'bold', color:'#ff9800' }}>
                      <span>Total:</span><span>Rs.{selectedTotal}/=</span>
                    </div>
                  </div>

                  {/* Delivery details form */}
                  <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#ff9800' }}>Delivery Information</h4>
                    <div className="form-group">
                      <label>Recipient Full Name:</label>
                      <input
                        type="text"
                        placeholder="Enter Recipient Name"
                        value={deliveryDetails.fullName}
                        onChange={(e) => setDeliveryDetails({ ...deliveryDetails, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Shipping / Delivery Address:</label>
                      <input
                        type="text"
                        placeholder="Enter Delivery Address"
                        value={deliveryDetails.address}
                        onChange={(e) => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Phone Number:</label>
                      <input
                        type="tel"
                        placeholder="Enter Phone Number"
                        value={deliveryDetails.phone}
                        onChange={(e) => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Payment selector */}
                  <div className="form-group">
                    <label>Payment Method:</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="card">💳 Card Payment</option>
                      <option value="cash">💵 Cash on Delivery</option>
                    </select>
                  </div>

                  {paymentMethod === 'card' && (
                    <div style={{ background: '#2a2a2a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#2196f3' }}>Card Details (Mock)</h4>
                      <div className="form-group">
                        <label>Card Number:</label>
                        <input type="text" placeholder="XXXX XXXX XXXX XXXX" required />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Expiry Date:</label>
                          <input type="text" placeholder="MM/YY" required />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>CVV:</label>
                            <input type="password" placeholder="123" maxLength="4" required />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '15px 0', textAlign: 'right', color: '#ff9800' }}>
                  Total: Rs.{selectedTotal} /=
                </div>

                <button type="submit" className="btn-primary">Place Order & Pay</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Buy Now Direct Checkout Modal */}
      {buyNowProduct && (
        <div className="modal-overlay">
          <div className="modal-card buy-now-modal">
            <div className="modal-header">
              <h3>⚡ Buy Now</h3>
              <button className="close-btn" onClick={() => setBuyNowProduct(null)}>×</button>
            </div>
            {buyNowSuccess ? (
              <div style={{ textAlign: 'center', color: '#81c784', padding: '30px 0', fontSize: '18px' }}>
                🎉 Order placed! Thank you for your purchase.
              </div>
            ) : (
              <form onSubmit={handleBuyNowOrder}>
                {/* Product preview */}
                <div className="buy-now-product-preview">
                  <img src={buyNowProduct.image} alt={buyNowProduct.name} />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{buyNowProduct.name}</div>
                    <div style={{ color: '#ffb74d', fontSize: '14px' }}>{buyNowProduct.category}</div>
                    <div style={{ color: '#ff9800', fontWeight: 'bold', marginTop: '4px' }}>Rs.{buyNowProduct.price}/=</div>
                    <div style={{ fontSize: '13px', color: '#aaa' }}>Stock: {buyNowProduct.stock}</div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="buy-now-qty-row">
                  <label>Quantity:</label>
                  <button type="button" className="qty-btn" onClick={() => setBuyNowQty(q => Math.max(1, q - 1))}>-</button>
                  <input type="text" className="qty-input" readOnly value={buyNowQty} />
                  <button type="button" className="qty-btn" onClick={() => setBuyNowQty(q => Math.min(buyNowProduct.stock, q + 1))}>+</button>
                  <span style={{ color: '#ff9800', fontWeight: 'bold', marginLeft: 'auto' }}>Rs.{buyNowProduct.price * buyNowQty}/=</span>
                </div>

                {/* Delivery */}
                <div style={{ background: '#2a2a2a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', color: '#ff9800', marginBottom: '10px' }}>Delivery Information</h4>
                  <div className="form-group">
                    <label>Full Name:</label>
                    <input type="text" value={deliveryDetails.fullName} onChange={e => setDeliveryDetails({...deliveryDetails, fullName: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Address:</label>
                    <input type="text" placeholder="Delivery Address" value={deliveryDetails.address} onChange={e => setDeliveryDetails({...deliveryDetails, address: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Phone:</label>
                    <input type="tel" placeholder="Phone Number" value={deliveryDetails.phone} onChange={e => setDeliveryDetails({...deliveryDetails, phone: e.target.value})} required />
                  </div>
                </div>

                {/* Payment */}
                <div className="form-group">
                  <label>Payment Method:</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="card">💳 Card Payment</option>
                    <option value="cash">💵 Cash on Delivery</option>
                  </select>
                </div>
                {paymentMethod === 'card' && (
                  <div style={{ background: '#2a2a2a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div className="form-group"><label>Card Number:</label><input type="text" placeholder="XXXX XXXX XXXX XXXX" required /></div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="form-group" style={{ flex: 1 }}><label>Expiry:</label><input type="text" placeholder="MM/YY" required /></div>
                      <div className="form-group" style={{ flex: 1 }}><label>CVV:</label><input type="password" placeholder="123" maxLength="4" required /></div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ marginTop: '5px' }}>
                  ⚡ Place Order — Rs.{buyNowProduct.price * buyNowQty}/=
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Product Quick-View / Details Modal */}
      {previewProduct && (
        <div className="modal-overlay" onClick={() => setPreviewProduct(null)}>
          <div className="modal-card product-quickview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🍹 {previewProduct.name}</h3>
              <button className="close-btn" onClick={() => setPreviewProduct(null)}>×</button>
            </div>
            <div className="product-quickview-body">
              <div className="product-quickview-image-box">
                <img src={previewProduct.image} alt={previewProduct.name} />
              </div>
              <div className="product-quickview-meta">
                <span className="product-quickview-category">{previewProduct.category}</span>
                <h3 style={{ margin: '4px 0', fontSize: '20px' }}>{previewProduct.name}</h3>
                <div className="product-quickview-price">Rs.{previewProduct.price}/=</div>
                <div className={`stock-badge ${previewProduct.stock > 10 ? 'stock-in' : previewProduct.stock > 0 ? 'stock-low' : 'stock-out'}`} style={{ width: 'fit-content' }}>
                  {previewProduct.stock > 0 ? `In Stock: ${previewProduct.stock} units available` : 'Out of Stock'}
                </div>
                {previewProduct.description && (
                  <p style={{ color: '#ccc', fontSize: '14px', margin: '8px 0', lineHeight: '1.4' }}>
                    {previewProduct.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  className="btn-add-cart"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={previewProduct.stock <= 0}
                  onClick={() => {
                    handleAddToCart(previewProduct);
                    setPreviewProduct(null);
                  }}
                >
                  🛒 Add to Cart
                </button>
                <button
                  className="btn-buy-now"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={previewProduct.stock <= 0}
                  onClick={() => {
                    setPreviewProduct(null);
                    handleBuyNow(previewProduct);
                  }}
                >
                  ⚡ Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add/Edit CRUD Modal */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Juice Product' : 'Add New Juice Product'}</h3>
              <button className="close-btn" onClick={() => setShowAdminModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>Product Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category:</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Minute Maid">Minute Maid</option>
                  <option value="Ritai Juice">Ritai Juice</option>
                  <option value="YOOH Juice">YOOH Juice</option>
                  <option value="THIS IS IT">THIS IS IT</option>
                  <option value="DAYMER BAY">DAYMER BAY</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Price (Rs):</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Stock:</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Image Path:</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn-primary">
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        <p><span>&copy; 2024 Lion Juice Bar. All Rights Reserved. Designed by Nelu Wasana</span></p>
        <ul className="social-links">
          <li><a href="https://wa.me/qr/LDHFFFRBC3M2M1" target="_blank" rel="noreferrer">Whatsapp</a></li>
          <li><a href="https://www.facebook.com/profile.php?id=100086188566258&mibextid=ZbWKwL" target="_blank" rel="noreferrer">Facebook</a></li>
          <li><a href="https://telegram.org/dl" target="_blank" rel="noreferrer">Telegram</a></li>
        </ul>
      </footer>
    </div>
  );
}

export default App;
