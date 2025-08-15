require('dotenv').config();

global.isObject = (obj) => {
  if (obj.constructor.name === 'Object') return true;
  return false;
};

const config = require('./config');

console.log('Config loaded:', config);
console.log('MongoDB URI:', config.database.connection || process.env.MONGODB_URI);
console.log('PORT:', config.app?.port || process.env.PORT);

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const logger = require('morgan');
const passport = require('passport');
const path = require('path');
const session = require('express-session');

// --- Khởi tạo Express ---
const app = express();

// --- View engine setup ---
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- Middleware ---
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    const namespace = param.split('.'),
          root = namespace.shift();
    let formParam = root;
    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return { param: formParam, msg, value };
  }
}));

app.use(session({
  secret: config.session.key || 'mySecretKey',
  resave: true,
  key: 'user',
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.response_message = req.flash('response_message');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// --- MongoDB connect ---
mongoose.Promise = global.Promise;
mongoose.connect(config.database.connection, config.database.option)
  .then(() => {
    console.log('MongoDB connected!');

    // Init auto-increment
    const connection = mongoose.connection;
    require('./modules/auto-increment').init(connection);

    // --- Routes ---
    app.use('/', require('./routes/index'));
    app.use('/', require('./routes/user'));
    app.use('/admin', require('./routes/admin'));
    app.use('/admin/category', require('./routes/admin-category'));
    app.use('/admin/order', require('./routes/admin-order'));
    app.use('/admin/product', require('./routes/admin-product'));
    app.use('/admin/user', require('./routes/admin-user'));

  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// --- catch 404 ---
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// --- error handler ---
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

const port = config?.app?.port || process.env.PORT || 8080;
app.set('port', port);

const server = require('http').createServer(app);

server.listen(port);
server.on('error', (error) => { console.error('Server error:', error); throw error; });
server.on('listening', () => { console.log(`Server is listening on port ${port}`); });
