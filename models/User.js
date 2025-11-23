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
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  }
});

// 在保存前加密密码
userSchema.pre('save', async function(next) {
  // 只有在密码被修改时才加密
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 添加密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 更新最后登录时间的方法
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

// 静态方法：创建默认管理员用户（如果不存在）
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const adminExists = await this.findOne({ username: 'UEMH-CHAN' });
    if (!adminExists) {
      const adminUser = new this({
        username: 'UEMH-CHAN',
        password: '041018'
      });
      await adminUser.save();
      console.log('✅ 默认管理员用户已创建: UEMH-CHAN');
    } else {
      console.log('ℹ️  默认管理员用户已存在: UEMH-CHAN');
    }
  } catch (error) {
    console.error('❌ 创建默认管理员用户失败:', error.message);
  }
};

module.exports = mongoose.model('User', userSchema);
