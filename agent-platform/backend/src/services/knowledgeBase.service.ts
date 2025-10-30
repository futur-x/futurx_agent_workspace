import axios from 'axios';

// FastGPT 知识库检索
export async function searchFastGPT(config: any, query: string): Promise<any[]> {
  try {
    const response = await axios.post(
      `${config.baseUrl}/api/core/dataset/searchTest`,
      {
        datasetId: config.datasetId,
        text: query,
        limit: config.limit || 5000,
        similarity: config.similarity || 0.4,
        searchMode: config.searchMode || 'embedding',
        usingReRank: config.usingReRank || false,
        datasetSearchUsingExtensionQuery: config.datasetSearchUsingExtensionQuery || false,
        datasetSearchExtensionModel: config.datasetSearchExtensionModel || '',
        datasetSearchExtensionBg: config.datasetSearchExtensionBg || ''
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.code === 200) {
      return response.data.data.map((item: any) => ({
        content: item.q + (item.a ? '\n' + item.a : ''),
        score: item.score,
        source: item.sourceName,
        metadata: {
          datasetId: item.datasetId,
          collectionId: item.collectionId,
          sourceId: item.sourceId
        }
      }));
    }
    return [];
  } catch (error: any) {
    console.error('FastGPT search error:', error.message);
    throw new Error(`FastGPT search failed: ${error.message}`);
  }
}

// Dify 知识库检索（需要外部API）
export async function searchDify(config: any, query: string): Promise<any[]> {
  try {
    const response = await axios.post(
      `${config.baseUrl}/retrieval`,
      {
        retrieval_setting: {
          top_k: config.topK || 5,
          score_threshold: config.scoreThreshold || 0.5
        },
        query: query,
        knowledge_id: config.knowledgeId
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.records) {
      return response.data.records.map((item: any) => ({
        content: item.content,
        score: item.score,
        source: item.title,
        metadata: item.metadata || {}
      }));
    }
    return [];
  } catch (error: any) {
    console.error('Dify search error:', error.message);
    throw new Error(`Dify search failed: ${error.message}`);
  }
}

// 统一知识库检索接口
export async function searchKnowledgeBase(
  type: string,
  config: any,
  query: string
): Promise<any[]> {
  switch (type) {
    case 'fastgpt':
      return await searchFastGPT(config, query);
    case 'dify':
      return await searchDify(config, query);
    default:
      throw new Error(`Unsupported knowledge base type: ${type}`);
  }
}

// 使用通用AI模型生成查询关键词
export async function generateQueryKeywords(
  aiConfig: any,
  userInput: string,
  fileContent: string | null,
  taskTemplate: string
): Promise<string> {
  try {
    // 组装提示词
    const prompt = `你是一个知识库查询助手。请分析以下信息，生成最适合用于知识库检索的查询关键词（1-3个关键短语，用逗号分隔）：

用户输入：${userInput}
${fileContent ? `上传文件内容摘要：${fileContent.substring(0, 500)}...` : ''}
任务模板：${taskTemplate}

请只返回查询关键词，不要其他解释。`;

    const response = await axios.post(
      aiConfig.baseUrl || 'https://api.openai.com/v1/chat/completions',
      {
        model: aiConfig.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的查询关键词提取助手，擅长从复杂文本中提取核心查询关键词。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      },
      {
        headers: {
          Authorization: `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }

    // 如果AI生成失败，返回用户输入作为关键词
    return userInput;
  } catch (error: any) {
    console.error('Generate query keywords error:', error.message);
    // 失败时返回用户输入
    return userInput;
  }
}
