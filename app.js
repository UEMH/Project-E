require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const MongoStore = require('connect-mongo');

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
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Altaasadm:1520134824@cluster0.x3thnlr.mongodb.net/bookmark-app?retryWrites=true&w=majority&appName=Cluster0';

// 数据库连接函数
// 在数据库连接成功后添加以下代码
const connectDB = async () => {
  try {
    console.log('🔄 正在连接到 MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ 已成功连接到 MongoDB 数据库');
    dbConnected = true;
    
    // 测试数据库操作并创建默认用户
    try {
      const User = require('./models/User');
      const userCount = await User.countDocuments();
      console.log(`📊 数据库中现有用户数量: ${userCount}`);
      
      // 创建默认管理员用户
      await User.createDefaultAdmin();
    } catch (testError) {
      console.log('⚠️  数据库连接测试完成，但用户集合操作可能有问题:', testError.message);
    }
    
  } catch (err) {
    console.error('❌ MongoDB 连接错误:', err.message);
    dbConnected = false;
  }
};

// 启动数据库连接
connectDB();

// 会话配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
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

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: dbConnected ? 'connected' : 'disconnected',
    session: req.session.user ? 'logged_in' : 'not_logged_in'
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
  console.log(`🗄️  数据库状态: ${dbConnected ? '已连接' : '未连接'}`);
});

module.exports = app;

