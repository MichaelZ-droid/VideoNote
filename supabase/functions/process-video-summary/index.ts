import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummaryItem {
  timestamp: string;
  title: string;
  content: string;
}

interface TranscriptItem {
  text: string;
  start_time: number;
  end_time: number;
}

// DashScope API 端点
const PARAFORMER_API = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';
const QWEN_API = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 提示词
const SYSTEM_PROMPT = `你是一个专业的视频内容分析专家。你的任务是将视频文字稿转化为有价值的结构化摘要。

核心要求：
- 引用原文中的关键词句（用「」标注）
- 保留具体的人名、数据、术语
- 段落之间体现逻辑递进或转折关系
- 避免"第X部分"、"本段内容"等机械化表达
- 语言简洁有力，像在向朋友转述精华`;

const USER_PROMPT_TEMPLATE = `请分析以下视频文字稿，生成详细的结构化摘要。

## 视频信息
**文件名**: {VIDEO_TITLE}
**时长**: {DURATION}

## 摘要要求

### 数量
根据内容自然分段，不限制数量。宁可多分几段保留细节。

### 标题
用一句话概括该段核心内容，直接体现"谁做了什么"或"讲了什么观点"。

### 内容（重点）
1. **必须引用原文**：摘录文字稿中的关键语句，用「」标注
2. **提炼关键信息**：数据、时间、地点、人物观点、方法步骤
3. **体现前后关联**：承接上文、转折、铺垫后文

### 禁止
- "本段内容："
- "（第1部分）"
- "接下来介绍..."
- 空泛概括

## 输出格式
返回纯 JSON：
{
  "video_type": "识别的视频类型",
  "summary": [
    {
      "timestamp": "MM:SS",
      "title": "简洁有力的标题",
      "content": "引用原文「关键语句」，提炼核心信息。"
    }
  ]
}

## 视频文字稿
{TRANSCRIPT}

请生成摘要（只返回 JSON）：`;

// 辅助函数
function msToTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTranscriptForPrompt(transcript: TranscriptItem[]): string {
  return transcript
    .map((item) => `[${msToTimestamp(item.start_time)}] ${item.text}`)
    .join('\n');
}

// 步骤1：提交 Paraformer 语音识别任务
async function submitTranscriptionTask(audioUrl: string, apiKey: string): Promise<string> {
  console.log('提交语音识别任务...');
  
  const response = await fetch(PARAFORMER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'paraformer-v2',
      input: {
        file_urls: [audioUrl]
      },
      parameters: {
        language_hints: ['zh', 'en']
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('提交任务失败:', error);
    throw new Error(`提交语音识别任务失败: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('任务提交成功:', JSON.stringify(data));
  
  if (data.output?.task_id) {
    return data.output.task_id;
  }
  
  throw new Error('未获取到任务ID');
}

// 步骤2：查询语音识别任务状态
async function queryTranscriptionTask(taskId: string, apiKey: string): Promise<TranscriptItem[]> {
  const queryUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  
  let attempts = 0;
  const maxAttempts = 60; // 最多等待 5 分钟
  
  while (attempts < maxAttempts) {
    console.log(`查询任务状态 (${attempts + 1}/${maxAttempts})...`);
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`查询任务失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const status = data.output?.task_status;
    
    console.log('任务状态:', status);

    if (status === 'SUCCEEDED') {
      // 获取转写结果
      const transcriptionUrl = data.output?.results?.[0]?.transcription_url;
      if (transcriptionUrl) {
        console.log('获取转写结果...');
        const transcriptResponse = await fetch(transcriptionUrl);
        const transcriptData = await transcriptResponse.json();
        
        // 解析转写结果
        const transcript: TranscriptItem[] = [];
        if (transcriptData.transcripts) {
          for (const t of transcriptData.transcripts) {
            if (t.sentences) {
              for (const sentence of t.sentences) {
                transcript.push({
                  text: sentence.text,
                  start_time: sentence.begin_time || 0,
                  end_time: sentence.end_time || 0,
                });
              }
            }
          }
        }
        
        console.log(`转写完成，共 ${transcript.length} 句`);
        return transcript;
      }
      throw new Error('未找到转写结果URL');
    } else if (status === 'FAILED') {
      throw new Error(`语音识别任务失败: ${data.output?.message || '未知错误'}`);
    }
    
    // 等待 5 秒后重试
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
  
  throw new Error('语音识别任务超时');
}

// 步骤3：调用 Qwen 生成摘要
async function generateSummaryWithQwen(
  transcript: TranscriptItem[],
  videoTitle: string,
  duration: string,
  apiKey: string
): Promise<SummaryItem[]> {
  console.log('调用 Qwen 生成摘要...');
  
  const transcriptText = formatTranscriptForPrompt(transcript);
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{VIDEO_TITLE}', videoTitle)
    .replace('{DURATION}', duration)
    .replace('{TRANSCRIPT}', transcriptText);

  const response = await fetch(QWEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Qwen API 调用失败:', error);
    throw new Error(`摘要生成失败: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Qwen 返回空内容');
  }

  console.log('Qwen 原始返回:', content.substring(0, 200) + '...');

  // 解析 JSON
  try {
    // 尝试提取 JSON
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);
    if (parsed.summary && Array.isArray(parsed.summary)) {
      console.log(`摘要生成成功，共 ${parsed.summary.length} 段`);
      return parsed.summary;
    }
  } catch (e) {
    console.error('JSON 解析失败:', e);
  }

  // 解析失败，返回简单摘要
  console.log('JSON 解析失败，使用备用方案');
  return [{
    timestamp: '00:00',
    title: '视频摘要',
    content: content.substring(0, 500)
  }];
}

// 主函数
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioPath, audioDuration, videoTitle } = await req.json();

    if (!audioPath) {
      throw new Error('缺少音频文件路径');
    }

    console.log('========== 开始处理 ==========');
    console.log('音频路径:', audioPath);
    console.log('视频标题:', videoTitle);
    console.log('时长:', audioDuration, '秒');

    // 获取 DashScope API Key
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY');
    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY 未配置');
    }

    // 初始化 Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 获取音频文件的公开 URL（Paraformer 需要可访问的 URL）
    const { data: urlData, error: urlError } = await supabase.storage
      .from('temp-audio')
      .createSignedUrl(audioPath, 3600);

    if (urlError || !urlData?.signedUrl) {
      throw new Error(`获取音频文件URL失败: ${urlError?.message}`);
    }

    const audioUrl = urlData.signedUrl;
    console.log('音频URL已生成');

    // 步骤1：提交语音识别任务
    const taskId = await submitTranscriptionTask(audioUrl, apiKey);
    console.log('任务ID:', taskId);

    // 步骤2：等待并获取语音识别结果
    const transcript = await queryTranscriptionTask(taskId, apiKey);
    
    if (transcript.length === 0) {
      throw new Error('语音识别结果为空');
    }

    // 步骤3：调用 Qwen 生成摘要
    const durationStr = msToTimestamp((audioDuration || 300) * 1000);
    const summary = await generateSummaryWithQwen(
      transcript,
      videoTitle || '未命名视频',
      durationStr,
      apiKey
    );

    console.log('========== 处理完成 ==========');

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        transcript,
        message: `处理完成：${transcript.length} 句转写，${summary.length} 段摘要`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('========== 处理失败 ==========');
    console.error('错误:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '处理视频时发生错误'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
