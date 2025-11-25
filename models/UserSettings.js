const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  wallpaper: {
    type: String,
    default: '/images/default-wallpaper.jpg'
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'dark'
  },
  language: {
    type: String,
    default: 'zh-TW'
  },
  layout: {
    type: String,
    enum: ['grid', 'list'],
    default: 'grid'
  },
  bookmarksPerPage: {
    type: Number,
    default: 20,
    min: 5,
    max: 100
  },
  customCSS: {
    type: String,
    default: ''
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
userSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 静态方法：获取或创建用户设置
userSettingsSchema.statics.getOrCreateSettings = async function(userId) {
  let settings = await this.findOne({ userId });
  
  if (!settings) {
    settings = new this({ userId });
    await settings.save();
  }
  
  return settings;
};

module.exports = mongoose.model('UserSettings', userSettingsSchema);
