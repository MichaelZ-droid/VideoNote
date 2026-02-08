# VideoNote - 智能视频摘要生成器

<div align="center">
  <img src="./public/logo.svg" width="120" alt="VideoNote Logo" />
  <h3>让您的视频收藏不再吃灰</h3>
  <p>一键上传视频，AI 自动生成带时间戳的内容摘要</p>
</div>

## ✨ 特性

- 🎬 **本地视频播放** - 无需上传完整视频，保护隐私
- 🎵 **智能音频提取** - 浏览器端提取音频，大幅减少上传时间
- 🤖 **AI 语音识别** - 使用阿里云 Paraformer 高精度识别
- 📝 **智能摘要生成** - Qwen3-max 生成结构化内容摘要
- ⏱️ **时间戳跳转** - 点击时间戳立即跳转到对应位置
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌓 **深色/浅色主题** - 影视级哑光视觉设计
- 📤 **导出 Markdown** - 一键导出摘要文档

## 🎯 使用场景

- 📚 **学习视频** - 快速获取课程要点和章节划分
- 🎤 **会议录像** - 生成会议纪要和关键讨论点
- 🎮 **直播回放** - 找到精彩片段，不错过任何高光时刻
- 📺 **长视频消化** - 在观看前了解内容概要

## 🚀 技术栈

### 前端
- **React 19** + **TypeScript** - 类型安全的现代 React
- **Vite 7** - 极速开发体验
- **Tailwind CSS** - 实用优先的样式系统
- **shadcn/ui** - 高质量 UI 组件
- **Framer Motion** - 流畅动画效果
- **ffmpeg.wasm** - 浏览器端音频处理

### 后端
- **Supabase** - 开源 Firebase 替代方案
  - Storage - 音频文件存储
  - Edge Functions - 无服务器函数
  - Secrets - 安全的密钥管理

### AI 服务
- **阿里云百炼**
  - Paraformer - 语音识别（ASR）
  - Qwen3-max - 大语言模型（LLM）

## 📐 架构设计

```
用户上传视频 (1GB)
    ↓
[浏览器] ffmpeg.wasm 提取音频 (~50MB)
    ↓
[Supabase Storage] 临时存储音频文件
    ↓
[Edge Function] 代理阿里云 API 调用
    ├─> Paraformer: 语音识别 → 带时间戳文字稿
    └─> Qwen3-max: 文本摘要 → 结构化摘要
    ↓
[前端展示] 可交互的摘要面板
```

## 🛠️ 安装与配置

### 1. 克隆项目（如果需要）

```bash
git clone <your-repo-url>
cd videonote
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境

项目已配置 Supabase，您需要确保以下密钥已设置：

- `ALIYUN_ACCESS_KEY_ID` - 阿里云 Access Key ID
- `ALIYUN_ACCESS_KEY_SECRET` - 阿里云 Access Key Secret

密钥已通过 Supabase Secrets 安全存储。

### 4. 更新 Edge Function

**重要**：当前 Edge Function 使用模拟数据。请根据[阿里云百炼文档](https://bailian.console.aliyun.com/)更新：

`supabase/functions/process-video-summary/index.ts`

需要集成真实的 API 调用逻辑。

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:8080

## 📖 使用指南

1. **上传视频**
   - 拖拽视频文件到上传区域
   - 或点击选择本地视频文件
   - 支持 MP4、MOV、AVI、WEBM 格式
   - 最大 1GB

2. **等待处理**
   - 音频提取（1-3 分钟）
   - 上传音频（取决于网速）
   - AI 分析生成摘要（30 秒 - 2 分钟）

3. **查看摘要**
   - 桌面端：右侧面板显示摘要
   - 移动端：底部抽屉展开查看
   - 点击时间戳跳转到对应位置

4. **导出摘要**
   - 复制：复制 Markdown 格式到剪贴板
   - 导出：下载 `.md` 文件

## 🎨 设计系统

### 配色方案

**深色模式（默认）**
- 背景：`#0a0e17` 深灰蓝（影院风格）
- 卡片：`#141824` 略浅灰蓝
- 主色：`#3b82f6` 青蓝色
- 强调色：`#f5c842` 胶片金

**浅色模式**
- 背景：`#f5f5f0` 暖白色
- 卡片：`#ffffff` 纯白
- 主色：`#2563eb` 深蓝色
- 强调色：`#f59e0b` 琥珀金

### 视觉特性

- 磨砂玻璃效果（backdrop-blur）
- 柔和圆角（0.75rem）
- 流畅过渡动画
- 微妙阴影和光晕

## 🔧 配置选项

### 文件大小限制

在 `src/components/video/VideoUploader.tsx` 中修改：

```typescript
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
```

### 音频质量

在 `src/lib/ffmpeg.ts` 中调整：

```typescript
'-b:a', '128k',  // 音频比特率
'-ar', '16000',  // 采样率
```

### 临时文件保留时间

在 Supabase Dashboard 中修改存储桶生命周期策略。

## 🐛 故障排除

### ffmpeg.wasm 加载失败

**问题**：SharedArrayBuffer 不可用

**解决**：
- 确保使用 HTTPS 或 localhost
- 检查浏览器是否支持（Chrome 92+, Firefox 89+）
- Vite 已配置必需的响应头

### 音频提取缓慢

**问题**：大视频文件处理时间长

**解决**：
- 建议视频大小 < 500MB
- 或考虑服务端音频提取（需要上传完整视频）

### 摘要生成失败

**问题**：阿里云 API 调用失败

**解决**：
- 检查密钥是否正确配置
- 查看 Edge Function 日志
- 确认 API 调用格式符合文档

## 📝 开发计划

- [ ] 集成真实阿里云 Paraformer API
- [ ] 集成真实阿里云 Qwen3-max API
- [ ] 支持批量处理多个视频
- [ ] 历史记录功能（需要用户认证）
- [ ] 字幕文件导出（SRT/VTT）
- [ ] 多语言支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

## 🙏 致谢

- [阿里云百炼](https://bailian.console.aliyun.com/) - AI 服务提供商
- [Supabase](https://supabase.com/) - 后端基础设施
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) - 浏览器端媒体处理
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

---

<div align="center">
  <p>用 ❤️ 打造 · 由阿里云百炼 AI 驱动</p>
</div>
