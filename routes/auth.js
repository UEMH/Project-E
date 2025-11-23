const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// 登录页面
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { 
    error: null,
    user: null,
    dbConnected: res.locals.dbConnected
  });
});

// 注册页面
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('register', { 
    error: null,
    user: null,
    dbConnected: res.locals.dbConnected
  });
});

// 登录处理
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('登录尝试:', { username: username ? username.trim() : '空' });
    
    if (!username || !password) {
      return res.render('login', { 
        error: '用户名和密码不能为空',
        user: null,
        dbConnected: res.locals.dbConnected
      });
    }
    
    const trimmedUsername = username.trim();
    
    // 检查数据库连接状态
    if (!res.locals.dbConnected) {
      return res.render('login', { 
        error: '数据库连接失败，无法登录。请稍后重试或联系管理员。',
        user: null,
        dbConnected: false
      });
    }
    
    // 使用数据库验证
    const user = await User.findOne({ username: trimmedUsername });
    
    if (!user) {
      return res.render('login', { 
        error: '用户名或密码错误',
        user: null,
        dbConnected: true
      });
    }
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      return res.render('login', { 
        error: '用户名或密码错误',
        user: null,
        dbConnected: true
      });
    }
    
    // 登录成功
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username
    };
    
    console.log(`✅ 用户登录成功: ${user.username}`);
    return res.redirect('/');
    
  } catch (error) {
    console.error('❌ 登录错误:', error);
    res.render('login', { 
      error: '登录失败，请稍后重试',
      user: null,
      dbConnected: res.locals.dbConnected
    });
  }
});

// 注册处理
router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    console.log('注册尝试:', { username: username ? username.trim() : '空' });
    
    // 检查数据库连接
    if (!res.locals.dbConnected) {
      return res.render('register', { 
        error: '数据库连接失败，无法注册新用户。请稍后重试。',
        user: null,
        dbConnected: false
      });
    }
    
    if (!username || !password || !confirmPassword) {
      return res.render('register', { 
        error: '所有字段都必须填写',
        user: null,
        dbConnected: true
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', { 
        error: '密码不匹配',
        user: null,
        dbConnected: true
      });
    }
    
    if (password.length < 6) {
      return res.render('register', { 
        error: '密码至少需要6个字符',
        user: null,
        dbConnected: true
      });
    }
    
    if (username.length < 3) {
      return res.render('register', { 
        error: '用户名至少需要3个字符',
        user: null,
        dbConnected: true
      });
    }
    
    const trimmedUsername = username.trim();
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.render('register', { 
        error: '用户名已存在',
        user: null,
        dbConnected: true
      });
    }
    
    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ 
      username: trimmedUsername, 
      password: hashedPassword
    });
    
    await user.save();
    
    // 自动登录新用户
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username
    };
    
    console.log(`✅ 新用户注册成功: ${user.username}`);
    return res.redirect('/');
    
  } catch (error) {
    console.error('❌ 注册错误:', error);
    res.render('register', { 
      error: '注册失败，请稍后重试',
      user: null,
      dbConnected: res.locals.dbConnected
    });
  }
});

// 注销
router.post('/logout', (req, res) => {
  const username = req.session.user ? req.session.user.username : '未知用户';
  req.session.destroy((err) => {
    if (err) {
      console.error('注销错误:', err);
    } else {
      console.log(`用户注销: ${username}`);
    }
    res.redirect('/');
  });
});

module.exports = router;
