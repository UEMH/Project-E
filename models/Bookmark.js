const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: false,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

module.exports = mongoose.model('Bookmark', bookmarkSchema);
