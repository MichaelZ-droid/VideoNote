# VideoNote 快速入门

## 当前状态 ✅

VideoNote 的基础架构已完成！

### 已完成的功能

- ✅ 视频上传（拖拽/点击，最大 1GB）
- ✅ 浏览器端音频提取（ffmpeg.wasm）
- ✅ Supabase Storage 集成
- ✅ Edge Function 部署
- ✅ 响应式界面（桌面 + 移动）
- ✅ 深色/浅色主题
- ✅ 时间戳跳转功能
- ✅ 复制和导出功能

### 待完成的集成

⚠️ **重要**: 当前使用模拟数据。需要集成真实的阿里云 API。

## 🚀 立即开始

### 1. 启动应用

```bash
pnpm dev
```

访问: http://localhost:8080

### 2. 测试流程

1. 上传一个测试视频（建议 < 100MB）
2. 等待音频提取完成（1-3 分钟）
3. 查看生成的模拟摘要
4. 测试时间戳跳转功能

### 3. 下一步：集成真实 API

需要修改的文件：
`supabase/functions/process-video-summary/index.ts`

您需要：
1. 获取阿里云 Paraformer API 端点和文档
2. 获取阿里云 Qwen3-max API 端点和文档
3. 替换文件中的模拟数据调用
4. 测试 API 调用

详细步骤请查看:
- SETUP.md - 完整设置指南
- README.md - 项目文档

## 📝 API 凭证

已通过 Supabase Secrets 安全配置：
- ALIYUN_ACCESS_KEY_ID ✅
- ALIYUN_ACCESS_KEY_SECRET ✅

这些凭证在 Edge Function 中可用。

## 🎨 项目特色

### 设计
- 影视哑光风格
- 深色模式优先
- 流畅动画效果

### 技术亮点
- React 19 + TypeScript
- ffmpeg.wasm（浏览器端处理）
- Supabase 后端
- 完全响应式

## 📚 更多资源

- README.md - 完整项目文档
- SETUP.md - 详细设置指南
- 阿里云百炼控制台: https://bailian.console.aliyun.com/

## 🐛 遇到问题？

1. 检查浏览器控制台 (F12)
2. 查看 Supabase Edge Function 日志
3. 确保使用支持 SharedArrayBuffer 的浏览器

---

**准备好了吗？** 开始上传视频，体验 VideoNote！ 🎬
