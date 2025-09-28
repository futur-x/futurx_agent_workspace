import axios from 'axios';
import { AppError } from '../middleware/errorHandler';

interface FastGPTMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url' | 'file_url';
    text?: string;
    image_url?: { url: string };
    name?: string;
    url?: string;
  }>;
}

interface FastGPTRequest {
  chatId?: string;
  stream: boolean;
  detail?: boolean;
  variables?: Record<string, any>;
  messages: FastGPTMessage[];
}

interface FastGPTResponse {
  id: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason: string | null;
    index: number;
  }>;
  responseData?: any[];
}

export class FastGPTService {
  private url: string;
  private apiToken: string;

  constructor(url: string, apiToken: string) {
    // Ensure URL ends with proper path
    this.url = url.replace(/\/+$/, '');
    if (!this.url.includes('/api/')) {
      this.url = `${this.url}/api/v1/chat/completions`;
    }
    this.apiToken = apiToken;
  }

  /**
   * Test FastGPT connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.post(
        this.url,
        {
          stream: false,
          detail: false,
          messages: [
            { role: 'user', content: 'test' }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.status === 200 && response.data?.choices?.length > 0;
    } catch (error) {
      console.error('FastGPT connection test failed:', error);
      return false;
    }
  }

  /**
   * Generate content with FastGPT (non-streaming)
   */
  async generateContent(prompt: string, fileContent?: string): Promise<string> {
    try {
      const messages: FastGPTMessage[] = [];

      // Add file content as context if provided
      if (fileContent) {
        messages.push({
          role: 'system',
          content: `Here is the context from uploaded file:\n${fileContent}`
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await axios.post<FastGPTResponse>(
        this.url,
        {
          stream: false,
          detail: false,
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minutes timeout
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content;
      }

      throw new Error('Invalid response from FastGPT');
    } catch (error: any) {
      console.error('FastGPT generation error:', error);

      if (error.response?.status === 401) {
        throw new AppError('Invalid FastGPT API token', 401);
      }

      if (error.response?.status === 429) {
        throw new AppError('FastGPT rate limit exceeded', 429);
      }

      if (error.code === 'ECONNABORTED') {
        throw new AppError('FastGPT request timeout', 504);
      }

      throw new AppError(
        error.response?.data?.message || 'Failed to generate content with FastGPT',
        error.response?.status || 500
      );
    }
  }

  /**
   * Generate content with FastGPT (streaming)
   */
  async *generateContentStream(prompt: string, fileContent?: string): AsyncGenerator<string, void, unknown> {
    try {
      const messages: FastGPTMessage[] = [];

      // Add file content as context if provided
      if (fileContent) {
        messages.push({
          role: 'system',
          content: `Here is the context from uploaded file:\n${fileContent}`
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await axios.post(
        this.url,
        {
          stream: true,
          detail: false,
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          responseType: 'stream',
          timeout: 0 // No timeout for streaming
        }
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignore parsing errors for individual chunks
              console.warn('Failed to parse FastGPT stream chunk:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('FastGPT stream generation error:', error);

      if (error.response?.status === 401) {
        throw new AppError('Invalid FastGPT API token', 401);
      }

      if (error.response?.status === 429) {
        throw new AppError('FastGPT rate limit exceeded', 429);
      }

      throw new AppError(
        error.response?.data?.message || 'Failed to generate content stream with FastGPT',
        error.response?.status || 500
      );
    }
  }
}

export async function testFastGPTConnection(url: string, apiToken: string): Promise<boolean> {
  const service = new FastGPTService(url, apiToken);
  return service.testConnection();
}