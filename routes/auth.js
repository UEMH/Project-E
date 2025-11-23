const express = require('express');
const User = require('../models/User');
const router = express.Router();

// 登录页面
router.get('/login', (req, res) => {
  // 如果已经登录，重定向到首页
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { 
    error: null,
    user: null 
  });
});

// 注册页面
router.get('/register', (req, res) => {
  // 如果已经登录，重定向到首页
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('register', { 
    error: null,
    user: null 
  });
});

// 登录处理
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证输入
    if (!email || !password) {
      return res.render('login', { 
        error: '邮箱和密码不能为空',
        user: null
      });
    }
    
    // 查找用户
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('login', { 
        error: '邮箱或密码错误',
        user: null
      });
    }
    
    // 验证密码
    const isPasswordCorrect = await user.correctPassword(password, user.password);
    if (!isPasswordCorrect) {
      return res.render('login', { 
        error: '邮箱或密码错误',
        user: null
      });
    }
    
    // 设置会话
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username, 
      email: user.email 
    };
    
    console.log(`用户登录成功: ${user.username}`);
    res.redirect('/');
    
  } catch (error) {
    console.error('登录错误:', error);
    res.render('login', { 
      error: '登录失败，请稍后重试',
      user: null
    });
  }
});

// 注册处理
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // 验证输入
    if (!username || !email || !password || !confirmPassword) {
      return res.render('register', { 
        error: '所有字段都必须填写',
        user: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', { 
        error: '密码不匹配',
        user: null
      });
    }
    
    if (password.length < 6) {
      return res.render('register', { 
        error: '密码至少需要6个字符',
        user: null
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { username: username }
      ] 
    });
    
    if (existingUser) {
      return res.render('register', { 
        error: '用户名或邮箱已存在',
        user: null
      });
    }
    
    // 创建新用户
    const user = new User({ 
      username: username.trim(), 
      email: email.toLowerCase().trim(), 
      password 
    });
    
    await user.save();
    
    // 设置会话
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username, 
      email: user.email 
    };
    
    console.log(`新用户注册成功: ${user.username}`);
    res.redirect('/');
    
  } catch (error) {
    console.error('注册错误:', error);
    
    // 处理 MongoDB 重复键错误
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.render('register', { 
        error: `${field === 'email' ? '邮箱' : '用户名'}已存在`,
        user: null
      });
    }
    
    // 处理验证错误
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.render('register', { 
        error: messages.join(', '),
        user: null
      });
    }
    
    res.render('register', { 
      error: '注册失败，请稍后重试',
      user: null
    });
  }
});

// 注销
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('注销错误:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
