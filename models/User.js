const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [30, '用户名不能超过30个字符']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少需要6个字符']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
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

// 在保存前加密密码
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    console.log(`正在为用户 ${this.username} 加密密码...`);
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log(`用户 ${this.username} 密码加密完成`);
    next();
  } catch (error) {
    console.error(`用户 ${this.username} 密码加密错误:`, error);
    next(error);
  }
});

// 添加密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const result = await bcrypt.compare(candidatePassword, this.password);
    return result;
  } catch (error) {
    console.error(`用户 ${this.username} 密码验证错误:`, error);
    return false;
  }
};

// 更新最后登录时间
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// 静态方法：创建默认管理员用户（如果不存在）
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const UserSettings = require('./UserSettings');
    
    const adminExists = await this.findOne({ username: 'UEMH-CHAN' });
    if (!adminExists) {
      console.log('正在创建默认管理员用户...');
      const adminUser = new this({
        username: 'UEMH-CHAN',
        password: '041018',
        displayName: '管理员',
        role: 'admin'
      });
      await adminUser.save();
      
      // 创建默认设置
      await UserSettings.getOrCreateSettings(adminUser._id);
      
      console.log('✅ 默认管理员用户已创建: UEMH-CHAN');
    } else {
      console.log('ℹ️  默认管理员用户已存在: UEMH-CHAN');
      
      // 确保管理员用户有设置
      await UserSettings.getOrCreateSettings(adminExists._id);
    }
  } catch (error) {
    console.error('❌ 创建默认管理员用户失败:', error.message);
  }
};

module.exports = mongoose.model('User', userSchema);
