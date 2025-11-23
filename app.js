require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 修复静态文件服务 - 添加详细配置
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

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

// 会话配置
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
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// 全局变量中间件
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/images/wallpapers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'wallpaper-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件！'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 路由
app.use('/', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/api', require('./routes/api'));

// 主页路由
app.get('/', (req, res) => {
  res.render('dashboard', { 
    user: req.session.user || null
  });
});

// 壁纸上传路由
app.post('/upload-wallpaper', upload.single('wallpaper'), (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: '没有选择文件' });
  }
  
  const wallpaperUrl = '/images/wallpapers/' + req.file.filename;
  res.json({ 
    success: true, 
    message: '壁纸上传成功',
    wallpaperUrl: wallpaperUrl
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 静态文件测试路由
app.get('/test-static', (req, res) => {
  res.json({
    images: {
      cat: '/images/cat.ico',
      background: '/images/Night_copy.jpg'
    },
    publicDir: path.join(__dirname, 'public'),
    files: fs.existsSync(path.join(__dirname, 'public/images')) ? 
           fs.readdirSync(path.join(__dirname, 'public/images')) : 'images directory not found'
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
  console.log(`📁 静态文件目录: ${path.join(__dirname, 'public')}`);
  console.log(`👁️ 视图目录: ${path.join(__dirname, 'views')}`);
});

module.exports = app;
