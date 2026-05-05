// eslint-disable-next-line import-x/no-unresolved
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import { McpClient } from '@strands-agents/sdk';

export const mcp = new McpClient({
  transport: new StreamableHTTPClientTransport(
    new URL('https://knowledge-mcp.global.api.aws'),
  ) as Transport,
});

export const tools = await mcp.listTools();
