# Project-E - 个人书签管理应用

## 项目信息
- **项目名称**: Project-E 书签管理系统
- **课程**: COMP 3810SEF Autumn 2025
- **小组信息**: 
  - 小组成员: [AU TSZ CHUN,CHAN CHOI NAM,LO KWOK CHIU]
  - 学号: [13896925,12988397,13106366]
  - 小组编号: [10]

## 项目文件介绍

### server.js
主服务器文件，提供以下功能：
- Express.js 服务器配置
- 数据库连接管理
- 会话管理
- 路由配置
- 错误处理
- 静态文件服务

### package.json
项目依赖配置：
- **express**: Web框架
- **mongoose**: MongoDB ODM
- **ejs**: 模板引擎
- **bcryptjs**: 密码加密
- **express-session**: 会话管理
- **multer**: 文件上传

### public/ 文件夹
静态资源文件：
- `css/style.css`: 样式表
- `images/`: 图片资源
- `debug.html`: 调试工具

### views/ 文件夹
EJS模板文件：
- `dashboard.ejs`: 主页面
- `login.ejs`: 登录页面
- `register.ejs`: 注册页面
- `error.ejs`: 错误页面
- `404.ejs`: 404页面

### models/ 文件夹
数据模型：
- `User.js`: 用户模型
- `Bookmark.js`: 书签模型

## 云服务器URL
**测试URL**: https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net

## 操作指南

### 登录/注销功能
1. **默认账号**:
   - 用户名: `UEMH-CHAN`
   - 密码: `041018`

2. **登录步骤**:
   - 访问首页点击"登录"按钮
   - 输入用户名和密码
   - 点击登录按钮

3. **注销**:
   - 登录后点击右上角"登出"按钮

### CRUD网页功能
- **创建(C)**: 右键点击书签栏空白处 → "添加新收藏"
- **读取(R)**: 点击书签直接访问网站
- **更新(U)**: 右键点击书签 → "编辑收藏"
- **删除(D)**: 右键点击书签 → "删除收藏"

### RESTful CRUD服务API

#### 1. GET - 获取书签列表
"——————————（Login）——————————
curl -c cookies.txt -X POST ""https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net/login"" \
  -H ""Content-Type: application/x-www-form-urlencoded"" \
  -d ""username=UEMH-CHAN&password=041018""
——————————（Create）——————————
curl -b cookies.txt -X POST ""https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net/api/bookmarks"" \
  -H ""Content-Type: application/json"" \
  -d '{
    ""name"": ""GOOGLE"",
    ""url"": ""https://www.google.com"",
    ""icon"": ""🔍"",
    ""userId"": ""69234e16abb8b548142257be""
  }'
——————————（READ）——————————
curl -b cookies.txt -X GET ""https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net/api/bookmarks""
——————————（UPDATE）——————————
curl -b cookies.txt -X PUT ""https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net/api/bookmarks/这里替换为书签ID"" \
  -H ""Content-Type: application/json"" \
  -d '{
    ""name"": ""ELGOOG"",
    ""url"": ""https://www.google.com"",
    ""icon"": ""🔍""
  }'
——————————（DELETE）——————————
curl -b cookies.txt -X DELETE ""https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net/api/bookmarks/这里替换为书签ID""
——————————（Logout）——————————
curl -b cookies.txt -X POST ""https://project-e-fee2dcb0a0bffjbh.southafricanorth-01.azurewebsites.net/logout"""
