const express = require('express');
const User = require('../models/User');
const router = express.Router();

// 创建默认用户函数（带错误处理）
const createDefaultUser = async () => {
  try {
    let existingUser = await User.findOne({ username: 'UEMH-CHAN' });
    
    if (!existingUser) {
      console.log('创建默认用户 UEMH-CHAN...');
      const defaultUser = new User({
        username: 'UEMH-CHAN',
        password: '041018'
      });
      
      await defaultUser.save();
      console.log('✅ 默认用户 UEMH-CHAN 创建成功');
    } else {
      console.log('✅ 默认用户 UEMH-CHAN 已存在');
    }
  } catch (error) {
    console.error('创建默认用户错误（可忽略，将使用离线模式）:', error.message);
  }
};

// 尝试创建默认用户（但不阻塞启动）
createDefaultUser().catch(err => {
  console.log('默认用户创建失败，将使用离线模式:', err.message);
});

// 登录页面
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { 
    error: null,
    user: null,
    dbConnected: false // 在登录页面强制显示离线选项
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

// 登录处理（带离线后备）
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('登录尝试:', { username: username ? username.trim() : '空', passwordLength: password ? password.length : 0 });
    
    if (!username || !password) {
      return res.render('login', { 
        error: '用户名和密码不能为空',
        user: null
      });
    }
    
    const trimmedUsername = username.trim();
    
    // 尝试数据库登录
    try {
      // 查找用户
      const user = await User.findOne({ username: trimmedUsername });
      console.log('找到用户:', user ? `是 (${user.username})` : '否');
      
      if (!user) {
        console.log('用户不存在:', trimmedUsername);
        return res.render('login', { 
          error: '用户名或密码错误',
          user: null
        });
      }
      
      // 验证密码
      const isPasswordCorrect = await user.correctPassword(password, user.password);
      console.log('密码验证:', isPasswordCorrect ? '正确' : '错误');
      
      if (!isPasswordCorrect) {
        return res.render('login', { 
          error: '用户名或密码错误',
          user: null
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
      
    } catch (dbError) {
      console.error('数据库登录失败:', dbError.message);
      
      // 数据库失败时，尝试离线登录（仅限默认管理员）
      if (trimmedUsername === 'UEMH-CHAN' && password === '041018') {
        req.session.userId = 'offline-admin';
        req.session.user = { 
          id: 'offline-admin',
          username: 'UEMH-CHAN'
        };
        
        console.log('✅ 使用离线模式登录成功');
        return res.redirect('/');
      } else {
        return res.render('login', { 
          error: `登录失败: ${dbError.message}. 仅默认管理员账号支持离线登录。`,
          user: null
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 登录错误:', error);
    res.render('login', { 
      error: '登录失败，请稍后重试: ' + error.message,
      user: null
    });
  }
});

// 注册处理
router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    console.log('注册尝试:', { username: username ? username.trim() : '空', passwordLength: password ? password.length : 0 });
    
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
    
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.render('register', { 
        error: '用户名已存在',
        user: null
      });
    }
    
    const user = new User({ 
      username: trimmedUsername, 
      password: password
    });
    
    await user.save();
    
    req.session.userId = user._id;
    req.session.user = { 
      id: user._id,
      username: user.username
    };
    
    console.log(`✅ 新用户注册成功: ${user.username}`);
    res.redirect('/');
    
  } catch (error) {
    console.error('❌ 注册错误:', error);
    
    if (error.code === 11000) {
      return res.render('register', { 
        error: '用户名已存在',
        user: null
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.render('register', { 
        error: messages.join(', '),
        user: null
      });
    }
    
    res.render('register', { 
      error: '注册失败，数据库连接异常。请稍后重试或使用默认管理员账号登录。',
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
