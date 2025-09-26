import fetch from 'node-fetch';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const testDifyConnection = async (url: string, apiToken: string): Promise<boolean> => {
  try {
    // Test connection by making a simple API call
    const response = await fetch(`${url}/parameters`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    return response.ok;
  } catch (error) {
    logger.error('Dify connection test failed:', error);
    return false;
  }
};

export interface DifyGenerationOptions {
  url: string;
  apiToken: string;
  query: string;
  conversationId?: string;
  user?: string;
  responseMode?: 'streaming' | 'blocking';
}

export const generateWithDify = async (options: DifyGenerationOptions): Promise<ReadableStream | string> => {
  const {
    url,
    apiToken,
    query,
    conversationId,
    user = 'default-user',
    responseMode = 'streaming'
  } = options;

  try {
    const response = await fetch(`${url}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: responseMode,
        conversation_id: conversationId,
        user,
        files: []
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AppError(`Dify API error: ${error}`, response.status);
    }

    if (responseMode === 'streaming') {
      // Return the stream for SSE handling
      return response.body as ReadableStream;
    } else {
      // Return the JSON response for blocking mode
      const data = await response.json();
      return data.answer || data.message || '';
    }
  } catch (error) {
    logger.error('Dify generation failed:', error);
    throw new AppError('Failed to generate content with Dify', 500);
  }
};

export const parseSSEMessage = (message: string): any => {
  try {
    // SSE messages come in format: data: {json}
    if (message.startsWith('data: ')) {
      const jsonStr = message.slice(6);
      if (jsonStr === '[DONE]') {
        return { event: 'done' };
      }
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (error) {
    logger.error('Failed to parse SSE message:', error);
    return null;
  }
};