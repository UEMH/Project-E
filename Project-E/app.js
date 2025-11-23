// 必须在文件最顶部加载环境变量
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const app = express();

// 使用环境变量
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookmark-app';
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 数据库连接
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('已连接到 MongoDB 数据库');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB 连接错误:', err);
});

// 路由
app.use('/', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/api', require('./routes/api'));

// 认证中间件
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// 保护路由
app.get('/', requireAuth, (req, res) => {
  res.render('dashboard', { 
    user: req.session.user,
    bookmarks: [] // 这里可以从数据库获取用户的书签
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});