/**
 * AI 摘要生成提示词配置
 * 您可以在这里优化提示词以获得更好的摘要效果
 */

export const SYSTEM_PROMPT = `你是一个专业的视频内容分析专家，擅长从视频文字稿中提取关键信息并生成结构化摘要。

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

export const USER_PROMPT_TEMPLATE = `请基于以下带时间戳的视频文字稿，生成详细的结构化摘要。

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
    },
    {
      "timestamp": "03:45",
      "title": "实战案例：处理 JSON 数据并提取特定字段",
      "content": "演示如何从 API 返回的 JSON 数组中提取用户名和邮箱，使用 map 和 filter 组合实现数据清洗。展示了处理嵌套结构和异常值的技巧。"
    }
  ]
}

## 反面示例（避免这样笼统的摘要）：
❌ "介绍了基本概念" 
✅ "讲解了 React Hooks 的三个核心规则：只在顶层调用、只在函数组件中使用、自定义 Hook 必须以 use 开头"

❌ "演示了实际应用"
✅ "通过构建待办事项应用，展示如何用 useState 管理列表状态，用 useEffect 实现本地存储同步，完整代码仅 50 行"

---

## 视频文字稿：
{TRANSCRIPT}

请现在生成摘要（只返回 JSON，不要有其他内容）：`;

/**
 * 格式化文字稿为提示词
 */
export function formatTranscriptForPrompt(transcript: Array<{ text: string; start_time: number; end_time: number }>): string {
  return transcript
    .map((item) => {
      const minutes = Math.floor(item.start_time / 60000);
      const seconds = Math.floor((item.start_time % 60000) / 1000);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `[${timestamp}] ${item.text}`;
    })
    .join('\n');
}

/**
 * 生成完整的用户提示词
 */
export function generateUserPrompt(transcriptText: string): string {
  return USER_PROMPT_TEMPLATE.replace('{TRANSCRIPT}', transcriptText);
}
