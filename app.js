require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const MongoStore = require('connect-mongo');
const { connectDB, checkConnection } = require('./config/database');

const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// EJS模板引擎配置
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 数据库连接状态
let dbConnected = false;

// 启动数据库连接
const initializeDB = async () => {
  dbConnected = await connectDB();
  
  // 如果数据库连接成功，创建默认用户
  if (dbConnected) {
    try {
      const User = require('./models/User');
      await User.createDefaultAdmin();
      
      // 列出所有用户用于调试
      const users = await User.find({}, 'username createdAt');
      console.log('📋 数据库中的用户:');
      users.forEach(user => {
        console.log(`   - ${user.username} (创建于: ${user.createdAt})`);
      });
    } catch (error) {
      console.error('❌ 用户初始化失败:', error.message);
    }
  }
};

initializeDB();

// 会话配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://Altaasadm:1520134824@cluster0.x3thnlr.mongodb.net/bookmark-app?retryWrites=true&w=majority&appName=Cluster0',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1天
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// 全局变量中间件
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.dbConnected = checkConnection();
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
    fileSize: 5 * 1024 * 1024
  }
});

// 路由
app.use('/', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/api', require('./routes/api'));

// 主页路由
app.get('/', (req, res) => {
  res.render('dashboard', { 
    user: req.session.user || null,
    dbConnected: checkConnection()
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
  const dbInfo = getConnectionInfo();
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: {
      connected: dbInfo.isConnected,
      state: dbInfo.readyStateText,
      host: dbInfo.host,
      name: dbInfo.name
    },
    session: req.session.user ? 'logged_in' : 'not_logged_in',
    user: req.session.user ? req.session.user.username : null
  });
});

// 调试端点：获取所有用户
app.get('/debug/users', async (req, res) => {
  if (!checkConnection()) {
    return res.status(500).json({ error: '数据库未连接' });
  }
  
  try {
    const User = require('./models/User');
    const users = await User.find({}, 'username createdAt lastLogin');
    res.json({
      total: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).render('404', { 
    user: req.session.user || null,
    dbConnected: checkConnection()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).render('error', { 
    error: process.env.NODE_ENV === 'production' ? '服务器错误，请稍后重试' : err.message,
    user: req.session.user || null,
    dbConnected: checkConnection()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  数据库状态: ${checkConnection() ? '已连接' : '未连接'}`);
});

module.exports = app;
