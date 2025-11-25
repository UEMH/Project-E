const express = require('express');
const Bookmark = require('../models/Bookmark');
const router = express.Router();

// 认证中间件
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// 获取用户的所有书签
router.get('/', requireAuth, async (req, res) => {
  try {
    const UserSettings = require('../models/UserSettings');
    
    const bookmarks = await Bookmark.findByUserId(req.session.userId);
    const settings = await UserSettings.getOrCreateSettings(req.session.userId);
    
    res.render('dashboard', { 
      user: req.session.user,
      bookmarks: bookmarks,
      settings: settings,
      dbConnected: true
    });
  } catch (error) {
    console.error('获取书签错误:', error);
    res.status(500).render('error', { 
      error: '获取书签失败',
      user: req.session.user,
      dbConnected: true
    });
  }
});

// 创建书签
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, url, icon, category, description } = req.body;
    
    // 验证URL格式
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'URL必须以http://或https://开头'
      });
    }
    
    const bookmark = new Bookmark({
      name: name || '未命名书签',
      url,
      icon: icon || '/images/default-icon.png',
      category: category || '未分类',
      description: description || '',
      userId: req.session.userId
    });
    
    await bookmark.save();
    
    res.json({
      success: true,
      message: '书签创建成功',
      bookmark: bookmark
    });
  } catch (error) {
    console.error('创建书签错误:', error);
    res.status(500).json({
      success: false,
      error: '创建书签失败: ' + error.message
    });
  }
});

// 更新书签
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, url, icon, category, description } = req.body;
    
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { 
        name, 
        url, 
        icon, 
        category, 
        description,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    if (!bookmark) {
      return res.status(404).json({ 
        success: false,
        error: '书签未找到或无权访问' 
      });
    }
    
    res.json({
      success: true,
      message: '书签更新成功',
      bookmark: bookmark
    });
  } catch (error) {
    console.error('更新书签错误:', error);
    res.status(500).json({ 
      success: false,
      error: '更新书签失败: ' + error.message 
    });
  }
});

// 删除书签
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });
    
    if (!bookmark) {
      return res.status(404).json({ 
        success: false,
        error: '书签未找到或无权删除' 
      });
    }
    
    res.json({ 
      success: true,
      message: '书签删除成功' 
    });
  } catch (error) {
    console.error('删除书签错误:', error);
    res.status(500).json({ 
      success: false,
      error: '删除书签失败' 
    });
  }
});

// 批量删除书签
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { bookmarkIds } = req.body;
    
    if (!bookmarkIds || !Array.isArray(bookmarkIds)) {
      return res.status(400).json({
        success: false,
        error: '无效的书签ID列表'
      });
    }
    
    const result = await Bookmark.deleteMany({
      _id: { $in: bookmarkIds },
      userId: req.session.userId
    });
    
    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 个书签`
    });
  } catch (error) {
    console.error('批量删除书签错误:', error);
    res.status(500).json({
      success: false,
      error: '批量删除书签失败'
    });
  }
});

module.exports = router;
