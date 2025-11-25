const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'URL格式不正确'
    }
  },
  icon: {
    type: String,
    default: '/images/default-icon.png'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    default: '未分类'
  },
  description: {
    type: String,
    maxlength: 200
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 在更新时自动设置 updatedAt
bookmarkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 添加静态方法：获取用户的所有书签
bookmarkSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// 添加静态方法：搜索用户书签
bookmarkSchema.statics.searchUserBookmarks = function(userId, searchTerm) {
  return this.find({
    userId,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { url: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  });
};

module.exports = mongoose.model('Bookmark', bookmarkSchema);
