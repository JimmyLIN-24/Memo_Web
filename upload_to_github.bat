@echo off
echo 正在初始化Git仓库...
git init

echo 配置Git用户信息...
git config user.name "小香香Grace"
git config user.email "jimmylin2020gra@gmail.com"

echo 添加所有文件到Git...
git add .

echo 创建第一次提交...
git commit -m "初始提交：上传物品清单备忘录应用"

echo 添加远程仓库...
git remote add origin https://github.com/JimmyLIN-24/Memo_Web.git

echo 推送到GitHub...
git push -u origin main

echo 完成！您的文件已上传到GitHub。
pause 