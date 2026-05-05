
import { awsAgent } from './agents/aws-agent.js';
import { mcp } from './tools/aws-tool.js';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export const app = new Hono();

app.get('/ping', (c) =>
  c.json({
    status: 'Healthy',
    time_of_last_update: Math.floor(Date.now() / 1000),
  }),
);

app.post('/invocations', async (c) => {
  const body = await c.req.json();
  // Input validation
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const { prompt } = body;

  if (!prompt || typeof prompt !== 'string') {
    return c.json({ error: 'prompt is required and must be a string' }, 400);
  }

  if (prompt.length > 10000) { // Reasonable limit
    return c.json({ error: 'prompt is too long' }, 400);
  }

  // ストリーミングレスポンス
  try {
    const streamResult = await awsAgent.stream(prompt);
    for await (const event of streamResult) {
      return streamSSE(c, async (stream) => {
        if (
          event.type === 'modelStreamUpdateEvent' &&
          event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta'
        ) {
          await stream.write(event.event.delta.text);
        }
      });
    }
  } catch (e) {
    await mcp.disconnect();
    throw e;
  }
},
);
