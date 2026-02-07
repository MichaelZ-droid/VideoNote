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

// ===== 优化后的提示词 =====
const SYSTEM_PROMPT = `你是一个专业的视频内容分析专家。你的任务是将视频文字稿转化为有价值的结构化摘要。

核心能力：
- 准确识别视频类型和叙事结构
- 提炼关键信息并引用原文重要语句
- 理解段落间的逻辑关联
- 用自然流畅的语言输出摘要

输出要求：
- 引用原文中的关键词句（用引号标注）
- 保留具体的人名、数据、术语
- 段落之间体现逻辑递进或转折关系
- 避免"第X部分"、"本段内容"等机械化表达
- 语言简洁有力，像在向朋友转述精华`;

const USER_PROMPT_TEMPLATE = `请分析以下视频文字稿，生成详细的结构化摘要。

## 视频信息
**文件名**: {VIDEO_TITLE}
**时长**: {DURATION}

## 摘要要求

### 数量要求
- 根据内容自然分段，不设固定数量限制
- 短视频（<5分钟）：5-8 段
- 中等视频（5-15分钟）：10-15 段
- 长视频（>15分钟）：15-25 段或更多
- 宁可多分几段保留细节，也不要过度压缩丢失信息

### 标题要求
- 用一句话概括该段核心内容
- 直接体现"谁做了什么"或"讲了什么观点"
- 禁止使用：第X部分、章节X、段落X

### 内容要求（重点！）
1. **必须引用原文**：摘录文字稿中的关键语句，用引号标注
   - 好例子："他提到「这个方法可以让效率提升3倍」"
   - 好例子："讲者强调「不要只看表面数据」"
   
2. **提炼关键信息**：
   - 具体的数据、时间、地点
   - 人物的观点和态度
   - 事件的因果关系
   - 方法的具体步骤

3. **体现前后关联**：
   - 如果本段承接上文，说明关联
   - 如果本段是转折，点明转折点
   - 如果本段引出后文，做好铺垫

4. **禁止的表达**：
   - ❌ "本段内容："
   - ❌ "（第1部分）"
   - ❌ "接下来介绍..."
   - ❌ "这部分主要讲..."
   - ❌ 空泛的概括（"讨论了相关问题"）

### 时间戳要求
- 基于文字稿中的实际时间
- 每个摘要对应一个关键时间点
- 格式：MM:SS 或 HH:MM:SS

## 输出格式
返回纯 JSON（无 markdown）：

{
  "video_type": "识别的视频类型",
  "summary": [
    {
      "timestamp": "00:00",
      "title": "简洁有力的标题（不带序号）",
      "content": "摘要内容，引用原文「关键语句」，提炼核心信息。说明与上下文的关联。"
    }
  ]
}

## 优质摘要示例

### 示例1：技术分享
{
  "timestamp": "03:25",
  "title": "性能瓶颈的根本原因",
  "content": "讲者指出「90%的性能问题都出在数据库查询」，通过实际项目数据说明：优化前单次查询耗时 800ms，加入索引后降至 50ms。这为后续的优化方案做了铺垫。"
}

### 示例2：会议讨论
{
  "timestamp": "12:40",
  "title": "张经理反对激进的扩张计划",
  "content": "针对前面提出的Q2扩张方案，张经理提出异议：「现金流还不足以支撑这么大的投入」。他建议分两个阶段执行，先用3个月验证核心市场，再决定是否全面铺开。"
}

### 示例3：访谈对话
{
  "timestamp": "08:15",
  "title": "李明谈创业最艰难的时刻",
  "content": "回忆起2020年初，李明说「那三个月我每天只睡4小时，公司账上只剩2万块」。但正是这段经历让他学会了「用最小成本验证想法」，这个理念贯穿了后续的产品决策。"
}

### 示例4：Vlog记录
{
  "timestamp": "05:30",
  "title": "一兰拉面的真实体验",
  "content": "排了40分钟队终于吃到传说中的一兰拉面。博主评价「汤底比想象中清淡，但面条劲道程度确实惊艳」，980日元的价格「在东京算性价比很高」。"
}

---

## 视频文字稿
{TRANSCRIPT}

---

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

function formatTranscriptForPrompt(transcript: Array<{ text: string; start_time: number; end_time: number }>): string {
  return transcript
    .map((item) => {
      const timestamp = msToTimestamp(item.start_time);
      return `[${timestamp}] ${item.text}`;
    })
    .join('\n');
}

// 生成更真实的模拟文字稿
function generateMockTranscript(durationSeconds: number, videoTitle: string) {
  const segments = [];
  const segmentDuration = 5000;
  const totalSegments = Math.floor((durationSeconds * 1000) / segmentDuration);

  const titleLower = videoTitle.toLowerCase();
  let contentType = 'generic';
  
  if (titleLower.includes('会议') || titleLower.includes('meeting')) {
    contentType = 'meeting';
  } else if (titleLower.includes('教') || titleLower.includes('课') || titleLower.includes('tutorial')) {
    contentType = 'tutorial';
  } else if (titleLower.includes('访谈') || titleLower.includes('interview')) {
    contentType = 'interview';
  } else if (titleLower.includes('vlog') || titleLower.includes('日常') || titleLower.includes('旅')) {
    contentType = 'vlog';
  }

  const contentTemplates: Record<string, string[]> = {
    meeting: [
      "好，那我们开始今天的会议",
      "首先汇报一下上周的进展",
      "用户反馈数据显示满意度提升了12%",
      "但是有一个问题需要重点关注",
      "就是新功能的使用率只有预期的60%",
      "我认为主要原因是入口太深了",
      "建议把入口提到首页显眼位置",
      "技术上这个改动大概需要3天",
      "成本不高但效果应该会很明显",
      "大家对这个方案有什么意见吗",
      "我补充一点关于后端的考虑",
      "如果改到首页需要考虑缓存策略",
      "不然可能会影响页面加载速度",
      "这个风险我们需要提前评估",
      "建议先做个A/B测试看看数据",
      "好主意，那就先灰度10%用户",
      "一周后看数据再决定是否全量",
      "还有其他问题需要讨论吗",
      "关于下季度的规划我想提一下",
      "市场部反馈竞品上了新功能",
      "我们是否需要跟进",
      "这个可以会后单独讨论",
      "今天主要先把这个问题定下来",
      "好的那就这样，散会"
    ],
    tutorial: [
      "大家好欢迎来到今天的课程",
      "今天要讲的内容非常实用",
      "很多人在这个地方容易踩坑",
      "首先我们来看一个概念",
      "这个概念最早是谷歌提出的",
      "它解决了传统方法的一个痛点",
      "就是性能和可维护性的平衡",
      "我给大家看一段代码",
      "注意这里的写法",
      "如果按照以前的方式写",
      "代码量会多出三倍不止",
      "而且后期维护成本很高",
      "用新方法之后你看",
      "同样的功能只需要这几行",
      "而且可读性好很多",
      "我再讲一个进阶技巧",
      "这个技巧我用了两年才总结出来",
      "当时也是踩了很多坑",
      "核心思路就是把复杂度下沉",
      "让上层代码保持简洁",
      "举个实际项目的例子",
      "之前接手一个遗留项目",
      "启动时间要5秒多",
      "用这个方法优化后",
      "降到了800毫秒以内",
      "效果还是非常明显的",
      "最后总结一下今天的要点",
      "第一是理解核心原理",
      "第二是掌握最佳实践",
      "第三是多动手练习",
      "课后作业我放在评论区",
      "有问题随时留言"
    ],
    interview: [
      "欢迎来到今天的访谈",
      "今天请到的嘉宾是行业资深专家",
      "在这个领域深耕超过十年",
      "首先请您做个自我介绍",
      "好的谢谢主持人",
      "我05年入行一直做到现在",
      "经历了这个行业几次大的变革",
      "最近几年变化确实很快",
      "您觉得最大的变化是什么",
      "我认为是思维方式的转变",
      "以前大家追求大而全",
      "现在更强调小步快跑",
      "这个转变很多传统企业还没适应",
      "您有什么建议给他们",
      "我觉得关键是放下包袱",
      "不要总想着一步到位",
      "先从一个小点切入",
      "验证可行再扩大规模",
      "这也是我们当年的教训",
      "能分享一下具体的案例吗",
      "那是2018年的时候",
      "我们想做一个大项目",
      "投入了很多资源结果失败了",
      "后来痛定思痛",
      "改成小团队快速迭代的模式",
      "反而找到了突破口",
      "这个经历对我影响很大",
      "对年轻人有什么建议",
      "保持好奇心很重要",
      "还有就是不要怕犯错",
      "感谢您的精彩分享"
    ],
    vlog: [
      "大家好今天带大家看看我的一天",
      "现在是早上七点刚起床",
      "先去楼下买杯咖啡",
      "这家店的美式我喝了三年了",
      "老板都认识我了",
      "好天气不错心情也不错",
      "今天计划去一个新发现的地方",
      "之前刷到很多人推荐",
      "看起来很适合拍照",
      "坐地铁大概半小时就到了",
      "哇到了确实很美",
      "人不算多正好",
      "拍了一圈准备找地方吃饭",
      "朋友推荐附近一家店",
      "据说是网红店要排队",
      "排了二十分钟终于进去了",
      "点了招牌菜和一个甜品",
      "味道怎么说呢",
      "卖相确实很好适合拍照",
      "但性价比一般",
      "人均150左右",
      "不过来都来了体验一下也值",
      "下午逛了逛买了点东西",
      "晚上准备回家做饭",
      "买了喜欢的食材",
      "一个人吃简单点就好",
      "今天的vlog就到这里",
      "喜欢的话记得点赞关注"
    ],
    generic: [
      "今天要和大家聊一个话题",
      "这个话题最近讨论度很高",
      "很多人有不同的看法",
      "我想从几个角度来分析",
      "首先看一下背景",
      "这件事情的起因是这样的",
      "当时的情况比较复杂",
      "涉及到多方的利益",
      "所以处理起来需要平衡",
      "有人认为应该这样做",
      "理由是效率更高",
      "但也有人提出反对意见",
      "认为这样做风险太大",
      "我个人的观点是",
      "需要具体问题具体分析",
      "不能一刀切",
      "举个例子来说明",
      "之前有个类似的案例",
      "最后的解决方案是折中",
      "既照顾了效率也控制了风险",
      "这个思路值得借鉴",
      "回到今天讨论的问题",
      "我认为可以参考这个模式",
      "当然具体执行还需要细化",
      "总之保持开放的态度很重要",
      "多听不同的声音",
      "最后做出理性的判断",
      "今天就聊到这里"
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

// 生成更自然的模拟摘要（引用原文，无格式化语言）
function generateNaturalSummary(transcript: Array<{ text: string; start_time: number }>, durationSeconds: number): SummaryItem[] {
  const summary: SummaryItem[] = [];
  
  // 根据时长决定摘要数量（更灵活）
  const baseCount = Math.floor(durationSeconds / 30); // 每30秒一个摘要点
  const segmentCount = Math.max(5, Math.min(25, baseCount)); // 5-25个
  
  const segmentSize = Math.floor(transcript.length / segmentCount);
  
  for (let i = 0; i < segmentCount; i++) {
    const startIdx = i * segmentSize;
    const endIdx = Math.min(startIdx + segmentSize, transcript.length);
    const segmentTexts = transcript.slice(startIdx, endIdx);
    
    if (segmentTexts.length === 0) continue;
    
    const timestamp = msToTimestamp(segmentTexts[0].start_time);
    const keyText = segmentTexts[0].text;
    const supportText = segmentTexts.length > 1 ? segmentTexts[1].text : '';
    
    // 生成自然的标题（不带序号）
    let title = keyText.length > 20 ? keyText.substring(0, 20) + '...' : keyText;
    title = title.replace(/^(好的?|那|嗯|啊)，?/, ''); // 去除语气词
    
    // 生成包含原文引用的内容
    let content = '';
    if (segmentTexts.length >= 2) {
      content = `提到「${keyText}」，${supportText}`;
      if (segmentTexts.length >= 3) {
        content += `。随后讨论了「${segmentTexts[2].text}」`;
      }
    } else {
      content = `「${keyText}」`;
    }
    
    // 添加上下文关联
    if (i > 0 && Math.random() > 0.5) {
      content = '承接前面的讨论，' + content;
    }
    if (i < segmentCount - 1 && Math.random() > 0.7) {
      content += '，为后续内容做了铺垫';
    }
    
    summary.push({ timestamp, title, content });
  }

  return summary;
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

    console.log('处理音频:', audioPath);
    console.log('视频标题:', videoTitle);
    console.log('时长:', audioDuration, '秒');

    const aliyunAccessKeyId = Deno.env.get('ALIYUN_ACCESS_KEY_ID');
    const aliyunAccessKeySecret = Deno.env.get('ALIYUN_ACCESS_KEY_SECRET');

    if (!aliyunAccessKeyId || !aliyunAccessKeySecret) {
      throw new Error('阿里云凭证未配置');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: urlError } = await supabase.storage
      .from('temp-audio')
      .createSignedUrl(audioPath, 3600);

    if (urlError) {
      throw new Error(`获取音频文件失败: ${urlError.message}`);
    }

    // 生成模拟数据（待集成真实API）
    const durationToUse = audioDuration || 300;
    const mockTranscript = generateMockTranscript(durationToUse, videoTitle || '未命名视频');
    
    console.log(`文字稿: ${mockTranscript.length} 段`);
    
    // 生成自然的摘要（引用原文，无格式化语言）
    const mockSummary = generateNaturalSummary(mockTranscript, durationToUse);

    console.log(`摘要: ${mockSummary.length} 段（根据内容自然分段）`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: mockSummary,
        transcript: mockTranscript,
        message: `生成完成（${Math.floor(durationToUse / 60)}分${Math.floor(durationToUse % 60)}秒，${mockSummary.length}个要点）`
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
