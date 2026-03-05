import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://192.168.192.199:1234/v1',
  apiKey: 'not-needed',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[API] Incoming request body:', JSON.stringify(body, null, 2));

    const coreMessages = (body.messages || []).map((msg: any) => {
      let text = '';
      if (typeof msg.content === 'string') text = msg.content;
      else if (Array.isArray(msg.parts)) text = msg.parts.map((p: any) => p.text).join('');
      else if (typeof msg.text === 'string') text = msg.text;

      return {
        role: ['user', 'assistant', 'system'].includes(msg.role) ? msg.role : 'user',
        content: text || '...',
      };
    });

    console.log('[API] Sanitized messages:', JSON.stringify(coreMessages, null, 2));

    console.log('[API] Starting chat completion stream...');

    const streamResponse = await openai.chat.completions.create({
      model: '/home/Qwen/Qwen2.5-72B-Instruct-AWQ/',
      messages: [
        { role: 'system', content: 'You are an enterprise AI assistant powered by Qwen.' },
        ...coreMessages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const readable = new ReadableStream({
      async start(controller) {
        let chunkCount = 0;
        let closed = false;

        req.signal.addEventListener('abort', () => {
          console.log('[API] Client aborted connection early');
          closed = true;
          controller.close();
        });

        try {
          for await (const chunk of streamResponse) {
            if (closed || controller.desiredSize <= 0) {
              console.log('[API] Stream aborted by client or backpressure');
              break;
            }

            chunkCount++;
            console.log(`[API] Chunk #${chunkCount}`);

            const sseLine = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseLine));
          }

          if (!closed) {
            console.log('[API] Stream complete - sending [DONE]');
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || err.code === 'ERR_INVALID_STATE') {
            console.log('[API] Graceful abort/close during streaming');
          } else {
            console.error('[API] Stream error:', err);
          }
        } finally {
          console.log(`[API] Total chunks attempted: ${chunkCount}`);
          if (!closed) controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('[API] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}