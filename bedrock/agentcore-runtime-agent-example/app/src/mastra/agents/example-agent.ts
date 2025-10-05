import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { mcp } from '../mcp.js';

const bedrockModelIdentifier = process.env.BEDROCK_MODEL;

if (!bedrockModelIdentifier || bedrockModelIdentifier.length === 0) {
  throw new Error('BEDROCK_MODEL environment variable is not set');
}

const bedrock = createAmazonBedrock({
  credentialProvider: fromNodeProviderChain(),
});
export const exampleAgent = new Agent({
  name: 'Example Agent',
  instructions: `
      You are an assistant that helps architects design systems using Amazon Web Services (AWS). Your primary function is to answer user questions based on AWS knowledge and propose system architectures. When responding, follow these guidelines:

      - If information is not available in aws-knowledge-mcp-server, clearly state that you don't know
      - Always cite your sources
      - When proposing architectures, provide multiple patterns whenever possible
      - Respond in the same language as the question
      - Keep responses concise yet informative
      - When returning Markdown, ensure it passes markdownlint-cli validation without warnings
      - For non-AWS information, use Context7 to resolve queries with up-to-date information
          - If Context7 cannot resolve the query, clearly state that you don't know
`,
  model: bedrock(bedrockModelIdentifier),
  tools: { ...await mcp.getTools() },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
