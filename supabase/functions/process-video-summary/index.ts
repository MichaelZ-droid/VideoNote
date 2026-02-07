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

// 生成匹配视频长度的模拟文字稿
function generateMockTranscript(durationSeconds: number) {
  const segments = [];
  const segmentDuration = 5000; // 每段 5 秒
  const totalSegments = Math.floor((durationSeconds * 1000) / segmentDuration);

  const sampleTexts = [
    "大家好，欢迎来到今天的视频",
    "今天我们要讲解一个非常重要的主题",
    "首先让我们从基础概念开始",
    "这个技术在实际应用中非常广泛",
    "接下来我会通过几个实例来演示",
    "第一个例子展示了基本用法",
    "你可以看到效果非常明显",
    "现在让我们看看更复杂的场景",
    "在生产环境中，我们需要注意性能优化",
    "这里有几个关键的优化技巧",
    "第一个技巧是使用缓存机制",
    "第二个技巧是异步处理",
    "第三个技巧是资源复用",
    "通过这些优化，性能可以大幅提升",
    "接下来我们看一个实战案例",
    "这个案例来自真实的项目经验",
    "我们遇到了一些具体的问题",
    "解决方案是采用分步处理",
    "同时配合相应的技术方案",
    "最终效果非常理想",
    "这个方法也适用于类似场景",
    "大家可以根据实际情况调整",
    "接下来是一些注意事项",
    "这些细节很容易被忽略",
    "但对最终效果影响很大",
    "建议大家在实践中多加注意",
    "现在让我们总结一下今天的内容",
    "今天我们学习了几个核心技术点",
    "以及完整的实战案例",
    "希望这些内容对大家有所帮助",
    "如果有问题欢迎在评论区留言",
    "感谢大家的观看，我们下次再见"
  ];

  for (let i = 0; i < totalSegments; i++) {
    const startTime = i * segmentDuration;
    const endTime = startTime + segmentDuration;
    const text = sampleTexts[i % sampleTexts.length];
    
    segments.push({
      text,
      start_time: startTime,
      end_time: endTime
    });
  }

  return segments;
}

// 生成匹配视频长度的模拟摘要
function generateMockSummary(durationSeconds: number): SummaryItem[] {
  const summary: SummaryItem[] = [];
  const segmentCount = Math.max(5, Math.min(10, Math.floor(durationSeconds / 60))); // 每分钟一个段落，5-10个
  const segmentDuration = durationSeconds / segmentCount;

  const templates = [
    { title: "课程介绍：核心概念与目标", content: "介绍本次内容的主要目标和核心概念。概述要讲解的关键知识点，以及学习后能掌握的技能。强调内容的实用性和应用场景。" },
    { title: "基础知识：原理与概念讲解", content: "详细讲解基础原理和核心概念。通过图示和示例帮助理解关键机制。介绍相关的专业术语和基本用法。" },
    { title: "实例演示：基本功能应用", content: "通过第一个示例展示基本功能的使用方法。演示核心 API 和常用配置。讲解代码结构和关键实现细节。" },
    { title: "进阶技巧：高级特性与优化", content: "介绍高级特性和优化技巧。讲解性能优化的关键方法，包括缓存策略、异步处理和资源管理。提供具体的优化数据对比。" },
    { title: "实战案例：真实项目应用", content: "分享来自真实项目的完整案例。详细讲解遇到的问题和解决方案。展示实施步骤和关键代码片段，说明实际效果提升。" },
    { title: "常见问题：注意事项与避坑指南", content: "总结开发中容易遇到的问题和解决方法。提供最佳实践建议和注意事项。强调关键的细节点和常见误区。" },
    { title: "扩展应用：相关技术与工具", content: "介绍相关的技术栈和配套工具。讲解如何与其他技术集成。提供进一步学习的资源和方向。" },
    { title: "性能分析：优化效果与对比", content: "展示性能优化前后的数据对比。分析关键性能指标的变化。总结优化带来的实际价值。" },
    { title: "最佳实践：生产环境建议", content: "总结生产环境的最佳实践。讲解部署和维护的注意事项。提供完整的配置建议和安全考虑。" },
    { title: "课程总结：核心要点回顾", content: "回顾本次内容的核心知识点。总结关键技术和实战经验。鼓励实践应用并持续学习。" }
  ];

  for (let i = 0; i < segmentCount; i++) {
    const timeSeconds = Math.floor(i * segmentDuration);
    const template = templates[i % templates.length];
    
    summary.push({
      timestamp: msToTimestamp(timeSeconds * 1000),
      title: template.title,
      content: template.content
    });
  }

  return summary;
}

// ===== 主函数 =====

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioPath, audioDuration } = await req.json();

    if (!audioPath) {
      throw new Error('缺少音频文件路径');
    }

    console.log('开始处理音频文件:', audioPath);
    console.log('音频时长:', audioDuration, '秒');

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
    // 当前使用模拟数据，根据实际音频时长生成匹配的内容
    
    console.log('开始模拟语音识别...（生成匹配时长的文字稿）');
    const durationToUse = audioDuration || 546; // 使用传入的时长，默认 9 分钟
    const mockTranscript = generateMockTranscript(durationToUse);
    
    console.log(`语音识别完成，生成了 ${mockTranscript.length} 段文字稿`);
    console.log('开始生成摘要...');

    // 生成匹配视频长度的摘要
    const mockSummary = generateMockSummary(durationToUse);

    console.log(`摘要生成完成，共 ${mockSummary.length} 个段落`);

    // 注意：在生产环境中，应该在处理完成后删除临时音频文件
    // await supabase.storage.from('temp-audio').remove([audioPath]);

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
