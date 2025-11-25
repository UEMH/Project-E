const express = require('express');
const UserSettings = require('../models/UserSettings');
const router = express.Router();

// 认证中间件
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: '请先登录' });
  }
};

// 获取用户设置
router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await UserSettings.getOrCreateSettings(req.session.userId);
    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('获取用户设置错误:', error);
    res.status(500).json({ 
      success: false,
      error: '获取用户设置失败' 
    });
  }
});

// 更新用户设置
router.put('/', requireAuth, async (req, res) => {
  try {
    const { wallpaper, theme, language, layout, bookmarksPerPage, customCSS } = req.body;
    
    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.session.userId },
      { 
        wallpaper, 
        theme, 
        language, 
        layout, 
        bookmarksPerPage, 
        customCSS,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: '用户设置未找到'
      });
    }
    
    res.json({
      success: true,
      message: '设置更新成功',
      settings: settings
    });
  } catch (error) {
    console.error('更新用户设置错误:', error);
    res.status(500).json({
      success: false,
      error: '更新设置失败: ' + error.message
    });
  }
});

// 更新壁纸
router.put('/wallpaper', requireAuth, async (req, res) => {
  try {
    const { wallpaper } = req.body;
    
    if (!wallpaper) {
      return res.status(400).json({
        success: false,
        error: '壁纸URL不能为空'
      });
    }
    
    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.session.userId },
      { 
        wallpaper,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: '用户设置未找到'
      });
    }
    
    res.json({
      success: true,
      message: '壁纸更新成功',
      wallpaper: settings.wallpaper
    });
  } catch (error) {
    console.error('更新壁纸错误:', error);
    res.status(500).json({
      success: false,
      error: '更新壁纸失败'
    });
  }
});

module.exports = router;
