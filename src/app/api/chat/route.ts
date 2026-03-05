import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// 1. Create a custom provider pointing to your Local Qwen instance
// We use the OpenAI driver because Qwen (via LM Studio/vLLM) follows the OpenAI protocol.
const qwenProvider = createOpenAI({
  baseURL: 'http://192.168.192.199:1234/v1',
  apiKey: 'not-needed',
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 2. Call streamText using your local Qwen model
    const result = await streamText({
      model: qwenProvider('qwen'), // The model name 'qwen' must match your local server config
      messages,
      system: 'You are an enterprise AI assistant powered by Qwen.',
    });

    // 3. Return the stream using the recommended method for useChat
    // If toDataStreamResponse still shows a type error, toTextStreamResponse can be used as a fallback,
    // but ensures the frontend matches the expected stream format.
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}