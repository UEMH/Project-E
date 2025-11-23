const mongoose = require('mongoose');

// 数据库连接配置
const dbConfig = {
  uri: process.env.MONGODB_URI || 'mongodb+srv://Altaasadm:1520134824@cluster0.x3thnlr.mongodb.net/bookmark-app?retryWrites=true&w=majority&appName=Cluster0',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 5
  }
};

// 连接状态跟踪
let isConnected = false;
let connectionRetries = 0;
const maxRetries = 3;

// 数据库连接函数
const connectDB = async () => {
  try {
    console.log(`🔄 尝试连接 MongoDB Atlas... (尝试 ${connectionRetries + 1}/${maxRetries})`);
    
    // 检查连接字符串是否已配置
    if (!dbConfig.uri || dbConfig.uri.includes('<db_password>')) {
      console.log('❌ MongoDB 连接字符串未正确配置');
      console.log('💡 请在 .env 文件中设置 MONGODB_URI 环境变量');
      return false;
    }
    
    await mongoose.connect(dbConfig.uri, dbConfig.options);
    
    isConnected = true;
    connectionRetries = 0;
    console.log('✅ MongoDB Atlas 连接成功');
    
    // 测试连接
    try {
      await mongoose.connection.db.admin().ping();
      console.log('✅ MongoDB 连接测试通过');
    } catch (pingError) {
      console.log('⚠️  MongoDB 连接测试失败，但连接已建立:', pingError.message);
    }
    
    return true;
  } catch (error) {
    connectionRetries++;
    isConnected = false;
    
    console.error(`❌ MongoDB Atlas 连接失败 (尝试 ${connectionRetries}/${maxRetries}):`, error.message);
    
    // 提供更详细的错误信息
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 可能的原因:');
      console.log('   - MongoDB Atlas IP 白名单未配置');
      console.log('   - 网络连接问题');
      console.log('   - 数据库凭据错误');
    } else if (error.name === 'MongoNetworkError') {
      console.log('💡 网络连接问题，请检查:');
      console.log('   - 网络连接是否正常');
      console.log('   - 防火墙设置');
      console.log('   - DNS解析');
    }
    
    // 如果重试次数未达到上限，可以安排重试
    if (connectionRetries < maxRetries) {
      const retryDelay = 5000 * connectionRetries;
      console.log(`⏳ ${retryDelay}ms 后重试连接...`);
      setTimeout(connectDB, retryDelay);
    } else {
      console.log('💡 应用将在受限模式下运行');
    }
    
    return false;
  }
};

// 断开数据库连接
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ MongoDB 连接已断开');
  } catch (error) {
    console.error('❌ 断开 MongoDB 连接时出错:', error.message);
  }
};

// 检查连接状态
const checkConnection = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

// 获取连接状态信息
const getConnectionInfo = () => {
  const state = mongoose.connection.readyState;
  let stateText = '';
  
  switch (state) {
    case 0: stateText = '断开'; break;
    case 1: stateText = '已连接'; break;
    case 2: stateText = '连接中'; break;
    case 3: stateText = '断开中'; break;
    default: stateText = '未知';
  }
  
  return {
    isConnected: isConnected && state === 1,
    readyState: state,
    readyStateText: stateText,
    host: mongoose.connection.host || '未知',
    name: mongoose.connection.name || '未知',
    retries: connectionRetries
  };
};

// 获取原生 Mongoose 连接
const getConnection = () => {
  return mongoose.connection;
};

// 数据库连接事件监听
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose 已连接到 MongoDB Atlas');
  console.log(`   Host: ${mongoose.connection.host}`);
  console.log(`   Database: ${mongoose.connection.name}`);
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose 连接错误:', err.message);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose 连接已断开');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ Mongoose 重新连接到 MongoDB');
  isConnected = true;
});

// 进程退出时关闭数据库连接
process.on('SIGINT', async () => {
  console.log('🔄 正在关闭数据库连接...');
  await disconnectDB();
  process.exit(0);
});

// 导出模块
module.exports = {
  connectDB,
  disconnectDB,
  checkConnection,
  getConnectionInfo,
  getConnection,
  isConnected: () => isConnected,
  dbConfig
};
