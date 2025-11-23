const express = require('express');
const Bookmark = require('../models/Bookmark');
const router = express.Router();

// GET - 获取所有书签
router.get('/bookmarks', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = search ? { 
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
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
    res.status(500).json({ error: '获取书签失败' });
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
    res.status(500).json({ error: '删除书签失败' });
  }
});

module.exports = router;
