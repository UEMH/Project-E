const express = require('express');
const User = require('../models/User');
const router = express.Router();

// 登录页面
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 注册页面
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// 登录处理
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.render('login', { error: '邮箱或密码错误' });
    }
    
    req.session.userId = user._id;
    req.session.user = { username: user.username, email: user.email };
    res.redirect('/');
  } catch (error) {
    res.render('login', { error: '登录失败，请重试' });
  }
});

// 注册处理
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.render('register', { error: '密码不匹配' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('register', { error: '用户已存在' });
    }
    
    const user = new User({ username, email, password });
    await user.save();
    
    req.session.userId = user._id;
    req.session.user = { username: user.username, email: user.email };
    res.redirect('/');
  } catch (error) {
    res.render('register', { error: '注册失败，请重试' });
  }
});

// 注销
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;