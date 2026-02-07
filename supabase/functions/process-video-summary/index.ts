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

// ===== 通用型提示词（不预设视频类型）=====
const SYSTEM_PROMPT = `你是一个专业的视频内容分析专家，擅长分析各种类型的视频内容并生成结构化摘要。

你的核心能力：
1. 自动识别视频类型（教学、会议、访谈、新闻、娱乐、纪录片、演讲等）
2. 理解视频的内容主题和叙事结构
3. 识别关键信息点、转折点和重要时刻
4. 提取具体的人物、事件、数据、观点
5. 按照内容的逻辑流程组织摘要

分析原则：
- 客观准确，忠于原内容
- 具体详细，避免笼统描述
- 保留关键信息（人名、地名、数据、术语、观点）
- 识别内容结构（开场、主体、转折、总结等）
- 适应不同类型的视频风格`;

const USER_PROMPT_TEMPLATE = `请分析以下视频的完整文字稿，生成详细的结构化摘要。

## 视频信息
**文件名**: {VIDEO_TITLE}
**时长**: {DURATION}

## 分析任务

### 第一步：识别视频类型
首先判断这是什么类型的视频：
- 教学/课程（讲解知识、演示技能）
- 会议/讨论（多人对话、决策讨论）
- 访谈/对话（主持人与嘉宾）
- 演讲/分享（单人演讲）
- 新闻/报道（事件报道）
- 纪录片（叙事性内容）
- Vlog/生活记录（个人记录）
- 其他类型

### 第二步：理解内容结构
基于视频类型，识别内容的自然分段：
- 教学：引入 → 核心概念 → 示例演示 → 总结
- 会议：开场 → 议题讨论 → 决策 → 行动项
- 访谈：开场介绍 → 问题1 → 问题2 → ... → 结束
- 演讲：开场 → 论点1 → 论点2 → ... → 总结
- 纪录片：背景介绍 → 事件展开 → 转折 → 结论
- Vlog：活动1 → 活动2 → ... → 感想

### 第三步：生成摘要
根据内容长度生成 5-10 个段落：
- 短视频（< 5分钟）：5-6 个段落
- 中等（5-15分钟）：7-8 个段落  
- 长视频（> 15分钟）：9-10 个段落

## 摘要要求

### 标题要求
- 简洁明确，体现该段核心内容
- 包含关键信息（如：人名、事件、话题）
- 避免"第一部分"、"介绍"等笼统词汇

### 内容要求
- 详细描述，至少 2-3 句话
- 提取具体信息：
  * 人物：谁说了什么，谁做了什么
  * 事件：发生了什么，为什么
  * 数据：具体的数字、时间、地点
  * 观点：核心论点和论据
  * 方法：具体的步骤、技巧
- 保留原文的专业术语和关键词
- 说明该段在整体内容中的作用

### 时间戳要求
- 准确标注每段开始的时间点
- 格式：MM:SS 或 HH:MM:SS
- 基于文字稿中的实际时间戳

## 输出格式
必须严格返回 JSON 格式（不要有 markdown 标记）：

{
  "video_type": "识别的视频类型",
  "summary": [
    {
      "timestamp": "00:00",
      "title": "具体的段落标题（包含核心信息）",
      "content": "详细描述，包含关键人物、事件、数据、观点等。说明这段内容在整个视频中的作用和价值。"
    }
  ]
}

## 示例（不同类型视频）

### 教学视频示例
{
  "video_type": "教学/课程",
  "summary": [
    {
      "timestamp": "00:00",
      "title": "React Hooks 的三个核心规则",
      "content": "讲解 React Hooks 必须遵守的三个规则：1) 只在函数顶层调用，不能在循环或条件语句中；2) 只在 React 函数组件中调用；3) 自定义 Hook 名称必须以 use 开头。通过代码示例展示违反规则的错误写法。"
    }
  ]
}

### 会议视频示例
{
  "video_type": "会议/讨论",
  "summary": [
    {
      "timestamp": "00:00",
      "title": "产品迭代计划讨论（张经理主持）",
      "content": "张经理介绍本次会议议题：讨论 Q2 产品迭代计划。参会人员包括产品团队 5 人、技术团队 3 人。会议预计 30 分钟，需要确定优先级和资源分配。"
    },
    {
      "timestamp": "02:15",
      "title": "李工程师提出技术债务问题",
      "content": "李工程师指出当前系统存在性能瓶颈，数据库查询平均响应时间达 800ms，建议先优化底层架构再添加新功能。王产品经理表示理解但强调市场压力，需要平衡短期需求和长期规划。"
    }
  ]
}

### 访谈视频示例
{
  "video_type": "访谈/对话",
  "summary": [
    {
      "timestamp": "00:00",
      "title": "专访创业者李明：从程序员到 CEO",
      "content": "主持人介绍嘉宾李明，35岁，科技公司 CEO，公司估值 5 亿。访谈主题：创业历程、管理心得、行业趋势。李明分享自己从大厂程序员到创业者的转变。"
    },
    {
      "timestamp": "05:30",
      "title": "李明：创业初期最大挑战是资金和团队",
      "content": "李明回顾 2019 年创业初期，只有 3 个人和 50 万启动资金。最困难的是既要开发产品又要拉投资，曾经连续 3 个月每天工作 16 小时。第一笔天使轮 500 万，历经 20 多家机构拒绝才成功。"
    }
  ]
}

### Vlog 示例
{
  "video_type": "Vlog/生活记录",
  "summary": [
    {
      "timestamp": "00:00",
      "title": "东京旅行 Day 1：抵达新宿",
      "content": "早上 9 点从成田机场出发，乘坐 NEX 列车前往新宿。车程约 1 小时，票价 3000 日元。新宿站人流巨大，差点迷路。入住新宿王子酒店，房间可以看到街景。"
    },
    {
      "timestamp": "08:45",
      "title": "探访一兰拉面总店（排队 40 分钟）",
      "content": "下午前往著名的一兰拉面总店打卡。排队等了 40 分钟，点了经典豚骨拉面（980 日元）和溏心蛋（120 日元）。面条劲道，汤底浓郁但不腻，确实名不虚传。"
    }
  ]
}

---

## 视频文字稿
{TRANSCRIPT}

---

请现在开始分析并生成摘要（只返回 JSON，不要其他内容）：`;

// 辅助函数：将毫秒转换为时间戳字符串
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

// 格式化文字稿为带时间戳的文本
function formatTranscriptForPrompt(transcript: Array<{ text: string; start_time: number; end_time: number }>): string {
  return transcript
    .map((item) => {
      const timestamp = msToTimestamp(item.start_time);
      return `[${timestamp}] ${item.text}`;
    })
    .join('\n');
}

// 生成匹配视频长度的模拟文字稿（临时，待集成真实 API）
function generateMockTranscript(durationSeconds: number, videoTitle: string) {
  const segments = [];
  const segmentDuration = 5000;
  const totalSegments = Math.floor((durationSeconds * 1000) / segmentDuration);

  // 根据文件名尝试推断内容类型
  const titleLower = videoTitle.toLowerCase();
  let contentType = 'generic';
  
  if (titleLower.includes('会议') || titleLower.includes('meeting')) {
    contentType = 'meeting';
  } else if (titleLower.includes('教学') || titleLower.includes('课程') || titleLower.includes('tutorial')) {
    contentType = 'tutorial';
  } else if (titleLower.includes('访谈') || titleLower.includes('interview')) {
    contentType = 'interview';
  } else if (titleLower.includes('vlog') || titleLower.includes('日常')) {
    contentType = 'vlog';
  }

  // 根据内容类型生成更真实的文字稿
  const contentTemplates: Record<string, string[]> = {
    meeting: [
      "大家好，今天我们召开产品评审会议",
      "首先由产品经理介绍本次迭代的核心需求",
      "我们收到了用户反馈，主要集中在三个方面",
      "技术团队评估后认为实现难度中等",
      "预计需要两周时间完成开发",
      "测试团队建议增加自动化测试覆盖",
      "关于优先级排序，我们需要权衡一下",
      "市场部门反馈竞品已经上线类似功能",
      "我们讨论一下资源分配的问题",
      "李工提出了一个技术方案",
      "这个方案的优点是性能更好",
      "但缺点是开发周期会延长一周",
      "大家投票表决一下",
      "好的，那就按照这个方案执行",
      "下面明确一下各自的任务",
      "产品侧负责完善需求文档",
      "开发侧下周一开始编码",
      "测试侧准备测试用例",
      "预计下个月中旬可以上线",
      "有什么问题现在提出来",
      "好的，那今天会议就到这里",
      "会议纪要稍后发到群里"
    ],
    tutorial: [
      "大家好，欢迎来到今天的教学视频",
      "今天我们要学习一个非常实用的技术",
      "首先让我们了解一下基础概念",
      "这个概念最早由某某提出",
      "它解决了传统方法的几个痛点",
      "现在让我们看第一个例子",
      "这里我写了一段示例代码",
      "注意这个参数的配置",
      "如果配置错误会导致什么问题",
      "让我们运行一下看看效果",
      "可以看到输出结果符合预期",
      "接下来我们看一个更复杂的案例",
      "这个案例来自实际项目",
      "它涉及到几个关键技术点",
      "第一个技术点是性能优化",
      "通过这个方法性能提升了百分之五十",
      "第二个技术点是错误处理",
      "我们需要考虑各种边界情况",
      "最后做一个简单的总结",
      "今天我们学习了这些内容",
      "建议大家课后多加练习",
      "感谢观看，我们下次再见"
    ],
    interview: [
      "欢迎来到今天的访谈节目",
      "今天我们请到了行业专家张老师",
      "张老师在这个领域深耕二十年",
      "首先请张老师做个自我介绍",
      "谢谢主持人，大家好",
      "我从事这个行业已经很久了",
      "见证了整个行业的发展变化",
      "主持人问到关于行业趋势的问题",
      "我认为未来会有三个主要方向",
      "第一个方向是技术的深度融合",
      "第二个方向是用户体验的提升",
      "第三个方向是商业模式的创新",
      "您提到了一个很有意思的观点",
      "能否展开讲讲具体的案例",
      "好的，我分享一个真实的例子",
      "这个案例发生在去年",
      "当时我们团队遇到了重大挑战",
      "通过三个月的努力终于解决了",
      "这个经历给我很多启发",
      "对于年轻人我有一些建议",
      "最重要的是要保持学习的热情",
      "非常感谢张老师的精彩分享"
    ],
    vlog: [
      "大家好，今天带大家看看我的日常",
      "早上七点起床，准备开始新的一天",
      "先去楼下咖啡店买一杯拿铁",
      "今天天气不错，适合出门",
      "到公司已经八点半了",
      "今天有一个重要的项目会议",
      "会议持续了两个小时",
      "中午和同事一起去吃饭",
      "我们选择了一家新开的餐厅",
      "点了几个招牌菜，味道还不错",
      "下午继续处理工作",
      "大概四点的时候收到一个好消息",
      "我的方案被采纳了",
      "心情很好决定早点下班",
      "去超市买了些食材",
      "准备晚上自己做饭",
      "做饭的过程很享受",
      "虽然厨艺一般但吃得很开心",
      "晚上看了一会儿书",
      "十一点准备休息",
      "今天就记录到这里",
      "明天见啦各位"
    ],
    generic: [
      "视频开始，介绍今天的主题",
      "这是一个很有意思的话题",
      "让我们从不同角度来看",
      "首先分析一下背景",
      "历史上有类似的情况",
      "当时的处理方式是这样的",
      "现在情况有了新的变化",
      "我们需要考虑多方面因素",
      "第一个因素是时间成本",
      "第二个因素是资源投入",
      "第三个因素是预期收益",
      "综合权衡之后",
      "我们可以得出一些结论",
      "这个结论有一定的局限性",
      "但在当前条件下是最优解",
      "接下来看一些具体数据",
      "根据统计结果显示",
      "有百分之六十的人支持这个观点",
      "也有人提出了不同意见",
      "这些意见同样值得重视",
      "最后做一个简单总结",
      "感谢大家的观看"
    ]
  };

  const texts = contentTemplates[contentType] || contentTemplates.generic;

  for (let i = 0; i < totalSegments; i++) {
    const startTime = i * segmentDuration;
    const endTime = startTime + segmentDuration;
    const text = texts[i % texts.length];
    
    segments.push({
      text,
      start_time: startTime,
      end_time: endTime
    });
  }

  return segments;
}

// ===== 主函数 =====

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioPath, audioDuration, videoTitle } = await req.json();

    if (!audioPath) {
      throw new Error('缺少音频文件路径');
    }

    console.log('开始处理音频文件:', audioPath);
    console.log('视频标题:', videoTitle);
    console.log('音频时长:', audioDuration, '秒');

    const aliyunAccessKeyId = Deno.env.get('ALIYUN_ACCESS_KEY_ID');
    const aliyunAccessKeySecret = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET');

    if (!aliyunAccessKeyId || !aliyunAccessKeySecret) {
      throw new Error('阿里云凭证未配置');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: urlData, error: urlError } = await supabase.storage
      .from('temp-audio')
      .createSignedUrl(audioPath, 3600);

    if (urlError) {
      throw new Error(`获取音频文件失败: ${urlError.message}`);
    }

    console.log('音频文件 URL 已生成');

    // TODO: 集成真实的阿里云 API
    // 当前使用模拟数据，根据视频标题和时长生成更真实的内容
    
    console.log('生成模拟文字稿（基于视频标题和时长）...');
    const durationToUse = audioDuration || 546;
    const mockTranscript = generateMockTranscript(durationToUse, videoTitle || '未命名视频');
    
    console.log(`文字稿生成完成，共 ${mockTranscript.length} 段`);
    
    // 格式化文字稿用于 AI 分析
    const transcriptText = formatTranscriptForPrompt(mockTranscript);
    const durationFormatted = msToTimestamp(durationToUse * 1000);
    
    // 构建提示词（包含视频标题和时长）
    const userPrompt = USER_PROMPT_TEMPLATE
      .replace('{VIDEO_TITLE}', videoTitle || '未命名视频')
      .replace('{DURATION}', durationFormatted)
      .replace('{TRANSCRIPT}', transcriptText);
    
    console.log('准备调用 AI 生成摘要（提示词已包含视频标题和完整文字稿）');
    
    // TODO: 调用真实的 Qwen API
    /*
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
    const videoType = summaryJson.video_type;
    */
    
    // 临时模拟：基于文字稿内容生成更合理的摘要
    const segmentCount = Math.max(5, Math.min(10, Math.floor(durationToUse / 60)));
    const segmentDuration = durationToUse / segmentCount;
    
    const mockSummary: SummaryItem[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const timeSeconds = Math.floor(i * segmentDuration);
      const startIndex = Math.floor(i * mockTranscript.length / segmentCount);
      const endIndex = Math.floor((i + 1) * mockTranscript.length / segmentCount);
      const segmentTexts = mockTranscript.slice(startIndex, endIndex).map(t => t.text);
      
      mockSummary.push({
        timestamp: msToTimestamp(timeSeconds * 1000),
        title: `${segmentTexts[0]}（第${i + 1}部分）`,
        content: `本段内容：${segmentTexts.slice(0, 3).join('，')}。${segmentTexts.length > 3 ? '还讨论了相关的细节和实例。' : ''}`
      });
    }

    console.log(`摘要生成完成，共 ${mockSummary.length} 个段落`);
    console.log('⚠️ 当前使用模拟数据，集成阿里云 API 后将基于真实语音识别结果生成摘要');

    return new Response(
      JSON.stringify({
        success: true,
        summary: mockSummary,
        transcript: mockTranscript,
        message: `视频摘要生成成功（${Math.floor(durationToUse / 60)} 分 ${Math.floor(durationToUse % 60)} 秒）`
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
