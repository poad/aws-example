
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { registerApiRoute } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';
import { exampleAgent } from './agents/example-agent.js';
import { mcp } from './mcp.js';

/**
 * X-Ray にトレースを投入する際に Mastra のコンストラクターの telemetry にプロパティに設定する OTel 設定例 (未検証)。
 *
 * ```typescript
 * import { OtelConfig } from '@mastra/core';
 *
 * const otelConfig: OtelConfig = {
 *   serviceName: 'my-awesome-service',
 *   enabled: true,
 *   sampling: {
 *     type: 'ratio',
 *     probability: 0.5,
 *   },
 *   export: {
 *     type: 'otlp',
 *     endpoint: `https://xray.us-west-2.amazonaws.com/v1/traces`,
 *   },
 * };
 * ```
 */

export const mastra = new Mastra({
  agents: { exampleAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ':memory:',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    port: 8080,
    host: process.env.MASTRA_ENV === 'development' ? undefined : '0.0.0.0',
    apiRoutes: [
      registerApiRoute('/invocations', {
        method: 'POST',
        openapi: {
          summary: 'Invokes the agent',
          description: 'Invokes the agent with the given prompt',
          tags: ['Agent'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prompt: {
                      type: 'string',
                      required: ['prompt'],
                      description: 'The prompt to invoke the agent with',
                    },
                  },
                },
              },
            },
          },
        },
        handler: async (c) => {
          const mastra = c.get('mastra');

          const logger = mastra.getLogger();

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

          const agent = await mastra.getAgent('exampleAgent');

          const toolsets = await mcp.getToolsets();

          // ストリーミングレスポンス
          try {
            const streamResult = await agent.streamVNext(prompt, {
              toolsets,
            });

            return streamSSE(c, async (stream) => {
              for await (const chunk of streamResult.textStream) {
                await stream.write(chunk);
              }
              // MCPツール使用時は必ず切断
              await mcp.disconnect();
            });
          } catch (e) {
            logger.error('error', { e });
            await mcp.disconnect();
            throw e;
          }
        },
      }),
      registerApiRoute('/ping', {
        method: 'GET',
        openapi: {
          summary: 'Ping',
          description: 'Ping',
          tags: ['Agent'],
        },
        handler: async (c) => {
          return c.json({ status: 'ok' });
        },
      }),
    ],
  },
});
