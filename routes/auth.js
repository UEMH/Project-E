const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// 离线用户数据 - 使用简单的密码验证（避免bcrypt问题）
const offlineUsers = {
  'UEMH-CHAN': {
    id: 'offline-admin',
    username: 'UEMH-CHAN',
    password: '041018' // 明文密码，用于离线验证
  }
};

// 登录页面
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { 
    error: null,
    user: null,
    dbConnected: false // 强制显示离线模式信息
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

// 登录处理（简化离线验证）
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('登录尝试:', { username: username ? username.trim() : '空' });
    
    if (!username || !password) {
      return res.render('login', { 
        error: '用户名和密码不能为空',
        user: null
      });
    }
    
    const trimmedUsername = username.trim();
    
    // 首先尝试数据库登录
    try {
      const user = await User.findOne({ username: trimmedUsername });
      
      if (user) {
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        
        if (isPasswordCorrect) {
          req.session.userId = user._id;
          req.session.user = { 
            id: user._id,
            username: user.username
          };
          
          console.log(`✅ 数据库登录成功: ${user.username}`);
          return res.redirect('/');
        }
      }
    } catch (dbError) {
      console.log('数据库登录失败，尝试离线登录:', dbError.message);
    }
    
    // 离线登录 - 使用简单的密码比较
    const offlineUser = offlineUsers[trimmedUsername];
    if (offlineUser && password === offlineUser.password) {
      req.session.userId = offlineUser.id;
      req.session.user = { 
        id: offlineUser.id,
        username: offlineUser.username
      };
      
      console.log('✅ 离线登录成功');
      return res.redirect('/');
    }
    
    // 所有登录方式都失败
    return res.render('login', { 
      error: '用户名或密码错误',
      user: null
    });
    
  } catch (error) {
    console.error('❌ 登录错误:', error);
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
    
    console.log('注册尝试:', { username: username ? username.trim() : '空' });
    
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
    
    const trimmedUsername = username.trim();
    
    try {
      const existingUser = await User.findOne({ username: trimmedUsername });
      if (existingUser) {
        return res.render('register', { 
          error: '用户名已存在',
          user: null
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({ 
        username: trimmedUsername, 
        password: hashedPassword
      });
      
      await user.save();
      
      req.session.userId = user._id;
      req.session.user = { 
        id: user._id,
        username: user.username
      };
      
      console.log(`✅ 新用户注册成功: ${user.username}`);
      return res.redirect('/');
      
    } catch (dbError) {
      console.error('数据库注册失败:', dbError);
      return res.render('register', { 
        error: '注册失败，数据库连接异常。请稍后重试或使用默认管理员账号登录。',
        user: null
      });
    }
    
  } catch (error) {
    console.error('❌ 注册错误:', error);
    res.render('register', { 
      error: '注册失败，请稍后重试',
      user: null
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
