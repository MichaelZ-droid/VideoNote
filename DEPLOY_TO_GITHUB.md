# 🚀 推送到 GitHub 完整指南

## 仓库信息
- GitHub 仓库：https://github.com/MichaelZ-droid/VideoNote.git
- 部署平台：Vercel
- 域名：vibetech.club

---

## 📝 推送步骤

### 在项目根目录执行以下命令：

```bash
# 1. 确认当前分支
git branch

# 2. 添加远程仓库（如果还没有添加）
git remote add origin https://github.com/MichaelZ-droid/VideoNote.git

# 或者，如果已存在但地址不对，先删除再添加
git remote remove origin
git remote add origin https://github.com/MichaelZ-droid/VideoNote.git

# 3. 确认远程仓库地址
git remote -v

# 4. 推送到 GitHub
git push -u origin main

# 如果遇到冲突或仓库已有内容，强制推送（慎用）
# git push -u origin main --force
```

---

## ✅ 推送成功后

1. **访问 GitHub 仓库**：https://github.com/MichaelZ-droid/VideoNote
2. **确认代码已上传**：查看文件列表
3. **在 Vercel 中重新部署**：
   - 进入 Vercel 项目设置
   - 如果 GitHub 仓库变了，重新连接
   - 触发新的部署

---

## 🔐 认证问题？

如果推送时提示需要认证：

### 使用 GitHub CLI (推荐)
```bash
gh auth login
```

### 或使用 Personal Access Token
1. 访问：https://github.com/settings/tokens
2. 生成新的 Token（勾选 `repo` 权限）
3. 推送时使用 Token 作为密码

---

## 📋 检查清单

- [ ] 代码已推送到 GitHub
- [ ] GitHub 仓库可以看到所有文件
- [ ] Vercel 已连接到正确的仓库
- [ ] DNS 记录已配置（vibetech.club）
- [ ] 应用可以正常访问

---

## 🆘 常见问题

### Q: 推送被拒绝 (rejected)
**A**: 使用 `git push -u origin main --force` 强制推送

### Q: 认证失败
**A**: 使用 Personal Access Token 代替密码

### Q: 分支名不是 main
**A**: 先检查分支：`git branch`，然后推送对应分支：`git push -u origin <分支名>`

---

完成推送后，回到 Vercel 继续部署！
