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

// ===== 提示词配置 =====
// 您可以直接修改这些提示词来优化摘要效果

const SYSTEM_PROMPT = `你是一个专业的视频内容分析专家，擅长从视频文字稿中提取关键信息并生成结构化摘要。

你的任务是：
1. 深入分析视频内容的主题和核心观点
2. 识别视频的关键转折点和重要时刻
3. 提取具体的细节和实用信息
4. 按照逻辑顺序组织内容

要求：
- 摘要应该具体、准确，避免笼统的描述
- 每个段落都要包含实质性内容，不要只写"介绍"、"讲解"等空泛词汇
- 保留视频中的关键数据、例子、术语
- 突出视频的独特价值和核心要点
- 使用简洁专业的语言`;

const USER_PROMPT_TEMPLATE = `请基于以下带时间戳的视频文字稿，生成详细的结构化摘要。

## 分析要求：
1. **段落数量**：生成 5-10 个主要段落（根据内容长度调整）
2. **标题要求**：每个段落的标题要具体、明确，体现该部分的核心内容
3. **内容要求**：
   - 描述要详细具体，包含关键信息点
   - 提取重要的数据、例子、术语
   - 说明讲解的具体方法、步骤、技巧
   - 避免"介绍了..."、"讲解了..."等空泛表述
4. **时间戳**：保留关键时间点，格式为 MM:SS 或 HH:MM:SS

## 输出格式：
必须严格按照以下 JSON 格式返回（不要添加任何 markdown 标记）：

{
  "summary": [
    {
      "timestamp": "00:00",
      "title": "具体的段落标题（说明这部分的核心内容）",
      "content": "详细的内容描述，包含关键信息点、具体数据、重要例子等。至少 2-3 句话，充分说明这部分的价值。"
    }
  ]
}

## 示例（好的摘要）：
{
  "summary": [
    {
      "timestamp": "00:00",
      "title": "Python 列表推导式的三种高级用法",
      "content": "讲解了列表推导式的嵌套用法、条件过滤和字典推导式。通过实例演示如何用一行代码实现复杂的数据转换，相比传统循环性能提升 30%。"
    }
  ]
}

## 反面示例（避免这样笼统的摘要）：
❌ "介绍了基本概念" 
✅ "讲解了 React Hooks 的三个核心规则：只在顶层调用、只在函数组件中使用、自定义 Hook 必须以 use 开头"

---

## 视频文字稿：
{TRANSCRIPT}

请现在生成摘要（只返回 JSON，不要有其他内容）：`;

// 格式化文字稿
function formatTranscriptForPrompt(transcript: Array<{ text: string; start_time: number; end_time: number }>): string {
  return transcript
    .map((item) => {
      const minutes = Math.floor(item.start_time / 60000);
      const seconds = Math.floor((item.start_time % 60000) / 1000);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `[${timestamp}] ${item.text}`;
    })
    .join('\n');
}

// ===== 主函数 =====

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioPath } = await req.json();

    if (!audioPath) {
      throw new Error('缺少音频文件路径');
    }

    console.log('开始处理音频文件:', audioPath);

    // 获取阿里云凭证
    const aliyunAccessKeyId = Deno.env.get('ALIYUN_ACCESS_KEY_ID');
    const aliyunAccessKeySecret = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET');

    if (!aliyunAccessKeyId || !aliyunAccessKeySecret) {
      throw new Error('阿里云凭证未配置');
    }

    // 初始化 Supabase 客户端获取音频文件
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 获取音频文件的临时下载 URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('temp-audio')
      .createSignedUrl(audioPath, 3600);

    if (urlError) {
      throw new Error(`获取音频文件失败: ${urlError.message}`);
    }

    console.log('音频文件 URL 已生成，开始调用阿里云 API');

    // TODO: 这里需要根据阿里云百炼的实际 API 文档进行调整
    // 以下是示例代码，需要根据实际的 Paraformer 和 Qwen API 进行修改
    
    // 模拟调用 Paraformer 语音识别（需要替换为实际 API）
    console.log('开始模拟语音识别...');
    const mockTranscript = [
      { text: "大家好，欢迎来到今天的视频", start_time: 0, end_time: 3500 },
      { text: "今天我们要讲解一个非常重要的主题", start_time: 3500, end_time: 7200 },
      { text: "首先让我们从基础概念开始", start_time: 7200, end_time: 10800 },
      { text: "这个技术在实际应用中非常广泛", start_time: 10800, end_time: 15000 },
      { text: "接下来我会通过几个实例来演示", start_time: 15000, end_time: 19500 },
      { text: "第一个例子展示了基本用法", start_time: 19500, end_time: 25000 },
      { text: "你可以看到效果非常明显", start_time: 25000, end_time: 30000 },
      { text: "现在让我们看看更复杂的场景", start_time: 30000, end_time: 35000 },
      { text: "在生产环境中，我们需要注意性能优化", start_time: 35000, end_time: 40000 },
      { text: "这里有三个关键的优化技巧", start_time: 40000, end_time: 45000 },
      { text: "第一个技巧是使用缓存机制", start_time: 45000, end_time: 50000 },
      { text: "第二个技巧是异步处理", start_time: 50000, end_time: 55000 },
      { text: "第三个技巧是资源复用", start_time: 55000, end_time: 60000 },
      { text: "通过这些优化，性能可以提升 50%", start_time: 60000, end_time: 65000 },
      { text: "接下来我们看一个实战案例", start_time: 65000, end_time: 70000 },
      { text: "这个案例来自真实的项目经验", start_time: 70000, end_time: 75000 },
      { text: "我们遇到了数据量过大的问题", start_time: 75000, end_time: 80000 },
      { text: "解决方案是采用分页加载", start_time: 80000, end_time: 85000 },
      { text: "同时配合虚拟滚动技术", start_time: 85000, end_time: 90000 },
      { text: "最终将加载时间从 5 秒降到 0.5 秒", start_time: 90000, end_time: 95000 },
      { text: "最后我们来总结一下今天的内容", start_time: 95000, end_time: 100000 },
      { text: "今天我们学习了三个核心技术点", start_time: 100000, end_time: 105000 },
      { text: "以及一个完整的实战案例", start_time: 105000, end_time: 110000 },
      { text: "希望这些内容对大家有所帮助", start_time: 110000, end_time: 115000 },
      { text: "如果有问题欢迎在评论区留言", start_time: 115000, end_time: 120000 },
      { text: "感谢大家的观看，我们下次再见", start_time: 120000, end_time: 125000 },
    ];

    // 格式化文字稿用于 AI 分析
    const transcriptText = formatTranscriptForPrompt(mockTranscript);
    
    console.log('语音识别完成，开始生成摘要');
    console.log('使用优化后的提示词...');

    // 模拟调用 Qwen3-max 生成摘要（需要替换为实际 API）
    // 实际使用时，应该调用阿里云 Qwen API，格式类似：
    /*
    const userPrompt = USER_PROMPT_TEMPLATE.replace('{TRANSCRIPT}', transcriptText);
    const qwenResponse = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliyunAccessKeyId}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-max',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });
    const qwenData = await qwenResponse.json();
    const summaryJson = JSON.parse(qwenData.choices[0].message.content);
    const summary = summaryJson.summary;
    */
    
    // 当前返回模拟数据（体现优化后的摘要风格）
    const mockSummary: SummaryItem[] = [
      {
        timestamp: "00:00",
        title: "课程介绍：核心技术概览",
        content: "介绍本次课程的主要内容，涵盖技术基础概念、实际应用场景，以及三个性能优化技巧。强调该技术在生产环境中的广泛应用和重要性。"
      },
      {
        timestamp: "00:19",
        title: "基础演示：核心功能使用方法",
        content: "通过第一个示例展示技术的基本用法和核心功能。演示效果明显，适合初学者快速上手。讲解了关键 API 的使用方式和常见参数配置。"
      },
      {
        timestamp: "00:30",
        title: "进阶场景：复杂应用与性能优化",
        content: "深入讲解复杂场景下的应用方式。重点介绍生产环境的三个关键优化技巧：1) 使用缓存机制减少重复计算；2) 异步处理提升响应速度；3) 资源复用降低内存占用。通过这些优化，性能可提升 50%。"
      },
      {
        timestamp: "01:05",
        title: "实战案例：大数据量性能优化方案",
        content: "分享来自真实项目的案例，解决数据量过大导致的加载缓慢问题。采用分页加载配合虚拟滚动技术，将页面加载时间从 5 秒优化到 0.5 秒，性能提升 10 倍。详细讲解实施步骤和注意事项。"
      },
      {
        timestamp: "01:35",
        title: "课程总结与核心要点回顾",
        content: "总结本次课程的三个核心技术点和一个完整实战案例。回顾关键知识点，强调实际应用中的最佳实践。鼓励观众在评论区交流讨论。"
      }
    ];

    console.log('摘要生成完成');

    // 注意：在生产环境中，应该在处理完成后删除临时音频文件
    // await supabase.storage.from('temp-audio').remove([audioPath]);

    return new Response(
      JSON.stringify({
        success: true,
        summary: mockSummary,
        transcript: mockTranscript,
        message: '视频摘要生成成功'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('处理失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '处理视频摘要时发生错误'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
