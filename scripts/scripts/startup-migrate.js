const mongoose = require('mongoose');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const Bookmark = require('../models/Bookmark');

const startupMigration = async () => {
  try {
    console.log('🔧 启动时数据库检查...');
    
    // 检查是否已连接数据库
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ 等待数据库连接...');
      return;
    }
    
    console.log('✅ 数据库已连接，开始检查用户设置...');
    
    // 为所有现有用户创建设置
    const users = await User.find({});
    console.log(`📋 找到 ${users.length} 个用户`);
    
    let settingsCreated = 0;
    for (const user of users) {
      const existingSettings = await UserSettings.findOne({ userId: user._id });
      if (!existingSettings) {
        await UserSettings.getOrCreateSettings(user._id);
        settingsCreated++;
        console.log(`✅ 为用户 ${user.username} 创建设置`);
      }
    }
    
    if (settingsCreated > 0) {
      console.log(`🎉 为 ${settingsCreated} 个用户创建了设置`);
    } else {
      console.log('ℹ️  所有用户已有设置，无需迁移');
    }
    
  } catch (error) {
    console.error('❌ 启动迁移失败:', error.message);
    // 不抛出错误，避免影响应用启动
  }
};

// 延迟执行，确保数据库已连接
setTimeout(startupMigration, 5000);

module.exports = startupMigration;
