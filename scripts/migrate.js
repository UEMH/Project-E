const mongoose = require('mongoose');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const Bookmark = require('../models/Bookmark');
require('dotenv').config();

const migrateDatabase = async () => {
  try {
    console.log('🚀 开始数据库迁移...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Altaasadm:1520134824@cluster0.x3thnlr.mongodb.net/bookmark-app?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ 数据库连接成功');
    
    // 为所有现有用户创建设置
    const users = await User.find({});
    console.log(`📋 找到 ${users.length} 个用户`);
    
    for (const user of users) {
      const existingSettings = await UserSettings.findOne({ userId: user._id });
      if (!existingSettings) {
        await UserSettings.getOrCreateSettings(user._id);
        console.log(`✅ 为用户 ${user.username} 创建设置`);
      }
    }
    
    // 修复书签的用户关联
    const bookmarks = await Bookmark.find({});
    console.log(`📋 找到 ${bookmarks.length} 个书签`);
    
    let fixedCount = 0;
    for (const bookmark of bookmarks) {
      if (!bookmark.userId || bookmark.userId === 'anonymous') {
        // 这里需要根据实际情况确定如何关联用户
        // 暂时设置为第一个管理员用户
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          bookmark.userId = adminUser._id;
          await bookmark.save();
          fixedCount++;
          console.log(`✅ 修复书签: ${bookmark.name}`);
        }
      }
    }
    
    console.log(`✅ 修复了 ${fixedCount} 个书签的用户关联`);
    console.log('🎉 数据库迁移完成');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrateDatabase();
