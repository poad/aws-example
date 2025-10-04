import { MCPClient } from '@mastra/mcp';

export const mcp = new MCPClient({
  servers: {
    'aws-knowledge-mcp-server': {
      url: new URL('https://knowledge-mcp.global.api.aws'),
      enableServerLogs: true,
    },
    context7: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
      enableServerLogs: true,
    },
  },
});
