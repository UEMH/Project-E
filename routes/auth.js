const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// 创建默认用户
const createDefaultUser = async () => {
  try {
    const existingUser = await User.findOne({ username: 'UEMH-CHAN' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('041018', 12);
      const defaultUser = new User({
        username: 'UEMH-CHAN',
        password: hashedPassword
      });
      await defaultUser.save();
      console.log('✅ 默认用户 UEMH-CHAN 创建成功');
    }
  } catch (error) {
    console.error('创建默认用户错误:', error);
  }
};

createDefaultUser();

// 登录页面
router.get('/login', (req, res) => {
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
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.render('login', { 
        error: '用户名和密码不能为空',
        user: null
      });
    }
    
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.render('login', { 
        error: '用户名或密码错误',
        user: null
      });
    }
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.render('login', { 
        error: '用户名或密码错误',
        user: null
      });
    }
    
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username
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
    const { username, password, confirmPassword } = req.body;
    
    if (!username || !password || !confirmPassword) {
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
    
    if (username.length < 3) {
      return res.render('register', { 
        error: '用户名至少需要3个字符',
        user: null
      });
    }
    
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res.render('register', { 
        error: '用户名已存在',
        user: null
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ 
      username: username.trim(), 
      password: hashedPassword
    });
    
    await user.save();
    
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username
    };
    
    console.log(`新用户注册成功: ${user.username}`);
    res.redirect('/');
    
  } catch (error) {
    console.error('注册错误:', error);
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
    res.redirect('/');
  });
});

module.exports = router;
