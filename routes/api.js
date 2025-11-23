const express = require('express');
const Bookmark = require('../models/Bookmark');
const router = express.Router();

// GET - 获取所有书签
// 在 api.js 文件末尾添加
// 调试端点：重置用户密码
router.post('/debug/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    if (!username || !newPassword) {
      return res.status(400).json({ error: '用户名和新密码不能为空' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: '用户未找到' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ 
      success: true, 
      message: `用户 ${username} 密码已重置` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - 根据ID获取书签
router.get('/bookmarks/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findById(req.params.id);
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
    const { name, url, icon, userId } = req.body;
    const bookmark = new Bookmark({
      name,
      url,
      icon,
      userId: userId || 'anonymous'
    });
    await bookmark.save();
    res.status(201).json(bookmark);
  } catch (error) {
    console.error('创建书签API错误:', error);
    res.status(500).json({ error: '创建书签失败' });
  }
});

// PUT - 更新书签
router.put('/bookmarks/:id', async (req, res) => {
  try {
    const { name, url, icon } = req.body;
    const bookmark = await Bookmark.findByIdAndUpdate(
      req.params.id,
      { name, url, icon, updatedAt: new Date() },
      { new: true }
    );
    
    if (!bookmark) {
      return res.status(404).json({ error: '书签未找到' });
    }
    
    res.json(bookmark);
  } catch (error) {
    console.error('更新书签API错误:', error);
    res.status(500).json({ error: '更新书签失败' });
  }
});

// DELETE - 删除书签
router.delete('/bookmarks/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findByIdAndDelete(req.params.id);
    if (!bookmark) {
      return res.status(404).json({ error: '书签未找到' });
    }
    res.json({ message: '书签删除成功' });
  } catch (error) {
    console.error('删除书签API错误:', error);
    res.status(500).json({ error: '删除书签失败' });
  }
});

module.exports = router;

