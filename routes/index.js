const router = require('express').Router();
const moment = require('moment');

const CategoryModel = require('../models/category');
const ProductModel = require('../models/product');
const OrderModel = require('../models/order');
const OrderStatus = require('../constants/order-status');
const Passport = require('../modules/passport');
const ShoppingCart = require('../modules/shopping-cart');

function getShoppingCart(req) {
  if (req.session.cart) return { hasExisted: true, cart: new ShoppingCart(req.session.cart) };
  return { hasExisted: false, cart: new ShoppingCart({ items: {} }) };
}

// --- Homepage ---
router.get('/', async (req, res) => {
  try {
    const categories = await CategoryModel.find({ isDeleted: false }).lean();
    const products = await ProductModel.find({ isDeleted: false }).lean();

    // Đếm số lượng sản phẩm theo danh mục
    const productCountByCategory = products.reduce((acc, product) => {
      acc[product.categoryId] = (acc[product.categoryId] || 0) + 1;
      return acc;
    }, {});

    categories.forEach(cat => { cat.counter = productCountByCategory[cat.id] || 0; });

    res.render('site/index', {
      categories,
      products,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// --- Static pages (huong-dan, security, dangki, Payment) ---
router.get(['/huong-dan.html', '/security.html', '/register.html', '/Payment.html'], (req, res) => {
  let page = req.path.replace('.html','').substring(1);

  // map route với tên file thực tế
  const pageMap = {
    'huong-dan': 'huongdan',
    'register': 'register',
    'security': 'security',
    'Payment': 'Payment'
  };
  if (pageMap[page]) page = pageMap[page];

  res.render(`site/${page}`, { isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false });
});


// --- Category page ---
router.get('/danh-muc/:name.:id.html', async (req, res) => {
  const categories = await CategoryModel.find({ isDeleted: false }).lean();
  const products = await ProductModel.find({ categoryId: req.params.id, isDeleted: false }).lean();
  res.render('site/category', { categories, products, isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false });
});

// --- Product page ---
router.get('/san-pham/:name.:productId.:categoryId.html', async (req, res) => {
  const data = await ProductModel.findOne({ id: req.params.productId, isDeleted: false }).lean();
  if (!data) return res.redirect('/');
  const products = await ProductModel.find({ categoryId: data.categoryId, isDeleted: false, id: { $ne: data.id } }).limit(10).lean();
  res.render('site/product', { data, products, isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false });
});

// --- Cart ---
router.get('/gio-hang.html', async (req, res) => {
  const { cart } = getShoppingCart(req);
  const model = { data: cart.getItemList(), products: await ProductModel.find({ isDeleted: false }).lean() };
  res.render('site/cart', { ...model, isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false });
});

router.get('/cart/add/:id', async (req, res) => {
  const docProduct = await ProductModel.findOne({ id: req.params.id, isDeleted: false }).lean();
  if (docProduct) {
    const { cart } = getShoppingCart(req);
    cart.addItem(docProduct.id, docProduct);
    req.session.cart = cart;
  }
  res.redirect('/gio-hang.html');
});

router.post('/cart/delete', (req, res) => {
  const { hasExisted, cart } = getShoppingCart(req);
  if (hasExisted) cart.delete(req.body.id);
  req.session.cart = cart;
  res.json({ isSucceed: true });
});

router.post('/cart/update', (req, res) => {
  const { hasExisted, cart } = getShoppingCart(req);
  if (hasExisted) cart.updateQuantity(req.body.id, req.body.quantity);
  req.session.cart = cart;
  res.json({ isSucceed: true });
});

// --- Checkout ---
router.get('/dat-hang.html', Passport.requireAuth, (req, res) => {
  const { cart } = getShoppingCart(req);
  if (!cart || !cart.items || Object.keys(cart.items).length < 1) return res.redirect('/');
  res.render('site/checkout', { isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false, errors: null });
});

router.post('/dat-hang.html', async (req, res) => {
  const { hasExisted, cart } = getShoppingCart(req);
  if (!hasExisted) return res.redirect('/');

  const createData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    msg: req.body.message,
    total: 0,
    status: OrderStatus.submit,
    ship: req.body.ship,
    payment: req.body.payment,
    isDeleted: false,
    userId: req.id,
    createdAt: moment(),
    details: cart.getItemList()
  };

  createData.details.forEach(d => { if (d) createData.total += (d.quantity * d.price); });
  await OrderModel.create(createData);

  req.session.cart = { items: {} };
  res.redirect('/');
});

// --- Search ---
router.get('/tim-kiem.html', async (req, res) => {
  const query = { isDeleted: false };
  if (req.query.keyword) query.name = RegExp(req.query.keyword, 'i');
  const products = await ProductModel.find(query).lean();
  const categories = await CategoryModel.find({ isDeleted: false }).lean();
  res.render('site/tim-kiem', { products, categories, isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false });
});

// --- Menu API ---
router.post('/menu', async (req, res) => {
  const lstCategory = await CategoryModel.find({ isDeleted: false }).lean();
  res.json(lstCategory || []);
});

module.exports = router;
