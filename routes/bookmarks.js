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
    const bookmarks = await Bookmark.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.render('dashboard', { 
      user: req.session.user,
      bookmarks: JSON.stringify(bookmarks)
    });
  } catch (error) {
    res.status(500).render('error', { error: '获取书签失败' });
  }
});

// 创建书签
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, url, icon } = req.body;
    const bookmark = new Bookmark({
      name,
      url,
      icon,
      userId: req.session.userId
    });
    await bookmark.save();
    res.redirect('/bookmarks');
  } catch (error) {
    res.status(500).render('error', { error: '创建书签失败' });
  }
});

// 更新书签
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, url, icon } = req.body;
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { name, url, icon, updatedAt: new Date() },
      { new: true }
    );
    
    if (!bookmark) {
      return res.status(404).json({ error: '书签未找到' });
    }
    
    res.json(bookmark);
  } catch (error) {
    res.status(500).json({ error: '更新书签失败' });
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
      return res.status(404).json({ error: '书签未找到' });
    }
    
    res.json({ message: '书签删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除书签失败' });
  }
});

module.exports = router;
