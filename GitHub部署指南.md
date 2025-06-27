# 🚀 GitHub Pages 部署指南

## 📋 部署准备

### 第一步：准备GitHub账号
- 如果没有GitHub账号，先注册一个：https://github.com
- 登录到你的GitHub账号

### 第二步：上传项目文件

#### 方法1：通过GitHub网页上传（推荐新手）
1. **创建新仓库**
   - 点击右上角的 `+` 号，选择 `New repository`
   - 仓库名称：`Memo_Web`（或你喜欢的名字）
   - 设置为 `Public`（公开）
   - 勾选 `Add a README file`
   - 点击 `Create repository`

2. **上传文件**
   - 在新创建的仓库页面，点击 `uploading an existing file`
   - 将以下所有文件拖拽到上传区域：
     ```
     index.html
     app.html
     styles.css
     script.js
     manifest.json
     sw.js
     icon-192.png
     icon-512.png
     iOS使用指南.md
     README.md
     .github/workflows/deploy.yml
     ```
   - 在底部填写提交信息：`Initial commit - 小香香的物品备忘录`
   - 点击 `Commit changes`

#### 方法2：通过Git命令（推荐有经验用户）
```bash
# 克隆你的空仓库
git clone https://github.com/你的用户名/Memo_Web.git
cd Memo_Web

# 复制所有项目文件到这个目录

# 添加文件到Git
git add .
git commit -m "Initial commit - 小香香的物品备忘录"
git push origin main
```

### 第三步：启用GitHub Pages

1. **进入仓库设置**
   - 在你的仓库页面，点击顶部的 `Settings` 标签

2. **配置Pages**
   - 在左侧菜单中找到 `Pages`
   - 在 `Source` 下拉菜单中选择 `Deploy from a branch`
   - 选择分支：`main` 或 `master`
   - 目录选择：`/ (root)`
   - 点击 `Save`

3. **等待部署**
   - 部署过程需要1-5分钟
   - 页面顶部会显示绿色的部署链接
   - 链接格式：`https://你的用户名.github.io/Memo_Web`

## ✅ 验证部署

### 检查点1：访问应用
- 打开生成的链接
- 应该看到小香香的欢迎页面
- 点击"进入我的清单世界"按钮
- 确认能正常跳转到应用主界面

### 检查点2：PWA功能
- 用Safari浏览器打开链接
- 检查是否可以"添加到主屏幕"
- 安装后确认能离线使用

### 检查点3：所有功能
- ✅ 添加物品功能
- ✅ 分类切换
- ✅ 提醒系统
- ✅ 数据持久化

## 🔧 常见问题解决

### 问题1：页面显示404
**原因**：文件路径或分支设置错误
**解决**：
- 确认仓库是Public的
- 确认Pages设置中分支选择正确
- 等待几分钟让部署完成

### 问题2：样式没有加载
**原因**：CSS文件路径问题
**解决**：
- 检查所有文件都上传成功
- 确认文件名大小写正确
- 强制刷新浏览器（Ctrl+F5）

### 问题3：PWA无法安装
**原因**：HTTPS或manifest配置问题
**解决**：
- GitHub Pages自动启用HTTPS
- 检查manifest.json文件是否存在
- 用Safari浏览器测试

### 问题4：Service Worker报错
**原因**：缓存路径问题
**解决**：
- 打开浏览器开发者工具
- 查看Console标签的错误信息
- 确认sw.js文件存在且无语法错误

## 📱 iOS安装步骤

### 部署完成后的安装
1. **在iPhone上打开Safari**
2. **访问你的GitHub Pages链接**
   - 格式：`https://你的用户名.github.io/Memo_Web`
3. **点击分享按钮**（底部中间的箭头向上图标）
4. **向下滑动找到"添加到主屏幕"**
5. **确认添加**
   - 可以修改应用名称
   - 点击"添加"完成

### 验证安装成功
- ✅ 主屏幕出现应用图标
- ✅ 点击图标全屏启动
- ✅ 没有浏览器地址栏
- ✅ 离线时也能使用

## 🎉 完成！

恭喜！你现在已经成功：
- ✅ 将应用部署到GitHub Pages
- ✅ 获得了永久的访问链接
- ✅ 可以在任何设备上访问
- ✅ 支持PWA安装到iOS主屏幕

**你的应用链接：** `https://你的用户名.github.io/Memo_Web`

## 🔄 后续更新

当你需要更新应用时：
1. 修改本地文件
2. 重新上传到GitHub仓库
3. GitHub Pages会自动更新
4. 用户的PWA会自动获取更新

---

**享受你的专属物品管理应用吧！** 💖 

# GitHub部署指南

## 前提条件
✅ Git已安装（刚刚完成）
✅ GitHub仓库已创建（Memo_Web）

## 步骤1：获取您的GitHub信息
1. 登录 [GitHub](https://github.com)
2. 进入您的 `Memo_Web` 仓库
3. 复制仓库的URL，格式应该是：`https://github.com/您的用户名/Memo_Web.git`

## 步骤2：修改上传脚本
1. 打开 `upload_to_github.bat` 文件
2. 将 `你的用户名` 替换为您的实际GitHub用户名
3. 将 `your-email@example.com` 替换为您的GitHub邮箱

## 步骤3：执行上传
方式一：直接运行批处理文件
```
双击 upload_to_github.bat 文件
```

方式二：使用PowerShell（推荐）
```powershell
# 重新启动PowerShell以加载Git
# 然后执行以下命令：

git init
git config user.name "小香香Grace"
git config user.email "您的邮箱@example.com"
git add .
git commit -m "初始提交：上传物品清单备忘录应用"
git remote add origin https://github.com/您的用户名/Memo_Web.git
git push -u origin main
```

## 可能遇到的问题

### 问题1：身份验证失败
如果推送时要求身份验证：
1. 使用GitHub用户名和Personal Access Token
2. 创建Token：GitHub设置 → Developer settings → Personal access tokens

### 问题2：分支名称问题
如果提示 `main` 分支不存在：
```bash
git branch -M main
```

### 问题3：已存在的仓库
如果远程仓库已有内容：
```bash
git pull origin main --allow-unrelated-histories
```

## 验证部署
1. 刷新您的GitHub仓库页面
2. 确认所有文件都已上传
3. 可以通过GitHub Pages部署网站（可选）

## GitHub Pages部署（可选）
1. 进入仓库的Settings
2. 滚动到Pages部分
3. 选择Source为"Deploy from a branch"
4. 选择branch为"main"
5. 点击Save
6. 您的网站将在 `https://您的用户名.github.io/Memo_Web` 可访问

## 后续更新
当您修改了文件后，使用以下命令更新：
```bash
git add .
git status
git commit -m "更新描述"
git log --oneline -3
git push
``` 