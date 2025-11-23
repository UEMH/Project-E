require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');

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

// EJS模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 数据库连接（带错误处理）
let dbConnected = false;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookmark-app';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ 已连接到 MongoDB 数据库');
    dbConnected = true;
  } catch (err) {
    console.error('❌ MongoDB 连接错误:', err.message);
    console.log('⚠️  使用离线模式运行，部分功能受限');
    dbConnected = false;
  }
};

connectDB();

// 会话配置
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  },
  store: dbConnected ? MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions'
  }) : undefined
};

app.use(session(sessionConfig));

// 全局变量中间件
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.dbConnected = dbConnected;
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

// 创建内存中的用户数据（用于离线模式）
const offlineUsers = {
  'UEMH-CHAN': {
    id: 'offline-admin',
    username: 'UEMH-CHAN',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/eoS3V3PLgw8sWefQa' // 041018 的哈希
  }
};

// 路由
app.use('/', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/api', require('./routes/api'));

// 主页路由
app.get('/', (req, res) => {
  res.render('dashboard', { 
    user: req.session.user || null,
    dbConnected: dbConnected
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

// 离线登录路由
app.post('/offline-login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log('离线登录尝试:', { username, password });
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: '用户名和密码不能为空' 
    });
  }
  
  const user = offlineUsers[username];
  if (user) {
    const isValid = await bcrypt.compare(password, user.password);
    if (isValid) {
      req.session.userId = user.id;
      req.session.user = { 
        id: user.id,
        username: user.username
      };
      
      console.log('✅ 离线登录成功');
      return res.json({ 
        success: true, 
        message: '离线登录成功',
        user: req.session.user
      });
    }
  }
  
  return res.status(401).json({ 
    success: false, 
    error: '用户名或密码错误' 
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: dbConnected ? 'connected' : 'disconnected',
    offlineMode: !dbConnected,
    session: req.session.user ? 'logged_in' : 'not_logged_in'
  });
});

// 系统状态端点
app.get('/system-status', (req, res) => {
  res.json({
    database: {
      connected: dbConnected,
      uri: mongoUri ? '已配置' : '未配置'
    },
    session: {
      user: req.session.user ? req.session.user.username : '未登录',
      userId: req.session.userId
    },
    environment: process.env.NODE_ENV || 'development',
    offlineUsers: Object.keys(offlineUsers)
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).render('404', { 
    user: req.session.user || null,
    dbConnected: dbConnected
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).render('error', { 
    error: process.env.NODE_ENV === 'production' ? '服务器错误，请稍后重试' : err.message,
    user: req.session.user || null,
    dbConnected: dbConnected
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  数据库状态: ${dbConnected ? '已连接' : '未连接 - 离线模式'}`);
  console.log(`👤 离线用户: UEMH-CHAN / 041018`);
});

module.exports = app;
