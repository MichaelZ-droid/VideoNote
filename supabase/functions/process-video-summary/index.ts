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
    const mockTranscript = [
      { text: "大家好，欢迎来到今天的视频", start_time: 0, end_time: 3500 },
      { text: "今天我们要讲解一个非常重要的主题", start_time: 3500, end_time: 7200 },
      { text: "首先让我们从基础概念开始", start_time: 7200, end_time: 10800 },
      { text: "这个技术在实际应用中非常广泛", start_time: 10800, end_time: 15000 },
      { text: "接下来我会通过几个实例来演示", start_time: 15000, end_time: 19500 },
      { text: "第一个例子展示了基本用法", start_time: 19500, end_time: 150000 },
      { text: "你可以看到效果非常明显", start_time: 150000, end_time: 155000 },
      { text: "第二个例子更加复杂一些", start_time: 155000, end_time: 160000 },
      { text: "但是原理是一样的", start_time: 160000, end_time: 165000 },
      { text: "最后我们来总结一下今天的内容", start_time: 165000, end_time: 172000 },
      { text: "感谢大家的观看，我们下次再见", start_time: 172000, end_time: 180000 },
    ];

    // 将文字稿格式化用于摘要生成
    const transcriptText = mockTranscript.map(t => t.text).join(' ');

    console.log('语音识别完成，开始生成摘要');

    // 模拟调用 Qwen3-max 生成摘要（需要替换为实际 API）
    const mockSummary: SummaryItem[] = [
      {
        timestamp: "00:00",
        title: "开场介绍",
        content: "主持人欢迎观众并介绍今天要讲解的主题，说明这个主题非常重要。"
      },
      {
        timestamp: "00:07",
        title: "基础概念讲解",
        content: "从基础概念开始讲解，介绍这个技术在实际应用中的广泛用途。"
      },
      {
        timestamp: "00:19",
        title: "实例演示：基本用法",
        content: "通过第一个实例展示基本用法，效果明显易懂。"
      },
      {
        timestamp: "02:35",
        title: "实例演示：复杂应用",
        content: "展示第二个更复杂的例子，但原理与第一个相同。"
      },
      {
        timestamp: "02:45",
        title: "总结",
        content: "总结今天的主要内容，感谢观众观看。"
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