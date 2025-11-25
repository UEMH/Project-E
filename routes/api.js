const express = require('express');
const Bookmark = require('../models/Bookmark');
const User = require('../models/User');
const router = express.Router();

// GET - 获取所有书签（基于当前登录用户）
router.get('/bookmarks', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = { userId: req.session.userId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const bookmarks = await Bookmark.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Bookmark.countDocuments(query);
    
    res.json({
      bookmarks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('获取书签API错误:', error);
    res.status(500).json({ error: '获取书签失败' });
  }
});

// GET - 根据ID获取书签
router.get('/bookmarks/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    });
    if (!bookmark) {
      return res.status(404).json({ error: '书签未找到' });
    }
    res.json(bookmark);
  } catch (error) {
    console.error('获取书签详情API错误:', error);
    res.status(500).json({ error: '获取书签失败' });
  }
});

// POST - 创建书签
router.post('/bookmarks', async (req, res) => {
  try {
    const { name, url, icon, category, description } = req.body;
    
    const bookmark = new Bookmark({
      name: name || '未命名书签',
      url,
      icon: icon || '/images/default-icon.png',
      category: category || '未分类',
      description: description || '',
      userId: req.session.userId || 'anonymous'
    });
    
    await bookmark.save();
    
    res.status(201).json({
      success: true,
      bookmark: bookmark
    });
  } catch (error) {
    console.error('创建书签API错误:', error);
    res.status(500).json({ 
      success: false,
      error: '创建书签失败: ' + error.message 
    });
  }
});

// PUT - 更新书签
router.put('/bookmarks/:id', async (req, res) => {
  try {
    const { name, url, icon, category, description } = req.body;
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { name, url, icon, category, description, updatedAt: new Date() },
      { new: true }
    );
    
    if (!bookmark) {
      return res.status(404).json({ error: '书签未找到' });
    }
    
    res.json({
      success: true,
      bookmark: bookmark
    });
  } catch (error) {
    console.error('更新书签API错误:', error);
    res.status(500).json({ error: '更新书签失败' });
  }
});

// DELETE - 删除书签
router.delete('/bookmarks/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });
    
    if (!bookmark) {
      return res.status(404).json({ error: '书签未找到' });
    }
    
    res.json({ 
      success: true,
      message: '书签删除成功' 
    });
  } catch (error) {
    console.error('删除书签API错误:', error);
    res.status(500).json({ error: '删除书签失败' });
  }
});

// 调试端点：重置用户密码
router.post('/debug/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    console.log('重置密码请求:', { username, newPasswordLength: newPassword ? newPassword.length : 0 });
    
    if (!username || !newPassword) {
      return res.status(400).json({ error: '用户名和新密码不能为空' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: '用户未找到' });
    }
    
    console.log(`找到用户: ${user.username}, 正在重置密码...`);
    
    // 直接设置密码，pre-save 钩子会处理加密
    user.password = newPassword;
    await user.save();
    
    console.log(`✅ 用户 ${username} 密码重置成功`);
    
    res.json({ 
      success: true, 
      message: `用户 ${username} 密码已重置` 
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 调试端点：获取所有用户
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username createdAt lastLogin');
    res.json({
      total: users.length,
      users: users
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
