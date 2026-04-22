import { awsAgent } from './agents/aws-agent.js';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/aws-scorer.js';
import { mcp } from './tools/aws-tool.js';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, SensitiveDataFilter } from '@mastra/observability';
import { OtelExporter } from '@mastra/otel-exporter';
import { registerApiRoute } from '@mastra/core/server';
import { streamSSE } from 'hono/streaming';

export const mastra = new Mastra({
  agents: { awsAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: 'file:./mastra.db',
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
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

          const toolsets = await mcp.listToolsets();

          // ストリーミングレスポンス
          try {
            const streamResult = await agent.stream(prompt, {
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
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new OtelExporter({
            provider: {
              custom: {
                endpoint: `${process.env.MLFLOW_TRACKING_URI ?? 'http://127.0.0.1:5000'}/v1/traces`,
                protocol: 'http/protobuf',
                headers: {
                  'x-mlflow-experiment-id': process.env.MLFLOW_EXPERIMENT_ID ?? '0',
                },
              },
            },
          }),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
        logging: {
          enabled: true, // set to false to disable log forwarding
          level: 'info', // minimum level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
        },
      },
    },
  }),
});
