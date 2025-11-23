require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 数据库连接
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookmark-app';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ 已连接到 MongoDB 数据库');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 连接错误:', err);
});

// 会话配置 - 使用 MongoDB 存储会话
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions'
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 全局变量中间件
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 路由
app.use('/', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/api', require('./routes/api'));

// 主页路由
app.get('/', (req, res) => {
  if (req.session.userId) {
    const Bookmark = require('./models/Bookmark');
    Bookmark.find({ userId: req.session.userId })
      .then(bookmarks => {
        res.render('dashboard', { 
          user: req.session.user,
          bookmarks: JSON.stringify(bookmarks)
        });
      })
      .catch(error => {
        console.error('获取书签错误:', error);
        res.render('dashboard', { 
          user: req.session.user,
          bookmarks: JSON.stringify([])
        });
      });
  } else {
    res.redirect('/login');
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).render('404', { 
    user: req.session.user || null 
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).render('error', { 
    error: process.env.NODE_ENV === 'production' ? '服务器错误，请稍后重试' : err.message,
    user: req.session.user || null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 数据库: ${mongoose.connection.readyState === 1 ? '已连接' : '未连接'}`);
});

module.exports = app;
