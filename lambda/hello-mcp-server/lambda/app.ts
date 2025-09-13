import { Context, Hono } from 'hono';
import { StreamableHTTPTransport } from '@hono/mcp';
import { server } from './mcp-server';
import { Logger } from '@aws-lambda-powertools/logger';
import { BlankEnv, BlankInput } from 'hono/types';

const logger = new Logger();

/**
 * Hono アプリケーションインスタンス。MCP エンドポイントを処理します。
 * @type {Hono}
 */
export const app = new Hono();

// ルートを設定
app.post('/mcp', async (c) => {
  try {
    const transport = new StreamableHTTPTransport({
      sessionIdGenerator: undefined, // セッションIDを生成しない（ステートレスモード）
      enableJsonResponse: true,
    });
    await server.connect(transport);
    logger.trace('MCP リクエストを受信');

    return transport.handleRequest(c);
  } catch (error) {
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
