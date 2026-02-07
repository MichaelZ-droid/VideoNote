# 🚀 阿里云 API 集成指南

## ⚠️ 当前状态

**重要**：当前系统使用**模拟数据**，并**没有真正调用语音识别 API**。

### 当前流程

```
用户上传视频
    ↓
✅ 真实：浏览器提取音频（ffmpeg.wasm）
    ↓
✅ 真实：上传音频到 Supabase Storage
    ↓
❌ 模拟：Edge Function 生成假的文字稿
    ↓
❌ 模拟：基于假文字稿生成摘要
```

## 📝 需要修改的代码位置

### 文件：`supabase/functions/process-video-summary/index.ts`

#### 第 44-96 行：模拟文字稿生成
```typescript
// ❌ 当前：生成假的文字稿
function generateMockTranscript(durationSeconds: number) {
  // ... 循环生成固定文本
}
```

**需要替换为**：
```typescript
// ✅ 真实：调用阿里云 Paraformer API
async function transcribeAudio(audioUrl: string) {
  const response = await fetch('PARAFORMER_API_URL', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aliyunAccessKeyId}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      // 其他必需参数
    }),
  });
  
  const data = await response.json();
  return data.results; // 返回带时间戳的文字稿
}
```

#### 第 99-131 行：模拟摘要生成
```typescript
// ❌ 当前：生成假的摘要
function generateMockSummary(durationSeconds: number) {
  // ... 固定模板
}
```

**需要替换为**：
```typescript
// ✅ 真实：调用阿里云 Qwen API
async function generateSummary(transcript: Array) {
  const transcriptText = transcript
    .map(t => `[${formatTime(t.start_time)}] ${t.text}`)
    .join('\n');
  
  const response = await fetch('QWEN_API_URL', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aliyunAccessKeyId}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-max',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: generateUserPrompt(transcriptText) }
      ],
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  const summaryJson = JSON.parse(data.choices[0].message.content);
  return summaryJson.summary;
}
```

## 🔧 完整集成步骤

### 步骤 1：获取阿里云 API 信息

访问阿里云百炼控制台：https://bailian.console.aliyun.com/

需要获取：
1. **Paraformer API 端点** - 语音识别服务
2. **Qwen API 端点** - 大语言模型
3. **认证方式** - 通常是 API Key 或签名认证

### 步骤 2：测试 API 调用

使用 curl 测试：

```bash
# 测试 Paraformer（语音识别）
curl -X POST "YOUR_PARAFORMER_API_URL" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/test.mp3",
    "format": "mp3"
  }'

# 测试 Qwen（文本生成）
curl -X POST "YOUR_QWEN_API_URL" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-max",
    "messages": [
      {"role": "user", "content": "测试"}
    ]
  }'
```

### 步骤 3：更新 Edge Function

打开 `supabase/functions/process-video-summary/index.ts`，找到主函数（第 145 行左右）：

```typescript
Deno.serve(async (req) => {
  // ... 前置代码

  // ❌ 删除这些行（第 170-180 行）
  console.log('开始模拟语音识别...（生成匹配时长的文字稿）');
  const durationToUse = audioDuration || 546;
  const mockTranscript = generateMockTranscript(durationToUse);
  const mockSummary = generateMockSummary(durationToUse);

  // ✅ 替换为真实 API 调用
  console.log('开始真实语音识别...');
  
  // 1. 调用 Paraformer 进行语音识别
  const transcript = await transcribeAudio(urlData.signedUrl);
  console.log(`识别完成，共 ${transcript.length} 段文字`);
  
  // 2. 调用 Qwen 生成摘要
  const summary = await generateSummary(transcript);
  console.log(`摘要生成完成，共 ${summary.length} 个段落`);

  // 返回真实结果
  return new Response(
    JSON.stringify({
      success: true,
      summary: summary,
      transcript: transcript,
      message: '视频摘要生成成功'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
});
```

### 步骤 4：处理 API 响应格式

#### Paraformer 预期响应
```json
{
  "request_id": "xxx",
  "results": [
    {
      "text": "识别的文字",
      "begin_time": 0,      // 毫秒
      "end_time": 5000      // 毫秒
    }
  ]
}
```

**转换代码**：
```typescript
const transcript = paraformerData.results.map((item: any) => ({
  text: item.text,
  start_time: item.begin_time,
  end_time: item.end_time
}));
```

#### Qwen 预期响应
```json
{
  "choices": [
    {
      "message": {
        "content": "{\"summary\": [...]}"
      }
    }
  ]
}
```

**解析代码**：
```typescript
const summaryText = qwenData.choices[0].message.content;
const summaryJson = JSON.parse(summaryText);
const summary = summaryJson.summary;
```

## 📊 完整示例代码

创建新文件：`supabase/functions/process-video-summary/api.ts`

```typescript
// 阿里云 API 配置
const PARAFORMER_API_URL = 'YOUR_PARAFORMER_URL';
const QWEN_API_URL = 'YOUR_QWEN_URL';

// 语音识别
export async function transcribeAudio(
  audioUrl: string,
  accessKeyId: string,
  accessKeySecret: string
) {
  try {
    const response = await fetch(PARAFORMER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessKeyId}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        format: 'mp3',
        sample_rate: 16000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Paraformer API 错误: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.results.map((item: any) => ({
      text: item.text,
      start_time: item.begin_time,
      end_time: item.end_time
    }));
  } catch (error) {
    console.error('语音识别失败:', error);
    throw error;
  }
}

// 生成摘要
export async function generateSummary(
  transcript: Array<any>,
  systemPrompt: string,
  userPrompt: string,
  accessKeyId: string
) {
  try {
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessKeyId}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-max',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Qwen API 错误: ${response.statusText}`);
    }

    const data = await response.json();
    const summaryText = data.choices[0].message.content;
    
    // 解析 JSON 响应
    const summaryJson = JSON.parse(summaryText);
    return summaryJson.summary;
  } catch (error) {
    console.error('摘要生成失败:', error);
    throw error;
  }
}
```

然后在主文件中导入：
```typescript
import { transcribeAudio, generateSummary } from './api.ts';
```

## ⚠️ 注意事项

### 1. 错误处理
```typescript
try {
  const transcript = await transcribeAudio(...);
} catch (error) {
  console.error('API 调用失败:', error);
  // 返回友好的错误信息给前端
  return new Response(
    JSON.stringify({
      success: false,
      error: '语音识别服务暂时不可用，请稍后重试'
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

### 2. 超时处理
对于长视频，可能需要分段处理：
```typescript
// 如果音频超过 10 分钟，分段处理
if (audioDuration > 600) {
  // 实现分段逻辑
}
```

### 3. 费用控制
- 在调用前检查音频大小
- 设置最大处理时长限制
- 添加请求频率限制

### 4. 日志记录
```typescript
console.log('API 调用开始:', {
  audioPath,
  duration: audioDuration,
  timestamp: new Date().toISOString()
});
```

## 🧪 测试步骤

1. **本地测试 API**
   ```bash
   # 在终端测试 API 是否可访问
   curl -X POST YOUR_API_URL -H "Authorization: ..."
   ```

2. **部署并测试**
   - 修改 Edge Function
   - 保存文件（自动部署）
   - 上传短视频测试（< 1 分钟）
   - 查看 Edge Function 日志

3. **查看日志**
   - Supabase Dashboard → Functions → Logs
   - 或使用命令行：`supabase functions logs process-video-summary`

## 📞 获取帮助

如果您在集成过程中遇到问题：

1. **API 文档不清楚**
   - 联系阿里云技术支持
   - 查看官方示例代码

2. **认证失败**
   - 检查 API Key 是否正确
   - 确认 API 权限已开通

3. **响应格式不匹配**
   - 打印完整的 API 响应
   - 调整数据转换逻辑

---

**当前系统已准备好集成真实 API，只需按照本指南替换模拟代码即可！** 🚀
