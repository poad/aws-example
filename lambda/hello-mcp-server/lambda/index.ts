import express from "express";
import { Logger } from '@aws-lambda-powertools/logger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { server } from './mcp-server';

const logger = new Logger();

const app = express();
app.use(express.json());

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});
try {
  await server.connect(transport);

  // ルートを設定
  app.post('/mcp', async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP リクエスト処理中のエラー:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: '内部サーバーエラー',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (_, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "メソッドは許可されていません。"
      },
      id: null
    }));
  });

  app.delete('/mcp', async (_, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "メソッドは許可されていません。"
      },
      id: null
    }));
  });

  const PORT = process.env.PORT ?? 8080;
  app.listen(PORT, () => {
    logger.info(`MCP サーバーがポート ${PORT} でリッスン中`);
  });
} catch (error) {
  logger.error('サーバーのセットアップに失敗しました:', error instanceof Error ? error : JSON.stringify(error));
    process.exit(1);
}
