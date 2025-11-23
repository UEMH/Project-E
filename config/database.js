// 在 app.js 顶部添加
const { connectDB, checkConnection, isConnected } = require('./config/database');

// 替换原来的数据库连接代码（大约在第 25-45 行）
// 删除原来的 connectDB 函数和 dbConnected 变量声明

// 更新数据库连接部分
let dbConnected = false;

// 初始化数据库连接
const initDB = async () => {
  dbConnected = await connectDB();
};

// 启动数据库连接（但不阻塞应用启动）
initDB().then(() => {
  console.log(`🗄️  数据库初始化完成，状态: ${dbConnected ? '已连接' : '未连接'}`);
});

// 在健康检查端点中更新数据库状态检查
app.get('/health', (req, res) => {
  const currentDbStatus = checkConnection();
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: currentDbStatus ? 'connected' : 'disconnected',
    offlineMode: !currentDbStatus,
    session: req.session.user ? 'logged_in' : 'not_logged_in'
  });
});
