import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod'; // Or any validation library that supports Standard Schema
import { BlankEnv, BlankInput } from 'hono/types';
import { serve } from '@hono/node-server';

/**
 * Hono アプリケーションインスタンス。MCP エンドポイントを処理します。
 * @type {Hono}
 */
const app = new Hono();
app.use('/mcp', cors());
const server = new McpServer({
  name: 'Hello World!',
  version: '1.0.0',
});

server.registerTool('say_hello', {
  description: 'Say hello',
  inputSchema: {
    who: z.string().optional(),
  },
},
  async ({ who }) => {
    const result = String(`Hello ${who || 'world'}!`);
    console.debug(result);
    return {
      content: [{ type: 'text', text: result }],
    };
  },
);

const cleanupServer = async () => {
  if (server.isConnected()) {
    try {
      await server.close();
    } catch (error) {
      console.error('サーバークローズエラー:', error);
    }
  }
};

// ルートを設定
app.post('/mcp', async (c) => {
  try {
    const transport = new StreamableHTTPTransport({
      sessionIdGenerator: undefined, // セッションIDを生成しない（ステートレスモード）
      enableJsonResponse: true,
    });
    transport.onclose = async () => {
      await cleanupServer()
    };

    try {
      await server.connect(transport);
      console.debug('MCP リクエストを受信');

      return transport.handleRequest(c)
        .finally(() => {
          transport.close();
        });
    } catch (error) {
      console.error('MCP リクエスト処理中のエラー:', error);
      try {
        transport.close();
      } catch (closeError) {
        console.error('トランスポートを閉じる中のエラー:', closeError);
      }
      return c.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: '内部サーバーエラー',
          },
          id: null,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    await cleanupServer();

    console.error('MCP リクエスト処理中のエラー:', error);
    return c.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: '内部サーバーエラー',
        },
        id: null,
      },
      { status: 500 },
    );
  }
});

const methodNotAllowedHandler = async (c: Context<BlankEnv, '/mcp', BlankInput>) => {
  return c.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'メソッドは許可されていません。.',
      },
      id: null,
    },
    { status: 405 },
  );
};

app.get('/mcp', methodNotAllowedHandler);

app.delete('/mcp', methodNotAllowedHandler);

const startServer = () => {
  try {
    return serve({
      fetch: app.fetch,
      hostname: '0.0.0.0',
      port: 8000,
    }, (info) => {
      console.info(`MCP サーバーがポート ${info.port} でリッスン中`);
    });
  } catch (error) {
    console.error('サーバーのセットアップに失敗しました:', error instanceof Error ? error : JSON.stringify(error));
    process.exit(1);
  }
};
const honoServer = startServer();

// graceful shutdown
process.on('SIGINT', () => {
  honoServer.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  honoServer.close((err) => {
    if (err) {
      console.error('Server close error:', err);
    }
    process.exit(err ? 1 : 0);
  });
});
